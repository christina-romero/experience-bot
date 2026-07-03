import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { generateStructured } from "@/lib/anthropic";
import { scopeSequenceSchema, type ScopeSequence } from "@/lib/schemas";
import { parseScopeSequencePrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

type Doc = { text?: string; base64?: string; name?: string } | undefined;

async function extractText(doc: Doc): Promise<string> {
  if (!doc) return "";
  if (doc.text && doc.text.trim()) return doc.text.trim();
  if (doc.base64) {
    const buffer = Buffer.from(doc.base64, "base64");
    const name = (doc.name || "").toLowerCase();
    if (name.endsWith(".docx")) {
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }
    // .txt / .md / anything else: best-effort plain text.
    return buffer.toString("utf8");
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const { competency, gradeBand, ss, rubric, cpc } = (await req.json()) as {
      competency: string;
      gradeBand: string;
      ss?: Doc;
      rubric?: Doc;
      cpc?: Doc;
    };
    if (!competency || !gradeBand) {
      return NextResponse.json({ error: "competency and gradeBand are required." }, { status: 400 });
    }

    const ssText = await extractText(ss);
    if (!ssText.trim()) {
      return NextResponse.json(
        { error: "Provide a scope & sequence — upload a .docx/.txt file or paste its text." },
        { status: 400 }
      );
    }
    const rubricText = await extractText(rubric);
    const cpcText = await extractText(cpc);

    const prompt = parseScopeSequencePrompt({ competency, gradeBand, ssText, rubricText, cpcText });
    const data = await generateStructured<ScopeSequence>(prompt, scopeSequenceSchema, { maxTokens: 32000 });

    // Attach the raw source materials so they ground downstream generation.
    data.rubricText = rubricText;
    data.cpcText = cpcText;

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Parse failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}