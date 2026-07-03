import { rubricFor, cpcExemplarFor, GradeBand } from "./knowledge";
import type { ScopeSequence, LessonWeek } from "./schemas";

function rubricBlock(competency: string, gradeBand: string): string {
  const rows = rubricFor(competency, gradeBand as GradeBand);
  if (!rows) {
    return `No pre-built HISD rubric exists for ${competency} at ${gradeBand}. Author a 5-indicator rubric grounded in the HISD Competency Framework: name each indicator + its systems dimension, and write Proficient (Level 3) and Advanced (Level 4) descriptors that are observable and require concrete decision-quality (not "more of the same but nicer").`;
  }
  const lines = rows
    .map(
      (r, i) =>
        `${i + 1}. ${r.dimension} — "${r.indicator}" | Proficient(3): ${r.proficient} | Advanced(4): ${r.advanced}`
    )
    .join("\n");
  return `THE 5 RUBRIC INDICATORS (use these as the through-line, in this order):\n${lines}`;
}

function cpcBlock(competency: string, cpcMode: string): string {
  const exemplar = cpcExemplarFor(competency);
  if (cpcMode === "bespoke" || !exemplar) {
    return `CPC FRAME: design a fresh, real-stakes CPC for this competency. It must be binary and individually verifiable, carry one hard external constraint, unlock harder work for early finishers, and end in public proof (not a presentation). Do NOT use a soft committee/planning format.`;
  }
  return `CPC FRAME (anchor on this proven exemplar and adapt it to the grade band):\n${exemplar}`;
}

export function scopeSequencePrompt(input: {
  competency: string;
  gradeBand: string;
  cpcMode: string;
}): string {
  return [
    `Build the Step 1 Scope & Sequence for a 6-week Future 2 Experience.`,
    `COMPETENCY: ${input.competency}`,
    `GRADE BAND (dyad): ${input.gradeBand}`,
    ``,
    rubricBlock(input.competency, input.gradeBand),
    ``,
    cpcBlock(input.competency, input.cpcMode),
    ``,
    `REQUIREMENTS:`,
    `- Backwards design from the Week-6 CPC. Produce exactly 6 weeks; weeks 1-5 have 5 days each, week 6 has 5 days (Day 1 = CPC Launch Day, Days 2-5 = CPC Day 1-4).`,
    `- One rubric indicator per week (weeks 1-5), developed via the weekly rhythm (Gradual Release & Discussion -> Invisible Sim -> Practice Sim -> Performance Sim -> Checkpoint Skills Lab). Week 1 also previews the CPC and introduces the whole rubric.`,
    `- Each day: choose the lessonType from {Gradual Release & Discussion, Simulation & Synthesis, Skills Lab, CPC — Live Performance}. For Simulation & Synthesis days, name the sim tier in the lessonTitle (Invisible / Practice / Performance).`,
    `- lo = the competency skill (observable, repeatable), NOT the activity. experienceObjective = competency evidence + a tangible deliverable + a completion target. activity = a real, specific, run-it-cold task with materials and a binary win condition.`,
    `- assessment: "None" on teaching days, "Checkpoint N: <indicator>" on each Day 5 (weeks 1-5), "CPC Launch" on Week 6 Day 1, "CPC Day N" on Week 6 Days 2-5.`,
    `- connection MUST point forward: name the exact later day this lesson feeds and where the skill scales.`,
    `- aiStage: stage the AI arc across the arc (None / Witness / Thought Partner / Auditor), age-appropriate for the dyad, reaching Auditor by the CPC.`,
    `- materialsCost: low-to-no cost, reusable classroom materials with a rough dollar range.`,
    `- Set cpcProblemStatement to the student-facing CPC problem statement, and overview to a 3-4 sentence summary of the backwards-design logic.`,
    `Return the ScopeSequence JSON only.`,
  ].join("\n");
}

export function lessonWeekPrompt(input: {
  scope: ScopeSequence;
  week: number;
}): string {
  const wk = input.scope.weeks.find((w) => w.week === input.week);
  const wkJson = wk ? JSON.stringify(wk, null, 2) : "(week not found)";
  return [
    `Produce the Step 2 daily lesson plans for WEEK ${input.week} of this approved Scope & Sequence.`,
    `COMPETENCY: ${input.scope.competency} | GRADE BAND: ${input.scope.gradeBand} | CPC FRAME: ${input.scope.cpcFrame}`,
    `CPC PROBLEM STATEMENT: ${input.scope.cpcProblemStatement}`,
    ``,
    `THIS WEEK FROM THE APPROVED S&S (do not change the day roles, lesson types, or assessments):`,
    wkJson,
    ``,
    `Produce exactly 5 lesson plans (one per day), each filled to the run-it-cold bar on the template for its lessonType:`,
    `- lo, experienceObjective, connection (forward link) consistent with the S&S row.`,
    `- whatMustBeTrue: give a SPECIFIC checkable mechanic for each of readWrite, noOptOut, urgency, groupings (no general statements).`,
    `- materials: exact student + teacher materials (low cost, reusable).`,
    `- phases: the ordered phases for this lesson type with minutes that sum to ~55, a slideMapping label per phase, run-it-cold steps, a named facilitation move, sentence stems, and teacher guidance (imperative, includes the engagement strategy).`,
    `- For a CPC — Live Performance day: include the CPC Launch sign-off (Day 1) or the guide no-fly list + individual-evidence capture + binary live test (performance days).`,
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
    `- For a CPC — Live Performance deck, follow the CPC deck skeleton (Launch + sign off, The Challenge with the hard constraint, performance-day slides with the no-fly list, Individual Evidence, Put It to the Test, Reflection & Closure).`,
    `Number slides sequentially in n. No em dashes or semicolons in student-facing text. Return the SlideDeck JSON only.`,
  ].join("\n");
}