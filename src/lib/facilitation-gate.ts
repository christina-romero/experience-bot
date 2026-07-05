/**
 * Layer 2: Facilitation Quality Gate.
 *
 * Before any facilitation is inserted into a lesson, evaluate it against the
 * writing requirements and return PASS / REVISE / REJECT.
 *  - PASS   -> may be used as-is
 *  - REVISE -> may inspire a rewritten version, which MUST be labeled "Adapted"
 *  - REJECT -> may not be used
 */

import { generateStructured } from "./anthropic";

export const FACILITATION_CRITERIA = [
  "alignsCompetency", // aligns to the selected competency
  "alignsDyad", // aligns to the dyad group
  "activePractice", // gives students active practice
  "clearStudentTask", // includes a clear student task
  "clearFacilitatorMoves", // includes clear facilitator moves
  "realisticTiming", // has realistic timing
  "materialsOk", // requires available materials, or flags missing materials
  "ageAppropriate", // is age-appropriate
  "supportsCpcOrRubric", // supports the CPC or the rubric indicator
] as const;

export type FacilitationCriterion = (typeof FACILITATION_CRITERIA)[number];

export type FacilitationVerdict = {
  verdict: "PASS" | "REVISE" | "REJECT";
  criteria: Record<FacilitationCriterion, boolean>;
  reasons: string;
  adapted: string; // rewritten, "Adapted"-labeled version when REVISE; empty otherwise
};

const facilitationGateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["PASS", "REVISE", "REJECT"] },
    criteria: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(FACILITATION_CRITERIA.map((c) => [c, { type: "boolean" }])),
      required: [...FACILITATION_CRITERIA],
    },
    reasons: { type: "string" },
    adapted: { type: "string" },
  },
  required: ["verdict", "criteria", "reasons", "adapted"],
} as const;

export type FacilitationContext = {
  competency: string;
  dyad: string; // grade band, e.g. "3/4"
  rubricIndicator?: string;
  cpc?: string;
  materials?: string;
};

function facilitationGatePrompt(facilitation: string, ctx: FacilitationContext): string {
  return [
    `Evaluate ONE facilitation move against the writing requirements. Return JSON only.`,
    `COMPETENCY: ${ctx.competency} | DYAD (grade band): ${ctx.dyad}`,
    ctx.rubricIndicator ? `RUBRIC INDICATOR: ${ctx.rubricIndicator}` : ``,
    ctx.cpc ? `CPC: ${ctx.cpc}` : ``,
    ctx.materials ? `MATERIALS AVAILABLE: ${ctx.materials}` : ``,
    ``,
    `FACILITATION TO EVALUATE:`,
    facilitation,
    ``,
    `Set each criterion true only if the facilitation clearly meets it:`,
    `- alignsCompetency: builds the selected competency.`,
    `- alignsDyad: fits the dyad group.`,
    `- activePractice: gives students active practice, not passive listening.`,
    `- clearStudentTask: names a clear, concrete student task.`,
    `- clearFacilitatorMoves: names clear facilitator moves.`,
    `- realisticTiming: has realistic timing for a 55 minute period.`,
    `- materialsOk: needs only available materials, or explicitly flags any missing materials.`,
    `- ageAppropriate: is age-appropriate for the dyad.`,
    `- supportsCpcOrRubric: supports the CPC or the rubric indicator.`,
    ``,
    `Verdict rule:`,
    `- PASS: all criteria are true. Leave "adapted" empty.`,
    `- REVISE: mostly strong but one or more criteria fail in a fixable way. Put a rewritten, competency-aligned version in "adapted", prefixed with "Adapted: ".`,
    `- REJECT: fundamentally misaligned or unfixable without a new move. Leave "adapted" empty.`,
    `Put a one to two sentence justification in "reasons".`,
    `Style: no em dashes, no semicolons.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Evaluate a single facilitation against the writing requirements. */
export async function gateFacilitation(
  facilitation: string,
  ctx: FacilitationContext
): Promise<FacilitationVerdict> {
  return generateStructured<FacilitationVerdict>(
    facilitationGatePrompt(facilitation, ctx),
    facilitationGateSchema,
    { maxTokens: 4000 }
  );
}

/**
 * Resolve a facilitation to the text that may actually be inserted:
 *  - PASS   -> the original
 *  - REVISE -> the adapted version (already "Adapted"-labeled by the model)
 *  - REJECT -> null (must not be used)
 */
export function usableFacilitation(original: string, v: FacilitationVerdict): string | null {
  if (v.verdict === "PASS") return original;
  if (v.verdict === "REVISE") return v.adapted?.trim() || null;
  return null;
}