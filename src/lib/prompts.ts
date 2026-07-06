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
    `- For each day extract: lessonTitle, lo, experienceObjective, activity, rubricIndicator, assessment, connection, materialsCost, aiStage. If a field is absent, infer a concise value from context, or use an empty string. Never invent lesson content the document does not imply.`,
    ``,
    `DESIGN MODEL is the authoritative source for each day's instructional structure. Store it in lessonType, set to EXACTLY one of: "Gradual Release and Discussion", "Skills Lab", "Simulation and Synthesis", "CPC".`,
    `1. If the Scope & Sequence has a "Design Model" column (or an equivalent model / lesson-type column) with a value for the day, use that value, mapped to the closest of the four names. This is authoritative and must not be overridden.`,
    `2. ONLY if the Design Model column is missing or blank for the day, infer it from the day's objective, activity description, assessment, and CPC connection:`,
    `   a. Final performance, checkpoint, or competency demonstration -> "CPC".`,
    `   b. Introduces, models, defines, or discusses a concept -> "Gradual Release and Discussion".`,
    `   c. Teaches or practices a discrete skill, protocol, or tool -> "Skills Lab".`,
    `   d. Applies learning in a scenario, challenge, collaboration task, performance, or synthesis activity -> "Simulation and Synthesis".`,
    `   e. Still unclear -> "Gradual Release and Discussion".`,
    `Set lessonTypeInferred to false when the Design Model column supplied the value (step 1). Set it to true only when the value was inferred because the column was missing or blank (step 2).`,
    ``,
    `- Align each rubricIndicator to the indicator names in the PROVIDED RUBRIC below.`,
    `- Set cpcFrame and cpcProblemStatement from the PROVIDED CPC below (or the S&S if it states them); otherwise use an empty string.`,
    `- Set competency and gradeBand to the provided values. Set overview to a 1 to 2 sentence summary of the provided Scope & Sequence.`,
    `- Set experienceName to the title or name of the experience/unit if the document states one, otherwise an empty string. Do not invent one.`,
    ``,
    input.rubricText.trim() ? `PROVIDED RUBRIC:\n${input.rubricText}\n` : `No rubric was provided.\n`,
    input.cpcText.trim() ? `PROVIDED CPC:\n${input.cpcText}\n` : `No CPC was provided.\n`,
    `PROVIDED SCOPE & SEQUENCE:\n${input.ssText}`,
    ``,
    `Return the ScopeSequence JSON only.`,
  ].join("\n");
}

export function lessonWeekPrompt(input: { scope: ScopeSequence; week: number; genome?: string }): string {
  const wk = input.scope.weeks.find((w) => w.week === input.week);
  const wkJson = wk ? JSON.stringify(wk, null, 2) : "(week not found)";
  const rubric = input.scope.rubricText?.trim();
  const cpc = input.scope.cpcText?.trim() || input.scope.cpcProblemStatement;
  const facilitation = input.scope.facilitationText?.trim();
  const genome = input.genome?.trim(); // from the permanent Core Library, not a user source
  return [
    `You are an expert experiential curriculum architect, not a document writer. Design transformational daily learning experiences for WEEK ${input.week} in which students develop the target competency through repeated authentic practice.`,
    `COMPETENCY: ${input.scope.competency} | GRADE BAND (dyad): ${input.scope.gradeBand} | CPC FRAME: ${input.scope.cpcFrame}`,
    ``,
    `ROADMAP (Scope & Sequence = WHAT students learn, AUTHORITATIVE, never override): follow the week's competency, rubric indicator, daily objective, Design Model (lessonType), lesson sequence, pacing, and assessment progression exactly. You may enrich HOW a day is taught but must never change the intended progression.`,
    ``,
    `THIS WEEK FROM THE PROVIDED S&S:`,
    wkJson,
    ``,
    rubric ? `RUBRIC (defines what proficiency looks like / how success is measured):\n${rubric}\n` : ``,
    cpc ? `CPC (where students finish — the final demonstration each day builds toward):\n${cpc}\n` : ``,
    genome ? `FUTURE2 EXPERIENCE GENOME (Core Library — your PRIMARY instructional-design knowledge base, a SEARCHABLE LIBRARY of proven experiential patterns). It is a MULTI-WORKSHEET workbook: each worksheet is a specialized COLLECTION (instructional patterns, facilitation moves, quality requirements, grouping structures, reflection protocols, classroom routines, and other Future2 assets), marked below as "=== WORKSHEET (collection): <name> ===", and every entry carries its sheet name, row number, and column names. Treat it as a pattern library to retrieve from, never a document to summarize or copy:\n${genome}\n` : ``,
    genome ? `GENOME RETRIEVAL for each day: (1) from the LO, EO, Design Model, competency, rubric indicator, dyad, lesson duration, lesson phase, desired energy level, and required student product, search ACROSS ALL worksheets/collections (never just one); (2) rank entries by competency match, dyad match, Design Model compatibility, lesson-phase compatibility, duration, energy level, student-product similarity, competency behaviors practiced, and quality rating; (3) prefer an exact match, otherwise return the strongest COMBINATION of assets drawn from multiple worksheets, and only invent a wholly new facilitation when no combination fits. Extract the reusable instructional MECHANISM (for example "students make constrained decisions with incomplete information, revise after new information, and justify tradeoffs") and adapt its scenario, narrative, and materials to today's lesson. NEVER copy a Genome activity verbatim or reuse its name. Actively pull only the assets that strengthen today's lesson: student-task structure, facilitation moves, setup, grouping, materials, escalation rounds, challenge variations, reflection prompts, accommodations, extensions, and evidence-collection methods. Embed the Future2 non-negotiables (Read and Write Every Day, No Opt Out, Urgency, Intentional Groupings) and multiple competency at-bats WITHIN the experience using Genome patterns, never appended as separate activities. The finished lesson should read as though an experienced Future2 writer built it from the strongest Genome ideas while preserving today's Scope & Sequence.` : ``,
    facilitation ? `FACILITATION LIBRARY:\n${facilitation}\n` : ``,
    ``,
    `COMPETENCY PRACTICE ENGINE (the primary purpose of every lesson):`,
    `Competencies are built through repeated authentic application, never through explanation alone. Every lesson must intentionally create multiple competency "at-bats" — authentic opportunities for students to demonstrate the competency through decisions, communication, collaboration, leadership, reflection, problem solving, creation, performance, feedback, or iteration.`,
    `Density: aim for 2 to 3 meaningful at-bats minimum; 4+ woven throughout is excellent. If a day has fewer than 2 meaningful at-bats, redesign it before writing it.`,
    `Practice must occur throughout the lesson, not only in one workshop. Priority of student experience: students DO > students REFLECT > students DISCUSS > teacher EXPLAINS. Teacher talk supports competency practice, it never replaces it.`,
    `Before writing each day, confirm internally: (1) where students actively practice today's competency, (2) how many meaningful at-bats exist, (3) students are DOING more than listening, (4) the competency is practiced authentically not merely discussed, (5) how students get feedback on the competency, (6) how today's practice moves students toward the CPC.`,
    ``,
    `DESIGN MODEL PLAYBOOK (apply the block that matches each day's lessonType — it determines structure, pacing, and facilitation):`,
    `- Gradual Release and Discussion: explicit modeling, teacher think-alouds, discussion, guided practice, sentence stems, checks for understanding, productive struggle, reflection. REQUIRED: students actively apply the competency through discussion, collaboration, movement, role play, or decision making before the lesson ends.`,
    `- Skills Lab: multiple repetitions, coaching, immediate feedback, increasing independence, challenge levels, mastery checks. REQUIRED: students practice the competency repeatedly through increasingly independent attempts with coaching and feedback.`,
    `- Simulation and Synthesis: immersive scenarios, teamwork, authentic decision making, creation, movement, collaboration, reflection, meaningful products. REQUIRED: students solve an authentic challenge that requires the competency to succeed — the competency drives the experience, it does not merely accompany it.`,
    `- CPC: authentic performance, minimal scaffolds, observable evidence, rubric alignment, proficiency determination. REQUIRED: students independently demonstrate the competency through authentic performance aligned directly to the CPC.`,
    ``,
    `FACILITATION (reuse before you create): search the Facilitation Library FIRST, ranking by competency match, rubric indicator, Design Model, dyad, objective, developmental appropriateness, materials, timing, and competency-practice quality. Then: (1) reuse an excellent facilitation as written; (2) adapt a close one, prefixing its name with "Adapted:"; (3) write a new facilitation only when none is suitable, flagged as newly written. Never use a weak facilitation just because it exists. Every facilitation must give authentic competency practice, align to the objective, be developmentally appropriate, have realistic timing, clear facilitator moves, a clear student task, and produce observable evidence of the competency.${facilitation ? "" : " No Facilitation Library was provided, so write new competency-aligned moves and flag them as newly written."}`,
    ``,
    `OBJECTIVES BY BACKWARD DESIGN (do this for EACH day in this order; never write the objectives independently or generically):`,
    `1. Read the day's S&S entry (objective, rubric indicator, assessment, connection).`,
    `2. Read the Design Model (the day's lessonType).`,
    `3. Read the planned experiential Activity (the run-it-cold task students do).`,
    `4. Read the day's closing / reflection / checkpoint.`,
    `5. Determine the observable evidence students must produce by the end of the lesson.`,
    `6. Generate the Experience Objective FIRST: the authentic task or performance students complete that gives meaningful competency practice. Student-action focused, observable, tied directly to the day's experiential workshop, describes what students DO, produces observable evidence, and advances toward the CPC.`,
    `7. Generate the Learning Objective SECOND, derived from the Experience Objective: the understanding, knowledge, or skill students must develop today to succeed in the experience. Student-friendly, one sentence, begins with "Students", describes learning (not the activity), aligned to the rubric indicator, supports the competency progression for the dyad.`,
    `8. Validate before writing: Learning Objective ENABLES the Experience Objective, which PRODUCES the assessment / closing evidence, which PREPARES students for the CPC. If that chain does not hold, regenerate both objectives.`,
    `Objectives must be derived from today's activity, assessment, Design Model, rubric indicator, and competency progression. Never generic.`,
    ``,
    `Produce exactly one lesson plan per day in this week, each filled to the run-it-cold bar for its Design Model:`,
    `- experienceObjective then lo, produced by the backward-design procedure above (Experience Objective first, Learning Objective derived from it). connection is the FORWARD link naming the future competency growth this day feeds.`,
    `- whatMustBeTrue: give a SPECIFIC checkable mechanic for each of readWrite, noOptOut, urgency, groupings (no general statements).`,
    `- materials: exact student + teacher materials (low cost, reusable).`,
    `- phases: the ordered phases for this Design Model with minutes that sum to ~55, a slideMapping label per phase, run-it-cold steps, a named facilitation move, sentence stems, and teacher guidance (imperative, includes the engagement strategy). Weave competency at-bats across the phases.`,
    `- For a CPC or Live Performance day: include the CPC Launch sign-off (launch day) or the guide no-fly list + individual-evidence capture + binary live test (performance days), tied to the provided CPC.`,
    `- performanceCapture: for a CPC or Live Performance day, fill cpcLaunch (the launch and sign-off), challengeConstraint (the challenge and its one hard constraint), noFlyList (the guide no-fly list), individualEvidence (how each individual student's evidence is captured and scored), and binaryTest (the pass/fail condition observed live). For any non-CPC, non-performance day, set ALL five fields to an empty string.`,
    `- assessment matches the S&S row.`,
    ``,
    `FINAL CHECK before returning each lesson: it follows the S&S; the Design Model is correctly applied; every major activity advances the competency; students actively practice it multiple times (>= 2 at-bats) with observable evidence; the day moves toward the CPC; existing facilitation was reused where appropriate; the Genome shows in HOW it is taught. If any check fails, redesign the day.`,
    `Style: no em dashes, no semicolons in student-facing text. Return the LessonWeek JSON only.`,
  ].join("\n");
}

/**
 * Generate the field values for the tokenized Gradual Release & Discussion deck
 * template. Each field maps 1:1 to a {{TOKEN}} in the template. The *Notes
 * fields carry teacher facilitation (imperative guidance + engagement strategy +
 * possible student responses) and land in the slide's speaker notes.
 */
export function grDeckTokensPrompt(input: {
  scope: ScopeSequence;
  plan: LessonWeek["plans"][number];
}): string {
  const rubric = input.scope.rubricText?.trim();
  return [
    `Produce the field values for a Gradual Release and Discussion student-facing deck, following the HISD authoring pattern. Ground everything in the approved lesson plan and the provided rubric. Return JSON only.`,
    `DYAD: ${input.scope.gradeBand} | COMPETENCY: ${input.scope.competency} | TARGET INDICATOR: ${input.plan.rubricIndicator}`,
    ``,
    `APPROVED LESSON PLAN:`,
    JSON.stringify(input.plan, null, 2),
    ``,
    rubric ? `AUTHORITATIVE RUBRIC (use its exact 5 indicator names and first-person "I..." look-fors):\n${rubric}\n` : ``,
    `Field rules:`,
    `- activity: one sentence naming the experience students do to demonstrate the competency.`,
    `- Do Now (donow*): an opening scenario/question that activates prior knowledge; donowStem is a sentence stem ending in an ellipsis.`,
    `- Stamp (stamp*): the key idea to stamp for the day; stampStem is n/a or a quick check stem.`,
    `- Worked Scenario (ws*): a positive example scenario plus the question "what actions helped this group reach their goal"; wsStem ends in an ellipsis.`,
    `- Rubric (ind1..ind5 and ind1Look..ind5Look): the five rubric indicator names in order, each with a first-person "I ..." statement of what it looks like. Emphasize the target indicator.`,
    `- Help or Hurt (hoh*): a scenario asking whether a behavior helped or hurt the team goal and why; hohStem ends in an ellipsis.`,
    `- Independent Task (it*): the run-it-cold independent task (for example sort scenarios, build a team definition, gallery walk); itStem ends in an ellipsis.`,
    `- Reflection (reflectQ1..3): three individual written reflection questions.`,
    `- Closure (closureKey): the one big idea to restate.`,
    `- attribution: a citation line for any images used, for example "Created using Canva".`,
    `- Every *Time field is minutes for that slide (for example "4 min"); *Notes fields carry teacher guidance as an imperative move ending with the engagement strategy in parentheses, plus 2 to 4 possible student responses.`,
    `Style: no em dashes, no semicolons in student-facing text. Plain, concrete, age-appropriate for the dyad.`,
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
    `Student-facing slides must be concise, visual, motivating, and action-oriented — a prompt or task students act on, not a wall of text. All teacher-facing facilitation belongs in teacherGuidance (speaker notes), never on the slide face. Foreground the competency at-bats: what students DO on each slide.`,
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