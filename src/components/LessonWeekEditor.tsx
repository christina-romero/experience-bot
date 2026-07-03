"use client";

import React from "react";
import type { LessonWeek, LessonPlan, LessonPhase } from "@/lib/schemas";
import { Card, Field } from "./ui";

export function LessonWeekEditor({
  week,
  onChange,
  readOnly = false,
}: {
  week: LessonWeek;
  onChange: (w: LessonWeek) => void;
  readOnly?: boolean;
}) {
  function patchPlan(pi: number, next: Partial<LessonPlan>) {
    onChange({ ...week, plans: week.plans.map((p, i) => (i !== pi ? p : { ...p, ...next })) });
  }
  function patchPhase(pi: number, phi: number, next: Partial<LessonPhase>) {
    const plan = week.plans[pi];
    const phases = plan.phases.map((ph, j) => (j !== phi ? ph : { ...ph, ...next }));
    patchPlan(pi, { phases });
  }

  return (
    <div className="space-y-4">
      {week.plans.map((plan, pi) => (
        <Card key={pi} className="overflow-hidden">
          <div className="flex items-center justify-between bg-slate-800 px-4 py-2 text-white">
            <div className="font-semibold">{plan.day}: {plan.lessonTitle}</div>
            <div className="text-sm opacity-90">{plan.lessonType}</div>
          </div>
          <div className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Learning Objective" value={plan.lo} readOnly={readOnly} onChange={(v) => patchPlan(pi, { lo: v })} />
              <Field label="Experience Objective" value={plan.experienceObjective} readOnly={readOnly} onChange={(v) => patchPlan(pi, { experienceObjective: v })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Rubric indicator" value={plan.rubricIndicator} readOnly={readOnly} onChange={(v) => patchPlan(pi, { rubricIndicator: v })} />
              <Field label="Assessment" value={plan.assessment} readOnly={readOnly} onChange={(v) => patchPlan(pi, { assessment: v })} />
            </div>
            <Field label="Connection (forward link)" value={plan.connection} readOnly={readOnly} onChange={(v) => patchPlan(pi, { connection: v })} />

            <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-2 text-xs font-bold uppercase text-slate-500">What Must Be True</div>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Read & write" value={plan.whatMustBeTrue.readWrite} readOnly={readOnly} onChange={(v) => patchPlan(pi, { whatMustBeTrue: { ...plan.whatMustBeTrue, readWrite: v } })} />
                <Field label="No opt out" value={plan.whatMustBeTrue.noOptOut} readOnly={readOnly} onChange={(v) => patchPlan(pi, { whatMustBeTrue: { ...plan.whatMustBeTrue, noOptOut: v } })} />
                <Field label="Urgency" value={plan.whatMustBeTrue.urgency} readOnly={readOnly} onChange={(v) => patchPlan(pi, { whatMustBeTrue: { ...plan.whatMustBeTrue, urgency: v } })} />
                <Field label="Groupings" value={plan.whatMustBeTrue.groupings} readOnly={readOnly} onChange={(v) => patchPlan(pi, { whatMustBeTrue: { ...plan.whatMustBeTrue, groupings: v } })} />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Field label="Student materials" value={plan.materials.student} readOnly={readOnly} onChange={(v) => patchPlan(pi, { materials: { ...plan.materials, student: v } })} />
              <Field label="Teacher materials" value={plan.materials.teacher} readOnly={readOnly} onChange={(v) => patchPlan(pi, { materials: { ...plan.materials, teacher: v } })} />
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase text-slate-500">Phases (sum to ~55 min)</div>
              <div className="space-y-3">
                {plan.phases.map((ph, phi) => (
                  <div key={phi} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 grid gap-2 md:grid-cols-3">
                      <Field label="Phase" value={ph.name} readOnly={readOnly} onChange={(v) => patchPhase(pi, phi, { name: v })} />
                      <Field label="Minutes" value={ph.minutes} readOnly={readOnly} onChange={(v) => patchPhase(pi, phi, { minutes: v })} />
                      <Field label="Slide mapping" value={ph.slideMapping} readOnly={readOnly} onChange={(v) => patchPhase(pi, phi, { slideMapping: v })} />
                    </div>
                    <Field label="Run-it-cold steps" value={ph.steps} rows={3} readOnly={readOnly} onChange={(v) => patchPhase(pi, phi, { steps: v })} />
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <Field label="Facilitation move" value={ph.facilitation} readOnly={readOnly} onChange={(v) => patchPhase(pi, phi, { facilitation: v })} />
                      <Field label="Sentence stems" value={ph.sentenceStems} readOnly={readOnly} onChange={(v) => patchPhase(pi, phi, { sentenceStems: v })} />
                    </div>
                    <Field label="Teacher guidance" value={ph.teacherGuidance} rows={2} readOnly={readOnly} onChange={(v) => patchPhase(pi, phi, { teacherGuidance: v })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}