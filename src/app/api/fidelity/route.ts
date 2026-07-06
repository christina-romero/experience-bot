import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { fidelityWeekSchema, type FidelityWeek, type CanonicalWeek, type LessonWeek, type ScopeSequence } from "@/lib/schemas";
import { fidelityGatePrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * TWO KINGS re-check: run the fidelity gate again on an EDITED week against its
 * canonical spine, so the human QC can fix a diluted day in place and re-verify
 * without regenerating the whole week.
 */
export async function POST(req: Request) {
  try {
    const { scope, canonical, week } = (await req.json()) as {
      scope: ScopeSequence;
      canonical: CanonicalWeek;
      week: LessonWeek;
    };
    if (!scope || !canonical || !week) {
      return NextResponse.json({ error: "scope, canonical, and week are required." }, { status: 400 });
    }
    const fidelity = await generateStructured<FidelityWeek>(
      fidelityGatePrompt({ scope, canonical, week }),
      fidelityWeekSchema,
      { maxTokens: 12000 }
    );
    return NextResponse.json(fidelity);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fidelity check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}