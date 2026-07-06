import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { auth } from "@/auth";
import type { ScopeSequence, LessonPlan } from "@/lib/schemas";
import {
  readDriveFile,
  driveFileIdFromUrl,
  fillDocumentFromTemplate,
  fillPresentationFromTemplate,
} from "@/lib/google";
import {
  analyzeTemplate,
  buildPlaceholderSchema,
  templateMatchCheck,
  toReplacements,
  toToken,
} from "@/lib/template-schema";
import { gateFacilitation, usableFacilitation } from "@/lib/facilitation-gate";
import { resolveTemplateId, type TemplateKind } from "@/lib/template-registry";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Layer 3 prompt: one JSON object keyed by the template's placeholder tokens.
 * The bot acts as an experiential-learning expert, not just a form filler:
 *  - the Scope & Sequence is the source of truth for WHAT the day teaches
 *  - the template is the source of truth for the OUTPUT structure (these keys)
 *  - the Genome + facilitation quality bar improve HOW the day is taught
 */
function structuredLessonPrompt(placeholders: string[], scope: ScopeSequence, plan: LessonPlan): string {
  const cpc = scope.cpcText?.trim() || scope.cpcProblemStatement;
  return [
    `You are an experiential-learning designer producing ONE JSON object for a single day's lesson. Use ONLY these template placeholder tokens as keys. Return JSON only.`,
    `Keys (use every one, exactly as written, including the braces):`,
    placeholders.map(toToken).join(", "),
    ``,
    `OUTPUT STRUCTURE (template = source of truth): fill each field with the content its name implies (for example {{STUDENT_TASK}} is the student task, {{FACILITATOR_MOVES}} is the guide moves, {{MATERIALS}} is the materials). If a field does not apply, use an empty string. Do NOT invent keys that are not in the list. Every field has exactly one destination.`,
    `Enumerated fields are a repeating collection: {{PHASE_1_*}}, {{PHASE_2_*}}, ... map to the 1st, 2nd, ... phase of the plan in order (same for any other N_ numbered group). Fill only as many as the plan has and leave any trailing ones as an empty string.`,
    ``,
    `WHAT THE DAY TEACHES (Scope & Sequence = source of truth, do not override): the daily objective, lesson type, competency indicator, CPC progression, assessment target, and the required sequence come from the plan below. Preserve this instructional intent exactly. You may generate richer daily content when the plan is only a thin outline, but you must NOT invent a new arc, a new CPC, or a different rubric priority.`,
    ``,
    `HOW TO TEACH IT (raise the experiential quality): design for student autonomy, movement, collaboration, active practice (real at-bats on the competency, not passive listening), reflection, and engagement. Every facilitation must be run-it-cold: a concrete student task, clear guide moves, realistic timing, and available materials (flag any that are missing). Facilitations will be independently validated, so make them strong.`,
    ``,
    `COMPETENCY: ${scope.competency} | DYAD: ${scope.gradeBand} | RUBRIC INDICATOR: ${plan.rubricIndicator}`,
    scope.rubricText?.trim() ? `AUTHORITATIVE RUBRIC:\n${scope.rubricText}\n` : ``,
    cpc ? `AUTHORITATIVE CPC:\n${cpc}\n` : ``,
    `APPROVED LESSON PLAN (the day from the Scope & Sequence):`,
    JSON.stringify(plan, null, 2),
    ``,
    `Style: no em dashes, no semicolons in student-facing text. Plain, concrete, age-appropriate for the dyad.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const { templateUrl, kind, scope, plan } = (await req.json()) as {
      templateUrl?: string;
      kind?: "doc" | "slides";
      scope: ScopeSequence;
      plan: LessonPlan;
    };
    if (!scope || !plan) {
      return NextResponse.json({ error: "scope and plan are required." }, { status: 400 });
    }
    const wantKind: TemplateKind = kind === "slides" ? "slides" : "doc";

    // Step 3: select the template deterministically. An explicit link overrides;
    // otherwise resolve the lesson type through the registry.
    let templateId: string | null;
    if (templateUrl && templateUrl.trim()) {
      templateId = driveFileIdFromUrl(templateUrl.trim());
      if (!templateId) {
        return NextResponse.json({ error: "That does not look like a Google Doc / Slides link." }, { status: 400 });
      }
    } else {
      const r = resolveTemplateId(plan.lessonType, wantKind);
      if (!r.id) {
        return NextResponse.json(
          {
            error: `No ${wantKind} template is registered for lesson type "${plan.lessonType}" (key "${r.key}"). Add it to TEMPLATE_REGISTRY_JSON or pass templateUrl. Registered keys: ${r.known.join(", ") || "none"}.`,
          },
          { status: 400 }
        );
      }
      templateId = r.id;
    }

    const session = await auth();
    const userToken = session?.accessToken;

    // ---- Layer 1: read the template, extract its placeholders as the schema ----
    const file = await readDriveFile(templateId, userToken);
    if (file.text == null) {
      return NextResponse.json(
        { error: "The template must be a Google Doc or Google Slides file (so its {{PLACEHOLDERS}} can be read)." },
        { status: 400 }
      );
    }
    const { placeholders, duplicates } = analyzeTemplate(file.text);
    if (placeholders.length === 0) {
      return NextResponse.json(
        { error: "No {{PLACEHOLDER}} fields were found in that template." },
        { status: 400 }
      );
    }

    // ---- Layer 3: generate one object keyed ONLY by the template placeholders ----
    const schema = buildPlaceholderSchema(placeholders);
    const generated = await generateStructured<Record<string, string>>(
      structuredLessonPrompt(placeholders, scope, plan),
      schema,
      { maxTokens: 16000 }
    );

    // ---- Layer 2: gate any facilitation field before it is inserted ----
    const materials = plan.materials ? `${plan.materials.student}; ${plan.materials.teacher}` : undefined;
    const facilitation: { field: string; verdict: string; reasons: string }[] = [];
    for (const name of placeholders) {
      if (!/FACILIT/i.test(name)) continue;
      const token = toToken(name);
      const value = generated[token];
      if (!value || !value.trim()) continue;
      const v = await gateFacilitation(value, {
        competency: scope.competency,
        dyad: scope.gradeBand,
        rubricIndicator: plan.rubricIndicator,
        cpc: scope.cpcText?.trim() || scope.cpcProblemStatement,
        materials,
      });
      generated[token] = usableFacilitation(value, v) ?? ""; // REJECT -> empty -> shows as missing
      facilitation.push({ field: token, verdict: v.verdict, reasons: v.reasons });
    }

    // ---- Template Match Check (after gating) ----
    const check = templateMatchCheck(placeholders, generated);

    // ---- Render into a copied template ----
    // A repeated token is not an error: replaceAllText fills every occurrence
    // with the same value, so a placeholder that legitimately appears more than
    // once (e.g. {{REFLECTION_PROMPT}} on a slide and in its notes) just gets the
    // same content in each spot. Duplicates are still reported for visibility.
    let filled: { id: string; webViewLink: string; shared: "ok" | "failed" | "skipped" } | null = null;
    let fillError: string | undefined;
    try {
      // [Competency]_[Dyad]_Week [#]_Day [#]_[Design Model]
      const wk = plan.day.match(/week\s*(\d+)/i)?.[1] ?? "";
      const dayNum = plan.day.match(/day\s*(\d+)/i)?.[1] ?? "";
      const name = `${scope.competency}_${scope.gradeBand}_Week ${wk}_Day ${dayNum}_${plan.lessonType}`.replace(
        /[/\\:*?"<>|]/g,
        "-"
      );
      const shareWith = session?.user?.email ?? undefined;
      const replacements = toReplacements(check.mapped);
      filled =
        wantKind === "slides"
          ? await fillPresentationFromTemplate(templateId, replacements, name, shareWith)
          : await fillDocumentFromTemplate(templateId, replacements, name, shareWith);
    } catch (e) {
      fillError = e instanceof Error ? e.message : "Template render failed.";
    }

    return NextResponse.json({
      placeholders,
      object: generated,
      templateMatchCheck: {
        unmapped: check.unmapped,
        missing: check.missing,
        duplicates: duplicates.map(toToken),
      },
      facilitation,
      file: filled,
      fillError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Template fill failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}