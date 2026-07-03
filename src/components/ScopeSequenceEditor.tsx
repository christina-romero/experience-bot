"use client";

import React from "react";
import type { ScopeSequence, ScopeDay } from "@/lib/schemas";
import { Card, Field } from "./ui";

export function ScopeSequenceEditor({
  scope,
  onChange,
  readOnly = false,
}: {
  scope: ScopeSequence;
  onChange: (s: ScopeSequence) => void;
  readOnly?: boolean;
}) {
  function patch(next: Partial<ScopeSequence>) {
    onChange({ ...scope, ...next });
  }
  function patchDay(wi: number, di: number, next: Partial<ScopeDay>) {
    const weeks = scope.weeks.map((w, i) =>
      i !== wi ? w : { ...w, days: w.days.map((d, j) => (j !== di ? d : { ...d, ...next })) }
    );
    onChange({ ...scope, weeks });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Competency" value={scope.competency} readOnly />
          <Field label="Grade band" value={scope.gradeBand} readOnly />
        </div>
        <div className="mt-3 grid gap-3">
          <Field label="CPC frame" value={scope.cpcFrame} rows={2} readOnly={readOnly} onChange={(v) => patch({ cpcFrame: v })} />
          <Field label="CPC problem statement" value={scope.cpcProblemStatement} rows={3} readOnly={readOnly} onChange={(v) => patch({ cpcProblemStatement: v })} />
          <Field label="Overview (backwards-design logic)" value={scope.overview} rows={3} readOnly={readOnly} onChange={(v) => patch({ overview: v })} />
        </div>
      </Card>

      {scope.weeks.map((wk, wi) => (
        <Card key={wk.week} className="overflow-hidden">
          <div className="flex items-center justify-between bg-brand px-4 py-2 text-white">
            <div className="font-semibold">Week {wk.week}: {wk.title}</div>
            <div className="text-sm opacity-90">Indicator: {wk.indicator}</div>
          </div>
          <div className="divide-y divide-slate-100">
            {wk.days.map((d, di) => (
              <div key={di} className="grid gap-3 p-4 md:grid-cols-12">
                <div className="md:col-span-2">
                  <div className="text-xs font-bold text-brand">{d.day}</div>
                  <div className="mt-1 text-xs text-slate-500">{d.lessonType}</div>
                  <div className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                    {d.assessment}
                  </div>
                  {d.aiStage && d.aiStage !== "None" && (
                    <div className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">
                      AI: {d.aiStage}
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:col-span-5">
                  <Field label="Lesson title" value={d.lessonTitle} readOnly={readOnly} onChange={(v) => patchDay(wi, di, { lessonTitle: v })} />
                  <Field label="Learning Objective" value={d.lo} readOnly={readOnly} onChange={(v) => patchDay(wi, di, { lo: v })} />
                  <Field label="Experience Objective" value={d.experienceObjective} readOnly={readOnly} onChange={(v) => patchDay(wi, di, { experienceObjective: v })} />
                </div>
                <div className="space-y-2 md:col-span-5">
                  <Field label="Activity (run-it-cold)" value={d.activity} rows={3} readOnly={readOnly} onChange={(v) => patchDay(wi, di, { activity: v })} />
                  <Field label="Connection (forward link)" value={d.connection} readOnly={readOnly} onChange={(v) => patchDay(wi, di, { connection: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Materials & cost" value={d.materialsCost} readOnly={readOnly} onChange={(v) => patchDay(wi, di, { materialsCost: v })} />
                    <Field label="Rubric indicator" value={d.rubricIndicator} readOnly={readOnly} onChange={(v) => patchDay(wi, di, { rubricIndicator: v })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}