"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
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
import { canonicalLessonType } from "@/lib/template-registry";

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

type DocVal = { text: string; base64?: string; name?: string; driveUrl?: string };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Request failed (${res.status}).`);
  }
  return res.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function docPayload(d: DocVal) {
  if (d.driveUrl && d.driveUrl.trim()) return { driveUrl: d.driveUrl.trim() };
  if (d.base64) return { base64: d.base64, name: d.name };
  return { text: d.text };
}

function docFilled(d: DocVal): boolean {
  return !!(d.text.trim() || d.base64 || d.driveUrl?.trim());
}

export default function Page() {
  const [stage, setStage] = useState<Stage>("config");

  const [competency, setCompetency] = useState(COMPETENCIES[0]);
  const [gradeBand, setGradeBand] = useState(GRADE_BANDS[0]);
  const [sources, setSources] = useState<DocVal[]>([{ text: "" }]);
  const [sourceReport, setSourceReport] = useState<SourceReport | null>(null);
  const [previewWeek, setPreviewWeek] = useState(1);

  const [scope, setScope] = useState<ScopeSequence | null>(null);
  const [scopeApproved, setScopeApproved] = useState(false);

  const [weeks, setWeeks] = useState<Record<number, LessonWeek>>({});
  const [weekApproved, setWeekApproved] = useState<Record<number, boolean>>({});

  const [decks, setDecks] = useState<Record<string, SlideDeck>>({});
  const [deckApproved, setDeckApproved] = useState<Record<string, boolean>>({});

  const [tmpl, setTmpl] = useState<Record<string, TemplateFillResult>>({});

  // Developer-only DEBUG mode (enabled via ?debug=1; never shown to writers).
  const [debugOn, setDebugOn] = useState(false);
  const [weekDebug, setWeekDebug] = useState<Record<number, WeekDebug>>({});

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: session } = useSession();

  const [driveEnabled, setDriveEnabled] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/publish")
      .then((r) => r.json())
      .then((d) => setDriveEnabled(!!d.enabled))
      .catch(() => setDriveEnabled(false));
  }, []);

  // Enable DEBUG via ?debug=1 (persisted); ?debug=0 clears it. Writers never do this.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("debug");
    if (p === "1") localStorage.setItem("f2Debug", "1");
    if (p === "0") localStorage.removeItem("f2Debug");
    setDebugOn(localStorage.getItem("f2Debug") === "1");
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

  const analyzeSources = guard(async () => {
    const payloads = sources.filter(docFilled).map(docPayload);
    const res = await post<SourceReport>("/api/sources", { competency, gradeBand, sources: payloads });
    setSourceReport(res);
    if (res.scope) {
      setScope(res.scope);
      setScopeApproved(false);
      setWeeks({});
      setWeekApproved({});
      setDecks({});
      setDeckApproved({});
    }
  }, "analyze");

  const genWeek = (week: number) =>
    guard(async () => {
      if (!scope) return;
      const data = await post<LessonWeek & { _debug?: WeekDebug }>("/api/generate/lesson-plans", { scope, week });
      const { _debug, ...wk } = data;
      setWeeks((w) => ({ ...w, [week]: wk }));
      setWeekApproved((a) => ({ ...a, [week]: false }));
      if (_debug) setWeekDebug((d) => ({ ...d, [week]: _debug }));
    }, `week-${week}`);

  const genDeck = (plan: LessonPlan) =>
    guard(async () => {
      if (!scope) return;
      const data = await post<SlideDeck>("/api/generate/slide-deck", { scope, plan });
      setDecks((d) => ({ ...d, [plan.day]: data }));
      setDeckApproved((a) => ({ ...a, [plan.day]: false }));
    }, `deck-${plan.day}`);

  const fillGrTemplate = (plan: LessonPlan) =>
    guard(async () => {
      if (!scope) return;
      const res = await post<{ webViewLink: string }>("/api/gr-deck", { scope, plan });
      setLinks((l) => ({ ...l, [`grfill-${plan.day}`]: res.webViewLink }));
      window.open(res.webViewLink, "_blank");
    }, `grfill-${plan.day}`);

  // Run the Template Match Check and render into the Google template when that is
  // configured. This NEVER leaves the user empty-handed: if native rendering is
  // not configured or fails, it falls back to the reliable .docx export.
  const fillTemplate = (plan: LessonPlan, week: LessonWeek) =>
    guard(async () => {
      if (!scope) return;
      let res: TemplateFillResult;
      try {
        res = await post<TemplateFillResult>("/api/template-fill", { scope, plan, kind: "doc" });
      } catch (e) {
        const why = e instanceof Error ? e.message : "Template check unavailable";
        res = {
          placeholders: [],
          object: {},
          templateMatchCheck: { unmapped: [], missing: [], duplicates: [] },
          facilitation: [],
          file: null,
          fillError: `${why} — downloaded .docx instead.`,
        };
      }
      setTmpl((t) => ({ ...t, [plan.day]: res }));
      if (res.file?.webViewLink) {
        window.open(res.file.webViewLink, "_blank");
      } else {
        // Native render unavailable -> guaranteed artifact via the working export.
        await exportLessonWeekDocx(scope, week);
      }
    }, `tmpl-${plan.day}`);

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
    { key: "config", label: "1. Inputs", enabled: true },
    { key: "scope", label: "2. Review S&S", enabled: !!scope },
    { key: "plans", label: "3. Lesson Plans", enabled: scopeApproved },
    { key: "decks", label: "4. Slide Decks", enabled: Object.values(weekApproved).some(Boolean) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold text-brand">Build an Experience</h1>
          {session?.user && (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              {debugOn && (
                <button
                  className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-white"
                  onClick={() => {
                    localStorage.removeItem("f2Debug");
                    setDebugOn(false);
                  }}
                >
                  🐞 Debug ON — hide
                </button>
              )}
              <span>{session.user.email}</span>
              <button className="text-brand-light underline" onClick={() => signOut({ callbackUrl: "/signin" })}>
                Sign out
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-600">
          Human-QC pipeline. Provide your inputs, then each stage generates a draft with Claude, you edit it in place,
          approve the gate, and the next stage unlocks. Download .docx / .pptx or publish to Drive at every stage.
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

      {/* STAGE 1: INPUTS */}
      {stage === "config" && (
        <Card className="p-5">
          <h2 className="mb-1 text-lg font-semibold">Step 1 — Experience Sources</h2>
          <p className="mb-4 text-sm text-slate-600">
            Choose the competency and dyad, then drop in the Experience-specific documents — Scope &amp; Sequence, CPC,
            rubric, previous lessons, and notes — as Google Doc/Sheet/folder links, files, or pasted text, in any mix.
            The Future2 Genome and templates are built in, so you never upload those. The app sorts each source, shows
            what it found, and asks only for what is missing.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Experience Sources</span>
              <button
                className="text-xs font-medium text-brand-light underline"
                onClick={() => setSources((s) => [...s, { text: "" }])}
              >
                + Add source
              </button>
            </div>
            <div className="grid gap-3">
              {sources.map((src, i) => (
                <SourceRow
                  key={i}
                  value={src}
                  onChange={(v) => setSources((s) => s.map((x, j) => (j === i ? v : x)))}
                  onRemove={sources.length > 1 ? () => setSources((s) => s.filter((_, j) => j !== i)) : undefined}
                />
              ))}
            </div>
          </div>

          {sourceReport && <SourceFindings report={sourceReport} />}

          {scope && <ReadyToGenerate scope={scope} week={previewWeek} onWeek={setPreviewWeek} />}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={analyzeSources} disabled={busy !== null || !sources.some(docFilled)}>
              {busy === "analyze" ? "Analyzing…" : "Analyze sources"}
            </Button>
            {busy === "analyze" && <Spinner label="Sorting and reading your sources…" />}
            {scope && (
              <Button variant="primary" onClick={() => setStage("scope")}>
                Continue to Review S&amp;S →
              </Button>
            )}
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
            onRegenerate={() => setStage("config")}
            regenerateLabel="Re-upload"
            regenBusy={false}
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
            // Strip a redundant leading "Week N" from the parsed title so it isn't repeated.
            const weekTitle = wk.title.replace(/^\s*week\s*\d+\s*[:\-–—]?\s*/i, "").trim();
            return (
              <Card key={wk.week} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">
                    Week {wk.week}{weekTitle ? `: ${weekTitle}` : ""}{" "}
                    <span className="text-slate-400">— {wk.indicator}</span>
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
                  <>
                    <LessonWeekEditor
                      week={generated}
                      readOnly={weekApproved[wk.week]}
                      onChange={(w) => setWeeks((prev) => ({ ...prev, [wk.week]: w }))}
                    />
                    <div className="mt-4 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Template Match Check
                      </h4>
                      {generated.plans.map((plan) => {
                        const beta = !/gradual\s*release/i.test(plan.lessonType);
                        return (
                          <div key={plan.day} className="rounded-md border border-slate-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm">
                                <span className="font-medium">{plan.day}</span>
                                <span className="text-slate-400"> — {plan.lessonType}</span>
                                {beta && (
                                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                    Beta
                                  </span>
                                )}
                              </div>
                              <Button variant="secondary" disabled={busy !== null} onClick={fillTemplate(plan, generated)}>
                                {busy === `tmpl-${plan.day}` ? "Checking…" : "Match Check + fill"}
                              </Button>
                            </div>
                            {tmpl[plan.day] && <MatchCheck r={tmpl[plan.day]} />}
                          </div>
                        );
                      })}
                    </div>
                    {debugOn && weekDebug[wk.week] && <DebugPanel d={weekDebug[wk.week]} />}
                  </>
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
                  <div className="flex flex-wrap items-center gap-2">
                    {driveEnabled && /gradual release/i.test(plan.lessonType) && (
                      <Button variant="secondary" disabled={busy !== null} onClick={fillGrTemplate(plan)}>
                        {busy === `grfill-${plan.day}` ? "Filling template…" : "Fill GR template → Drive"}
                      </Button>
                    )}
                    {links[`grfill-${plan.day}`] && (
                      <a href={links[`grfill-${plan.day}`]} target="_blank" rel="noreferrer" className="text-sm text-brand-light underline">
                        Open filled deck ↗
                      </a>
                    )}
                    {!deck ? (
                      <Button onClick={genDeck(plan)} disabled={busy !== null}>
                        {busy === `deck-${plan.day}` ? "Generating…" : "Generate deck"}
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={genDeck(plan)} disabled={busy !== null || deckApproved[plan.day]}>
                          Regenerate
                        </Button>
                        <Button variant="secondary" onClick={() => exportSlideDeckPptx(deck, scope)}>
                          Download .pptx
                        </Button>
                        {driveEnabled && (
                          <Button
                            variant="secondary"
                            disabled={busy !== null}
                            onClick={publish(`publish-deck-${plan.day}`, "slides", slideDeckFileName(deck, scope), () =>
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
  regenerateLabel,
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
  regenerateLabel?: string;
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
          {regenBusy ? "Regenerating…" : regenerateLabel || "Regenerate"}
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

// One Experience Source: a Google Doc link, an uploaded file, or pasted text.
function SourceRow({
  value,
  onChange,
  onRemove,
}: {
  value: DocVal;
  onChange: (v: DocVal) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <label className="cursor-pointer text-xs font-medium text-brand-light underline">
          {value.name ? value.name : "Upload .docx / .txt"}
          <input
            type="file"
            accept=".docx,.txt,.md"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const base64 = await fileToBase64(f);
              onChange({ text: "", base64, name: f.name });
            }}
          />
        </label>
        {onRemove && (
          <button className="text-xs text-slate-400 underline" onClick={onRemove}>
            remove
          </button>
        )}
      </div>
      {value.name ? (
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>Using uploaded file.</span>
          <button className="text-xs text-slate-500 underline" onClick={() => onChange({ text: "" })}>
            clear
          </button>
        </div>
      ) : (
        <>
          <input
            type="url"
            className="editable mb-2"
            placeholder="Paste a Google Doc, Slides, Sheet, file, or folder link"
            value={value.driveUrl ?? ""}
            onChange={(e) => onChange({ ...value, driveUrl: e.target.value })}
          />
          <textarea
            className="editable"
            rows={2}
            placeholder="…or paste text"
            value={value.text}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
          />
        </>
      )}
    </div>
  );
}

type SourceReport = {
  scope: ScopeSequence | null;
  sources: { name: string; category: string }[];
  found: {
    scopeSequence: boolean;
    cpc: boolean;
    rubric: boolean;
    facilitationLibrary: boolean;
    previousLessons: boolean;
    notes: boolean;
  };
  missing: string[];
};

const CATEGORY_LABEL: Record<string, string> = {
  scope_sequence: "Scope & Sequence",
  cpc: "CPC",
  rubric: "Rubric",
  facilitation_library: "Facilitation Library",
  previous_lessons: "Previous Lessons",
  notes: "Supporting Notes",
  unknown: "Unknown",
};

const FOUND_LABEL: [keyof SourceReport["found"], string][] = [
  ["scopeSequence", "Scope & Sequence"],
  ["cpc", "CPC"],
  ["rubric", "Rubric"],
  ["facilitationLibrary", "Facilitation Library"],
  ["previousLessons", "Previous Lessons"],
  ["notes", "Supporting Notes"],
];

// The internal source pack, shown back to the user: what each source was, what
// categories were found, and what is still missing.
function SourceFindings({ report }: { report: SourceReport }) {
  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="mb-1 font-semibold">What we found</div>
      <ul className="mb-2 space-y-0.5 text-slate-600">
        {report.sources.map((s, i) => (
          <li key={i}>
            {s.name} → <span className="font-medium">{CATEGORY_LABEL[s.category] ?? s.category}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-0.5 text-xs">
        {FOUND_LABEL.filter(([key]) => report.found[key]).map(([key, label]) => (
          <div key={key} className="text-green-700">
            ✓ {label} found
          </div>
        ))}
      </div>
      {report.missing.length > 0 && (
        <div className="mt-2 text-amber-700">
          Scope &amp; Sequence is required to continue — add it above and analyze again.
        </div>
      )}
    </div>
  );
}

type WeekDebug = {
  genome: {
    seeds: { id: string; name: string; phase: string; primaryCompetency: string; fidelity: string }[];
    targetBehaviors: string[];
    competencyBehaviors: string[];
  };
  days: {
    day: string;
    designModel: string;
    docTemplate: string;
    slidesTemplate: string;
    facilitation: { phase: string; move: string; kind: "adapted" | "new" | "library" }[];
  }[];
};

// Developer-only diagnostics for a generated week. Rendered only in debug mode.
function DebugPanel({ d }: { d: WeekDebug }) {
  const kindColor = (k: string) =>
    k === "adapted" ? "text-amber-300" : k === "new" ? "text-emerald-300" : "text-slate-400";
  return (
    <div className="mt-4 rounded-md border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200">
      <div className="mb-2 font-semibold text-slate-100">🐞 DEBUG — developer only</div>

      <div className="mb-3 space-y-0.5">
        <div className="font-semibold text-slate-300">Genome retrieval (week)</div>
        <div className="text-slate-400">
          Target competency behaviors: {d.genome.targetBehaviors.join("; ") || "—"}
        </div>
        <div className="text-slate-400">
          Competency behaviors: {d.genome.competencyBehaviors.join("; ") || "—"}
        </div>
        <div className="text-slate-400">Top Genome patterns retrieved ({d.genome.seeds.length}):</div>
        <ul className="ml-4 list-disc">
          {d.genome.seeds.map((s) => (
            <li key={s.id}>
              {s.id} {s.name} <span className="text-slate-500">— {s.phase} · {s.primaryCompetency} · fidelity {s.fidelity}</span>
            </li>
          ))}
          {d.genome.seeds.length === 0 && <li className="text-slate-500">none retrieved</li>}
        </ul>
      </div>

      {d.days.map((day, i) => {
        const adapted = day.facilitation.filter((f) => f.kind === "adapted");
        const created = day.facilitation.filter((f) => f.kind === "new");
        return (
          <div key={i} className="mb-2 space-y-0.5 border-t border-slate-800 pt-2">
            <div className="font-semibold text-slate-100">{day.day}</div>
            <div className="text-slate-400">Design Model: <span className="text-slate-200">{day.designModel}</span></div>
            <div className="text-slate-400">Lesson template: <span className="text-slate-200">{day.docTemplate}</span></div>
            <div className="text-slate-400">Slide template: <span className="text-slate-200">{day.slidesTemplate}</span></div>
            <div className="text-slate-400">Facilitation assets used:</div>
            <ul className="ml-4 list-disc">
              {day.facilitation.map((f, j) => (
                <li key={j}>
                  <span className={kindColor(f.kind)}>[{f.kind}]</span> {f.phase}: {f.move}
                </li>
              ))}
            </ul>
            <div className="text-slate-400">
              Genome assets adapted: {adapted.length ? adapted.map((a) => a.phase).join(", ") : "none"}
            </div>
            <div className="text-slate-400">
              Newly generated content: {created.length ? created.map((a) => a.phase).join(", ") : "none flagged"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TEMPLATE_LABEL: Record<string, string> = {
  gradual_release: "Gradual Release",
  skills_lab: "Skills Lab",
  simulation_synthesis: "Simulation & Synthesis",
  cpc: "CPC",
};

// Read-only "Ready to Generate" preview built from the parsed scope. No per-item
// approval — the writer just reviews and clicks Continue.
function ReadyToGenerate({
  scope,
  week,
  onWeek,
}: {
  scope: ScopeSequence;
  week: number;
  onWeek: (w: number) => void;
}) {
  const wk = scope.weeks.find((w) => w.week === week) ?? scope.weeks[0];
  const templateFor = (lessonType: string) =>
    TEMPLATE_LABEL[canonicalLessonType(lessonType)] ?? "Standard (.docx)";
  return (
    <div className="mt-4 rounded-md border border-slate-200 p-4 text-sm">
      <div className="mb-2 font-semibold">Ready to Generate</div>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <div>
          <span className="text-slate-500">Competency:</span> {scope.competency}
        </div>
        <div>
          <span className="text-slate-500">Dyad:</span> {scope.gradeBand}
        </div>
        {scope.experienceName?.trim() && (
          <div>
            <span className="text-slate-500">Experience:</span> {scope.experienceName}
          </div>
        )}
        <div>
          <span className="text-slate-500">Weeks detected:</span> {scope.weeks.length}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">Week</span>
        <select
          className="editable max-w-[7rem]"
          value={week}
          onChange={(e) => onWeek(Number(e.target.value))}
        >
          {scope.weeks.map((w) => (
            <option key={w.week} value={w.week}>
              Week {w.week}
            </option>
          ))}
        </select>
        <span className="text-slate-500">— {wk?.days.length ?? 0} days</span>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Day</th>
              <th className="py-1 pr-3 font-medium">Design Model</th>
              <th className="py-1 font-medium">Template</th>
            </tr>
          </thead>
          <tbody>
            {wk?.days.map((d, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1 pr-3 whitespace-nowrap">{d.day}</td>
                <td className="py-1 pr-3">
                  {d.lessonType}
                  {d.lessonTypeInferred && <span className="ml-1 text-slate-400">(inferred)</span>}
                </td>
                <td className="py-1 whitespace-nowrap">{templateFor(d.lessonType)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type TemplateFillResult = {
  placeholders: string[];
  object: Record<string, string>;
  templateMatchCheck: { unmapped: string[]; missing: string[]; duplicates: string[] };
  facilitation: { field: string; verdict: string; reasons: string }[];
  file: { id: string; webViewLink: string } | null;
  fillError?: string;
};

// Template Match Check panel: what mapped, what is missing / unmapped / duplicated,
// and each facilitation's verdict — the pre-export flag list.
function MatchCheck({ r }: { r: TemplateFillResult }) {
  const c = r.templateMatchCheck;
  const filled = r.placeholders.length - c.missing.length;
  return (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs">
      {r.file?.webViewLink && (
        <a href={r.file.webViewLink} target="_blank" rel="noreferrer" className="text-brand-light underline">
          Open filled template ↗
        </a>
      )}
      {r.fillError && <div className="text-amber-700">Not rendered: {r.fillError}</div>}
      <div className="text-slate-600">
        {filled}/{r.placeholders.length} fields filled · {c.missing.length} missing · {c.unmapped.length} unmapped ·{" "}
        {c.duplicates.length} duplicate
      </div>
      {c.duplicates.length > 0 && (
        <div className="text-red-600">Duplicates (make each unique): {c.duplicates.join(", ")}</div>
      )}
      {c.missing.length > 0 && <div className="text-amber-700">Missing: {c.missing.join(", ")}</div>}
      {c.unmapped.length > 0 && <div className="text-slate-500">Unmapped (ignored): {c.unmapped.join(", ")}</div>}
      {r.facilitation.some((f) => f.verdict !== "PASS") && (
        <div className="text-slate-600">
          Facilitation needs review:{" "}
          {r.facilitation
            .filter((f) => f.verdict !== "PASS")
            .map((f) => (
              <span key={f.field} className={f.verdict === "REVISE" ? "text-amber-700" : "text-red-600"}>
                {f.field} ({f.verdict === "REVISE" ? "adapted" : "replaced"}){" "}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}