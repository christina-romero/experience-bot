import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { auth } from "@/auth";
import type { ScopeSequence, LessonPlan } from "@/lib/schemas";
import { readDriveFile, driveFileIdFromUrl, fillDocumentFromTemplate } from "@/lib/google";
import { analyzeTemplate, buildPlaceholderSchema, templateMatchCheck, toReplacements, toToken } from "@/lib/template-schema";
import { resolveTemplateId, canonicalLessonType } from "@/lib/template-registry";

export const runtime = "nodejs";
export const maxDuration = 300;

/** The week's Design Model = the model most of its days use (drives template choice). */
function weekDesignModel(weekPlans: LessonPlan[]): string {
  const counts = new Map<string, number>();
  for (const p of weekPlans) counts.set(p.lessonType, (counts.get(p.lessonType) ?? 0) + 1);
  let best = weekPlans[0]?.lessonType ?? "Gradual Release and Discussion";
  let n = 0;
  for (const [k, c] of counts) if (c > n) { n = c; best = k; }
  return best;
}

/**
 * Fill ONE weekly lesson-plan document (Days 1-5) keyed by the template's tokens.
 * DAY{n}_* tokens map to Day n; header tokens come from the week/scope. Preserves
 * competency progression, rubric indicator, per-day Design Models, connections,
 * checkpoint progression, and CPC alignment across the five days.
 */
function structuredWeekPrompt(
  placeholders: string[],
  scope: ScopeSequence,
  week: number,
  weekPlans: LessonPlan[]
): string {
  const cpc = scope.cpcText?.trim() || scope.cpcProblemStatement;
  return [
    `You are an experiential-learning designer filling ONE weekly lesson-plan document that contains all five days. Use ONLY these template placeholder tokens as keys. Return JSON only.`,
    `Keys (use every one exactly, including the braces):`,
    placeholders.map(toToken).join(", "),
    ``,
    `MAPPING: tokens named DAY{n}_... belong to Day n. Fill each from that day's plan below, matching the phase in the token name (DO_NOW, DIRECT_TEACH, GUIDED_PRACTICE, INDEPENDENT, CLOSING). A ..._DIRECTIONS token is the time-stamped, run-it-cold facilitator script for that phase, like "[00:00] move. [02:30] next move." A ..._TAKEAWAY, ..._SCAFFOLDS, or ..._EXTENSION token comes from that day's reflection, supports, and extension. Header tokens (COMPETENCY, DYAD, LESSON_OBJECTIVE_SKILL, EXPERIENCE_OBJECTIVE, MATERIALS, WEEK_NUMBER, DAYS_PER_WEEK, MINUTES_PER_DAY, NUMBER_OF_WEEKS) come from the week and scope. If a field does not apply, use an empty string. Do NOT invent keys.`,
    ``,
    `PRESERVE ACROSS THE WEEK (do not override the Scope & Sequence): the competency progression, the rubric indicator, each day's Design Model, the day-to-day lesson connections, the checkpoint progression, and the CPC alignment. Keep exactly the arc the S&S defines; enrich HOW each day is taught without changing WHAT it teaches.`,
    ``,
    `COMPETENCY: ${scope.competency} | DYAD: ${scope.gradeBand} | WEEK: ${week} of ${scope.weeks.length}`,
    scope.rubricText?.trim() ? `AUTHORITATIVE RUBRIC:\n${scope.rubricText}\n` : ``,
    cpc ? `AUTHORITATIVE CPC:\n${cpc}\n` : ``,
    `APPROVED WEEK PLANS (Days 1-5, authoritative):`,
    JSON.stringify(weekPlans, null, 2),
    ``,
    `Style: no em dashes, no semicolons in student-facing text. Plain, concrete, age-appropriate for the dyad.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const { templateUrl, scope, week, weekPlans } = (await req.json()) as {
      templateUrl?: string;
      scope: ScopeSequence;
      week: number;
      weekPlans: LessonPlan[];
    };
    if (!scope || !week || !weekPlans?.length) {
      return NextResponse.json({ error: "scope, week, and weekPlans are required." }, { status: 400 });
    }

    const session = await auth();
    const userToken = session?.accessToken;

    // Select the week's Doc template (by the week's Design Model), link overrides.
    const designModel = weekDesignModel(weekPlans);
    let templateId: string | null;
    if (templateUrl && templateUrl.trim()) {
      templateId = driveFileIdFromUrl(templateUrl.trim());
      if (!templateId) {
        return NextResponse.json({ error: "That does not look like a Google Doc link." }, { status: 400 });
      }
    } else {
      const r = resolveTemplateId(designModel, "doc");
      if (!r.id) {
        return NextResponse.json(
          { error: `No doc template is registered for Design Model "${designModel}" (key "${r.key}").` },
          { status: 400 }
        );
      }
      templateId = r.id;
    }

    // Read the template, extract its placeholders.
    const file = await readDriveFile(templateId, userToken);
    if (file.text == null) {
      return NextResponse.json({ error: "The template must be a Google Doc (so its {{PLACEHOLDERS}} can be read)." }, { status: 400 });
    }
    const { placeholders, duplicates } = analyzeTemplate(file.text);
    if (placeholders.length === 0) {
      return NextResponse.json({ error: "No {{PLACEHOLDER}} fields were found in that template." }, { status: 400 });
    }

    // Generate one object keyed by the week template's placeholders.
    const schema = buildPlaceholderSchema(placeholders);
    const generated = await generateStructured<Record<string, string>>(
      structuredWeekPrompt(placeholders, scope, week, weekPlans),
      schema,
      { maxTokens: 32000 }
    );

    // Deterministic header values override the model for the numeric fields.
    const setIf = (name: string, value: string) => {
      const t = toToken(name);
      if (t in generated) generated[t] = value;
    };
    setIf("WEEK_NUMBER", String(week));
    setIf("DAYS_PER_WEEK", String(weekPlans.length));
    setIf("MINUTES_PER_DAY", "55");
    setIf("NUMBER_OF_WEEKS", String(scope.weeks.length));

    const check = templateMatchCheck(placeholders, generated);

    // In a weekly doc some tokens intentionally repeat with ONE value (e.g.
    // {{COMPETENCY}}, {{WEEK_NUMBER}}, {{DYAD}}). replaceAllText fills every
    // occurrence with the same value, so repeats are fine here — do not block.
    let filled: { id: string; webViewLink: string; shared: "ok" | "failed" | "skipped" } | null = null;
    let fillError: string | undefined;
    try {
      const name = `${scope.competency}_${scope.gradeBand}_Week ${week}_${designModel}`.replace(/[/\\:*?"<>|]/g, "-");
      filled = await fillDocumentFromTemplate(templateId, toReplacements(check.mapped), name, session?.user?.email ?? undefined);
    } catch (e) {
      fillError = e instanceof Error ? e.message : "Template render failed.";
    }

    return NextResponse.json({
      placeholders,
      object: generated,
      templateMatchCheck: { unmapped: check.unmapped, missing: check.missing, duplicates: duplicates.map(toToken) },
      facilitation: [],
      file: filled,
      fillError,
      designModel: canonicalLessonType(designModel),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Weekly template fill failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}