import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import {
  lessonWeekSchema,
  canonicalWeekSchema,
  fidelityWeekSchema,
  type LessonWeek,
  type CanonicalWeek,
  type FidelityWeek,
  type ScopeSequence,
} from "@/lib/schemas";
import { lessonWeekPrompt, canonicalWeekPrompt, fidelityGatePrompt } from "@/lib/prompts";
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

    // TWO KINGS pipeline: (A) write the canonical Access spine, (B) render the
    // HISD derivative FROM it, (C) run the fidelity gate as an adversarial diff.
    // The derivative (the lesson plans) is the essential output. The canonical
    // and fidelity passes are best-effort: a failure in either must NOT block the
    // lesson content from returning, so they are wrapped and degrade to null.
    let canonical: CanonicalWeek | null = null;
    try {
      canonical = await generateStructured<CanonicalWeek>(
        canonicalWeekPrompt({ scope, week, genome }),
        canonicalWeekSchema,
        { maxTokens: 20000 }
      );
    } catch (e) {
      console.error(`Canonical spine failed for week ${week}:`, e);
    }

    // Detailed run-it-cold plans are long; give the derivative a large output
    // budget so a full week is never truncated into invalid JSON.
    const data = await generateStructured<LessonWeek>(
      lessonWeekPrompt({ scope, week, genome, canonical: canonical ?? undefined }),
      lessonWeekSchema,
      { maxTokens: 64000 }
    );

    let fidelity: FidelityWeek | null = null;
    if (canonical) {
      try {
        fidelity = await generateStructured<FidelityWeek>(
          fidelityGatePrompt({ scope, canonical, week: data }),
          fidelityWeekSchema,
          { maxTokens: 16000 }
        );
      } catch (e) {
        console.error(`Fidelity gate failed for week ${week}:`, e);
      }
    }

    // Developer-only debug payload (surfaced in the app behind the ?debug=1 toggle).
    const debug = {
      genome: retrieveGenomeDebug(scope, week),
      days: data.plans.map((p) => ({
        day: p.day,
        designModel: p.lessonType,
        docTemplate: resolveTemplateId(p.lessonType, "doc").id ?? "(none registered)",
        facilitation: p.phases.map((ph) => ({
          phase: ph.name,
          move: ph.facilitation,
          kind: facilitationKind(ph.facilitation),
        })),
      })),
    };

    return NextResponse.json({ ...data, _canonical: canonical, _fidelity: fidelity, _debug: debug });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}