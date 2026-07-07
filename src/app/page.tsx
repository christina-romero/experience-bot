"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button, Banner, Card, Spinner } from "@/components/ui";
import { ScopeSequenceEditor } from "@/components/ScopeSequenceEditor";
import { LessonWeekEditor } from "@/components/LessonWeekEditor";
import type { ScopeSequence, LessonWeek, CanonicalWeek, FidelityWeek } from "@/lib/schemas";
import {
  exportScopeSequenceDocx,
  exportLessonWeekDocx,
  scopeSequenceDocxBase64,
  scopeSequenceFileName,
} from "@/lib/export-docx";
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

type Stage = "config" | "scope" | "plans";

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

  // Two Kings: the canonical Access spine + fidelity-gate result per week.
  const [canonical, setCanonical] = useState<Record<number, CanonicalWeek>>({});
  const [fidelity, setFidelity] = useState<Record<number, FidelityWeek>>({});
  const [fidelityOverride, setFidelityOverride] = useState<Record<number, boolean>>({});

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

  function publish(token: string, kind: "doc", name: string, makeBase64: () => Promise<string>) {
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
      setCanonical({});
      setFidelity({});
      setFidelityOverride({});
    }
  }, "analyze");

  const genWeek = (week: number) =>
    guard(async () => {
      if (!scope) return;
      const data = await post<
        LessonWeek & { _debug?: WeekDebug; _canonical?: CanonicalWeek; _fidelity?: FidelityWeek }
      >("/api/generate/lesson-plans", { scope, week });
      const { _debug, _canonical, _fidelity, ...wk } = data;
      setWeeks((w) => ({ ...w, [week]: wk }));
      setWeekApproved((a) => ({ ...a, [week]: false }));
      if (_debug) setWeekDebug((d) => ({ ...d, [week]: _debug }));
      if (_canonical) setCanonical((c) => ({ ...c, [week]: _canonical }));
      if (_fidelity) setFidelity((f) => ({ ...f, [week]: _fidelity }));
      setFidelityOverride((o) => ({ ...o, [week]: false }));
    }, `week-${week}`);

  // Re-run the Two Kings fidelity gate on the (possibly edited) current week.
  const recheckFidelity = (week: number) =>
    guard(async () => {
      if (!scope || !canonical[week] || !weeks[week]) return;
      const f = await post<FidelityWeek>("/api/fidelity", { scope, canonical: canonical[week], week: weeks[week] });
      setFidelity((prev) => ({ ...prev, [week]: f }));
      setFidelityOverride((o) => ({ ...o, [week]: false }));
    }, `fidelity-${week}`);

  // One Google Doc per week: fill the whole week's plans into a single copied template.
  const fillWeekTemplate = (week: LessonWeek) =>
    guard(async () => {
      if (!scope) return;
      const res = await post<TemplateFillResult>("/api/template-fill-week", {
        scope,
        week: week.week,
        weekPlans: week.plans,
      });
      setTmpl((t) => ({ ...t, [`week:${week.week}`]: { ...res, kind: "doc" } }));
      if (!res.file?.webViewLink && res.fillError) setError(res.fillError);
    }, `tmpl-week-${week.week}`);

  const steps: { key: Stage; label: string; enabled: boolean }[] = [
    { key: "config", label: "1. Inputs", enabled: true },
    { key: "scope", label: "2. Review S&S", enabled: !!scope },
    { key: "plans", label: "3. Lesson Plans", enabled: scopeApproved },
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
          approve the gate, and the next stage unlocks. Download .docx or publish to Drive at every stage.
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
                        disabled={busy !== null}
                        variant="primary"
                      >
                        {busy === `week-${wk.week}` ? "Generating…" : `Generate Week ${wk.week} plans`}
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={genWeek(wk.week)} disabled={busy !== null || weekApproved[wk.week]}>
                          Regenerate
                        </Button>
                        <Button variant="primary" disabled={busy !== null} onClick={fillWeekTemplate(generated)}>
                          {busy === `tmpl-week-${wk.week}` ? "Creating…" : "Create from template → Drive"}
                        </Button>
                        <Button variant="ghost" onClick={() => exportLessonWeekDocx(scope, generated)}>
                          Download draft only (.docx)
                        </Button>
                        <Button
                          variant={weekApproved[wk.week] ? "success" : "primary"}
                          disabled={
                            !weekApproved[wk.week] &&
                            !!fidelity[wk.week] &&
                            !fidelity[wk.week].weekPass &&
                            !fidelityOverride[wk.week]
                          }
                          onClick={() => setWeekApproved((a) => ({ ...a, [wk.week]: !a[wk.week] }))}
                        >
                          {weekApproved[wk.week]
                            ? "✓ Approved (Gate 2)"
                            : fidelity[wk.week] && !fidelity[wk.week].weekPass && !fidelityOverride[wk.week]
                            ? "Fidelity gate failed"
                            : "Approve Gate 2"}
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
                    {fidelity[wk.week] && (
                      <FidelityPanel
                        f={fidelity[wk.week]}
                        rechecking={busy === `fidelity-${wk.week}`}
                        onRecheck={recheckFidelity(wk.week)}
                        override={!!fidelityOverride[wk.week]}
                        onToggleOverride={() => setFidelityOverride((o) => ({ ...o, [wk.week]: !o[wk.week] }))}
                      />
                    )}
                    {canonical[wk.week] && <CanonicalPanel c={canonical[wk.week]} />}
                    {tmpl[`week:${wk.week}`] && (
                      <div className="mt-4">
                        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Weekly lesson-plan document
                        </h4>
                        <MatchCheck r={tmpl[`week:${wk.week}`]} />
                      </div>
                    )}
                    {debugOn && weekDebug[wk.week] && <DebugPanel d={weekDebug[wk.week]} />}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}

// Two Kings: the fidelity-gate result for a week (the four protected fields per day).
function FidelityPanel({
  f,
  onRecheck,
  rechecking,
  override,
  onToggleOverride,
}: {
  f: FidelityWeek;
  onRecheck: () => void;
  rechecking: boolean;
  override: boolean;
  onToggleOverride: () => void;
}) {
  const fields = [
    { key: "unlock", label: "Earned unlock" },
    { key: "binaryMastery", label: "Binary mastery" },
    { key: "mechanismWhy", label: "Mechanism Why" },
    { key: "escalation", label: "Grade-band escalation" },
  ] as const;
  return (
    <div className={`mt-3 rounded-md border p-3 text-xs ${f.weekPass ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-slate-700">
          Two Kings fidelity gate{" "}
          <span className={f.weekPass ? "text-green-700" : "text-red-700"}>{f.weekPass ? "PASS" : "FAIL"}</span>
        </span>
        <button
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          onClick={onRecheck}
          disabled={rechecking}
        >
          {rechecking ? "Checking…" : "Re-check fidelity"}
        </button>
      </div>
      <div className="space-y-2">
        {f.days.map((d) => (
          <div key={d.day} className="border-t border-black/5 pt-1.5">
            <div className="font-semibold text-slate-700">
              {d.dayPass ? "✓" : "✗"} {d.day}
            </div>
            <ul className="mt-0.5 space-y-0.5">
              {fields.map(({ key, label }) => {
                const cell = d[key];
                return (
                  <li key={key} className={cell.pass ? "text-slate-500" : "text-red-700"}>
                    {cell.pass ? "✓" : "✗"} {label}
                    {!cell.pass && cell.note ? `: ${cell.note}` : ""}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {!f.weekPass && (
        <label className="mt-2 flex items-center gap-2 text-slate-600">
          <input type="checkbox" checked={override} onChange={onToggleOverride} />
          Override the gate — I verified these fields manually and accept the risk.
        </label>
      )}
    </div>
  );
}

// Two Kings: the canonical Access spine (source of record), collapsed by default.
function CanonicalPanel({ c }: { c: CanonicalWeek }) {
  const rows: { label: string; get: (d: CanonicalWeek["days"][number]) => string }[] = [
    { label: "Mechanism / Why", get: (d) => d.mechanismWhy },
    { label: "Earned unlock", get: (d) => d.unlock },
    { label: "Binary Check2Pass", get: (d) => d.binaryCheck2Pass },
    { label: "Grade-band escalation", get: (d) => d.gradeBandEscalation },
    { label: "Guide moves", get: (d) => d.guideMoves },
  ];
  return (
    <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
      <summary className="cursor-pointer font-semibold text-slate-600">
        Canonical Access spine (source of record) — {c.days.length} day{c.days.length === 1 ? "" : "s"}
      </summary>
      <div className="mt-2 space-y-3">
        {c.days.map((d) => (
          <div key={d.day} className="border-t border-slate-200 pt-2">
            <div className="font-semibold text-slate-700">{d.day}</div>
            <div className="mt-1 space-y-1">
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[150px_1fr] gap-2">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="text-slate-700">{r.get(d)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
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
  file: { id: string; webViewLink: string; shared?: "ok" | "failed" | "skipped" } | null;
  fillError?: string;
  kind?: "doc";
};

// Template Match Check panel: what mapped, what is missing / unmapped / duplicated,
// and each facilitation's verdict — the pre-export flag list.
function MatchCheck({ r }: { r: TemplateFillResult }) {
  const c = r.templateMatchCheck;
  const filled = r.placeholders.length - c.missing.length;
  return (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs">
      {r.file?.webViewLink && (
        <div className="rounded-md border border-green-300 bg-green-50 px-2 py-1.5 text-green-800">
          <div className="font-semibold">✓ Lesson Plan created</div>
          <a href={r.file.webViewLink} target="_blank" rel="noreferrer" className="text-brand-light underline">
            Open Google Doc ↗
          </a>
          {r.file.shared === "ok" && <div className="mt-0.5">Shared with your Google account.</div>}
          {r.file.shared === "failed" && (
            <div className="mt-0.5 text-amber-700">
              The files were created successfully but could not be shared automatically. Contact an administrator.
            </div>
          )}
        </div>
      )}
      {r.fillError && <div className="text-amber-700">Not rendered: {r.fillError}</div>}
      <div className="text-slate-600">
        {filled}/{r.placeholders.length} fields filled · {c.missing.length} missing · {c.unmapped.length} unmapped ·{" "}
        {c.duplicates.length} duplicate
      </div>
      {c.duplicates.length > 0 && (
        <div className="text-slate-500">
          Repeated tokens (filled with the same value in each spot): {c.duplicates.join(", ")}
        </div>
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