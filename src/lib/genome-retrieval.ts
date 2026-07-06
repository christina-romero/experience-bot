/**
 * Retrieval-first Genome access.
 *
 * The full Future2 Experience Genome stays bundled (genome-data.ts). Instead of
 * injecting the whole workbook into every generation, we retrieve only the most
 * relevant Experience Genome seeds for the week's days, ranked by a fixed
 * priority, then attach the supporting instructional collections those seeds
 * need. Optimized for instructional quality, consistency, speed, and low tokens.
 *
 * Ranking priority (do not change the order):
 *   1 Competency (required)   2 Dyad (required)      3 Design Model (required)
 *   4 Rubric Indicator        5 Lesson phase         6 Student product
 *   7 Duration                8 Energy level         9 Materials   10 Quality rating
 */

import { GENOME_WORKBOOK } from "./genome-data";
import { canonicalLessonType } from "./template-registry";
import type { ScopeSequence } from "./schemas";

type Row = Record<string, string | number>;
type Sheet = { sheetName: string; columns: string[]; rows: Row[] };
const SHEETS = GENOME_WORKBOOK as unknown as Sheet[];

function sheet(name: string): Sheet | undefined {
  return SHEETS.find((s) => s.sheetName === name);
}
function cell(row: Row, key: string): string {
  const v = row[key];
  return v == null ? "" : String(v).trim();
}
function norm(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function dyadToBand(dyad: string): string {
  const d = (dyad || "").replace(/\s/g, "");
  if (d.includes("3") && d.includes("4")) return "3rd-4th";
  if (d.includes("5") && d.includes("6")) return "5th-6th";
  if (d.includes("7") && d.includes("8")) return "7th-8th";
  return "";
}

/**
 * TODO (Genome schema — future first-class retrieval fields):
 * Add two metadata columns to the Future2 Experience Genome workbook. Once
 * populated, they REPLACE the heuristics below (kept only as fallbacks):
 *   1. "Primary Competency Behavior" — the single observable behavior each seed
 *      best trains (e.g. "resolves disagreement"). Retrieval will match it EXACTLY
 *      to the day's determined behavior instead of synonym-matching the task text.
 *   2. "Preferred Design Model" — the Design Model each seed fits ("Gradual Release
 *      and Discussion" / "Skills Lab" / "Simulation and Synthesis" / "CPC").
 *      Retrieval will match it EXACTLY instead of mapping Design Model -> phase.
 * The code below already reads these columns when present; until then it uses the
 * semantic behavior matching and the Design-Model -> Experience-Phase mapping.
 */
const COL_PRIMARY_BEHAVIOR = "Primary Competency Behavior";
const COL_PREFERRED_DESIGN_MODEL = "Preferred Design Model";

// Design Model has no column in the Genome yet; map it to preferred Experience Phases.
const DESIGN_MODEL_PHASES: Record<string, string[]> = {
  gradual_release: ["Launch", "Skill Build"],
  skills_lab: ["Skill Build", "Iteration"],
  simulation_synthesis: ["Core Challenge", "Iteration"],
  cpc: ["Core Challenge", "Celebration"],
};

type Query = {
  competency: string;
  behaviors: string[]; // today's primary competency behavior(s) — the action students must demonstrate
  band: string;
  designKey: string;
  rubricIndicator?: string;
  studentProduct?: string;
  materials?: string;
};

function keywordHits(hay: string, needle: string, minLen = 4): number {
  const words = norm(needle).split(" ").filter((w) => w.length > minLen);
  return words.filter((w) => hay.includes(w)).length;
}

/** The observable competency behaviors for a competency (Competency Behaviors sheet). */
function competencyBehaviorList(competency: string): string[] {
  const s = sheet("Competency Behaviors");
  if (!s) return [];
  const qc = norm(competency);
  return s.rows
    .filter((r) => norm(cell(r, "Competency")) === qc)
    .map((r) => cell(r, "Observable Behavior"))
    .filter(Boolean);
}

/** Determine today's primary competency behavior(s) from the day's text. */
function pickDayBehaviors(all: string[], dayText: string): string[] {
  const t = norm(dayText);
  const scored = all
    .map((b) => ({ b, s: (t.includes(norm(b)) ? 100 : 0) + keywordHits(t, b, 3) * 10 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.length ? scored.slice(0, 2).map((x) => x.b) : all;
}

// Behavior word -> activity-vocabulary synonyms/stems. Seeds all share the same
// generic Observable Behaviors list, so we match a behavior's ACTION words (and
// their synonyms) against each seed's actual task text to rank by demonstration.
const BEHAVIOR_SYNONYMS: Record<string, string[]> = {
  resolves: ["resolve", "settle", "agree", "consensus", "compromise", "negoti"],
  disagreement: ["disagree", "conflict", "argue", "dispute", "negoti", "trade", "fair", "consensus", "compromise"],
  disagreements: ["disagree", "conflict", "negoti", "trade", "fair", "consensus", "compromise"],
  shares: ["share", "split", "divide", "distribut", "fair"],
  roles: ["role", "assign", "captain", "recorder", "job", "position"],
  coordinates: ["coordinat", "sync", "synchron", "turn", "order", "sequence", "pace", "timing", "time"],
  timing: ["time", "sync", "synchron", "pace", "turn", "order", "sequence"],
  invites: ["invite", "input", "idea", "suggest", "propose", "everyone", "voice", "contribut"],
  input: ["input", "idea", "suggest", "propose", "voice", "contribut"],
  supports: ["support", "help", "assist", "encourag"],
  teammates: ["teammate", "team", "peer", "partner"],
  weighs: ["weigh", "tradeoff", "cost", "benefit", "balance", "priorit"],
  tradeoffs: ["tradeoff", "cost", "benefit", "balance", "sacrifice", "priorit"],
  identifies: ["identif", "list", "option", "choice", "find", "spot"],
  options: ["option", "choice", "alternativ", "path"],
  chooses: ["choose", "decide", "select", "pick"],
  strategy: ["strateg", "plan", "approach", "method"],
  revises: ["revise", "adjust", "change", "iterat", "redo", "refine", "improve", "redesign"],
  consequences: ["consequence", "result", "outcome", "fail"],
  explains: ["explain", "justif", "reason", "because", "defend"],
  reasoning: ["reason", "justif", "because", "logic", "explain"],
  separates: ["separat", "sort", "distinguish", "categoriz"],
  evidence: ["evidence", "proof", "cite", "source", "data", "record", "document"],
  inference: ["infer", "conclude", "interpret"],
  tests: ["test", "try", "experiment", "check", "trial"],
  assumptions: ["assum", "guess", "belief", "bias"],
  contradictions: ["contradict", "conflict", "mismatch", "inconsist"],
  claims: ["claim", "statement", "assert"],
  cites: ["cite", "source", "reference", "proof"],
  checks: ["check", "verif", "confirm", "inspect"],
  source: ["source", "origin", "author", "reliab"],
  compares: ["compare", "contrast", "match", "versus"],
  verifies: ["verif", "confirm", "check", "prove"],
  missing: ["missing", "gap", "absent", "unknown"],
  documents: ["document", "record", "log", "write"],
  monitors: ["monitor", "track", "measure", "progress"],
  feedback: ["feedback", "critique", "review", "coach"],
  paraphrases: ["paraphrase", "restate", "summariz", "own words"],
  repairs: ["repair", "fix", "restore", "mend", "reconcil"],
  confusion: ["confus", "unclear", "misunderstand"],
  viewpoints: ["viewpoint", "perspective", "angle", "side", "stakeholder"],
  stakeholder: ["stakeholder", "role", "party", "group", "need"],
  empathy: ["empath", "feel", "care", "understand"],
  values: ["value", "principle", "belief", "fair", "honest", "ethic"],
  resists: ["resist", "refuse", "avoid", "stand"],
  shortcuts: ["shortcut", "cheat", "easy way"],
  impact: ["impact", "harm", "affect", "consequence", "repair"],
  prototypes: ["prototype", "build", "make", "construct", "model", "design"],
  ideas: ["idea", "concept", "design"],
  iterates: ["iterat", "redesign", "revise", "improve", "refine", "retry"],
  constraints: ["constraint", "limit", "budget", "rule"],
  emotions: ["emotion", "feeling", "mood"],
  reactions: ["reaction", "impulse", "response", "emotion"],
  regulates: ["regulat", "calm", "breathe", "reset", "cool", "manage"],
  social: ["social", "cue", "signal", "body"],
  peers: ["peer", "teammate", "partner"],
  conflict: ["conflict", "disagree", "argue", "tension", "repair"],
  names: ["name", "label", "identif", "state"],
  calibrates: ["calibrat", "confidence", "estimate", "predict"],
  confidence: ["confidence", "sure", "certain", "estimate"],
};

function expandBehavior(b: string): string[] {
  const out = new Set<string>();
  for (const w of norm(b).split(" ").filter((w) => w.length > 3)) {
    out.add(w);
    (BEHAVIOR_SYNONYMS[w] ?? []).forEach((s) => out.add(s));
  }
  return [...out];
}

/**
 * How strongly a seed makes students ACTIVELY DEMONSTRATE the target behavior.
 * Matches the behavior's action words + synonyms against the seed's actual task
 * text (Students Will / mechanism / rules / rounds / evidence), not the generic
 * shared behavior list.
 */
function behaviorScore(row: Row, behaviors: string[]): number {
  if (!behaviors.length) return 0;
  // First-class: exact match on the seed's tagged Primary Competency Behavior.
  const tagged = norm(cell(row, COL_PRIMARY_BEHAVIOR));
  if (tagged) return behaviors.some((b) => norm(b) === tagged) ? 80 : 0;
  // Fallback (until the column is populated): semantic match on the task text.
  const hay = norm(
    `${cell(row, "Students Will Statement")} ${cell(row, "Competency Mechanism")} ${cell(row, "Rules")} ` +
      `${cell(row, "Round 1")} ${cell(row, "Round 2")} ${cell(row, "Round 3")} ${cell(row, "Success Criteria")} ` +
      `${cell(row, "Assessment Evidence")}`
  );
  let best = 0;
  for (const b of behaviors) {
    if (hay.includes(norm(b))) {
      best = Math.max(best, 70);
      continue;
    }
    const kws = expandBehavior(b);
    const distinct = new Set(kws.filter((k) => hay.includes(k))).size;
    best = Math.max(best, Math.min(60, distinct * 22));
  }
  return best;
}

/** Score one seed for a query. Returns -1 if it fails a required filter. */
function scoreSeed(row: Row, q: Query): number {
  const qc = norm(q.competency);
  const primary = norm(cell(row, "Primary Competency"));
  const secondary = norm(cell(row, "Secondary Competency"));
  let score = 0;

  // 1 Competency (required)
  if (primary === qc) score += 100;
  else if (secondary === qc) score += 45;
  else return -1;

  // 2 Competency behavior (immediately after competency) — the strongest ranking
  // signal: prefer seeds that make students actively DEMONSTRATE today's behavior.
  score += behaviorScore(row, q.behaviors);

  // 3 Dyad (required)
  if (cell(row, "Grade Band") !== q.band) return -1;
  score += 80;

  // 4 Design Model — first-class exact match on the tagged column when present,
  // otherwise fall back to the Design-Model -> Experience-Phase mapping.
  const taggedDM = cell(row, COL_PREFERRED_DESIGN_MODEL);
  if (taggedDM) {
    if (canonicalLessonType(taggedDM) === q.designKey) score += 40;
  } else {
    const phase = cell(row, "Experience Phase");
    if ((DESIGN_MODEL_PHASES[q.designKey] ?? []).includes(phase)) score += 40;
  }

  // 4 Rubric Indicator
  if (q.rubricIndicator) {
    const hay = norm(
      `${cell(row, "Observable Behaviors")} ${cell(row, "Competency Mechanism")} ${cell(row, "Success Criteria")}`
    );
    if (norm(q.rubricIndicator) && hay.includes(norm(q.rubricIndicator))) score += 20;
    else score += Math.min(15, keywordHits(hay, q.rubricIndicator, 3) * 3);
  }

  // 6 Student product
  if (q.studentProduct) {
    const hay = norm(`${cell(row, "Students Will Statement")} ${cell(row, "Assessment Evidence")}`);
    score += Math.min(10, keywordHits(hay, q.studentProduct) * 2);
  }

  // 9 Materials
  if (q.materials) score += Math.min(4, keywordHits(norm(cell(row, "Materials Needed")), q.materials));

  // 10 Quality rating
  const fid = cell(row, "Fidelity Rating").toLowerCase();
  if (fid === "high") score += 3;
  else if (fid === "medium-high") score += 1;

  return score;
}

function renderSeed(r: Row): string {
  const line = (label: string, key: string) => {
    const v = cell(r, key);
    return v ? `${label}: ${v}` : "";
  };
  const rounds = [1, 2, 3, 4, 5]
    .map((n) => {
      const v = cell(r, `Round ${n}`);
      return v ? `R${n}) ${v}` : "";
    })
    .filter(Boolean)
    .join("  ");
  const header =
    `--- ${cell(r, "Genome ID")} ${cell(r, "Experience Name")} | ${cell(r, "Primary Competency")}` +
    `${cell(r, "Secondary Competency") ? " + " + cell(r, "Secondary Competency") : ""} | ${cell(r, "Grade Band")}` +
    ` | ${cell(r, "Mode")} | ${cell(r, "Energy Level")} energy | phase ${cell(r, "Experience Phase")}` +
    ` | ${cell(r, "Duration")} | fidelity ${cell(r, "Fidelity Rating")} ---`;
  return [
    header,
    line("Students will", "Students Will Statement"),
    line("Competency mechanism", "Competency Mechanism"),
    line("Observable behaviors", "Observable Behaviors"),
    line("Success criteria", "Success Criteria"),
    line("Materials", "Materials Needed"),
    line("Preparation", "Preparation"),
    line("Room setup", "Room Setup"),
    line("Rules", "Rules"),
    rounds ? `Rounds: ${rounds}` : "",
    line("Guide coaching moves", "Guide Coaching Moves"),
    line("Common failure modes", "Common Failure Modes"),
    line("Debrief questions", "Debrief Questions"),
    line("Support scaffolds", "Support Scaffolds"),
    line("Extension opportunities", "Extension Opportunities"),
    line("Adaptable elements", "Adaptable Elements"),
    line("Non-negotiables", "Non-Negotiables"),
    line("Assessment evidence", "Assessment Evidence"),
    line("Productive struggle", "Productive Struggle"),
  ]
    .filter(Boolean)
    .join("\n");
}

function renderCollection(title: string, sheetName: string, filter?: (r: Row) => boolean): string {
  const s = sheet(sheetName);
  if (!s) return "";
  const rows = filter ? s.rows.filter(filter) : s.rows;
  if (rows.length === 0) return "";
  const lines = rows.map((r) =>
    s.columns
      .map((c) => {
        const v = cell(r, c);
        return v ? `${c}: ${v}` : "";
      })
      .filter(Boolean)
      .join(" | ")
  );
  return `${title}\n${lines.join("\n")}`;
}

/**
 * Retrieve the relevant Genome slice for a whole week: union of the top seeds
 * per day (competency + dyad required, ranked by Design Model + indicator +
 * product + materials + quality), clamped to ~5-15, plus supporting collections.
 * Returns "" when nothing matches so generation simply proceeds without it.
 */
export function retrieveGenomeForWeek(scope: ScopeSequence, week: number): string {
  const wk = scope.weeks.find((w) => w.week === week);
  const eg = sheet("Experience Genome");
  const band = dyadToBand(scope.gradeBand);
  if (!wk || !eg || !band) return "";

  const behaviorList = competencyBehaviorList(scope.competency);
  const targetBehaviors = new Set<string>();

  const chosen = new Map<string, { row: Row; score: number }>();
  for (const day of wk.days) {
    const dayText = [day.rubricIndicator, day.lo, day.experienceObjective, day.activity].filter(Boolean).join(" ");
    const behaviors = pickDayBehaviors(behaviorList, dayText);
    behaviors.forEach((b) => targetBehaviors.add(b));
    const q: Query = {
      competency: scope.competency,
      behaviors,
      band,
      designKey: canonicalLessonType(day.lessonType),
      rubricIndicator: day.rubricIndicator,
      studentProduct: [day.experienceObjective, day.activity].filter(Boolean).join(" "),
      materials: day.materialsCost,
    };
    const top = eg.rows
      .map((r) => ({ r, s: scoreSeed(r, q) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6);
    for (const { r, s } of top) {
      const id = cell(r, "Genome ID");
      const prev = chosen.get(id);
      if (!prev || s > prev.score) chosen.set(id, { row: r, score: s });
    }
  }

  // Clamp to 5-15. If too few, backfill with any seed for this competency + band.
  if (chosen.size < 5) {
    const qc = norm(scope.competency);
    for (const r of eg.rows) {
      if (cell(r, "Grade Band") !== band) continue;
      if (norm(cell(r, "Primary Competency")) !== qc && norm(cell(r, "Secondary Competency")) !== qc) continue;
      const id = cell(r, "Genome ID");
      if (!chosen.has(id)) chosen.set(id, { row: r, score: 0 });
      if (chosen.size >= 8) break;
    }
  }
  // Complementary selection: keep the SMALLEST set that covers the arc. Take the
  // single strongest seed per Experience Phase (Launch -> ... -> Celebration) so
  // patterns complement each other instead of duplicating the same instructional
  // problem. Redundant same-phase seeds are dropped in favor of the stronger one.
  const ranked = [...chosen.values()].sort((a, b) => b.score - a.score);
  const PHASE_ORDER = ["Launch", "Skill Build", "Core Challenge", "Iteration", "Reflection", "Celebration"];
  const byPhase = new Map<string, { row: Row; score: number }>();
  for (const c of ranked) {
    const phase = cell(c.row, "Experience Phase") || "Other";
    if (!byPhase.has(phase)) byPhase.set(phase, c); // ranked desc -> keep the STRONGEST per phase
  }
  // One strong pattern per phase, in arc order. No redundant same-phase seeds; if
  // two patterns cover the same phase, only the stronger is kept.
  const selected: { row: Row; score: number }[] = [];
  for (const p of PHASE_ORDER) {
    const c = byPhase.get(p);
    if (c) selected.push(c);
  }
  for (const [p, c] of byPhase) if (!PHASE_ORDER.includes(p)) selected.push(c);
  const seeds = selected.slice(0, 7).map((x) => x.row);
  if (seeds.length === 0) return "";

  // Struggles referenced by the chosen seeds (for the Productive Struggles slice).
  const struggles = new Set(seeds.map((r) => norm(cell(r, "Productive Struggle"))).filter(Boolean));
  const qc = norm(scope.competency);

  const blocks = [
    targetBehaviors.size
      ? `TARGET COMPETENCY BEHAVIORS THIS WEEK (choose patterns where students ACTIVELY DEMONSTRATE these, never merely discuss them): ${[...targetBehaviors].join("; ")}`
      : "",
    `COMPLEMENTARY EXPERIENCE SEEDS (${seeds.length}) — the smallest set that covers the arc, one strong pattern per phase (Launch -> Skill Build -> Core Challenge -> Iteration -> Reflection -> Celebration), each selected by competency, competency behavior, dyad, and Design Model. These complement each other; do not treat them as separate workshops:`,
    seeds.map(renderSeed).join("\n\n"),
    renderCollection(
      "COMPETENCY BEHAVIORS (observable evidence for this competency):",
      "Competency Behaviors",
      (r) => norm(cell(r, "Competency")) === qc
    ),
    renderCollection(
      "PRODUCTIVE STRUGGLES (engineer these into the experience):",
      "Productive Struggles",
      (r) => struggles.size === 0 || [...struggles].some((s) => norm(cell(r, "Struggle Type")).includes(s) || s.includes(norm(cell(r, "Struggle Type"))))
    ),
    renderCollection(
      "REFLECTION BANK (DAR reflection questions for this competency):",
      "Reflection Bank",
      (r) => norm(cell(r, "Competency")) === qc
    ),
    renderCollection("QUALITY GATE (every experience must pass these):", "Quality Gate"),
  ];
  return blocks.filter(Boolean).join("\n\n");
}