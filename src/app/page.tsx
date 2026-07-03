"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Banner, Card, Spinner } from "@/components/ui";
import { ScopeSequenceEditor } from "@/components/ScopeSequenceEditor";
import { LessonWeekEditor } from "@/components/LessonWeekEditor";
import { SlideDeckEditor } from "@/components/SlideDeckEditor";
import type { ScopeSequence, LessonWeek, SlideDeck, LessonPlan } from "@/lib/schemas";
import {
  exportScopeSequenceDocx,
  exportLessonWeekDocx,
  scopeSequenceDocxBase64,
  scopeSequenceFileName,
  lessonWeekDocxBase64,
  lessonWeekFileName,
} from "@/lib/export-docx";
import { exportSlideDeckPptx, slideDeckPptxBase64, slideDeckFileName } from "@/lib/export-pptx";

const COMPETENCIES = [
  "Collaboration & Teamwork",
  "Emotional Intelligence",
  "Problem-Solving & Decision-making",
  "Critical Thinking",
  "Information Literacy",
  "Learning How to Learn",
  "Communications",
  "Building Perspective",
  "Values-based Action",
  "Innovation & Design Thinking",
];
const GRADE_BANDS = ["3/4", "5/6", "7/8"];

type Stage = "config" | "scope" | "plans" | "decks";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Request failed (${res.status}).`);
  }
  return res.json();
}

export default function Page() {
  const [stage, setStage] = useState<Stage>("config");

  const [competency, setCompetency] = useState(COMPETENCIES[0]);
  const [gradeBand, setGradeBand] = useState(GRADE_BANDS[0]);
  const [cpcMode, setCpcMode] = useState<"exemplar" | "bespoke">("exemplar");

  const [scope, setScope] = useState<ScopeSequence | null>(null);
  const [scopeApproved, setScopeApproved] = useState(false);

  const [weeks, setWeeks] = useState<Record<number, LessonWeek>>({});
  const [weekApproved, setWeekApproved] = useState<Record<number, boolean>>({});

  const [decks, setDecks] = useState<Record<string, SlideDeck>>({});
  const [deckApproved, setDeckApproved] = useState<Record<string, boolean>>({});

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [driveEnabled, setDriveEnabled] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/publish")
      .then((r) => r.json())
      .then((d) => setDriveEnabled(!!d.enabled))
      .catch(() => setDriveEnabled(false));
  }, []);

  function guard(fn: () => Promise<void>, token: string) {
    return async () => {
      setError(null);
      setBusy(token);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(null);
      }
    };
  }

  function publish(token: string, kind: "doc" | "slides", name: string, makeBase64: () => Promise<string>) {
    return guard(async () => {
      const base64 = await makeBase64();
      const res = await post<{ webViewLink: string }>("/api/publish", { name, kind, base64 });
      setLinks((l) => ({ ...l, [token]: res.webViewLink }));
      window.open(res.webViewLink, "_blank");
    }, token);
  }

  const gen1 = guard(async () => {
    const data = await post<ScopeSequence>("/api/generate/scope-sequence", { competency, gradeBand, cpcMode });
    setScope(data);
    setScopeApproved(false);
    setWeeks({});
    setWeekApproved({});
    setDecks({});
    setDeckApproved({});
    setStage("scope");
  }, "scope");

  const genWeek = (week: number) =>
    guard(async () => {
      if (!scope) return;
      const data = await post<LessonWeek>("/api/generate/lesson-plans", { scope, week });
      setWeeks((w) => ({ ...w, [week]: data }));
      setWeekApproved((a) => ({ ...a, [week]: false }));
    }, `week-${week}`);

  const genDeck = (plan: LessonPlan) =>
    guard(async () => {
      if (!scope) return;
      const data = await post<SlideDeck>("/api/generate/slide-deck", { scope, plan });
      setDecks((d) => ({ ...d, [plan.day]: data }));
      setDeckApproved((a) => ({ ...a, [plan.day]: false }));
    }, `deck-${plan.day}`);

  const allPlans: LessonPlan[] = useMemo(
    () =>
      Object.keys(weeks)
        .map(Number)
        .filter((n) => weekApproved[n])
        .sort((a, b) => a - b)
        .flatMap((n) => weeks[n].plans),
    [weeks, weekApproved]
  );

  const steps: { key: Stage; label: string; enabled: boolean }[] = [
    { key: "config", label: "1. Setup", enabled: true },
    { key: "scope", label: "2. Scope & Sequence", enabled: !!scope },
    { key: "plans", label: "3. Lesson Plans", enabled: scopeApproved },
    { key: "decks", label: "4. Slide Decks", enabled: Object.values(weekApproved).some(Boolean) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-brand">F2 Experience Builder</h1>
        <p className="text-sm text-slate-600">
          Gated, human-QC pipeline. Each stage generates a draft with Claude, you edit it in place, approve the gate, then
          the next stage unlocks. Export downloadable Google Docs (.docx) and Google Slides (.pptx) at every stage.
        </p>
      </header>

      {/* Stepper */}
      <nav className="mb-5 flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s.key}
            disabled={!s.enabled}
            onClick={() => s.enabled && setStage(s.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              stage === s.key
                ? "bg-brand text-white"
                : s.enabled
                ? "bg-white text-brand border border-brand hover:bg-blue-50"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-4">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {/* STAGE 1: CONFIG */}
      {stage === "config" && (
        <Card className="p-5">
          <h2 className="mb-1 text-lg font-semibold">Step 1 — Trigger the build</h2>
          <p className="mb-4 text-sm text-slate-600">Name a competency and grade band. Fixed container: 6 weeks x 5 days x 55 min = 30 lessons, Week 6 CPC.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="label">Competency</span>
              <select className="editable" value={competency} onChange={(e) => setCompetency(e.target.value)}>
                {COMPETENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Grade band (dyad)</span>
              <select className="editable" value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}>
                {GRADE_BANDS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">CPC frame</span>
              <select className="editable" value={cpcMode} onChange={(e) => setCpcMode(e.target.value as "exemplar" | "bespoke")}>
                <option value="exemplar">Use proven exemplar (Rescue Mission / Utter Chaos)</option>
                <option value="bespoke">Design a fresh real-stakes CPC</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={gen1} disabled={busy !== null}>
              {busy === "scope" ? "Generating…" : "Generate Scope & Sequence"}
            </Button>
            {busy === "scope" && <Spinner label="Backwards-designing 6 weeks from the CPC…" />}
          </div>
        </Card>
      )}

      {/* STAGE 2: SCOPE & SEQUENCE */}
      {stage === "scope" && scope && (
        <div className="space-y-4">
          <GateBar
            title="QC Gate 1 — Scope & Sequence"
            approved={scopeApproved}
            onApprove={() => setScopeApproved((v) => !v)}
            onRegenerate={gen1}
            regenBusy={busy === "scope"}
            onExport={() => exportScopeSequenceDocx(scope)}
            exportLabel="Download .docx"
            driveEnabled={driveEnabled}
            onPublish={publish("publish-scope", "doc", scopeSequenceFileName(scope), () => scopeSequenceDocxBase64(scope))}
            publishBusy={busy === "publish-scope"}
            publishLink={links["publish-scope"]}
            nextLabel="Go to Lesson Plans"
            onNext={scopeApproved ? () => setStage("plans") : undefined}
          />
          <ScopeSequenceEditor scope={scope} onChange={setScope} readOnly={scopeApproved} />
        </div>
      )}

      {/* STAGE 3: LESSON PLANS */}
      {stage === "plans" && scope && (
        <div className="space-y-5">
          {!scopeApproved && <Banner tone="info">Approve Gate 1 first to lock the Scope & Sequence.</Banner>}
          {scope.weeks.map((wk) => {
            const prevApproved = wk.week === 1 || weekApproved[wk.week - 1];
            const generated = weeks[wk.week];
            return (
              <Card key={wk.week} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">
                    Week {wk.week}: {wk.title} <span className="text-slate-400">— {wk.indicator}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {!generated ? (
                      <Button
                        onClick={genWeek(wk.week)}
                        disabled={!prevApproved || busy !== null}
                        variant="primary"
                      >
                        {busy === `week-${wk.week}` ? "Generating…" : prevApproved ? `Generate Week ${wk.week} plans` : "Locked (approve prior week)"}
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={genWeek(wk.week)} disabled={busy !== null || weekApproved[wk.week]}>
                          Regenerate
                        </Button>
                        <Button variant="secondary" onClick={() => exportLessonWeekDocx(scope, generated)}>
                          Download .docx
                        </Button>
                        {driveEnabled && (
                          <Button
                            variant="secondary"
                            disabled={busy !== null}
                            onClick={publish(`publish-week-${wk.week}`, "doc", lessonWeekFileName(scope, generated), () =>
                              lessonWeekDocxBase64(scope, generated)
                            )}
                          >
                            {busy === `publish-week-${wk.week}` ? "Publishing…" : "Publish to Drive"}
                          </Button>
                        )}
                        {links[`publish-week-${wk.week}`] && (
                          <a href={links[`publish-week-${wk.week}`]} target="_blank" rel="noreferrer" className="text-sm text-brand-light underline">
                            View in Drive ↗
                          </a>
                        )}
                        <Button
                          variant={weekApproved[wk.week] ? "success" : "primary"}
                          onClick={() => setWeekApproved((a) => ({ ...a, [wk.week]: !a[wk.week] }))}
                        >
                          {weekApproved[wk.week] ? "✓ Approved (Gate 2)" : "Approve Gate 2"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {busy === `week-${wk.week}` && <Spinner label={`Writing 5 run-it-cold plans for Week ${wk.week}…`} />}
                {generated && (
                  <LessonWeekEditor
                    week={generated}
                    readOnly={weekApproved[wk.week]}
                    onChange={(w) => setWeeks((prev) => ({ ...prev, [wk.week]: w }))}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* STAGE 4: SLIDE DECKS */}
      {stage === "decks" && scope && (
        <div className="space-y-4">
          {allPlans.length === 0 && <Banner tone="info">Approve at least one week of lesson plans (Gate 2) to unlock its slide decks.</Banner>}
          {allPlans.map((plan) => {
            const deck = decks[plan.day];
            return (
              <Card key={plan.day} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">
                    {plan.day}: {plan.lessonTitle} <span className="text-slate-400">— {plan.lessonType}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {!deck ? (
                      <Button onClick={genDeck(plan)} disabled={busy !== null}>
                        {busy === `deck-${plan.day}` ? "Generating…" : "Generate deck"}
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={genDeck(plan)} disabled={busy !== null || deckApproved[plan.day]}>
                          Regenerate
                        </Button>
                        <Button variant="secondary" onClick={() => exportSlideDeckPptx(deck)}>
                          Download .pptx
                        </Button>
                        {driveEnabled && (
                          <Button
                            variant="secondary"
                            disabled={busy !== null}
                            onClick={publish(`publish-deck-${plan.day}`, "slides", slideDeckFileName(deck), () =>
                              slideDeckPptxBase64(deck)
                            )}
                          >
                            {busy === `publish-deck-${plan.day}` ? "Publishing…" : "Publish to Drive"}
                          </Button>
                        )}
                        {links[`publish-deck-${plan.day}`] && (
                          <a href={links[`publish-deck-${plan.day}`]} target="_blank" rel="noreferrer" className="text-sm text-brand-light underline">
                            View in Drive ↗
                          </a>
                        )}
                        <Button
                          variant={deckApproved[plan.day] ? "success" : "primary"}
                          onClick={() => setDeckApproved((a) => ({ ...a, [plan.day]: !a[plan.day] }))}
                        >
                          {deckApproved[plan.day] ? "✓ Approved (Gate 3)" : "Approve Gate 3"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {busy === `deck-${plan.day}` && <Spinner label="Building the student-facing deck…" />}
                {deck && (
                  <SlideDeckEditor
                    deck={deck}
                    readOnly={deckApproved[plan.day]}
                    onChange={(d) => setDecks((prev) => ({ ...prev, [plan.day]: d }))}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GateBar({
  title,
  approved,
  onApprove,
  onRegenerate,
  regenBusy,
  onExport,
  exportLabel,
  driveEnabled,
  onPublish,
  publishBusy,
  publishLink,
  nextLabel,
  onNext,
}: {
  title: string;
  approved: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
  regenBusy: boolean;
  onExport: () => void;
  exportLabel: string;
  driveEnabled?: boolean;
  onPublish?: () => void;
  publishBusy?: boolean;
  publishLink?: string;
  nextLabel: string;
  onNext?: () => void;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
      <div className="font-semibold">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={onRegenerate} disabled={regenBusy || approved}>
          {regenBusy ? "Regenerating…" : "Regenerate"}
        </Button>
        <Button variant="secondary" onClick={onExport}>
          {exportLabel}
        </Button>
        {driveEnabled && onPublish && (
          <Button variant="secondary" onClick={onPublish} disabled={publishBusy}>
            {publishBusy ? "Publishing…" : "Publish to Drive"}
          </Button>
        )}
        {publishLink && (
          <a href={publishLink} target="_blank" rel="noreferrer" className="text-sm text-brand-light underline">
            View in Drive ↗
          </a>
        )}
        <Button variant={approved ? "success" : "primary"} onClick={onApprove}>
          {approved ? "✓ Approved" : "Approve gate"}
        </Button>
        {onNext && <Button onClick={onNext}>{nextLabel} →</Button>}
      </div>
    </Card>
  );
}