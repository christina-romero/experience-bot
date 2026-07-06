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
    `ALPHA EXPERIENCE STANDARD (this is the quality bar the outputs are judged against; it fully governs HOW each day is taught — the method, the sequence within the lesson, the facilitation, and the voice. It NEVER overrides the S&S ROADMAP for WHAT is taught. Match the feel of an Alpha-built workshop, not a scripted worksheet):`,
    `1. EXPERIENCE BEFORE INSTRUCTION (name it after). Open every day with a concrete, hands-on challenge students attempt with minimal or NO instruction and NO pre-taught vocabulary. Reveal the concept, strategy, or word ONLY after students have produced visible evidence through the attempt (the move is: "Only after evidence is visible, say: 'that strong shape you found has a name — it is called a triangle'"). Never front-load a lecture, definition, or worked example before students have struggled. Even in a modeling or direct-teach phase, teach by briefly naming, in one or two sentences, what students just did.`,
    `2. THE GUIDE IS A SILENT FACILITATOR, not a lecturer. Default facilitator moves to: set the challenge, start a visible timer, observe, and hand ownership back to students ("Make a team decision", "What does your evidence say?"). Do NOT answer "what should we do?". Cap teacher talk hard. Ration vocabulary — introduce a term only to name something students already discovered.`,
    `3. RADICAL STUDENT AUTONOMY. Every day, students make a real choice they own (their strategy, level, role, topic, or approach), self-coach from evidence/peers/feedback, self-assess, and change their approach after failure WITHOUT being told. Build in a way for students to level up by choice.`,
    `4. HANDS-ON AND PHYSICAL. Every day is anchored by a timed build, manipulation, station rotation, physical-movement task (e.g. "stand on the side of the room for the option you choose"), or real production — never a worksheet- or discussion-centered day. Worksheets appear only as a brief scaffold or the single assessed artifact, never as the main event. Use cheap, real, reusable materials.`,
    `5. STUDENT-COMPLETED SENTENCE FRAMES are the autonomy + evidence device. Give students fill-in-the-blank frames they complete themselves to force reasoning and self-diagnosis (e.g. "We chose ___ because ___", "Our team failed because ___, which traces back to ___"). Put these in sentenceStems.`,
    `6. REAL STAKES, REAL AUDIENCE. Frame the week's work toward a cheat-proof, publicly-defended, externally-judged demonstration (the CPC): a live audience, a public defense, a status earned through contribution — never points-for-compliance, never participation. Make the bar honest and hard and the success un-fakeable.`,
    `7. VOICE: direct, concrete, no fluff. Write facilitation as exact say-aloud lines in quotes and terse imperatives ("Start the timer. Say nothing else."). Write student-facing prompts as punchy provocations. Be concise — no filler, no throat-clearing.`,
    ``,
    `THIS WEEK FROM THE PROVIDED S&S:`,
    wkJson,
    ``,
    rubric ? `RUBRIC (defines what proficiency looks like / how success is measured):\n${rubric}\n` : ``,
    cpc ? `CPC (where students finish — the final demonstration each day builds toward):\n${cpc}\n` : ``,
    genome ? `RETRIEVED FUTURE2 EXPERIENCE GENOME (already filtered to this week's competency, dyad, and Design Models — the strongest matching seeds plus the supporting instructional collections they need). This is your PRIMARY instructional-design knowledge base; treat it as patterns to retrieve and recombine, never as a document to summarize or copy:\n${genome}\n` : ``,
    genome ? `COMPETENCY BEHAVIOR FIRST: for each day, determine the single primary competency behavior students must DEMONSTRATE today (an observable action, for example "resolves disagreement", "weighs tradeoffs", "coordinates timing"), then build the day around a pattern that makes students actively DO that behavior, never merely discuss it. The behavior being practiced matters more than the competency title. The retrieved seeds are already ranked with this behavior signal.` : ``,
    genome ? `USE THE RETRIEVED GENOME for each day: match the day's LO, EO, Design Model, rubric indicator, and required student product to the seed(s) above whose mechanism fits best. Extract the reusable instructional MECHANISM (for example "students make constrained decisions with incomplete information, revise after new information, and justify tradeoffs") and adapt its scenario, narrative, and materials to today's lesson. NEVER copy a seed verbatim or reuse its name. The retrieved seeds are already a small COMPLEMENTARY set (one strong pattern per phase of the arc), so use them as parts of ONE intentionally designed lesson, not as separate workshops stitched together. Do not use two patterns that solve the same instructional problem; when patterns overlap, keep the stronger one. Combine seeds only when they play different roles (for example one supplies the launch, another the core challenge, another the reflection), and only invent new when none fits. Pull the concrete assets the seeds provide: student-task structure, rules, escalation rounds, guide coaching moves, common failure modes, debrief questions, support scaffolds, extensions, and assessment evidence, plus the competency behaviors, productive struggles, and reflection questions in the supporting collections. Embed the Future2 non-negotiables (Read and Write Every Day, No Opt Out, Urgency, Intentional Groupings) and multiple competency at-bats WITHIN the experience, never appended as separate activities. The finished lesson should read as though an experienced Future2 writer built it from the strongest Genome ideas while preserving today's Scope & Sequence.` : ``,
    facilitation ? `FACILITATION LIBRARY:\n${facilitation}\n` : ``,
    ``,
    `COMPETENCY PRACTICE ENGINE (the primary purpose of every lesson):`,
    `Competencies are built through repeated authentic application, never through explanation alone. Every lesson must intentionally create multiple competency "at-bats" — authentic opportunities for students to demonstrate the competency through decisions, communication, collaboration, leadership, reflection, problem solving, creation, performance, feedback, or iteration.`,
    `Density: aim for 2 to 3 meaningful at-bats minimum; 4+ woven throughout is excellent. If a day has fewer than 2 meaningful at-bats, redesign it before writing it.`,
    `Practice must occur throughout the lesson, not only in one workshop. Priority of student experience: students DO > students REFLECT > students DISCUSS > teacher EXPLAINS. Teacher talk supports competency practice, it never replaces it.`,
    `Before writing each day, confirm internally: (1) where students actively practice today's competency, (2) how many meaningful at-bats exist, (3) students are DOING more than listening, (4) the competency is practiced authentically not merely discussed, (5) how students get feedback on the competency, (6) how today's practice moves students toward the CPC.`,
    ``,
    `DESIGN MODEL PLAYBOOK (apply the block that matches each day's lessonType for STRUCTURE and pacing — but always inside the ALPHA EXPERIENCE STANDARD above: students struggle first, the concept is named after, the guide mostly observes):`,
    `- Gradual Release and Discussion: NOT lecture-first. Students first attempt a hands-on challenge and generate raw attempts; the guide then names the concept or strategy in one or two sentences using exactly what students just produced; students immediately apply it with growing independence, discuss FROM their own evidence, and reflect. Any modeling is brief and comes AFTER the first attempt, never before it.`,
    `- Skills Lab: repeated hands-on reps with coaching and immediate feedback, increasing independence, student-chosen challenge levels, and mastery checks students can see. Students self-diagnose between reps and adjust their own approach without being told.`,
    `- Simulation and Synthesis: an immersive, physical, authentic challenge that CANNOT be solved without the competency; teams make real decisions with incomplete information, revise after new information arrives, and defend their tradeoffs. The guide observes and does not intervene.`,
    `- CPC: authentic public performance, minimal scaffolds, observable INDIVIDUAL evidence, rubric alignment, and an un-fakeable pass/fail determination judged against the CPC.`,
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
    `- phases: the ordered phases for this Design Model, minutes summing to ~55, each with a slideMapping label, run-it-cold steps, a named facilitation move, sentence stems, and teacher guidance. Sequence the phases EXPERIENCE-FIRST: a hands-on challenge or attempt with minimal instruction, THEN a brief reveal that names the concept from what students produced, THEN autonomous practice/application, THEN a closing framing statement. runItColdSteps describe what STUDENTS DO (a physical, active task), not what the teacher says. teacherGuidance defaults to observe / time / redirect ownership ("Make a team decision") and deliberately caps teacher talk. sentenceStems are student-completed frames that force reasoning and self-diagnosis. Weave competency at-bats across every phase.`,
    `- For a CPC or Live Performance day: include the CPC Launch sign-off (launch day) or the guide no-fly list + individual-evidence capture + binary live test (performance days), tied to the provided CPC.`,
    `- performanceCapture: for a CPC or Live Performance day, fill cpcLaunch (the launch and sign-off), challengeConstraint (the challenge and its one hard constraint), noFlyList (the guide no-fly list), individualEvidence (how each individual student's evidence is captured and scored), and binaryTest (the pass/fail condition observed live). For any non-CPC, non-performance day, set ALL five fields to an empty string.`,
    `- assessment matches the S&S row.`,
    ``,
    `FINAL CHECK before returning each lesson: it follows the S&S; it MEETS THE ALPHA EXPERIENCE STANDARD (students struggle before any concept is named; the guide mostly observes and redirects rather than explains; students make a real autonomous choice they own; the day is hands-on/physical, not worksheet- or discussion-bound; student-completed sentence frames are present; the work builds toward a cheat-proof, publicly-defended demonstration; the voice is direct and concrete with say-aloud lines); the Design Model is correctly applied; every major activity advances the competency with >= 2 authentic at-bats and observable evidence; the day moves toward the CPC; the Genome shows in HOW it is taught. If any check fails, redesign the day.`,
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
    `ALPHA STYLE (match the Alpha student-facing standard): lead with the CHALLENGE or provocation students act on — never a definition or concept dump. The concept is named only AFTER students have attempted it, and that naming lives in teacherGuidance (speaker notes), not on the slide face. Each slide poses a hands-on task, a real choice, or a "which one, and why?" prompt. sentenceStems are student-completed frames that force reasoning (e.g. "We chose ___ because ___"). Frame the deck toward a real, publicly-judged demonstration with genuine stakes. Voice: direct, punchy, concrete, no filler.`,
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