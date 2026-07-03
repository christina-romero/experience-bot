import type { ScopeSequence, LessonWeek } from "./schemas";

/**
 * Step 1 is now an INPUT step: the user provides competency + dyad and uploads
 * an existing Scope & Sequence, rubric, and CPC. This prompt parses the provided
 * Scope & Sequence into the structured schema faithfully (no redesign), using the
 * rubric and CPC as context to align indicators and fill the CPC fields.
 */
export function parseScopeSequencePrompt(input: {
  competency: string;
  gradeBand: string;
  ssText: string;
  rubricText: string;
  cpcText: string;
}): string {
  return [
    `Parse the user's EXISTING Scope & Sequence into the structured JSON schema. Represent it faithfully. Do NOT redesign, improve, or add content the document does not contain.`,
    `COMPETENCY: ${input.competency}`,
    `GRADE BAND (dyad): ${input.gradeBand}`,
    ``,
    `Rules:`,
    `- Use the document's ACTUAL structure: exactly the weeks and days it contains, in its order. Do not force a 6-week or 5-day shape.`,
    `- For each day extract: lessonTitle, lessonType, lo, experienceObjective, activity, rubricIndicator, assessment, connection, materialsCost, aiStage. If a field is absent, infer a concise value from context, or use an empty string. Never invent lesson content the document does not imply.`,
    `- Align each rubricIndicator to the indicator names in the PROVIDED RUBRIC below.`,
    `- Set cpcFrame and cpcProblemStatement from the PROVIDED CPC below (or the S&S if it states them); otherwise use an empty string.`,
    `- Set competency and gradeBand to the provided values. Set overview to a 1 to 2 sentence summary of the provided Scope & Sequence.`,
    ``,
    input.rubricText.trim() ? `PROVIDED RUBRIC:\n${input.rubricText}\n` : `No rubric was provided.\n`,
    input.cpcText.trim() ? `PROVIDED CPC:\n${input.cpcText}\n` : `No CPC was provided.\n`,
    `PROVIDED SCOPE & SEQUENCE:\n${input.ssText}`,
    ``,
    `Return the ScopeSequence JSON only.`,
  ].join("\n");
}

export function lessonWeekPrompt(input: { scope: ScopeSequence; week: number }): string {
  const wk = input.scope.weeks.find((w) => w.week === input.week);
  const wkJson = wk ? JSON.stringify(wk, null, 2) : "(week not found)";
  const rubric = input.scope.rubricText?.trim();
  const cpc = input.scope.cpcText?.trim() || input.scope.cpcProblemStatement;
  return [
    `Produce the Step 2 daily lesson plans for WEEK ${input.week} of a user-provided Scope & Sequence.`,
    `COMPETENCY: ${input.scope.competency} | GRADE BAND: ${input.scope.gradeBand} | CPC FRAME: ${input.scope.cpcFrame}`,
    ``,
    `The Scope & Sequence, rubric, and CPC below were provided by the user and are AUTHORITATIVE. Follow the week's day roles, lesson types, and assessments exactly. Do not redesign the arc; write the plans the S&S calls for.`,
    ``,
    `THIS WEEK FROM THE PROVIDED S&S:`,
    wkJson,
    ``,
    rubric ? `AUTHORITATIVE RUBRIC (use these exact indicators and descriptors):\n${rubric}\n` : ``,
    cpc ? `AUTHORITATIVE CPC (what the arc builds toward):\n${cpc}\n` : ``,
    `Produce exactly one lesson plan per day in this week, each filled to the run-it-cold bar on the template for its lessonType:`,
    `- lo, experienceObjective, connection (forward link) consistent with the S&S row and the rubric indicator it targets.`,
    `- whatMustBeTrue: give a SPECIFIC checkable mechanic for each of readWrite, noOptOut, urgency, groupings (no general statements).`,
    `- materials: exact student + teacher materials (low cost, reusable).`,
    `- phases: the ordered phases for this lesson type with minutes that sum to ~55, a slideMapping label per phase, run-it-cold steps, a named facilitation move, sentence stems, and teacher guidance (imperative, includes the engagement strategy).`,
    `- For a CPC or Live Performance day: include the CPC Launch sign-off (launch day) or the guide no-fly list + individual-evidence capture + binary live test (performance days), tied to the provided CPC.`,
    `- assessment matches the S&S row.`,
    `Style: no em dashes, no semicolons in student-facing text. Return the LessonWeek JSON only.`,
  ].join("\n");
}

export function slideDeckPrompt(input: {
  scope: ScopeSequence;
  plan: LessonWeek["plans"][number];
}): string {
  return [
    `Produce the Step 3 student-facing slide deck for ONE lesson, using the deck template for its lessonType and the HISD authoring pattern.`,
    `COMPETENCY: ${input.scope.competency} | GRADE BAND: ${input.scope.gradeBand}`,
    ``,
    `THE APPROVED LESSON PLAN (build the deck to match it exactly):`,
    JSON.stringify(input.plan, null, 2),
    ``,
    `Build the slide array:`,
    `- Slide 1 = title (kind "title") with the dyad, competency, rubric indicator, lesson type, LO, Experience Objective, and Activity in onSlide.`,
    `- Slide 2 = materials (kind "materials") listing student and teacher materials.`,
    `- Start each phase with a divider slide (kind "divider") whose heading reads "Slides XX to XX" and whose onSlide reads "For this section, plan for approximately: N minutes".`,
    `- Every content slide (kind "content") carries: heading, onSlide (the student-facing prompt/scenario/task), time, sentenceStems (each ending in an ellipsis and matched by the possibleResponses), teacherGuidance (imperative, ends with the engagement strategy in parentheses), and 4-8 possibleResponses. Set phase to the color-coded phase name.`,
    `- Include a reflection slide (kind "reflection") and a closure slide (kind "closure") near the end.`,
    `- Final slide = attribution (kind "attribution") crediting any images/videos (e.g. created using Canva).`,
    `- For a CPC or Live Performance deck, follow the CPC deck skeleton (Launch + sign off, The Challenge with the hard constraint, performance-day slides with the no-fly list, Individual Evidence, Put It to the Test, Reflection & Closure).`,
    `Number slides sequentially in n. No em dashes or semicolons in student-facing text. Return the SlideDeck JSON only.`,
  ].join("\n");
}