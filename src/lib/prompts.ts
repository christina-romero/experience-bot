import type { ScopeSequence, LessonWeek, CanonicalWeek } from "./schemas";

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
    `- For each day extract the ANCHOR columns faithfully: lessonTitle, lessonType (from Lesson Design Type), lo (from the LO column, verbatim), rubricIndicator, and connection. These are authoritative.`,
    `- The EO (Experience Objective), Activity, and Materials columns are intentionally blank in this S&S. Set experienceObjective, activity, and materialsCost to an EMPTY STRING when blank — do NOT infer or invent them. They are produced later from the Experience Genome facilitations, not from the S&S.`,
    `- assessment: infer from the Lesson Title / Design Type (e.g. a "Checkpoint N" title = "Checkpoint N: <indicator>"; a "CPC Day N" title = "CPC Day N"; otherwise "None"). aiStage: infer only if the day clearly involves AI, else "None". Never invent other lesson content the document does not imply.`,
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

export function lessonWeekPrompt(input: {
  scope: ScopeSequence;
  week: number;
  genome?: string;
  canonical?: CanonicalWeek;
}): string {
  const wk = input.scope.weeks.find((w) => w.week === input.week);
  const wkJson = wk ? JSON.stringify(wk, null, 2) : "(week not found)";
  const rubric = input.scope.rubricText?.trim();
  const cpc = input.scope.cpcText?.trim() || input.scope.cpcProblemStatement;
  const facilitation = input.scope.facilitationText?.trim();
  const genome = input.genome?.trim(); // from the permanent Core Library, not a user source
  const canonicalBlock = input.canonical
    ? [
        `PROVIDED CANONICAL SPINE (Stage A — already written and AUTHORITATIVE; this is a RENDER job, not a redesign). For each day, carry its mechanismWhy, unlock, binaryCheck2Pass, gradeBandEscalation, and guideMoves into the HISD fields (objectives, phases, whatMustBeTrue, assessment, performanceCapture, teacherGuidance). Change only format and evidence language. NEVER soften, drop, generalize, or replace these five. If a canonical day and the S&S disagree on WHAT is taught, the S&S wins on content while you preserve the canonical mechanism:`,
        JSON.stringify(input.canonical, null, 2),
        ``,
      ].join("\n")
    : "";
  return [
    `You are an expert experiential curriculum architect, not a document writer. Design transformational daily learning experiences for WEEK ${input.week} in which students develop the target competency through repeated authentic practice.`,
    `COMPETENCY: ${input.scope.competency} | GRADE BAND (dyad): ${input.scope.gradeBand} | CPC FRAME: ${input.scope.cpcFrame}`,
    ``,
    `ROADMAP (Scope & Sequence = WHAT students learn, AUTHORITATIVE, never override): follow the week's competency, rubric indicator, daily objective, Design Model (lessonType), lesson sequence, pacing, and assessment progression exactly. You may enrich HOW a day is taught but must never change the intended progression.`,
    ``,
    `ANCHORING CONTRACT (how to use the S&S vs the Genome — this is critical). ANCHOR each day ONLY on these S&S columns, which are authoritative: Day, Lesson Title, Lesson Design Type (lessonType), LO (Lesson Objective), and Rubric Indicator. The S&S EO (Experience Objective), Activity, and Materials are INTENTIONALLY BLANK — do NOT expect them and do NOT invent generic ones. You PRODUCE the Experience Objective, the Activity, and the lesson content by adapting the RETRIEVED EXPERIENCE GENOME FACILITATIONS that match this day (by competency, dyad, Rubric Indicator, Lesson Design Type, and LO). The Genome facilitation IS the concrete experience: take its mechanism, scenario, rules, rounds, and materials and adapt them to this day's LO and Rubric Indicator. Then DERIVE the Experience Objective from that experience (the observable accomplishment students complete during it). Never copy a seed's name; never fall back to a thin write-or-discuss task when a Genome facilitation fits.`,
    ``,
    `TWO KINGS — CANONICAL FIRST, DERIVATIVE SECOND (mandatory). Two sovereigns govern this work: the ACCESS MODEL owns HOW learning happens (the mechanism, earned autonomy, guide behavior, binary mastery, friction); HISD/Future2 owns WHAT must be evidenced (the S&S, rubric indicator, competency, TEKS/STAAR, and the district lesson-plan format you are filling). Do NOT blend them into a compliance-first hybrid. For EACH day, design the CANONICAL Access spine FIRST, then render it into this HISD lesson-plan format as a derivative that changes format and evidence language but NEVER changes the mechanism.`,
    `Design the canonical spine for each day before you format it: (a) MECHANISM-BASED WHY — name the student capability being built and the mechanism that builds it, never "evidence for a rubric"; (b) UNLOCK — what students EARN by demonstrating readiness (autonomy or a harder challenge unlocked by proof, never by permission or pacing); (c) BINARY CHECK2PASS — a pass/fail success condition against an external quality bar (it works or it does not), tied to the day's assessment and building toward the CPC; (d) GRADE-BAND ESCALATION — how this task is harder for the ${input.scope.gradeBand} dyad than the band below (more complexity, responsibility, interdependence, or independence); (e) GUIDE MOVES — facilitate, coach, question, observe, hold the line; never lecture-deliver, never rescue.`,
    `Then render into the template fields (objectives, phases, whatMustBeTrue, assessment, performanceCapture) as the HISD-facing view. HISD language (competency, rubric indicator, TEKS) is an evidence overlay, never a replacement for the mechanism. NEVER soften an earned unlock into blanket permission, NEVER replace binary mastery with open-ended "completion" language, NEVER replace the mechanism-Why with rubric-evidence language, and NEVER collapse the grade-band escalation. If the district format and the mechanism ever conflict, protect the mechanism.`,
    ``,
    canonicalBlock,
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
    `DESIGN EACH DAY FROM THE GENOME (do this in order; the LO is GIVEN, the experience and EO are PRODUCED):`,
    `1. Read the day's S&S anchors: Lesson Title, Lesson Design Type (lessonType), LO (Lesson Objective), Rubric Indicator, Connection. The LO is AUTHORITATIVE — keep it as the day's Learning Objective. Do NOT rewrite or regenerate the LO. The S&S Activity/EO/Materials are blank by design.`,
    `2. Retrieve the Experience Genome facilitation(s) that best match this day by competency, dyad, Rubric Indicator, Lesson Design Type, and LO. This facilitation is the concrete experience for the day.`,
    `3. Adapt that facilitation into this day's ACTIVITY: take its mechanism, scenario, rules, rounds, roles, and materials and shape them to serve THIS LO and Rubric Indicator (and, for the ${input.scope.gradeBand} dyad, at the right level). Keep it in-action and real-vehicle per the LESSON GENERATION CONTEXT. Never copy the seed name.`,
    `4. Generate the Experience Objective FROM that activity: the observable accomplishment students complete during the experience (a tangible deliverable or demonstrated performance), describing what students DO, producing observable evidence for the Rubric Indicator, and advancing toward the CPC. The EO serves the given LO.`,
    `5. Validate before writing: the given LO is genuinely served by the ACTIVITY you built and the EO you wrote, which PRODUCES the assessment / closing evidence, which PREPARES students for the CPC. If that chain does not hold, redesign the activity (never rewrite the LO).`,
    `The Activity and EO must come from the retrieved Genome facilitation adapted to the given LO and Rubric Indicator. Never generic, never a thin write-or-discuss task.`,
    ``,
    `Produce exactly one lesson plan per day in this week, each filled to the run-it-cold bar for its Design Model:`,
    `- lo: the GIVEN S&S Learning Objective, kept VERBATIM. Do not rewrite it.`,
    `- experienceObjective: write it to the EXPERIENCE OBJECTIVE STANDARD formula — "Students [complete/do/create/practice] [specific task] while [using the named skill] and [producing the concrete observable evidence]" — and state the number of rounds/stations/products/reps. It must be clear to a middle-school teacher on first read; no abstract matching language. connection is the FORWARD link naming the future day this feeds.`,
    `- whatMustBeTrue: give a SPECIFIC checkable mechanic for each of readWrite, noOptOut, urgency, groupings (no general statements).`,
    `- materials: specific enough to produce. When the day uses challenge cards, station cards, scenario prompts, or role cards, WRITE THE ACTUAL CARD TEXT (for example "Challenge Card 1: Your tower falls with 45 seconds left. Use Reset Breath before rebuilding."), never just "challenge cards". Low cost, reusable.`,
    `- phases: the ordered phases for this Design Model, minutes summing to ~55, sequenced EXPERIENCE-FIRST (hands-on attempt with minimal instruction -> brief reveal naming the concept from what students produced -> autonomous application -> closing framing). Move students Notice -> Name -> Try -> Compare -> Choose -> Reflect. Each phase must be RUN-IT-COLD and SLIDE-READY:`,
    `   - steps (run-it-cold): the exact task, the number of rounds/stations/steps, time for each part, the grouping, the materials, and exactly what students write/say/build/sort/decide/perform and what they produce by the end. Concrete, never "students rotate through stations". When students use strategies, NAME each strategy and DEFINE it inline (e.g. "Reset Breath: inhale through the nose for 4 counts, exhale for 6, then restart").`,
    `   - slideMapping (SLIDE-READY, not a code): slide title; the student-facing directions; the exact on-screen text; a visual or image suggestion; timer needs; any animation or reveal; and what stays visible while students work. Never "S1 Stations Live".`,
    `   - facilitation and teacherGuidance: EXACT teacher words written as say-aloud lines ("Guide says: '...'"). Include the launch script, transition script, partner directions, work-time cues, debrief questions, redirection language, what to say if students are confused, and what to say if students finish early. Default the guide to observe / time / redirect ("Make a team decision") and cap teacher talk.`,
    `   - sentenceStems: student-completed frames that force reasoning and self-diagnosis. Weave competency at-bats across every phase.`,
    `- OPENER RED FLAG (reject and rewrite): the Do Now / opening block must be an IN-ACTION move tied to the day's real vehicle — students immediately DO something physical (build, sort a real object, run a quick round, make and post a real decision). A Do Now that is "write one quick idea on your tracker", "pick an option and write why", or any solo write/discuss prompt is REJECTED. Do not open by naming or defining the skill. Every block, not only the core, favors students DOING over writing or talking.`,
    `- For a CPC or Live Performance day: include the CPC Launch sign-off (launch day) or the guide no-fly list + individual-evidence capture + binary live test (performance days), tied to the provided CPC.`,
    `- performanceCapture: for a CPC or Live Performance day, fill cpcLaunch (the launch and sign-off), challengeConstraint (the challenge and its one hard constraint), noFlyList (the guide no-fly list), individualEvidence (how each individual student's evidence is captured and scored), and binaryTest (the pass/fail condition observed live). For any non-CPC, non-performance day, set ALL five fields to an empty string.`,
    `- assessment: OBSERVABLE evidence, not "students understand X". Name the concrete artifact (completed tool card, station tracker, partner observation, exit reflection, group product, or teacher checklist) and what the student names, applies, and records. Match the S&S assessment row (Checkpoint / CPC).`,
    ``,
    `RUNNABILITY BAR (Experience Bot standard): a teacher must be able to run each day COLD and a curriculum writer must be able to build the slides from it with ZERO clarification questions. Do NOT use these phrases unless the very next words give the concrete detail: "real-world", "high-pressure", "observable change", "students explore", "students reflect", "students discuss", "students engage", "students demonstrate", "teacher facilitates", "students process". If you write one, immediately state exactly what students do, say, write, create, or decide.`,
    ``,
    `FINAL CHECK before returning each lesson: it follows the S&S; it MEETS THE ALPHA EXPERIENCE STANDARD (students struggle before any concept is named; the guide mostly observes and redirects rather than explains; students make a real autonomous choice they own; the day is hands-on/physical, not worksheet- or discussion-bound; student-completed sentence frames are present; the work builds toward a cheat-proof, publicly-defended demonstration; the voice is direct and concrete with say-aloud lines); the Design Model is correctly applied; every major activity advances the competency with >= 2 authentic at-bats and observable evidence; the day moves toward the CPC; the Genome shows in HOW it is taught. If any check fails, redesign the day.`,
    `TWO KINGS FIDELITY SELF-AUDIT (this audits the single generated output, which is WEAKER than a true canonical-vs-derivative diff — treat any failure as a real design problem, not a formality): confirm each rendered day still has (1) an explicit EARNED unlock tied to demonstrated capability, (2) a BINARY pass/fail Check2Pass against an external bar (not vague process/"completion" language), (3) a MECHANISM-based Why (not rubric-evidence language), and (4) the GRADE-BAND escalation for the dyad. If any of these four protected fields is missing or softened, redesign the day before returning it. Do not weaken the canonical spine to fit the district format.`,
    `Style: no em dashes, no semicolons in student-facing text. Return the LessonWeek JSON only.`,
  ].join("\n");
}

/**
 * TWO KINGS — STAGE A. Write the CANONICAL Access-Model design spine for a week
 * (the source of record, in Access language) BEFORE any HISD district format
 * exists. Each day gets the five protected elements: mechanism-based Why, earned
 * unlock, binary Check2Pass, grade-band escalation, and guide moves.
 */
export function canonicalWeekPrompt(input: { scope: ScopeSequence; week: number; genome?: string }): string {
  const wk = input.scope.weeks.find((w) => w.week === input.week);
  const wkJson = wk ? JSON.stringify(wk, null, 2) : "(week not found)";
  const rubric = input.scope.rubricText?.trim();
  const cpc = input.scope.cpcText?.trim() || input.scope.cpcProblemStatement;
  const genome = input.genome?.trim();
  return [
    `You are an Access Model (Alpha) lead designer. Write the CANONICAL design spine for WEEK ${input.week} — the source of record, in Access language, BEFORE any district lesson-plan format exists. This is Stage A of a Two Kings build: canonical first, HISD derivative second.`,
    `COMPETENCY: ${input.scope.competency} | DYAD (grade band): ${input.scope.gradeBand} | CPC FRAME: ${input.scope.cpcFrame}`,
    ``,
    `The Scope & Sequence is AUTHORITATIVE for WHAT each day teaches, via these columns ONLY: Day, Lesson Title, Lesson Design Type, LO (Lesson Objective), and Rubric Indicator. The S&S EO, Activity, and Materials are INTENTIONALLY BLANK. Do NOT change the progression, and do NOT invent generic activities. The concrete EXPERIENCE for each day comes from the RETRIEVED EXPERIENCE GENOME facilitation that matches this day (competency, dyad, Rubric Indicator, Lesson Design Type, LO); you are naming the underlying Access MECHANISM of that experience. The binaryCheck2Pass and mechanismWhy you write must reflect the specific genome-based experience serving the given LO, not a generic framing.`,
    ``,
    `THIS WEEK FROM THE S&S:`,
    wkJson,
    ``,
    rubric ? `RUBRIC:\n${rubric}\n` : ``,
    cpc ? `CPC (the cheat-proof final demonstration each day builds toward):\n${cpc}\n` : ``,
    genome ? `RETRIEVED FUTURE2 GENOME (patterns to recombine, never copy):\n${genome}\n` : ``,
    `ACCESS DESIGN LAWS (every day must honor them): autonomy is EARNED (not granted by pacing); systems > subjects (content is the vehicle, the student operating-system is the product); if it does not work it is not finished (mastery proven by function, not completion); belonging follows contribution; capability is forged through friction (preserve productive struggle, ban adult rescue).`,
    ``,
    `EXPERIENTIAL MANDATES from the LESSON GENERATION CONTEXT (design each day to these, not to a generic worksheet rhythm):`,
    `- IN-ACTION CORE (§2): every day is anchored by a hands-on, do-it-live activity where students practice the skill in the body, in the moment (build it, play it, run the round, carry the role) — NOT by discussion or a "write your idea on the tracker" task. Discussion and reflection only wrap the experiential core; they never replace it. A day that is all writing/talking is rejected.`,
    `- REAL VEHICLE (§2A): the scenario is recognizable and real to a student in the ${input.scope.gradeBand} dyad (a class job that got dropped, a group project falling apart, coordinating the cafeteria line, fixing something real on campus) with real stakes — NOT an invented fantasy premise (lost explorers, missing artifacts) and NOT a cosmetic local veneer. Apply this strictly to Practice/Performance/CPC days; Invisible Sims may stay abstract.`,
    `- EXPERIENCE BEFORE INSTRUCTION / INVISIBLE ENTRY (§3, §4): where an arc applies, the skill is practiced BEFORE it is named — an Invisible Sim (a game/puzzle/competition) surfaces the skill only in the debrief. Never front-load a definition or lecture. Gradual Release days end on an embedded low-stakes practice that feels fun, not a reflection prompt.`,
    `- FUN and 30:1: the activity should be genuinely fun, and it must run at one guide per ~30 students with no bottleneck adult delivering or rescuing.`,
    `The mechanismWhy, unlock, and binaryCheck2Pass you write for each day must reflect THIS in-action, real-vehicle mechanism — not a generic "practice the competency" framing.`,
    ``,
    `For EACH day in this week, produce the canonical spine (Access language, concrete, no district formatting):`,
    `- mechanismWhy: the student CAPABILITY being built today and the MECHANISM that builds it (how the activity forges the skill). Never "produces evidence for a rubric".`,
    `- unlock: what students EARN by demonstrating readiness today — a specific autonomy or harder challenge that unlocks from PROOF, never from permission, pacing, or finishing early. Name the trigger and the reward.`,
    `- binaryCheck2Pass: a PASS/FAIL success condition against an external quality bar (the object works or it does not; the plan meets the non-negotiable constraints or it does not). Observable, un-fakeable, pointed at the CPC. No "students will understand / participate / complete".`,
    `- gradeBandEscalation: how THIS day is harder for the ${input.scope.gradeBand} dyad than for the band below — via complexity, responsibility, interdependence, or independence. Be specific about what scales.`,
    `- guideMoves: what the guide DOES — facilitate, coach, question, observe, hold the line. Silent-facilitator default (set the challenge, start the timer, redirect ownership). Never lecture-deliver, never rescue. Must run at a 30:1 ratio without a bottleneck adult.`,
    ``,
    `Return CanonicalWeek JSON only: { week, days: [ { day, mechanismWhy, unlock, binaryCheck2Pass, gradeBandEscalation, guideMoves } ] } — one entry per day in this week, in order. No em dashes or semicolons.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * TWO KINGS — STAGE C. The fidelity gate: an adversarial diff of the rendered
 * HISD derivative against the canonical spine, judged ONLY on the four protected
 * fields, per day. Default to FAIL when a protected element is softened or missing.
 */
export function fidelityGatePrompt(input: {
  scope: ScopeSequence;
  canonical: CanonicalWeek;
  week: LessonWeek;
}): string {
  return [
    `You are the TWO KINGS FIDELITY GATE — an adversarial reviewer. Diff the HISD-facing DERIVATIVE lesson plans against the CANONICAL Access spine they were meant to render, AND audit each day against the LESSON GENERATION CONTEXT. Judge FIVE protected fields, per day. Catch DILUTION and any red flag from the context. Be strict; default to FAIL when a protected element is vague, softened, missing, or a red flag is present.`,
    `COMPETENCY: ${input.scope.competency} | DYAD: ${input.scope.gradeBand}`,
    ``,
    `CANONICAL SPINE (source of record, per day):`,
    JSON.stringify(input.canonical, null, 2),
    ``,
    `HISD DERIVATIVE (the rendered lesson plans to audit):`,
    JSON.stringify(input.week, null, 2),
    ``,
    `For EACH day (match by the day label), judge the five protected fields. Set pass=true only if it holds; pass=false if softened, dropped, generalized, replaced, or a red flag is present. Give a one-sentence note with concrete evidence (quote or paraphrase the offending derivative text, or state what preserves it):`,
    `- unlock: is an EARNED progression still explicit in the derivative and tied to demonstrated capability? FAIL if the unlock became blanket permission, disappeared, or is merely "early finishers get more".`,
    `- binaryMastery: is success still PASS/FAIL against an external bar? FAIL if it became "students will understand / participate / complete / discuss" or any open-ended completion language.`,
    `- mechanismWhy: does the derivative still build the capability by the canonical mechanism? FAIL if the Why drifted into rubric-evidence language or generic "practice the competency".`,
    `- escalation: is the grade-band escalation still present for the dyad? FAIL if it was collapsed to a single generic level.`,
    `- experiential: does the day have a genuine IN-ACTION core (students physically DO the skill: build/play/run/carry a role), a REAL recognizable vehicle (not an invented fantasy premise or an "any city" generic scenario, for Practice/Performance/CPC days), and does it practice before naming (no front-loaded lecture/definition)? FAIL if the day is all discussion/writing (e.g. a Do Now that is "write one idea on your tracker" or "pick X and write why"), if the opener names or lectures the skill before students act, or if the scenario is a generic/fantasy premise. This is where thin, worksheet-style days get caught.`,
    `Set dayPass=true only when ALL FIVE fields pass. Set weekPass=true only when every day passes.`,
    `Return FidelityWeek JSON only.`,
  ]
    .filter(Boolean)
    .join("\n");
}