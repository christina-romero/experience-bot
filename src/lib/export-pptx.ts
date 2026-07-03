"use client";

import PptxGenJS from "pptxgenjs";
import type { SlideDeck } from "./schemas";

// HISD phase footer colors (hex without #).
const PHASE_COLORS: Record<string, string> = {
  "Do Now": "2E7D32",
  "Direct Instruction": "D27040",
  "Guided Practice": "474F99",
  "Independent Practice": "6DB83D",
  "Independent Practice - Human Advantage": "6DB83D",
  Reflection: "6DB83D",
  Closure: "6DB83D",
  CPC: "1F4E79",
  "CPC — Live Performance": "1F4E79",
};

function phaseColor(phase: string): string {
  return PHASE_COLORS[phase] || "1F4E79";
}

export async function exportSlideDeckPptx(deck: SlideDeck) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "F2", width: 13.333, height: 7.5 });
  pptx.layout = "F2";
  pptx.theme = { headFontFace: "Radio Canada", bodyFontFace: "Radio Canada" };

  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    const color = phaseColor(s.phase);

    if (s.kind === "title" || s.kind === "divider" || s.kind === "attribution") {
      slide.background = { color: "F5F5F0" };
    }

    // Heading
    slide.addText(s.heading || deck.lessonTitle, {
      x: 0.5, y: 0.35, w: 12.3, h: 0.9,
      fontSize: s.kind === "title" ? 30 : 24, bold: true, color: "0F172A",
    });

    // Time chip
    if (s.time) {
      slide.addText(`Time: ${s.time}`, {
        x: 10.6, y: 0.4, w: 2.2, h: 0.4, fontSize: 12, align: "right", color: "475569",
      });
    }

    // On-slide student-facing content
    if (s.onSlide) {
      slide.addText(s.onSlide, {
        x: 0.6, y: 1.5, w: 12.1, h: 3.4, fontSize: 18, color: "1E293B", valign: "top",
      });
    }

    // Sentence stems
    if (s.sentenceStems && s.sentenceStems.length) {
      slide.addText(
        [
          { text: "Sentence stems:\n", options: { bold: true, fontSize: 14 } },
          ...s.sentenceStems.map((st) => ({ text: `• ${st}\n`, options: { fontSize: 14 } })),
        ],
        { x: 0.6, y: 5.0, w: 12.1, h: 1.4, color: "334155", valign: "top" }
      );
    }

    // Footer band (color-coded by phase)
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.05, w: 13.333, h: 0.45, fill: { color } });
    slide.addText(`${s.phase || deck.lessonType}   |   ${deck.day}   |   Slide ${s.n}`, {
      x: 0.3, y: 7.05, w: 12.7, h: 0.45, fontSize: 11, color: "FFFFFF", valign: "middle",
    });

    // Teacher guidance + possible responses go into speaker notes.
    const notes: string[] = [];
    if (s.teacherGuidance) notes.push(`TEACHER GUIDANCE:\n${s.teacherGuidance}`);
    if (s.possibleResponses && s.possibleResponses.length) {
      notes.push(`POSSIBLE STUDENT RESPONSES:\n` + s.possibleResponses.map((r) => `- ${r}`).join("\n"));
    }
    if (notes.length) slide.addNotes(notes.join("\n\n"));
  }

  const safe = `F2_Deck_${deck.day.replace(/[^a-z0-9]+/gi, "_")}_${deck.lessonType.replace(/[^a-z0-9]+/gi, "_")}.pptx`;
  await pptx.writeFile({ fileName: safe });
}