import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { generateStructured } from "@/lib/anthropic";
import { scopeSequenceSchema, type ScopeSequence } from "@/lib/schemas";
import { parseScopeSequencePrompt } from "@/lib/prompts";
import { readDriveFile, driveFileIdFromUrl } from "@/lib/google";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Experience Sources: one panel of mixed inputs (Doc links, files, pasted text).
 * We extract text from each, classify it automatically, assemble an internal
 * source pack, and reuse the existing Scope & Sequence parser. The curriculum
 * writer does not have to say which document is which.
 */

type Src = { text?: string; base64?: string; name?: string; driveUrl?: string };
type Category =
  | "scope_sequence"
  | "cpc"
  | "rubric"
  | "genome"
  | "facilitation_library"
  | "notes"
  | "unknown";
const CATEGORIES: Category[] = [
  "scope_sequence",
  "cpc",
  "rubric",
  "genome",
  "facilitation_library",
  "notes",
  "unknown",
];

async function bufferToText(buffer: Buffer, name: string): Promise<string> {
  if (name.toLowerCase().endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString("utf8");
}

async function extractText(doc: Src, userToken?: string): Promise<{ text: string; name: string }> {
  const fallbackName = doc.name || (doc.driveUrl ? "Drive link" : "Pasted text");
  if (doc.driveUrl && doc.driveUrl.trim()) {
    const id = driveFileIdFromUrl(doc.driveUrl.trim());
    if (!id) throw new Error(`That does not look like a Google Drive link: ${doc.driveUrl}`);
    const f = await readDriveFile(id, userToken);
    if (f.text != null) return { text: f.text, name: f.name };
    if (f.buffer) return { text: await bufferToText(f.buffer, f.name), name: f.name };
    return { text: "", name: f.name };
  }
  if (doc.text && doc.text.trim()) return { text: doc.text.trim(), name: fallbackName };
  if (doc.base64) return { text: await bufferToText(Buffer.from(doc.base64, "base64"), doc.name || ""), name: fallbackName };
  return { text: "", name: fallbackName };
}

const classifySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "integer" },
          category: { type: "string", enum: CATEGORIES },
        },
        required: ["index", "category"],
      },
    },
  },
  required: ["items"],
} as const;

function classifyPrompt(items: { index: number; name: string; snippet: string }[]): string {
  return [
    `Classify each curriculum source into exactly one category. Return JSON only, one entry per source index.`,
    `Categories:`,
    `- scope_sequence: a Scope & Sequence — the week-by-week or day-by-day plan / arc.`,
    `- cpc: a Culminating Performance Challenge (CPC) problem statement or structure.`,
    `- rubric: a competency rubric with indicators and levels.`,
    `- genome: Future2 Experience Genome references or experiential-design patterns.`,
    `- facilitation_library: a library or list of facilitation moves, protocols, routines, or engagement strategies.`,
    `- notes: supporting notes or anything else useful but not the above.`,
    `- unknown: cannot tell from the content.`,
    ``,
    `SOURCES:`,
    ...items.map((s) => `[${s.index}] name: ${s.name}\n${s.snippet}\n`),
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const { competency, gradeBand, sources } = (await req.json()) as {
      competency: string;
      gradeBand: string;
      sources: Src[];
    };
    if (!competency || !gradeBand) {
      return NextResponse.json({ error: "competency and gradeBand are required." }, { status: 400 });
    }
    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: "Add at least one source." }, { status: 400 });
    }

    const session = await auth();
    const userToken = session?.accessToken;

    // 1. Extract text for every source.
    const extracted: { index: number; name: string; text: string }[] = [];
    for (let i = 0; i < sources.length; i++) {
      const { text, name } = await extractText(sources[i], userToken);
      if (text.trim()) extracted.push({ index: i, name, text });
    }
    if (extracted.length === 0) {
      return NextResponse.json({ error: "No readable text was found in the sources provided." }, { status: 400 });
    }

    // 2. Classify all sources in one pass.
    const { items } = await generateStructured<{ items: { index: number; category: Category }[] }>(
      classifyPrompt(extracted.map((e) => ({ index: e.index, name: e.name, snippet: e.text.slice(0, 1200) }))),
      classifySchema,
      { maxTokens: 2000 }
    );
    const catByIndex = new Map(items.map((it) => [it.index, it.category]));

    // 3. Assemble the internal source pack.
    const byCat: Record<Category, string[]> = {
      scope_sequence: [], cpc: [], rubric: [], genome: [], facilitation_library: [], notes: [], unknown: [],
    };
    const perSource = extracted.map((e) => {
      const category = catByIndex.get(e.index) ?? "unknown";
      byCat[category].push(e.text);
      return { name: e.name, category };
    });
    const join = (a: string[]) => a.join("\n\n");
    const ssText = join(byCat.scope_sequence);
    const rubricText = join(byCat.rubric);
    const cpcText = join(byCat.cpc);

    const found = {
      scopeSequence: !!ssText.trim(),
      cpc: !!cpcText.trim(),
      rubric: !!rubricText.trim(),
      genome: byCat.genome.length > 0,
      facilitationLibrary: byCat.facilitation_library.length > 0,
      notes: byCat.notes.length > 0,
    };

    // 4. Reuse the existing parser only when the required piece is present.
    let scope: ScopeSequence | null = null;
    const missing: string[] = [];
    if (found.scopeSequence) {
      scope = await generateStructured<ScopeSequence>(
        parseScopeSequencePrompt({ competency, gradeBand, ssText, rubricText, cpcText }),
        scopeSequenceSchema,
        { maxTokens: 32000 }
      );
      scope.rubricText = rubricText;
      scope.cpcText = cpcText;
      scope.facilitationText = join(byCat.facilitation_library);
    } else {
      missing.push("Scope & Sequence");
    }

    return NextResponse.json({ scope, sources: perSource, found, missing });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Source analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}