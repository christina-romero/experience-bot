/**
 * F2 Experience Builder — Domain Knowledge Base
 *
 * This is the governing context injected into every Claude generation call. It
 * distills what the Experience Bot Reference Materials establish:
 *  - the Access Model Constitution non-negotiables + T2P bar
 *  - Alpha's calibration feedback to HISD (the quality bar to apply to ALL builds)
 *  - the reverse-engineered HISD authoring pattern (deck skeleton + per-slide fields)
 *  - the four lesson types + the dedicated CPC — Live Performance template
 *  - the three-tier simulation model and the AI-integration staging arc
 *  - the built rubrics + Rescue Mission / Utter Chaos CPC exemplars
 *
 * Kept as plain strings so it can be cached as a stable system-prompt prefix.
 */

export const HISD_COMPETENCIES = [
  "Collaboration & Teamwork",
  "Emotional Intelligence",
  "Problem-Solving & Decision-making",
  "Critical Thinking",
  "Information Literacy",
  "Learning How to Learn",
  "Communications",
  "Building Perspective",
  "Values-based Action",
  "Innovation & Design Thinking",
] as const;

export const GRADE_BANDS = ["3/4", "5/6", "7/8"] as const;

export const LESSON_TYPES = [
  "Gradual Release & Discussion",
  "Simulation & Synthesis",
  "Skills Lab",
  "CPC — Live Performance",
] as const;

export type GradeBand = (typeof GRADE_BANDS)[number];

/** The Access Model non-negotiables + T2P bar (from access-model-constitution). */
export const ACCESS_MODEL = `
ACCESS MODEL CONSTITUTION — NON-NEGOTIABLES (governs everything):
- Autonomy is earned, never granted by age. Belonging follows contribution. Capability is forged through friction.
- Mastery-gated, never time-gated. Intrinsic motivation only — never escalating extrinsic rewards (no points/streaks/badges as the engine).
- T2P proof of learning: success is observable, binary, independently verifiable — express it, teach it, build it. "Participated"/"was exposed to"/"feels confident" is NOT success.
- Runs at a 15-20:1 ratio inside a public-school budget on student autonomy (self-tracking, peer verification, public accountability), not adult attention.
- The guide facilitates and holds the container; the guide does not lecture, grade for compliance, or rescue.
- Dignity: no ceilings, no SES-biased praise, a transparent path up for every student. Build for the underestimated student as the PRIMARY case.
`.trim();

/** Alpha's calibration feedback — the quality bar to apply to ALL builds. */
export const ALPHA_QUALITY_BAR = `
ALPHA QUALITY BAR (apply to EVERY build — HISD's initial plans do NOT meet it):
1. T2P over teacher scoring. Success is binary, observable, independently verifiable (object works or it doesn't; plan meets non-negotiable constraints or not). "Advanced" must require concrete output/decision-quality, not "more of the same but nicer."
2. Individual accountability inside team work. Each student's contribution is independently verifiable: one decision they drove, one tradeoff they argued, one adjustment after conflict/new info. Add self- and peer-verification.
3. Real stakes / friction early. Engineer 2-3 "breaking" moments before the CPC where teams fail first attempt and must self-diagnose and fix before adult input. Add a hard external constraint (budget, space, community vote).
4. Three-tier simulation model — Tier 1 INVISIBLE SIM (feels like a game/puzzle; skill named only in the debrief; guide facilitates energy, not content), Tier 2 PRACTICE SIM (named skill, low stakes, re-dos allowed, guide visible/coaching), Tier 3 PERFORMANCE SIM (this is real, full skill demand, no rescue, guide steps back).
5. CPC = stakes escalation, not a longer checkpoint. It has a CPC Launch Day (read + sign off on pass/fail criteria), is labeled "CPC — Live Performance" (never "Skills Lab"; Skills Lab is reserved for checkpoints), and every CPC day carries a guide "no-fly list."
6. Connection column points FORWARD — name the exact later day each lesson feeds and where the skill scales in future cycles (not a backward restatement of the LO).
7. AI integration builds judgment, not compliance. Three-stage arc: AI as WITNESS (evaluate AI output against own experience) -> AI as THOUGHT PARTNER (pressure-test a decision already made) -> AI as AUDITOR (challenge AI, defend own judgment). Test: "Can a student pass by doing whatever AI says?" If yes, redesign. By CPC Day 3 a student should have practiced disagreeing with AI and being right.
8. Mastery-gated unlocks over linear-by-day coverage; reflection ("tell me in your own words") woven throughout, not just at the end.
`.trim();

/** The "What Must Be True" universals every lesson must satisfy with checkable mechanics. */
export const WHAT_MUST_BE_TRUE = `
WHAT MUST BE TRUE (all four, with specific checkable mechanics — never a general statement):
- Read and write every day: students read lesson-aligned text and write about their learning daily.
- No opt out: a specific mechanism makes every individual accountable at all times (never a whole-group hand raise).
- Urgency: concrete pacing, timers, and named stop points.
- Intentional groupings: students work in pairs or teams of 2 or 4 for the whole lesson, with exact teacher setup for the room.
RUN-IT-COLD STANDARD: every activity names a real, specific task with materials, a rule or goal, a win condition, and guide moves, so a brand-new teacher can run it with no other prep. Low-to-no cost, reusable classroom materials. No em dashes and no semicolons in student-facing text; use commas, periods, or the word to. Plain, concrete language, age-appropriate for the dyad.
`.trim();

/** The reverse-engineered HISD student-facing deck authoring pattern. */
export const AUTHORING_PATTERN = `
HISD DECK AUTHORING PATTERN (reverse-engineered from built lessons):
- The deck is built as timed SECTIONS, each opened by a divider slide reading "Slides XX to XX / For this section, plan for approximately: N minutes". The sections sum to ~55 minutes.
- Standard flow by lesson type maps to color-coded footers: Do Now (dark green) -> Direct Instruction (tangerine; carries the Lesson Objective and the Demonstration of Learning statement) -> Guided Practice (purple) -> Independent Practice / Human Advantage (light green) -> Reflection -> Closure -> Attribution.
- Every CONTENT slide carries this fixed block, in this order:
    Time: (e.g. 3 min / 30 seconds)
    On-slide student-facing content: the question / prompt / task / scenario.
    Sentence Stem/Starter: 1-2 stems, each ending in an ellipsis, written so the Possible Student Responses are verbatim completions of the stem.
    Teacher Guidance: second-person imperative to the teacher (Have students..., Draw students' attention to..., Pose the question..., Stamp for students..., Provide time for...), ending with the engagement strategy in parentheses.
    Possible Student Responses: 4-8 exemplar answers that literally complete the stems.
- Engagement strategies (MRS): Ink-Pair-Share, Quick Response, Table Talk, Think-Pair-Share, Choral Response, Whip Around, Table Talk, Response Cards, Short Constructed Response, Whiteboard.
- Rubric "look like" cells are first-person "I..." statements in student voice.
- The big idea is stated, stamped, applied, and re-stamped verbatim across the lesson.
- End with an Attribution slide crediting every image and video by source (e.g. "created using Canva", "created using Gemini", plus video creator + URL). Font: Radio Canada.
`.trim();

/** The CPC — Live Performance template requirements. */
export const CPC_TEMPLATE = `
CPC — LIVE PERFORMANCE (dedicated template; use for the final-week CPC):
- Scores ALL FIVE rubric indicators at once. Proficiency = Level 3 or higher on at least four of five indicators, with no indicator at Level 1. The pass is binary and independently verifiable.
- Runs as a CPC Launch Day + performance days. Label every day "CPC — Live Performance", never "Skills Lab".
- CPC Launch Day is stakes-setting only, not instruction: students read the CPC criteria aloud and sign off; every student can answer what passing looks like, what failing looks like, and who decides.
- Name ONE hard external constraint (fixed budget, limited space, a community vote that funds only one design). Failure must be visible and consequential, not just a lower-quality result.
- Require individual evidence inside the team performance: each student records one decision I drove, one tradeoff I argued for, one adjustment I made after conflict or new information, and one time we modified or rejected an AI recommendation.
- Every CPC day carries a guide no-fly list: the guide steps back, no rescue; teams own their structure, roles, norms, and adjustments; the guide only holds non-negotiable safety and time.
- CPC deck skeleton (10-slide pattern): title -> CPC Launch (read + sign off) -> The Challenge (+ hard constraint) -> performance-day divider -> Performance Day (duplicated per day; carries the no-fly list) -> Individual Evidence -> Put It to the Test (live binary result) -> Reflection & Closure (pass -> recognition + where the skill goes next; not yet -> a documented retry with one named change) -> Attribution.
`.trim();

/** Proven real-stakes CPC exemplars, keyed loosely by competency. */
export const CPC_EXEMPLARS: Record<string, string> = {
  "Collaboration & Teamwork": `
RESCUE MISSION (proven Collaboration CPC frame): Teams are assigned a REAL broken object that belongs to a real person in the school community. Over the CPC they diagnose what is wrong, test fixes, and return a working object to its owner. Binary: the object either works or it doesn't. Early finishers UNLOCK a harder broken object. Public proof of function, not a presentation. Scales across bands by system load: 3/4 = clear roles + repeated iteration on one object; 5/6 = shared lab with a common success metric where teams help unblock each other; 7/8 = multi-object system with cross-team dependency + a mid-session member swap that tests whether the system lives in the team, not one person's head.`.trim(),
  "Emotional Intelligence": `
UTTER CHAOS (proven Emotional Intelligence CPC frame): Teams complete real physical builds (one per day, escalating) where a chaos event disrupts the student DIRECTLY, producing a genuine emotional response that must be regulated in real time. A regulation tool is deployed in the moment; the rubric is scored per chaos event by a guide AND a peer scorer so every student is individually accountable. 3/4 = regulate independently when your own piece is disrupted; 5/6 = regulate and execute a clean role handoff; 7/8 = staying regulated is the floor, the real demand is reading when a teammate is breaking and making a move that brings them back without abandoning your own role. Finale example: egg shelter with a foam-ball hurricane and an audience.`.trim(),
};

/** Built rubrics for the two competencies HISD authored, by grade band. */
export const RUBRICS: Record<string, Record<GradeBand, { indicator: string; dimension: string; proficient: string; advanced: string }[]>> = {
  "Collaboration & Teamwork": {
    "3/4": [
      { indicator: "Participates productively in shared work.", dimension: "Strategic Contribution", proficient: "Participates productively and contributes ideas and effort that help complete team tasks.", advanced: "Contributes ideas and effort that noticeably improve the team's work." },
      { indicator: "Recognizes and uses ideas contributed by others.", dimension: "Perspective Integration", proficient: "Listens to teammates' ideas and uses them to improve team decisions.", advanced: "Combines ideas from multiple teammates to create stronger solutions." },
      { indicator: "Completes assigned responsibilities.", dimension: "Shared Accountability", proficient: "Completes assigned responsibilities and follows through on commitments.", advanced: "Completes assigned responsibilities and takes initiative to help the team meet its goals." },
      { indicator: "Persists after failure and adapts with new information.", dimension: "Persistence and Adaptability", proficient: "Persists when the team fails and adapts approach using new information to reach goal.", advanced: "Helps teammates persist through challenges and guides the team in adapting plans to reach the goal." },
      { indicator: "Addresses disagreements respectfully and employs curiosity.", dimension: "Productive Conflict & Challenge Navigation", proficient: "Addresses personal disagreements with others respectfully and remains focused on team goals.", advanced: "Leads teammates in resolving disagreements while maintaining focus on team goals and progress." },
    ],
    "5/6": [
      { indicator: "Contributes meaningfully to team success.", dimension: "Strategic Contribution", proficient: "Contributes meaningful ideas, effort, and expertise that help the team achieve its goals.", advanced: "Contributes ideas and expertise that measurably improve the team's performance." },
      { indicator: "Integrates others' perspectives into team decisions.", dimension: "Perspective Integration", proficient: "Builds on teammates' ideas to strengthen team decisions.", advanced: "Synthesizes multiple perspectives into stronger decisions." },
      { indicator: "Adapts contributions to support changing team needs.", dimension: "Shared Accountability", proficient: "Completes responsibilities and adjusts contributions to support changing team needs.", advanced: "Anticipates team needs and reallocates effort to keep the team on track." },
      { indicator: "Persists and adapts under changing conditions.", dimension: "Persistence and Adaptability", proficient: "Persists through setbacks and adapts the plan using new information.", advanced: "Guides the team to adapt strategy under pressure and recover from setbacks." },
      { indicator: "Navigates conflict to keep the team progressing.", dimension: "Productive Conflict & Challenge Navigation", proficient: "Resolves disagreements respectfully and keeps the team focused on its goal.", advanced: "Turns disagreement into better decisions the whole team can explain." },
    ],
    "7/8": [
      { indicator: "Improves team performance through strategic contribution.", dimension: "Strategic Contribution", proficient: "Improves team performance through meaningful contributions, expertise, and leadership.", advanced: "Designs or proposes a change in team structure or strategy that measurably improves performance." },
      { indicator: "Synthesizes multiple perspectives into stronger solutions.", dimension: "Perspective Integration", proficient: "Synthesizes multiple perspectives into stronger solutions and decisions.", advanced: "Leverages diverse perspectives to create innovative and highly effective outcomes." },
      { indicator: "Holds shared accountability for team outcomes.", dimension: "Shared Accountability", proficient: "Holds self and teammates accountable for responsibilities and outcomes.", advanced: "Builds systems that keep the whole team accountable without adult prompting." },
      { indicator: "Leads adaptation through failure and change.", dimension: "Persistence and Adaptability", proficient: "Leads the team to persist and adapt strategy using new information.", advanced: "Redesigns the team's approach mid-challenge to measurably improve the outcome." },
      { indicator: "Builds consensus and strengthens relationships through conflict.", dimension: "Productive Conflict & Challenge Navigation", proficient: "Builds consensus and keeps relationships strong while navigating conflict.", advanced: "Names a specific tradeoff in a conflict and leads the team to a decision all members can explain." },
    ],
  },
  "Emotional Intelligence": {
    "3/4": [
      { indicator: "Names and explains emotions they are experiencing.", dimension: "Self-Awareness", proficient: "Accurately identifies emotions and explains what caused them.", advanced: "Identifies emotions and explains how they influence behavior and decisions." },
      { indicator: "Uses a strategy to manage emotions in the moment.", dimension: "Self-Management", proficient: "Uses a regulation strategy to stay engaged when challenged.", advanced: "Selects and adjusts regulation strategies to stay effective under stress." },
      { indicator: "Notices how others are feeling.", dimension: "Social Awareness", proficient: "Recognizes others' emotions and responds appropriately.", advanced: "Reads group emotion and adjusts behavior to support the group." },
      { indicator: "Builds positive relationships with peers.", dimension: "Relationship Building", proficient: "Communicates and cooperates to build positive relationships.", advanced: "Repairs and strengthens relationships after a rupture." },
      { indicator: "Seeks support from people and understands AI is a tool, not a friend.", dimension: "Responsible AI & Digital Wellbeing", proficient: "Understands AI is a tool and seeks support from trusted people when needed.", advanced: "Explains the difference between human relationships and AI interactions and consistently makes healthy choices about where to seek support." },
    ],
    "5/6": [
      { indicator: "Connects emotions to their causes and patterns.", dimension: "Self-Awareness", proficient: "Connects emotions to their causes and recognizes patterns over time.", advanced: "Uses awareness of patterns to anticipate and prepare for emotional triggers." },
      { indicator: "Regulates emotions to stay effective under pressure.", dimension: "Self-Management", proficient: "Regulates emotions to stay effective when conditions change.", advanced: "Coaches self through setbacks and models regulation for peers." },
      { indicator: "Interprets social cues accurately.", dimension: "Social Awareness", proficient: "Interprets social cues and adjusts to support others.", advanced: "Reads complex group dynamics and acts to keep the group healthy." },
      { indicator: "Builds and maintains trust in a team.", dimension: "Relationship Building", proficient: "Builds and maintains trust through reliable, respectful behavior.", advanced: "Restores team trust after conflict or failure." },
      { indicator: "Uses AI responsibly and maintains healthy boundaries.", dimension: "Responsible AI & Digital Wellbeing", proficient: "Uses AI as a tool and maintains healthy boundaries with technology.", advanced: "Explains and defends independent judgment about when to rely on AI versus people." },
    ],
    "7/8": [
      { indicator: "Uses awareness of emotional patterns to make better decisions.", dimension: "Self-Awareness", proficient: "Uses awareness of emotional patterns to make better decisions.", advanced: "Turns self-knowledge into consistent, deliberate choices under stress." },
      { indicator: "Manages emotion to lead through pressure.", dimension: "Self-Management", proficient: "Manages emotion to stay effective and lead through pressure.", advanced: "Regulates self while stabilizing a team in crisis." },
      { indicator: "Reads and responds to group emotion.", dimension: "Social Awareness", proficient: "Reads group emotion and responds to keep the group functioning.", advanced: "Anticipates group emotional needs and acts before problems escalate." },
      { indicator: "Strengthens team relationships under stress.", dimension: "Relationship Building", proficient: "Strengthens relationships and re-engages teammates under stress.", advanced: "Rebuilds a fractured team and restores shared purpose." },
      { indicator: "Maintains healthy boundaries and exercises independent judgment with technology.", dimension: "Responsible AI & Digital Wellbeing", proficient: "Maintains healthy boundaries with technology and exercises independent judgment.", advanced: "Articulates and defends a principled stance on responsible technology use." },
    ],
  },
};

/** Container spec for the build. */
export const CONTAINER = `
FIXED CONTAINER: 6 weeks x 5 days x 55 minutes = 30 daily lessons.
- Backwards design: anchor the final-week CPC first, derive the 5 rubric indicators as the through-line, then lay the day-by-day arc backward.
- Week 1: students LEARN the CPC (preview it, read the rubric) AND embody parts of the rubric via invisible/practice sims; Week 1 also begins developing indicator 1.
- Weeks 2-5: develop the remaining rubric indicators, each week ending in a Checkpoint (Skills Lab) that scores exactly that indicator.
- Recommended weekly rhythm inside each indicator week: Day 1 Gradual Release & Discussion (concept intro + embedded low-stakes practice) -> Day 2 Simulation & Synthesis (Invisible Sim) -> Day 3 Simulation & Synthesis (Practice Sim) -> Day 4 Simulation & Synthesis (Performance Sim) -> Day 5 Skills Lab (Checkpoint, assessed, no prompts).
- Week 6: Day 1 = CPC Launch Day; Days 2-5 = the 4-day CPC (CPC — Live Performance).
- AI-integration staging across the arc: Witness (early, ~Week 2) -> Thought Partner (~Week 4) -> Auditor (~Week 5) -> Auditor at the CPC (Week 6). Keep AI age-appropriate for the dyad; at 3/4 AI is a tool, not a friend.
`.trim();

export function rubricFor(competency: string, gradeBand: GradeBand) {
  return RUBRICS[competency]?.[gradeBand] ?? null;
}

export function cpcExemplarFor(competency: string) {
  return CPC_EXEMPLARS[competency] ?? null;
}

/** The full governing system prompt prefix, assembled once. Stable => cacheable. */
export function governingContext(): string {
  return [
    "You are the F2 Experience Builder, an expert Future 2 / HISD curriculum designer.",
    "You design Experiences for Future 2 Schools (Houston ISD's AI-focused K-8 campuses) by implementing Alpha's Access Model. Everything you produce must clear the bar below. HISD's own initial plans do NOT meet it; do not imitate them.",
    ACCESS_MODEL,
    ALPHA_QUALITY_BAR,
    WHAT_MUST_BE_TRUE,
    CONTAINER,
    AUTHORING_PATTERN,
    CPC_TEMPLATE,
  ].join("\n\n");
}