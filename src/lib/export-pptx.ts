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
  if (phase.includes("routine")) return "E8B93A"; // yellow
  if (phase.includes("cpc")) return "1F4E79";
  if (kind === "title" || kind === "attribution" || kind === "materials") return "1F4E79"; // brand blue
  return "1F4E79";
}

const FONT = "Radio Canada";
const INK = "0F172A";
const SUBINK = "475569";
const PAPER = "F5F5F0";
const BRAND = "1F4E79";
const W = 13.333;

// Teacher guidance + possible responses -> speaker notes.
function speakerNotes(slide: PptxGenJS.Slide, s: SlideDeck["slides"][number]) {
  const notes: string[] = [];
  if (s.teacherGuidance) notes.push(`TEACHER GUIDANCE:\n${s.teacherGuidance}`);
  if (s.possibleResponses && s.possibleResponses.length) {
    notes.push(`POSSIBLE STUDENT RESPONSES:\n` + s.possibleResponses.map((r) => `- ${r}`).join("\n"));
  }
  if (notes.length) slide.addNotes(notes.join("\n\n"));
}

function footer(pptx: PptxGenJS, slide: PptxGenJS.Slide, deck: SlideDeck, s: SlideDeck["slides"][number], color: string) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.05, w: W, h: 0.45, fill: { color } });
  slide.addText(`${s.phase || deck.lessonType}   |   ${deck.day}   |   Slide ${s.n}`, {
    x: 0.3, y: 7.05, w: W - 0.6, h: 0.45, fontSize: 11, color: "FFFFFF", valign: "middle", fontFace: FONT,
  });
}

function buildDeck(deck: SlideDeck): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "F2", width: W, height: 7.5 });
  pptx.layout = "F2";
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    const color = phaseColor(s.phase, s.kind);

    // ---- Title slide: full brand background, big type ----
    if (s.kind === "title") {
      slide.background = { color: BRAND };
      slide.addText((deck.lessonType || "").toUpperCase(), {
        x: 0.8, y: 1.3, w: 11.7, h: 0.6, fontSize: 16, bold: true, color: "BFD3E6", charSpacing: 2, fontFace: FONT,
      });
      slide.addText(s.heading || deck.lessonTitle, {
        x: 0.8, y: 2.0, w: 11.7, h: 1.9, fontSize: 40, bold: true, color: "FFFFFF", valign: "top", fontFace: FONT,
      });
      if (s.onSlide) {
        slide.addText(s.onSlide, {
          x: 0.8, y: 4.1, w: 11.7, h: 2.6, fontSize: 18, color: "E2E8F0", valign: "top", fontFace: FONT,
        });
      }
      speakerNotes(slide, s);
      continue;
    }

    // ---- Divider slide: centered section marker ----
    if (s.kind === "divider") {
      slide.background = { color: PAPER };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.3, fill: { color } });
      slide.addText((s.phase || "").toUpperCase(), {
        x: 1, y: 2.5, w: W - 2, h: 0.6, fontSize: 18, bold: true, color, align: "center", charSpacing: 2, fontFace: FONT,
      });
      slide.addText(s.heading || "", {
        x: 1, y: 3.1, w: W - 2, h: 1.1, fontSize: 34, bold: true, color: INK, align: "center", fontFace: FONT,
      });
      if (s.onSlide) {
        slide.addText(s.onSlide, {
          x: 1, y: 4.3, w: W - 2, h: 0.8, fontSize: 18, color: SUBINK, align: "center", fontFace: FONT,
        });
      }
      speakerNotes(slide, s);
      continue;
    }

    // ---- Content / materials / reflection / closure / attribution ----
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.28, fill: { color } });

    slide.addText(s.heading || deck.lessonTitle, {
      x: 0.6, y: 0.55, w: 10, h: 0.9, fontSize: 26, bold: true, color: INK, valign: "top", fontFace: FONT,
    });
    if (s.time) {
      slide.addText(s.time, {
        x: 10.7, y: 0.6, w: 2.0, h: 0.4, fontSize: 13, align: "right", color: SUBINK, fontFace: FONT,
      });
    }

    const hasStems = !!(s.sentenceStems && s.sentenceStems.length);
    if (s.onSlide) {
      slide.addText(s.onSlide, {
        x: 0.6, y: 1.7, w: 12.1, h: hasStems ? 3.0 : 4.8, fontSize: 20, color: "1E293B", valign: "top", fontFace: FONT,
      });
    }
    if (hasStems) {
      slide.addText(
        [
          { text: "Sentence stems\n", options: { bold: true, fontSize: 15, color: color } },
          ...s.sentenceStems.map((st) => ({ text: `•  ${st}\n`, options: { fontSize: 15 } })),
        ],
        { x: 0.6, y: 4.9, w: 12.1, h: 1.8, color: "334155", valign: "top", fontFace: FONT }
      );
    }

    footer(pptx, slide, deck, s, color);
    speakerNotes(slide, s);
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