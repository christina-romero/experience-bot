import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/anthropic";
import { grDeckTokensSchema, type GrDeckTokens, type ScopeSequence, type LessonPlan } from "@/lib/schemas";
import { grDeckTokensPrompt } from "@/lib/prompts";
import { fillPresentationFromTemplate } from "@/lib/google";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { scope, plan } = (await req.json()) as { scope: ScopeSequence; plan: LessonPlan };
    if (!scope || !plan) {
      return NextResponse.json({ error: "scope and plan are required." }, { status: 400 });
    }
    const templateId = process.env.GR_DECK_TEMPLATE_ID;
    if (!templateId) {
      return NextResponse.json(
        { error: "GR_DECK_TEMPLATE_ID is not set. Set it to the ID of your tokenized Gradual Release deck template." },
        { status: 400 }
      );
    }

    const t = await generateStructured<GrDeckTokens>(grDeckTokensPrompt({ scope, plan }), grDeckTokensSchema, {
      maxTokens: 16000,
    });

    // Map generated fields + scope/plan facts onto the template's {{TOKENS}}.
    const replacements: Record<string, string> = {
      DYAD: scope.gradeBand,
      COMPETENCY: scope.competency,
      RUBRIC_INDICATOR: plan.rubricIndicator,
      LO: plan.lo,
      EO: plan.experienceObjective,
      ACTIVITY: t.activity,
      DONOW_TIME: t.donowTime, DONOW_PROMPT: t.donowPrompt, DONOW_STEM: t.donowStem, DONOW_NOTES: t.donowNotes,
      STAMP_TIME: t.stampTime, STAMP_IDEA: t.stampIdea, STAMP_STEM: t.stampStem, STAMP_NOTES: t.stampNotes,
      WS_TIME: t.wsTime, WS_SCENARIO: t.wsScenario, WS_STEM: t.wsStem, WS_NOTES: t.wsNotes,
      IND1: t.ind1, IND1_LOOK: t.ind1Look, IND2: t.ind2, IND2_LOOK: t.ind2Look, IND3: t.ind3, IND3_LOOK: t.ind3Look,
      IND4: t.ind4, IND4_LOOK: t.ind4Look, IND5: t.ind5, IND5_LOOK: t.ind5Look,
      HOH_TIME: t.hohTime, HOH_SCENARIO: t.hohScenario, HOH_STEM: t.hohStem, HOH_NOTES: t.hohNotes,
      IT_TIME: t.itTime, IT_TASK: t.itTask, IT_STEM: t.itStem, IT_NOTES: t.itNotes,
      REFLECT_Q1: t.reflectQ1, REFLECT_Q2: t.reflectQ2, REFLECT_Q3: t.reflectQ3, REFLECT_NOTES: t.reflectNotes,
      CLOSURE_KEY: t.closureKey, CLOSURE_NOTES: t.closureNotes,
      ATTRIBUTION: t.attribution,
    };

    const safeName = `F2_Deck_${plan.day.replace(/[^a-z0-9]+/gi, "_")}_GradualRelease`;
    const file = await fillPresentationFromTemplate(templateId, replacements, safeName);
    return NextResponse.json(file);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Template fill failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}