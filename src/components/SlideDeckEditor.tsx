"use client";

import React from "react";
import type { SlideDeck, Slide } from "@/lib/schemas";
import { Card, Field } from "./ui";

const PHASE_HEX: Record<string, string> = {
  "Do Now": "#2e7d32",
  "Direct Instruction": "#d27040",
  "Guided Practice": "#474f99",
  "Independent Practice": "#6db83d",
  Reflection: "#6db83d",
  Closure: "#6db83d",
  CPC: "#1f4e79",
  "CPC — Live Performance": "#1f4e79",
};

export function SlideDeckEditor({
  deck,
  onChange,
  readOnly = false,
}: {
  deck: SlideDeck;
  onChange: (d: SlideDeck) => void;
  readOnly?: boolean;
}) {
  function patchSlide(i: number, next: Partial<Slide>) {
    onChange({ ...deck, slides: deck.slides.map((s, j) => (j !== i ? s : { ...s, ...next })) });
  }
  function patchList(i: number, key: "sentenceStems" | "possibleResponses", text: string) {
    patchSlide(i, { [key]: text.split("\n").filter((x) => x.trim().length) } as Partial<Slide>);
  }

  return (
    <div className="space-y-3">
      {deck.slides.map((s, i) => {
        const color = PHASE_HEX[s.phase] || "#1f4e79";
        return (
          <Card key={i} className="overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 text-white" style={{ backgroundColor: color }}>
              <div className="text-sm font-semibold">Slide {s.n} — {s.kind}</div>
              <div className="text-xs opacity-90">{s.phase} {s.time ? `• ${s.time}` : ""}</div>
            </div>
            <div className="grid gap-3 p-3 md:grid-cols-2">
              <div className="space-y-2">
                <Field label="Heading" value={s.heading} readOnly={readOnly} onChange={(v) => patchSlide(i, { heading: v })} />
                <Field label="On-slide (student-facing)" value={s.onSlide} rows={4} readOnly={readOnly} onChange={(v) => patchSlide(i, { onSlide: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Phase" value={s.phase} readOnly={readOnly} onChange={(v) => patchSlide(i, { phase: v })} />
                  <Field label="Time" value={s.time} readOnly={readOnly} onChange={(v) => patchSlide(i, { time: v })} />
                </div>
              </div>
              <div className="space-y-2">
                <Field label="Sentence stems (one per line)" value={(s.sentenceStems || []).join("\n")} rows={3} readOnly={readOnly} onChange={(v) => patchList(i, "sentenceStems", v)} />
                <Field label="Teacher guidance (speaker notes)" value={s.teacherGuidance} rows={3} readOnly={readOnly} onChange={(v) => patchSlide(i, { teacherGuidance: v })} />
                <Field label="Possible student responses (one per line)" value={(s.possibleResponses || []).join("\n")} rows={4} readOnly={readOnly} onChange={(v) => patchList(i, "possibleResponses", v)} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}