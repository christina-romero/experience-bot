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

// Design Model has no column in the Genome; map it to preferred Experience Phases.
const DESIGN_MODEL_PHASES: Record<string, string[]> = {
  gradual_release: ["Launch", "Skill Build"],
  skills_lab: ["Skill Build", "Iteration"],
  simulation_synthesis: ["Core Challenge", "Iteration"],
  cpc: ["Core Challenge", "Celebration"],
};

type Query = {
  competency: string;
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

  // 2 Dyad (required)
  if (cell(row, "Grade Band") !== q.band) return -1;
  score += 80;

  // 3 Design Model (via Experience Phase)
  const phase = cell(row, "Experience Phase");
  if ((DESIGN_MODEL_PHASES[q.designKey] ?? []).includes(phase)) score += 40;

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

  const chosen = new Map<string, { row: Row; score: number }>();
  for (const day of wk.days) {
    const q: Query = {
      competency: scope.competency,
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
  const seeds = [...chosen.values()].sort((a, b) => b.score - a.score).slice(0, 15).map((x) => x.row);
  if (seeds.length === 0) return "";

  // Struggles referenced by the chosen seeds (for the Productive Struggles slice).
  const struggles = new Set(seeds.map((r) => norm(cell(r, "Productive Struggle"))).filter(Boolean));
  const qc = norm(scope.competency);

  const blocks = [
    `RETRIEVED EXPERIENCE SEEDS (${seeds.length}) — ranked by competency, dyad, Design Model, rubric indicator, product, materials, quality:`,
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