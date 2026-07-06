import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { lessonWeekSchema, type LessonWeek, type ScopeSequence } from "@/lib/schemas";
import { lessonWeekPrompt } from "@/lib/prompts";
import { retrieveGenomeForWeek } from "@/lib/genome-retrieval";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}