/**
 * BUILT-IN SCOPE & SEQUENCE (Cycle 1) — locked into the bot's operating system so
 * a Scope & Sequence upload is never required. Source: the Cycle-1 Experiences
 * Scope & Sequence sheet (all three dyads x Teamwork & Collaboration [A1] and
 * Emotional Intelligence [B1]).
 *
 * Per the anchoring contract, only the authoritative columns are stored: Day,
 * Lesson Title, Lesson Design Type, LO (Lesson Objective), Rubric Indicator, and
 * Connection. The EO, Activity, and Materials are intentionally produced downstream
 * from the Experience Genome facilitations, never stored here.
 *
 * buildBuiltinScope() turns a section into a ScopeSequence deterministically:
 * days are grouped into weeks by rubric-indicator block, CPC-titled days become
 * "CPC - Live Performance", and the bundled rubric + CPC exemplar are attached.
 */
import type { ScopeSequence, ScopeDay, ScopeWeek } from "./schemas";
import { rubricFor, cpcExemplarFor, type GradeBand } from "./knowledge";

// [day, title, lessonDesignType, LO, rubricIndicator, connection]
type Row = [number, string, string, string, string, string];
type Section = { competency: string; gradeBand: string; experienceName: string; rows: Row[] };

const RI_SC = "Strategic Contribution";
const RI_PI = "Perspective Integration";
const RI_SA = "Shared Accountability";
const RI_PA = "Persistence & Adaptability";
const RI_PC = "Productive Conflict & Challenge Navigation";
const RI_ALL = "All Indicators";
const EI_SA = "Self-Awareness";
const EI_SM = "Self-Management";
const EI_SOC = "Social Awareness";
const EI_RB = "Relationship Building";
const EI_AI = "Responsible AI & Digital Wellbeing";

const GR = "Gradual Release and Discussion";
const SS = "Simulation and Synthesis";
const SL = "Skills Lab";

const SECTIONS: Section[] = [
  {
    competency: "Collaboration & Teamwork",
    gradeBand: "3/4",
    experienceName: "Seeds of Legends",
    rows: [
      [1, "What Makes a Legendary Team?", GR, "Students will understand the Teamwork & Collaboration rubric and why each indicator is important.", RI_SC, "Successful teams require ideas and effort from all members."],
      [2, "Everyone Has Something to Contribute", SS, "Students will identify and evaluate their role toward a team goal.", RI_SC, "Students begin contributing ideas and effort during team tasks."],
      [3, "Strengths Make Teams Stronger", SS, "Students will use information and strengths from all team members to solve a problem.", RI_SC, "Students recognize how their contributions advance team thinking."],
      [4, "Checkpoint 1: Team Construction Sprint", SL, "Students will demonstrate productive participation by contributing ideas and effort toward a shared goal.", RI_SC, "Checkpoint evidence."],
      [5, "The Power of Other People's Ideas", GR, "Students will understand how listening to others can improve team solutions.", RI_PI, "Students recognize that teammates' ideas strengthen thinking."],
      [6, "Better Together", SS, "Students will practice listening to teammates and building on their ideas during collaborative work.", RI_PI, "Students actively engage with ideas contributed by teammates."],
      [7, "The Mystery of the Missing Artifact", SS, "Students will use information and ideas from multiple teammates to solve a shared problem.", RI_PI, "Students use teammates' ideas to improve team decisions."],
      [8, "Checkpoint 2: Mystery Solver Challenge", SL, "Students will demonstrate the ability to listen to and use ideas contributed by teammates to solve a problem.", RI_PI, "Checkpoint evidence."],
      [9, "My Job Matters", GR, "Students will understand how individual responsibilities contribute to team success.", RI_SA, "Students recognize the importance of following through on commitments."],
      [10, "One Missing Piece", SS, "Students will practice completing responsibilities that contribute to a team outcome.", RI_SA, "Students experience how their actions affect team success."],
      [11, "Mission Completion", SS, "Students will follow through on assigned responsibilities during a collaborative task.", RI_SA, "Students demonstrate ownership of assigned tasks."],
      [12, "Checkpoint 3: Team Production Challenge", SL, "Students will demonstrate the ability to complete assigned responsibilities and follow through on commitments.", RI_SA, "Checkpoint evidence."],
      [13, "Challenges Are Part of the Journey", GR, "Students will understand that effective teams persist and adapt when challenges arise.", RI_PA, "Failure provides information for improvement."],
      [14, "The Missing Piece", SS, "Students will adapt a team plan when new information changes the situation.", RI_PA, "Students practice adjusting plans when circumstances change."],
      [15, "Checkpoint 4: Adaptation Challenge", SL, "Students will demonstrate persistence and adaptability when faced with challenges.", RI_PA, "Checkpoint evidence."],
      [16, "Disagreements Are Normal", GR, "Students will understand that disagreements can be addressed respectfully while working toward a shared goal.", RI_PC, "Students experience productive conflict firsthand."],
      [17, "Finding Compromise", SS, "Students will practice responding respectfully to differing opinions during team discussions.", RI_PC, "Students develop strategies for navigating disagreement constructively."],
      [18, "The Resource Allocation Game", SS, "Students will practice working through differing opinions while remaining focused on a shared team goal.", RI_PC, "Students maintain focus on team goals while navigating differing perspectives."],
      [19, "Checkpoint 5: Resource Challenge", SL, "Students will demonstrate the ability to address disagreements respectfully while maintaining progress toward a team goal.", RI_PC, "Checkpoint evidence."],
      [20, "CPC Day 1: Team of Legends Expedition Launch", SL, "Students will establish team structures, responsibilities, and collaborative expectations while beginning the playground planning process.", RI_ALL, "CPC launch."],
      [21, "CPC Day 2: Team Trials", SL, "Students will use multiple stakeholder perspectives to develop a playground plan that meets community needs.", RI_ALL, "CPC development."],
      [22, "CPC Day 3: The Crisis", SL, "Students will adapt their plans, evaluate AI recommendations, and maintain effective collaboration when faced with new challenges.", RI_ALL, "CPC adaptation."],
      [23, "CPC Day 4: Council of Legends", SL, "Students will reflect on their collaboration performance, identify evidence of competency growth, and set goals for future teamwork experiences.", RI_ALL, "CPC reflection."],
    ],
  },
  {
    competency: "Emotional Intelligence",
    gradeBand: "3/4",
    experienceName: "Chaos Builders",
    rows: [
      [1, "What Makes Someone Emotionally Aware?", GR, "Students will understand the Emotional Intelligence rubric and why each indicator is important.", EI_SA, "Understanding emotions begins with recognizing and naming them accurately."],
      [2, "First Chaos", SS, "Students will identify emotions and possible causes in different situations.", EI_SA, "Emotions become easier to recognize when experienced authentically."],
      [3, "Feelings Have Clues", SS, "Students will connect emotions to events and experiences.", EI_SA, "Students recognize patterns between emotions and experiences."],
      [4, "Checkpoint 1: Emotion Awareness Challenge", SL, "Students will demonstrate the ability to identify and explain emotions in authentic situations.", EI_SA, "Checkpoint evidence."],
      [5, "Big Feelings, Better Choices", GR, "Students will understand strategies for managing strong emotions.", EI_SM, "Emotional awareness becomes useful when students can regulate emotions productively."],
      [6, "Pause, Think, Choose Lab", SS, "Students will practice regulation strategies during challenging situations.", EI_SM, "Regulation helps students remain productive when challenges occur."],
      [7, "Frustration Challenge", SS, "Students will remain productive when plans change unexpectedly.", EI_SM, "Students learn to remain productive despite setbacks."],
      [8, "Checkpoint 2: Regulation Challenge", SL, "Students will demonstrate emotional regulation during challenging situations.", EI_SM, "Checkpoint evidence."],
      [9, "Seeing Through Someone Else's Eyes", GR, "Students will understand that different people experience situations differently.", EI_SOC, "Emotional intelligence includes understanding how others feel."],
      [10, "Empathy Lab", SS, "Students will practice recognizing emotions and choosing supportive responses.", EI_SOC, "Empathy requires recognizing and responding to emotional needs."],
      [11, "Helping Others Through Challenges", SS, "Students will support others experiencing emotional challenges.", EI_SOC, "Students learn how to support others effectively."],
      [12, "Checkpoint 3: Support Challenge", SL, "Students will demonstrate the ability to respond appropriately to others' emotions.", EI_SOC, "Checkpoint evidence."],
      [13, "Relationships Matter", GR, "Students will understand why relationships sometimes need repair.", EI_RB, "Strong relationships require trust and repair."],
      [14, "Relationship Repair Lab", SS, "Students will practice strategies for repairing relationships.", EI_RB, "Repair strengthens relationships."],
      [15, "Relationship Rescue Challenge", SS, "Students will repair relationships after conflict or misunderstanding.", EI_RB, "Relationships can recover after conflict."],
      [16, "Checkpoint 4: Relationship Repair Challenge", SL, "Students will demonstrate relationship repair skills.", EI_RB, "Checkpoint evidence."],
      [17, "Humans, Friends, and Technology", GR, "Students will understand the difference between human relationships and AI interactions.", EI_AI, "Healthy emotional support comes from trusted people."],
      [18, "Healthy Digital Choices Lab", SS, "Students will evaluate healthy and unhealthy uses of technology and AI.", EI_AI, "Technology should support, not replace, relationships."],
      [19, "AI Advice Challenge", SS, "Students will determine when human support is more appropriate than AI support.", EI_AI, "Human judgment remains essential."],
      [20, "Checkpoint 5: Digital Wellbeing Challenge", SL, "Students will demonstrate healthy decision-making regarding emotional support and technology use.", EI_AI, "Checkpoint evidence."],
      [21, "CPC Day 1: School Community Care Committee Launch", SL, "Students will identify emotional needs and establish team structures while beginning the committee's work.", RI_ALL, "CPC launch."],
      [22, "CPC Day 2: Community Support Planning", SL, "Students will develop support plans that respond to emotional needs across multiple stakeholder groups.", RI_ALL, "CPC development."],
      [23, "CPC Day 3: Community Challenge Update", SL, "Students will manage emotions, maintain relationships, and adapt plans when new challenges emerge.", RI_ALL, "CPC culmination."],
    ],
  },
  {
    competency: "Collaboration & Teamwork",
    gradeBand: "5/6",
    experienceName: "Teams of Legends",
    rows: [
      [1, "What Makes a Reliable Collaborator?", GR, "Students will understand the Collaboration & Teamwork rubric and why each indicator is important.", RI_SC, "Effective teams depend on meaningful contributions from all members."],
      [2, "Contributions That Matter", SS, "Students will identify how their contributions influence team outcomes.", RI_SC, "Meaningful contributions improve team outcomes."],
      [3, "Expertise and Initiative", SS, "Students will contribute ideas, effort, and expertise that strengthen team outcomes.", RI_SC, "Teams improve when expertise is shared."],
      [4, "Checkpoint 1: Community Design Sprint", SL, "Students will demonstrate meaningful contributions toward a shared goal.", RI_SC, "Checkpoint evidence demonstrating meaningful contribution to team success."],
      [5, "Better Decisions Through Different Perspectives", GR, "Students will understand how multiple perspectives improve decisions.", RI_PI, "Multiple perspectives improve decisions and strengthen outcomes."],
      [6, "Stakeholder Challenge", SS, "Students will practice building upon teammates' ideas.", RI_PI, "Strong collaborators build upon others' thinking and perspectives."],
      [7, "Hidden Information Investigation", SS, "Students will use multiple perspectives to solve a problem.", RI_PI, "Teams make stronger decisions when all information is considered."],
      [8, "Checkpoint 2: Stakeholder Decision Challenge", SL, "Students will demonstrate the ability to build upon teammates' contributions.", RI_PI, "Checkpoint evidence demonstrating integration of multiple perspectives."],
      [9, "Accountability Builds Trust", GR, "Students will understand how accountability supports team success.", RI_SA, "Reliable collaborators earn trust through accountability."],
      [10, "Team Operations Lab", SS, "Students will practice adapting responsibilities based on team needs.", RI_SA, "Teams must adapt when circumstances change."],
      [11, "Adapting Under Pressure", SS, "Students will adjust contributions as team circumstances change.", RI_SA, "Effective collaborators adapt to changing team needs."],
      [12, "Checkpoint 3: Adaptive Team Challenge", SL, "Students will demonstrate adaptability in response to changing team needs.", RI_SA, "Checkpoint evidence demonstrating adaptability and accountability."],
      [13, "Setbacks Are Part of Success", GR, "Students will understand how effective teams respond to setbacks.", RI_PA, "Strong collaborators remain engaged and adjust strategies when challenges arise."],
      [14, "Adaptation Lab", SS, "Students will practice adapting strategies when plans fail.", RI_PA, "Strong collaborators remain engaged despite setbacks."],
      [15, "Team Recovery Challenge", SS, "Students will persist through setbacks and adjust strategies.", RI_PA, "Teams succeed when they adapt rather than quit."],
      [16, "Checkpoint 4: Adaptation Challenge", SL, "Students will demonstrate persistence and adaptability during team challenges.", RI_PA, "Checkpoint evidence demonstrating persistence through challenges."],
      [17, "Productive Disagreement", GR, "Students will understand how compromise and problem solving support team progress.", RI_PC, "Strong collaborators navigate conflict productively."],
      [18, "Negotiation Lab", SS, "Students will practice compromise and collaborative problem solving.", RI_PC, "Productive disagreement can improve solutions."],
      [19, "Resource Allocation Challenge", SS, "Students will work through disagreements while maintaining progress.", RI_PC, "Teams maintain progress by solving problems collaboratively."],
      [20, "Checkpoint 5: Resource Negotiation Challenge", SL, "Students will demonstrate compromise and problem-solving skills during conflict.", RI_PC, "Checkpoint evidence demonstrating compromise and collaborative problem solving."],
      [21, "CPC Day 1: Community Design Council Launch", SL, "Students will establish team structures and responsibilities while beginning the community design challenge.", RI_ALL, "Students apply all collaboration indicators within the CPC launch experience."],
      [22, "CPC Day 2: Community Needs & Planning", SL, "Students will use stakeholder perspectives to develop a proposal that balances community needs.", RI_ALL, "Students apply all collaboration indicators while developing their proposal."],
      [23, "CPC Day 3: The Setback", SL, "Students will adapt plans, respond to setbacks, and maintain effective collaboration when challenges arise.", RI_ALL, "Students demonstrate mastery of all collaboration indicators during the CPC culmination."],
    ],
  },
  {
    competency: "Emotional Intelligence",
    gradeBand: "5/6",
    experienceName: "Chaos Crew",
    rows: [
      [1, "What Makes Someone Emotionally Regulated?", GR, "Students will understand the Emotional Intelligence rubric and why each indicator is important.", EI_SA, "Emotional regulation begins with understanding where emotions come from."],
      [2, "The Story Behind the Feeling", SS, "Students will identify causes and patterns behind emotions.", EI_SA, "Emotions often follow recognizable triggers."],
      [3, "Emotional Pattern Detectives", SL, "Students will connect emotions to situations, triggers, and recurring patterns.", EI_SA, "Recognizing patterns helps students anticipate emotions."],
      [4, "Checkpoint 1: Emotional Pattern Challenge", SL, "Students will demonstrate the ability to connect emotions to causes and patterns.", EI_SA, "Checkpoint evidence. Teacher scores Self-Awareness."],
      [5, "Staying Productive Under Pressure", SS, "Students will understand how emotional regulation supports productivity and decision-making.", EI_SM, "Emotional regulation supports productivity during challenges."],
      [6, "Regulation Toolbox Lab", SL, "Students will practice strategies for managing strong emotions.", EI_SM, "Different challenges require different regulation strategies."],
      [7, "Pressure Test Simulation", SS, "Students will manage emotions during a challenging team experience.", EI_SM, "Emotional regulation helps students remain effective under pressure."],
      [8, "Checkpoint 2: Regulation Challenge", SL, "Students will demonstrate emotional regulation during challenging situations.", EI_SM, "Checkpoint evidence. Teacher scores Self-Management."],
      [9, "Understanding Emotional Needs", GR, "Students will understand how emotional needs influence behavior.", EI_SOC, "Emotional intelligence requires understanding the needs of others."],
      [10, "Stakeholder Support Lab", SL, "Students will practice identifying emotional needs and selecting appropriate responses.", EI_SOC, "Effective leaders identify and respond to emotional needs."],
      [11, "Community Support Simulation", SS, "Students will respond appropriately to the emotional needs of others.", EI_SOC, "Students learn to provide meaningful support."],
      [12, "Checkpoint 3: Support Challenge", SL, "Students will demonstrate the ability to respond helpfully and appropriately to others' emotions.", EI_SOC, "Checkpoint evidence. Teacher scores Social Awareness."],
      [13, "Relationships During Challenges", SS, "Students will understand how relationships are maintained during difficult situations.", EI_RB, "Strong relationships require maintenance and repair."],
      [14, "Relationship Maintenance Lab", SL, "Students will practice maintaining relationships during disagreement.", EI_RB, "Positive relationships require respectful disagreement."],
      [15, "Trust Under Pressure Challenge", SS, "Students will maintain positive relationships while navigating challenges.", EI_RB, "Trust is tested during difficult situations."],
      [16, "Checkpoint 4: Relationship Challenge", SL, "Students will demonstrate the ability to maintain positive relationships through challenges.", EI_RB, "Checkpoint evidence. Teacher scores Relationship Building."],
      [17, "People, Technology, and Support", GR, "Students will understand when people and technology provide different kinds of support.", EI_AI, "Healthy decision-makers understand the limits of AI."],
      [18, "Digital Wellbeing Lab", SL, "Students will evaluate healthy and unhealthy uses of AI and technology.", EI_AI, "Technology should support, not replace, human relationships."],
      [19, "AI Advice Challenge", SS, "Students will evaluate AI-generated advice and determine when human support is needed.", EI_AI, "Human judgment remains essential."],
      [20, "Checkpoint 5: Digital Wellbeing Challenge", SL, "Students will demonstrate thoughtful decision-making regarding AI and emotional support.", EI_AI, "Checkpoint evidence. Teacher scores Responsible AI & Digital Wellbeing."],
      [21, "CPC Day 1: Future Leaders Expo Committee Launch", SS, "Students will identify stakeholder needs, emotional concerns, and establish committee structures.", RI_ALL, "CPC launch."],
      [22, "CPC Day 2: Stakeholder Advocacy & Planning", SS, "Students will develop support plans that respond to stakeholder needs.", RI_ALL, "CPC development."],
      [23, "CPC Day 3: Expo Crisis Update", SS, "Students will manage emotions, maintain relationships, adapt plans, and evaluate AI recommendations.", RI_ALL, "CPC culmination."],
    ],
  },
  {
    competency: "Collaboration & Teamwork",
    gradeBand: "7/8",
    experienceName: "Load-Bearing Legends",
    rows: [
      [1, "What Makes a Collaborative Leader?", GR, "Students will understand the Collaboration & Teamwork rubric and the characteristics of collaborative leadership.", RI_SC, "Collaborative leaders improve team performance rather than simply contributing individually."],
      [2, "Team Performance Audit", SS, "Students will identify how contributions can improve team performance.", RI_SC, "Leaders improve systems and team performance."],
      [3, "Community Innovation Sprint", SS, "Students will contribute expertise and initiative that strengthen team outcomes.", RI_SC, "Strategic contributions improve outcomes."],
      [4, "Checkpoint 1: Leadership Improvement Challenge", SL, "Students will demonstrate strategic contribution.", RI_SC, "Checkpoint evidence."],
      [5, "Multiple Perspectives Create Better Solutions", GR, "Students will understand how multiple perspectives improve decisions and outcomes.", RI_PI, "Missing perspectives weaken decisions."],
      [6, "Stakeholder Town Hall", SS, "Students will practice synthesizing competing perspectives.", RI_PI, "Leaders synthesize competing viewpoints."],
      [7, "Community Dispute Investigation", SS, "Students will use multiple perspectives to solve a problem.", RI_PI, "Strong solutions emerge from integrating perspectives."],
      [8, "Checkpoint 2: Stakeholder Decision Challenge", SL, "Students will demonstrate the ability to synthesize multiple perspectives.", RI_PI, "Checkpoint evidence."],
      [9, "Accountability Beyond Your Role", GR, "Students will understand collective accountability and leadership responsibility.", RI_SA, "Leaders take responsibility for collective outcomes."],
      [10, "Systems of Accountability Lab", SS, "Students will develop systems that support team accountability.", RI_SA, "Effective teams adapt when circumstances change."],
      [11, "Leadership Through Responsibility", SS, "Students will practice assuming responsibility for overall team success.", RI_SA, "Leaders ensure continuity during disruption."],
      [12, "Checkpoint 3: Team Accountability Challenge", SL, "Students will demonstrate responsibility for overall team success.", RI_SA, "Checkpoint evidence."],
      [13, "Leading Through Uncertainty", GR, "Students will understand how leaders respond to setbacks and uncertainty.", RI_PA, "Adaptation drives improvement."],
      [14, "Adaptation Leadership Lab", SS, "Students will practice leading adaptation efforts during setbacks.", RI_PA, "Leaders guide teams through uncertainty."],
      [15, "Community Project Recovery Challenge", SS, "Students will lead adaptation efforts during a complex setback.", RI_PA, "Effective leaders adapt when information is incomplete."],
      [16, "Checkpoint 4: Adaptation Leadership Challenge", SL, "Students will demonstrate the ability to lead adaptation efforts during setbacks.", RI_PA, "Checkpoint evidence."],
      [17, "Productive Conflict Creates Better Decisions", GR, "Students will understand how conflict can strengthen decisions and relationships.", RI_PC, "Productive conflict strengthens solutions."],
      [18, "Consensus Building Lab", SS, "Students will practice building consensus among competing viewpoints.", RI_PC, "Collaborative leaders build consensus."],
      [19, "Community Trade-Off Challenge", SS, "Students will use conflict and disagreement to strengthen solutions.", RI_PC, "Teams maintain progress through collaborative problem solving."],
      [20, "Checkpoint 5: Consensus Challenge", SL, "Students will demonstrate the ability to build consensus and strengthen relationships through conflict.", RI_PC, "Checkpoint evidence."],
      [21, "CPC Day 1: Tiny House Community Challenge Launch", SL, "Students will establish team systems, analyze stakeholder needs, and develop a community design that balances multiple priorities.", RI_ALL, "CPC launch."],
      [22, "CPC Day 2: Community Design & Construction", SL, "Students will synthesize perspectives and assume responsibility for successful project completion.", RI_ALL, "CPC development."],
      [23, "CPC Day 3: Community Planning Update", SL, "Students will respond to setbacks, adapt plans, and build consensus around final decisions.", RI_ALL, "CPC culmination."],
    ],
  },
  {
    competency: "Emotional Intelligence",
    gradeBand: "7/8",
    experienceName: "Chaos Constructors",
    rows: [
      [1, "What Makes an Emotionally Influential Leader?", GR, "Students will understand the Emotional Intelligence rubric and the characteristics of emotional leadership.", EI_SA, "Emotionally influential leaders understand how emotions impact decisions and outcomes."],
      [2, "Logic Lab: Emotional Leadership in Action", SL, "Students will identify emotional patterns and their impact on decisions.", EI_SA, "Emotional patterns influence decisions and performance."],
      [3, "Escape Route Challenge", SL, "Students will use emotional awareness to improve decision-making.", EI_SA, "Emotional awareness improves decision quality."],
      [4, "Checkpoint 1: Leadership Decision Challenge", SS, "Students will demonstrate the ability to use emotional awareness to make better decisions.", EI_SA, "Checkpoint evidence."],
      [5, "Obstacle Course Under Pressure", GR, "Students will understand how emotional regulation influences group performance.", EI_SM, "Composure helps teams remain productive under pressure."],
      [6, "Regulation Toolbox Lab", SL, "Students will practice emotional regulation strategies during high-pressure situations.", EI_SM, "Different situations require different regulation strategies."],
      [7, "Leadership Under Stress", SS, "Students will regulate emotions while supporting group productivity.", EI_SM, "Emotional leaders remain effective during uncertainty."],
      [8, "Checkpoint 2: Composure Challenge", SS, "Students will demonstrate emotional regulation under pressure.", EI_SM, "Checkpoint evidence."],
      [9, "Understanding Emotional Needs", GR, "Students will understand how emotional needs influence behavior and group performance.", EI_SOC, "Effective leaders recognize emotional needs."],
      [10, "Stakeholder Support Lab", SL, "Students will practice identifying emotional needs and selecting supportive responses.", EI_SOC, "Supporting others requires recognizing emotional needs."],
      [11, "Community Leadership Simulation", SS, "Students will adapt behavior to support others.", EI_SOC, "Leaders adapt behavior to support others."],
      [12, "Checkpoint 3: Stakeholder Support Challenge", SS, "Students will demonstrate the ability to recognize emotional needs and adapt behavior accordingly.", EI_SOC, "Checkpoint evidence."],
      [13, "Blind Builder Challenge", GR, "Students will understand how trust is built and maintained across groups.", EI_RB, "Trust is built through reliability and communication."],
      [14, "Minefield Challenge", SL, "Students will practice behaviors that strengthen trust and relationships.", EI_RB, "Trust develops through communication and support."],
      [15, "Resource Scarcity Challenge", SS, "Students will strengthen relationships during challenging situations.", EI_RB, "Positive relationships support collaboration during challenges."],
      [16, "Checkpoint 4: Trust & Relationships Challenge", SS, "Students will demonstrate the ability to build trust and strengthen relationships.", EI_RB, "Checkpoint evidence."],
      [17, "AI vs Human Coach", GR, "Students will understand how technology and AI influence decisions and behavior.", EI_AI, "Leaders know when human judgment should override technology."],
      [18, "Digital Influence Lab", SL, "Students will evaluate technology's influence on decisions and wellbeing.", EI_AI, "Technology influences decisions in subtle ways."],
      [19, "AI Leadership Challenge", SS, "Students will evaluate AI-generated recommendations and maintain independent judgment.", EI_AI, "Human judgment remains essential."],
      [20, "Checkpoint 5: Digital Judgment Challenge", SS, "Students will demonstrate healthy boundaries with technology and sound independent judgment.", EI_AI, "Checkpoint evidence."],
      [21, "CPC Day 1: Community Connection Center Launch", SS, "Students will identify stakeholder needs, emotional concerns, and establish systems for operating the Community Connection Center.", RI_ALL, "CPC launch."],
      [22, "CPC Day 2: Community Operations Planning", SS, "Students will allocate resources and manage operations while balancing stakeholder needs and maintaining trust.", RI_ALL, "CPC development."],
      [23, "CPC Day 3: Community Operations Update", SS, "Students will respond to setbacks, emotional challenges, conflicting stakeholder concerns, and AI recommendations.", RI_ALL, "CPC culmination."],
    ],
  },
];

/** Grade bands that have a built-in S&S, per competency (for the UI). */
export function builtinCompetencies(): string[] {
  return Array.from(new Set(SECTIONS.map((s) => s.competency)));
}
export function hasBuiltinScope(competency: string, gradeBand: string): boolean {
  return SECTIONS.some((s) => s.competency === competency && s.gradeBand === gradeBand);
}

function lessonTypeFor(title: string, designType: string): { lessonType: string; assessment: string } {
  const cpc = /\bCPC\b/i.test(title);
  const cp = title.match(/Checkpoint\s*(\d+)/i);
  if (cpc) {
    const dayNum = title.match(/CPC Day\s*(\d+)/i)?.[1] ?? "";
    return { lessonType: "CPC - Live Performance", assessment: dayNum ? `CPC Day ${dayNum}` : "CPC" };
  }
  return { lessonType: designType, assessment: cp ? `Checkpoint ${cp[1]}` : "None" };
}

function aiStageFor(title: string, rubricIndicator: string): string {
  if (rubricIndicator !== EI_AI) return "None";
  if (/checkpoint/i.test(title)) return "Auditor";
  if (/challenge/i.test(title)) return "Auditor";
  if (/lab/i.test(title)) return "Thought Partner";
  return "Witness";
}

/** Serialize the bundled rubric for a competency + dyad into text for grounding. */
function rubricText(competency: string, gradeBand: GradeBand): string {
  const r = rubricFor(competency, gradeBand);
  if (!r) return "";
  const lines = r.map(
    (i, n) =>
      `${n + 1}. ${i.dimension} — ${i.indicator}\n   Proficient: ${i.proficient}\n   Advanced: ${i.advanced}`
  );
  return `RUBRIC — ${competency} (${gradeBand}):\n${lines.join("\n")}`;
}

/**
 * Build a full ScopeSequence for a competency + grade band deterministically from
 * the bundled data. Returns null when there is no built-in section.
 */
export function buildBuiltinScope(competency: string, gradeBand: string): ScopeSequence | null {
  const section = SECTIONS.find((s) => s.competency === competency && s.gradeBand === gradeBand);
  if (!section) return null;

  // Group days into weeks by rubric-indicator block (a new week starts whenever
  // the rubric indicator changes from the previous day).
  const weeks: ScopeWeek[] = [];
  let currentIndicator: string | null = null;
  let week: ScopeWeek | null = null;
  let dayInWeek = 0;
  for (const [absDay, title, designType, lo, rubricIndicator, connection] of section.rows) {
    if (rubricIndicator !== currentIndicator) {
      currentIndicator = rubricIndicator;
      dayInWeek = 0;
      week = { week: weeks.length + 1, title: rubricIndicator, indicator: rubricIndicator, days: [] };
      weeks.push(week);
    }
    dayInWeek += 1;
    const { lessonType, assessment } = lessonTypeFor(title, designType);
    const day: ScopeDay = {
      day: `Week ${week!.week}, Day ${dayInWeek}`,
      lessonTitle: title,
      lessonType,
      lessonTypeInferred: false,
      lo,
      experienceObjective: "", // produced downstream from the Experience Genome
      activity: "", // produced downstream from the Experience Genome
      rubricIndicator,
      assessment,
      connection,
      materialsCost: "",
      aiStage: aiStageFor(title, rubricIndicator),
    };
    // Keep the absolute S&S day number visible in the label for reference.
    day.day = `Week ${week!.week}, Day ${dayInWeek} (S&S Day ${absDay})`;
    week!.days.push(day);
  }

  const cpcFrame =
    section.rows.find((r) => /\bCPC Day 1\b/i.test(r[1]))?.[1].replace(/^CPC Day 1:\s*/i, "").replace(/\s*Launch$/i, "") ??
    "";
  const scope: ScopeSequence = {
    competency,
    gradeBand,
    experienceName: section.experienceName,
    cpcFrame,
    cpcProblemStatement: "",
    overview: `Built-in Cycle 1 Scope & Sequence: ${competency} for grades ${gradeBand} ("${section.experienceName}"). ${section.rows.length} days across ${weeks.length} rubric-indicator blocks, culminating in the CPC.`,
    weeks,
    rubricText: rubricText(competency, gradeBand as GradeBand),
    cpcText: cpcExemplarFor(competency) ?? "",
  };
  return scope;
}