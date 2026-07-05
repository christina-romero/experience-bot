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
  extractPlaceholders,
  buildPlaceholderSchema,
  templateMatchCheck,
  toReplacements,
  toToken,
} from "@/lib/template-schema";
import { gateFacilitation, usableFacilitation } from "@/lib/facilitation-gate";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Layer 3 prompt: one JSON object keyed by the template's placeholder tokens. */
function structuredLessonPrompt(placeholders: string[], scope: ScopeSequence, plan: LessonPlan): string {
  const cpc = scope.cpcText?.trim() || scope.cpcProblemStatement;
  return [
    `Produce ONE JSON object for a lesson, using ONLY these template placeholder tokens as keys. Return JSON only.`,
    `Keys (use every one, exactly as written, including the braces):`,
    placeholders.map(toToken).join(", "),
    ``,
    `Fill each field with content for THIS lesson, grounded in the approved plan below. Match each field to what its name implies (for example {{STUDENT_TASK}} is the student task, {{FACILITATOR_MOVES}} is the guide moves, {{MATERIALS}} is the materials). If a field does not apply, use an empty string. Do NOT invent keys that are not in the list.`,
    ``,
    `COMPETENCY: ${scope.competency} | DYAD: ${scope.gradeBand} | RUBRIC INDICATOR: ${plan.rubricIndicator}`,
    scope.rubricText?.trim() ? `AUTHORITATIVE RUBRIC:\n${scope.rubricText}\n` : ``,
    cpc ? `AUTHORITATIVE CPC:\n${cpc}\n` : ``,
    `APPROVED LESSON PLAN:`,
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
      templateUrl: string;
      kind?: "doc" | "slides";
      scope: ScopeSequence;
      plan: LessonPlan;
    };
    if (!templateUrl || !scope || !plan) {
      return NextResponse.json({ error: "templateUrl, scope, and plan are required." }, { status: 400 });
    }

    const templateId = driveFileIdFromUrl(templateUrl.trim());
    if (!templateId) {
      return NextResponse.json({ error: "That does not look like a Google Doc / Slides link." }, { status: 400 });
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
    const placeholders = extractPlaceholders(file.text);
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

    // ---- Render into a copied template (best-effort; validation stands either way) ----
    let filled: { id: string; webViewLink: string } | null = null;
    let fillError: string | undefined;
    try {
      const name = `${scope.competency}_${scope.gradeBand}_${plan.day}`.replace(/[/\\:*?"<>|]/g, "-");
      const replacements = toReplacements(check.mapped);
      filled =
        kind === "slides"
          ? await fillPresentationFromTemplate(templateId, replacements, name)
          : await fillDocumentFromTemplate(templateId, replacements, name);
    } catch (e) {
      fillError = e instanceof Error ? e.message : "Template render failed.";
    }

    return NextResponse.json({
      placeholders,
      object: generated,
      templateMatchCheck: { unmapped: check.unmapped, missing: check.missing },
      facilitation,
      file: filled,
      fillError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Template fill failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}