"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  VerticalAlign,
  PageBreak,
} from "docx";
import type { ScopeSequence, LessonWeek, LessonPlan, LessonPhase } from "./schemas";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- palette (mirrors the Lesson Planning Template's look) ----
const HEADER_FILL = "EFEFEF"; // light gray label cells
const SECTION_FILL = "1F3864"; // dark blue full-width section banners
const PHASE_FILL = "2E75B6"; // medium blue phase header row
const WHITE = "FFFFFF";

const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: "BFBFBF" };
const tableBorders = {
  top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder,
  insideHorizontal: thinBorder, insideVertical: thinBorder,
};

function splitLines(text: string): string[] {
  const t = (text ?? "").toString();
  const lines = t.split("\n");
  return lines.length ? lines : [""];
}

function h(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level, spacing: { before: 200, after: 80 } });
}

function p(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value || "" }),
    ],
  });
}

function gap() {
  return new Paragraph({ text: "", spacing: { after: 100 } });
}

type CellOpts = {
  bold?: boolean;
  width?: number;
  fill?: string;
  color?: string;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
};

function cell(text: string, opts?: CellOpts) {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts?.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: splitLines(text).map(
      (line) =>
        new Paragraph({
          alignment: opts?.align,
          spacing: { after: 0 },
          children: [new TextRun({ text: line, bold: opts?.bold, color: opts?.color })],
        })
    ),
  });
}

// Full-width banner row, e.g. "WHAT MUST BE TRUE", "LESSON FLOW".
function banner(text: string, opts?: { fill?: string; color?: string }) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        children: [
          cell(text, {
            bold: true,
            fill: opts?.fill ?? SECTION_FILL,
            color: opts?.color ?? WHITE,
            align: AlignmentType.CENTER,
            width: 100,
          }),
        ],
      }),
    ],
  });
}

// Two-column label / value table.
function kvTable(rows: [string, string][], labelWidth = 26) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            cell(label, { bold: true, width: labelWidth, fill: HEADER_FILL }),
            cell(value, { width: 100 - labelWidth }),
          ],
        })
    ),
  });
}

// Header row (bold, shaded) over a single values row.
function headedTable(headers: string[], values: string[], widths: number[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((hd, i) =>
          cell(hd, { bold: true, fill: HEADER_FILL, width: widths[i], align: AlignmentType.CENTER })
        ),
      }),
      new TableRow({
        children: values.map((v, i) => cell(v, { width: widths[i], align: AlignmentType.CENTER })),
      }),
    ],
  });
}

// One phase block, matching the template's per-phase layout.
function phaseTable(ph: LessonPhase) {
  const labeledRow = (label: string, value: string) =>
    new TableRow({
      children: [
        cell(label, { bold: true, width: 28, fill: HEADER_FILL }),
        cell(value, { width: 72 }),
      ],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        children: [
          cell(ph.name, { bold: true, width: 28, fill: PHASE_FILL, color: WHITE }),
          cell(ph.minutes, { bold: true, width: 72, fill: PHASE_FILL, color: WHITE }),
        ],
      }),
      labeledRow("Slide mapping", ph.slideMapping),
      labeledRow("What students do", ph.steps),
      labeledRow("Facilitation", ph.facilitation),
      labeledRow("Sentence stems", ph.sentenceStems),
      labeledRow("Guide check-ins and stop points", ph.teacherGuidance),
    ],
  });
}

function buildScopeSequenceDoc(scope: ScopeSequence): Document {
  const children: (Paragraph | Table)[] = [];

  children.push(new Paragraph({
    text: `Scope & Sequence — ${scope.competency} (${scope.gradeBand})`,
    heading: HeadingLevel.TITLE,
  }));
  children.push(new Paragraph({ children: [new TextRun({ text: "Future 2 Experience — 6 weeks x 5 days x 55 min", italics: true })], spacing: { after: 120 } }));
  children.push(p("CPC Frame", scope.cpcFrame));
  children.push(p("CPC Problem Statement", scope.cpcProblemStatement));
  children.push(new Paragraph({ children: [new TextRun({ text: "Overview: ", bold: true }), new TextRun({ text: scope.overview })], spacing: { after: 160 } }));

  for (const wk of scope.weeks) {
    children.push(h(`Week ${wk.week}: ${wk.title} — ${wk.indicator}`));
    const header = new TableRow({
      tableHeader: true,
      children: [
        cell("Day", { bold: true, width: 10, fill: HEADER_FILL }),
        cell("Lesson / Type", { bold: true, width: 20, fill: HEADER_FILL }),
        cell("LO / Experience Objective", { bold: true, width: 24, fill: HEADER_FILL }),
        cell("Activity", { bold: true, width: 20, fill: HEADER_FILL }),
        cell("Assessment / AI", { bold: true, width: 13, fill: HEADER_FILL }),
        cell("Connection (forward)", { bold: true, width: 13, fill: HEADER_FILL }),
      ],
    });
    const rows = wk.days.map((d) =>
      new TableRow({
        children: [
          cell(d.day),
          cell(`${d.lessonTitle}\n(${d.lessonType})`),
          cell(`LO: ${d.lo}\nEO: ${d.experienceObjective}\nIndicator: ${d.rubricIndicator}`),
          cell(`${d.activity}\nMaterials: ${d.materialsCost}`),
          cell(`${d.assessment}\nAI: ${d.aiStage}`),
          cell(d.connection),
        ],
      })
    );
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [header, ...rows],
    }));
  }

  return new Document({ sections: [{ children }] });
}

export function scopeSequenceFileName(scope: ScopeSequence) {
  return `F2_ScopeSequence_${scope.competency.replace(/[^a-z0-9]+/gi, "_")}_${scope.gradeBand.replace("/", "-")}`;
}

export async function exportScopeSequenceDocx(scope: ScopeSequence) {
  const blob = await Packer.toBlob(buildScopeSequenceDoc(scope));
  download(blob, `${scopeSequenceFileName(scope)}.docx`);
}

export async function scopeSequenceDocxBase64(scope: ScopeSequence): Promise<string> {
  return Packer.toBase64String(buildScopeSequenceDoc(scope));
}

// Render ONE lesson plan in the Lesson Planning Template's layout.
function planChildren(scope: ScopeSequence, plan: LessonPlan): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const week = plan.day.match(/week\s*(\d+)/i)?.[1] ?? "";
  const dayNum = plan.day.match(/day\s*(\d+)/i)?.[1] ?? "";

  out.push(new Paragraph({ text: `${plan.day}: ${plan.lessonTitle}`, heading: HeadingLevel.HEADING_1, spacing: { after: 80 } }));
  out.push(banner((plan.lessonType || "").toUpperCase()));
  out.push(gap());

  out.push(headedTable(
    ["Competency", "Rubric Indicator", "Dyad"],
    [plan.competency, plan.rubricIndicator, scope.gradeBand],
    [40, 40, 20],
  ));
  out.push(gap());

  out.push(headedTable(
    ["Module", "Week", "Day", "Lesson Length", "Assessment Today"],
    ["", week, dayNum, "55 minutes", plan.assessment],
    [16, 12, 12, 24, 36],
  ));
  out.push(gap());

  out.push(kvTable([
    ["Lesson Objective (LO)", plan.lo],
    ["Experience Objective (EO)", plan.experienceObjective],
    ["Connection", plan.connection],
  ]));
  out.push(gap());

  out.push(banner("WHAT MUST BE TRUE"));
  out.push(kvTable([
    ["Read and Write Today", plan.whatMustBeTrue.readWrite],
    ["No Opt Out", plan.whatMustBeTrue.noOptOut],
    ["Urgency", plan.whatMustBeTrue.urgency],
    ["Intentional Groupings and Setup", plan.whatMustBeTrue.groupings],
  ]));
  out.push(gap());

  out.push(kvTable([
    ["Materials — Student", plan.materials.student],
    ["Materials — Teacher", plan.materials.teacher],
  ]));
  out.push(gap());

  out.push(banner("LESSON FLOW"));
  for (const ph of plan.phases) {
    out.push(gap());
    out.push(phaseTable(ph));
  }
  out.push(gap());

  out.push(banner("CHECKPOINT / CPC CAPTURE"));
  out.push(kvTable([["Assessment Today", plan.assessment]]));

  return out;
}

function buildLessonWeekDoc(scope: ScopeSequence, wk: LessonWeek): Document {
  const children: (Paragraph | Table)[] = [];
  children.push(new Paragraph({
    text: `Lesson Plans — Week ${wk.week} — ${scope.competency} (${scope.gradeBand})`,
    heading: HeadingLevel.TITLE,
    spacing: { after: 160 },
  }));

  wk.plans.forEach((plan, i) => {
    if (i > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(...planChildren(scope, plan));
  });

  return new Document({ sections: [{ children }] });
}

export function lessonWeekFileName(scope: ScopeSequence, wk: LessonWeek) {
  return `F2_LessonPlans_Week${wk.week}_${scope.competency.replace(/[^a-z0-9]+/gi, "_")}_${scope.gradeBand.replace("/", "-")}`;
}

export async function exportLessonWeekDocx(scope: ScopeSequence, wk: LessonWeek) {
  const blob = await Packer.toBlob(buildLessonWeekDoc(scope, wk));
  download(blob, `${lessonWeekFileName(scope, wk)}.docx`);
}

export async function lessonWeekDocxBase64(scope: ScopeSequence, wk: LessonWeek): Promise<string> {
  return Packer.toBase64String(buildLessonWeekDoc(scope, wk));
}