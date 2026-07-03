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
} from "docx";
import type { ScopeSequence, LessonWeek } from "./schemas";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

function cell(text: string, opts?: { bold?: boolean; width?: number }) {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: text || "", bold: opts?.bold })] })],
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
  });
}

const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" };
const tableBorders = {
  top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder,
  insideHorizontal: thinBorder, insideVertical: thinBorder,
};

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
        cell("Day", { bold: true, width: 10 }),
        cell("Lesson / Type", { bold: true, width: 20 }),
        cell("LO / Experience Objective", { bold: true, width: 24 }),
        cell("Activity", { bold: true, width: 20 }),
        cell("Assessment / AI", { bold: true, width: 13 }),
        cell("Connection (forward)", { bold: true, width: 13 }),
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

function buildLessonWeekDoc(scope: ScopeSequence, wk: LessonWeek): Document {
  const children: (Paragraph | Table)[] = [];
  children.push(new Paragraph({
    text: `Lesson Plans — Week ${wk.week} — ${scope.competency} (${scope.gradeBand})`,
    heading: HeadingLevel.TITLE,
  }));

  for (const plan of wk.plans) {
    children.push(h(`${plan.day}: ${plan.lessonTitle}`, HeadingLevel.HEADING_1));
    children.push(p("Lesson Type", plan.lessonType));
    children.push(p("Competency / Indicator", `${plan.competency} — ${plan.rubricIndicator}`));
    children.push(p("Learning Objective", plan.lo));
    children.push(p("Experience Objective", plan.experienceObjective));
    children.push(p("Connection (forward)", plan.connection));
    children.push(p("Assessment", plan.assessment));

    children.push(h("What Must Be True", HeadingLevel.HEADING_3));
    children.push(p("Read & Write", plan.whatMustBeTrue.readWrite));
    children.push(p("No Opt Out", plan.whatMustBeTrue.noOptOut));
    children.push(p("Urgency", plan.whatMustBeTrue.urgency));
    children.push(p("Groupings", plan.whatMustBeTrue.groupings));

    children.push(h("Materials", HeadingLevel.HEADING_3));
    children.push(p("Student", plan.materials.student));
    children.push(p("Teacher", plan.materials.teacher));

    children.push(h("Phases", HeadingLevel.HEADING_3));
    const header = new TableRow({
      tableHeader: true,
      children: [
        cell("Phase (min)", { bold: true, width: 16 }),
        cell("Slide mapping", { bold: true, width: 14 }),
        cell("Run-it-cold steps", { bold: true, width: 30 }),
        cell("Facilitation", { bold: true, width: 14 }),
        cell("Stems & Teacher guidance", { bold: true, width: 26 }),
      ],
    });
    const rows = plan.phases.map((ph) =>
      new TableRow({
        children: [
          cell(`${ph.name}\n(${ph.minutes})`),
          cell(ph.slideMapping),
          cell(ph.steps),
          cell(ph.facilitation),
          cell(`Stems: ${ph.sentenceStems}\nGuidance: ${ph.teacherGuidance}`),
        ],
      })
    );
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [header, ...rows],
    }));
    children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
  }

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