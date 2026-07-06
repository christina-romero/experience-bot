import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { lessonWeekSchema, type LessonWeek, type ScopeSequence } from "@/lib/schemas";
import { lessonWeekPrompt } from "@/lib/prompts";
import { retrieveGenomeForWeek, retrieveGenomeDebug } from "@/lib/genome-retrieval";
import { resolveTemplateId } from "@/lib/template-registry";

export const runtime = "nodejs";
export const maxDuration = 300;

function facilitationKind(move: string): "adapted" | "new" | "library" {
  const m = (move || "").toLowerCase();
  if (m.startsWith("adapted")) return "adapted";
  if (m.includes("newly written") || m.includes("new facilitation") || m.includes("newly created")) return "new";
  return "library";
}

export async function POST(req: Request) {
  try {
    const { scope, week } = (await req.json()) as { scope: ScopeSequence; week: number };
    if (!scope || !week) {
      return NextResponse.json({ error: "scope and week are required." }, { status: 400 });
    }

    // Retrieval-first: inject only the most relevant Genome seeds + supporting
    // instructional collections for this week, not the whole bundled workbook.
    const genome = retrieveGenomeForWeek(scope, week);

    const prompt = lessonWeekPrompt({ scope, week, genome });
    const data = await generateStructured<LessonWeek>(prompt, lessonWeekSchema, { maxTokens: 32000 });

    // Developer-only debug payload (surfaced in the app behind the ?debug=1 toggle).
    const debug = {
      genome: retrieveGenomeDebug(scope, week),
      days: data.plans.map((p) => ({
        day: p.day,
        designModel: p.lessonType,
        docTemplate: resolveTemplateId(p.lessonType, "doc").id ?? "(none registered)",
        slidesTemplate: resolveTemplateId(p.lessonType, "slides").id ?? "(none registered)",
        facilitation: p.phases.map((ph) => ({
          phase: ph.name,
          move: ph.facilitation,
          kind: facilitationKind(ph.facilitation),
        })),
      })),
    };

    return NextResponse.json({ ...data, _debug: debug });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}