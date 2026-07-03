"use client";

import PptxGenJS from "pptxgenjs";
import type { SlideDeck } from "./schemas";

// HISD phase footer colors (hex without #). Matched by keyword so title,
// materials, divider, reflection, and closure slides also get a sensible band.
function phaseColor(phaseRaw: string, kind: string): string {
  const phase = (phaseRaw || "").toLowerCase();
  if (phase.includes("do now")) return "2E7D32"; // dark green
  if (phase.includes("direct")) return "D27040"; // tangerine
  if (phase.includes("guided")) return "474F99"; // purple
  if (phase.includes("independent") || phase.includes("human advantage")) return "6DB83D"; // light green
  if (phase.includes("reflection") || phase.includes("closure")) return "6DB83D";
  if (phase.includes("cpc")) return "1F4E79";
  if (kind === "title" || kind === "attribution" || kind === "materials") return "1F4E79"; // brand blue
  return "1F4E79";
}

function buildDeck(deck: SlideDeck): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "F2", width: 13.333, height: 7.5 });
  pptx.layout = "F2";
  pptx.theme = { headFontFace: "Radio Canada", bodyFontFace: "Radio Canada" };

  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    const color = phaseColor(s.phase, s.kind);

    if (s.kind === "title" || s.kind === "divider" || s.kind === "attribution") {
      slide.background = { color: "F5F5F0" };
    }

    slide.addText(s.heading || deck.lessonTitle, {
      x: 0.5, y: 0.35, w: 12.3, h: 0.9,
      fontSize: s.kind === "title" ? 30 : 24, bold: true, color: "0F172A", fontFace: "Radio Canada",
    });

    if (s.time) {
      slide.addText(`Time: ${s.time}`, {
        x: 10.6, y: 0.4, w: 2.2, h: 0.4, fontSize: 12, align: "right", color: "475569",
      });
    }

    if (s.onSlide) {
      slide.addText(s.onSlide, {
        x: 0.6, y: 1.5, w: 12.1, h: 3.4, fontSize: 18, color: "1E293B", valign: "top", fontFace: "Radio Canada",
      });
    }

    if (s.sentenceStems && s.sentenceStems.length) {
      slide.addText(
        [
          { text: "Sentence stems:\n", options: { bold: true, fontSize: 14 } },
          ...s.sentenceStems.map((st) => ({ text: `• ${st}\n`, options: { fontSize: 14 } })),
        ],
        { x: 0.6, y: 5.0, w: 12.1, h: 1.4, color: "334155", valign: "top", fontFace: "Radio Canada" }
      );
    }

    // Color-coded footer band by phase.
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.05, w: 13.333, h: 0.45, fill: { color } });
    slide.addText(`${s.phase || deck.lessonType}   |   ${deck.day}   |   Slide ${s.n}`, {
      x: 0.3, y: 7.05, w: 12.7, h: 0.45, fontSize: 11, color: "FFFFFF", valign: "middle", fontFace: "Radio Canada",
    });

    // Teacher guidance + possible responses -> speaker notes.
    const notes: string[] = [];
    if (s.teacherGuidance) notes.push(`TEACHER GUIDANCE:\n${s.teacherGuidance}`);
    if (s.possibleResponses && s.possibleResponses.length) {
      notes.push(`POSSIBLE STUDENT RESPONSES:\n` + s.possibleResponses.map((r) => `- ${r}`).join("\n"));
    }
    if (notes.length) slide.addNotes(notes.join("\n\n"));
  }

  return pptx;
}

export function slideDeckFileName(deck: SlideDeck) {
  return `F2_Deck_${deck.day.replace(/[^a-z0-9]+/gi, "_")}_${deck.lessonType.replace(/[^a-z0-9]+/gi, "_")}`;
}

export async function exportSlideDeckPptx(deck: SlideDeck) {
  await buildDeck(deck).writeFile({ fileName: `${slideDeckFileName(deck)}.pptx` });
}

export async function slideDeckPptxBase64(deck: SlideDeck): Promise<string> {
  return (await buildDeck(deck).write({ outputType: "base64" })) as string;
}