/**
 * Shared types + JSON Schemas for Claude structured outputs.
 *
 * Anthropic structured outputs require every object to set
 * `additionalProperties: false` and list every property in `required`, and they
 * do not support min/max constraints. The schemas below follow those rules.
 */

// ---------- TypeScript types (used across API + UI + exporters) ----------

export interface ScopeDay {
  day: string; // "Week 1, Day 1"
  lessonTitle: string;
  lessonType: string;
  lessonTypeInferred: boolean; // true when the type was inferred, not stated in the S&S
  lo: string; // Learning Objective (the competency skill)
  experienceObjective: string;
  activity: string;
  rubricIndicator: string;
  assessment: string; // "None" | "Checkpoint N: <indicator>" | "CPC Launch" | "CPC Day N"
  connection: string; // FORWARD link
  materialsCost: string;
  aiStage: string; // "None" | "Witness" | "Thought Partner" | "Auditor"
}

export interface ScopeWeek {
  week: number;
  title: string;
  indicator: string;
  days: ScopeDay[];
}

export interface ScopeSequence {
  competency: string;
  gradeBand: string;
  experienceName: string; // detected title of the experience/unit, or "" if none
  cpcFrame: string;
  cpcProblemStatement: string;
  overview: string;
  weeks: ScopeWeek[];
  // Raw user-provided source materials, attached after parsing so they travel
  // with the scope and ground lesson-plan generation. Not part of the Claude
  // output schema.
  rubricText?: string;
  cpcText?: string;
  facilitationText?: string; // classified Facilitation Library source, if provided
  genomeText?: string; // classified Future2 Experience Genome source, if provided
}

export interface LessonPhase {
  name: string; // "Do Now" | "Direct Instruction" | ...
  minutes: string;
  slideMapping: string; // which student-facing slide type
  steps: string; // run-it-cold detail
  facilitation: string; // named move from the library
  sentenceStems: string;
  teacherGuidance: string;
}

export interface LessonPlan {
  day: string; // "Week 1, Day 1"
  lessonTitle: string;
  lessonType: string;
  competency: string;
  rubricIndicator: string;
  lo: string;
  experienceObjective: string;
  connection: string;
  whatMustBeTrue: {
    readWrite: string;
    noOptOut: string;
    urgency: string;
    groupings: string;
  };
  materials: { student: string; teacher: string };
  phases: LessonPhase[];
  assessment: string;
  // Filled only for CPC / Live Performance days; empty strings otherwise.
  performanceCapture: {
    cpcLaunch: string;
    challengeConstraint: string;
    noFlyList: string;
    individualEvidence: string;
    binaryTest: string;
  };
}

export interface LessonWeek {
  week: number;
  plans: LessonPlan[];
}

// ---- Two Kings: the canonical Access-Model spine (Stage A, source of record) ----
export interface CanonicalDay {
  day: string; // "Week 1, Day 1"
  mechanismWhy: string; // the capability being built + the mechanism that builds it
  unlock: string; // what students EARN by demonstrating readiness (autonomy/harder challenge)
  binaryCheck2Pass: string; // pass/fail success condition against an external bar
  gradeBandEscalation: string; // how this is harder for the dyad than the band below
  guideMoves: string; // facilitate/coach/question/observe/hold-the-line (no lecture/rescue)
}
export interface CanonicalWeek {
  week: number;
  days: CanonicalDay[];
}

// ---- Two Kings: the fidelity gate (Stage C, derivative-vs-canonical diff) ----
export interface FidelityField {
  pass: boolean;
  note: string; // one concrete sentence: what holds, or exactly what was softened/dropped
}
export interface FidelityDay {
  day: string;
  unlock: FidelityField; // earned progression still explicit + tied to demonstrated capability
  binaryMastery: FidelityField; // still pass/fail vs external bar, not vague completion language
  mechanismWhy: FidelityField; // still names how the activity builds the skill, not rubric-evidence
  escalation: FidelityField; // grade-band escalation still present
  experiential: FidelityField; // in-action core (not all discussion/writing) + real vehicle + skill practiced before named
  dayPass: boolean; // true only when all protected fields pass
}
export interface FidelityWeek {
  week: number;
  days: FidelityDay[];
  weekPass: boolean; // true only when every day passes
}

// ---------- JSON Schemas for structured output ----------

const str = { type: "string" } as const;

const scopeDaySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    day: str,
    lessonTitle: str,
    lessonType: str,
    lessonTypeInferred: { type: "boolean" },
    lo: str,
    experienceObjective: str,
    activity: str,
    rubricIndicator: str,
    assessment: str,
    connection: str,
    materialsCost: str,
    aiStage: str,
  },
  required: [
    "day", "lessonTitle", "lessonType", "lessonTypeInferred", "lo", "experienceObjective", "activity",
    "rubricIndicator", "assessment", "connection", "materialsCost", "aiStage",
  ],
} as const;

export const scopeSequenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    competency: str,
    gradeBand: str,
    experienceName: str,
    cpcFrame: str,
    cpcProblemStatement: str,
    overview: str,
    weeks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          week: { type: "integer" },
          title: str,
          indicator: str,
          days: { type: "array", items: scopeDaySchema },
        },
        required: ["week", "title", "indicator", "days"],
      },
    },
  },
  required: ["competency", "gradeBand", "experienceName", "cpcFrame", "cpcProblemStatement", "overview", "weeks"],
} as const;

const lessonPhaseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: str,
    minutes: str,
    slideMapping: str,
    steps: str,
    facilitation: str,
    sentenceStems: str,
    teacherGuidance: str,
  },
  required: ["name", "minutes", "slideMapping", "steps", "facilitation", "sentenceStems", "teacherGuidance"],
} as const;

const lessonPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    day: str,
    lessonTitle: str,
    lessonType: str,
    competency: str,
    rubricIndicator: str,
    lo: str,
    experienceObjective: str,
    connection: str,
    whatMustBeTrue: {
      type: "object",
      additionalProperties: false,
      properties: { readWrite: str, noOptOut: str, urgency: str, groupings: str },
      required: ["readWrite", "noOptOut", "urgency", "groupings"],
    },
    materials: {
      type: "object",
      additionalProperties: false,
      properties: { student: str, teacher: str },
      required: ["student", "teacher"],
    },
    phases: { type: "array", items: lessonPhaseSchema },
    assessment: str,
    performanceCapture: {
      type: "object",
      additionalProperties: false,
      properties: {
        cpcLaunch: str,
        challengeConstraint: str,
        noFlyList: str,
        individualEvidence: str,
        binaryTest: str,
      },
      required: ["cpcLaunch", "challengeConstraint", "noFlyList", "individualEvidence", "binaryTest"],
    },
  },
  required: [
    "day", "lessonTitle", "lessonType", "competency", "rubricIndicator", "lo",
    "experienceObjective", "connection", "whatMustBeTrue", "materials", "phases", "assessment",
    "performanceCapture",
  ],
} as const;

export const lessonWeekSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    week: { type: "integer" },
    plans: { type: "array", items: lessonPlanSchema },
  },
  required: ["week", "plans"],
} as const;

// ---- Two Kings canonical spine (Stage A) ----
const canonicalDaySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    day: str,
    mechanismWhy: str,
    unlock: str,
    binaryCheck2Pass: str,
    gradeBandEscalation: str,
    guideMoves: str,
  },
  required: ["day", "mechanismWhy", "unlock", "binaryCheck2Pass", "gradeBandEscalation", "guideMoves"],
} as const;

export const canonicalWeekSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    week: { type: "integer" },
    days: { type: "array", items: canonicalDaySchema },
  },
  required: ["week", "days"],
} as const;

// ---- Two Kings fidelity gate (Stage C) ----
const fidelityFieldSchema = {
  type: "object",
  additionalProperties: false,
  properties: { pass: { type: "boolean" }, note: str },
  required: ["pass", "note"],
} as const;

const fidelityDaySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    day: str,
    unlock: fidelityFieldSchema,
    binaryMastery: fidelityFieldSchema,
    mechanismWhy: fidelityFieldSchema,
    escalation: fidelityFieldSchema,
    experiential: fidelityFieldSchema,
    dayPass: { type: "boolean" },
  },
  required: ["day", "unlock", "binaryMastery", "mechanismWhy", "escalation", "experiential", "dayPass"],
} as const;

export const fidelityWeekSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    week: { type: "integer" },
    days: { type: "array", items: fidelityDaySchema },
    weekPass: { type: "boolean" },
  },
  required: ["week", "days", "weekPass"],
} as const;
