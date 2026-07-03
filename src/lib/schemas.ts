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
  cpcFrame: string;
  cpcProblemStatement: string;
  overview: string;
  weeks: ScopeWeek[];
  // Raw user-provided source materials, attached after parsing so they travel
  // with the scope and ground lesson-plan generation. Not part of the Claude
  // output schema.
  rubricText?: string;
  cpcText?: string;
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

export interface Slide {
  n: number;
  kind: string; // "title" | "materials" | "divider" | "content" | "reflection" | "closure" | "attribution"
  phase: string; // "Do Now" | "Direct Instruction" | "Guided Practice" | "Independent Practice" | ...
  heading: string;
  onSlide: string; // student-facing content
  time: string;
  sentenceStems: string[];
  teacherGuidance: string;
  possibleResponses: string[];
}

export interface SlideDeck {
  day: string;
  lessonTitle: string;
  lessonType: string;
  slides: Slide[];
}

// ---------- JSON Schemas for structured output ----------

const str = { type: "string" } as const;
const strArr = { type: "array", items: { type: "string" } } as const;

const scopeDaySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    day: str,
    lessonTitle: str,
    lessonType: str,
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
    "day", "lessonTitle", "lessonType", "lo", "experienceObjective", "activity",
    "rubricIndicator", "assessment", "connection", "materialsCost", "aiStage",
  ],
} as const;

export const scopeSequenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    competency: str,
    gradeBand: str,
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
  required: ["competency", "gradeBand", "cpcFrame", "cpcProblemStatement", "overview", "weeks"],
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

// ---- Gradual Release & Discussion deck: values for the tokenized template ----

export const GR_DECK_FIELDS = [
  "activity",
  "donowTime", "donowPrompt", "donowStem", "donowNotes",
  "stampTime", "stampIdea", "stampStem", "stampNotes",
  "wsTime", "wsScenario", "wsStem", "wsNotes",
  "ind1", "ind1Look", "ind2", "ind2Look", "ind3", "ind3Look", "ind4", "ind4Look", "ind5", "ind5Look",
  "hohTime", "hohScenario", "hohStem", "hohNotes",
  "itTime", "itTask", "itStem", "itNotes",
  "reflectQ1", "reflectQ2", "reflectQ3", "reflectNotes",
  "closureKey", "closureNotes",
  "attribution",
] as const;

export type GrDeckTokens = Record<(typeof GR_DECK_FIELDS)[number], string>;

export const grDeckTokensSchema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(GR_DECK_FIELDS.map((f) => [f, str])),
  required: [...GR_DECK_FIELDS],
} as const;

const slideSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    n: { type: "integer" },
    kind: str,
    phase: str,
    heading: str,
    onSlide: str,
    time: str,
    sentenceStems: strArr,
    teacherGuidance: str,
    possibleResponses: strArr,
  },
  required: ["n", "kind", "phase", "heading", "onSlide", "time", "sentenceStems", "teacherGuidance", "possibleResponses"],
} as const;

export const slideDeckSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    day: str,
    lessonTitle: str,
    lessonType: str,
    slides: { type: "array", items: slideSchema },
  },
  required: ["day", "lessonTitle", "lessonType", "slides"],
} as const;