// The Workbench (decisions 91, 95): Legal works here in four steps - 1 Analysis (five boxes) and 2 Contracts
// (which contracts, with the preview) on one screen, 3 Answer (every contract in scope as red, orange or
// green, and the list "To decide"), 4 Evidence & decision (the page with the passage marked, the finding,
// and the decision where one is needed). The address says where you are (D2): #/tool/workbench is a fresh
// step 1, ?run=<id> the answer, ?run=<id>&doc=M08 one contract of it, ?doc=M08&clause=... one finding opened
// from the register (D6). Steps 1 and 2 also read the register's hand-over: ?q=Q2, ?check=&clause=&intent=,
// ?type=&law=&from=&to=&search= - they prefill the plan, nothing runs.
import { MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { api, ApiError, type Example, type Plan, type Run, type RunRow } from "../api";
import { ContractFile } from "../register/ContractFile";
import { hasFilters, NO_FILTERS, readParams, readRecorded, type Prefill, type ScopeFilters } from "../filters";
import { useLang, useT } from "../i18n";
import { ANALYSES, planQuestion, serverMessage, type Analysis, type AnalysisId } from "../labels";
import { useRegisterLive } from "../live";
import { navigate, useHashRoute, workbenchHref } from "../routing";
import { AnalysisBoxes, AnalysisPanel, NewStrip, type Meta } from "./AnalysisStep";
import type { Filter } from "./answerRows";
import { AnswerStep } from "./AnswerStep";
import { ContractsStep } from "./ContractsStep";
import { DecideOne, DecideStep } from "./DecideStep";
import { FreshnessNote, OneFindingBar, WorkBar, type Step } from "./WorkBar";
import "./workbench.css";

/** What steps 1 and 2 hold until the plan is confirmed. */
interface Ask {
  analysis: AnalysisId | null;    // the chosen box; null: nothing chosen yet
  plan: Plan | null;
  type: string;                   // "" = every type
  filters: ScopeFilters;
  fromRegister: boolean;          // the type or the filters came with the address: keep them
}
const FRESH: Ask = { analysis: null, plan: null, type: "", filters: NO_FILTERS, fromRegister: false };
const PILOT_CLAUSE = "liability_limitation";

/** The plan a box starts with: a clause analysis keeps the clause it had (the pilot clause first), the law
 *  analysis starts with German law, so it is never sent without one. */
function startPlan(a: Analysis, before: Plan | null): Plan {
  if (a.check === "missing_clause") {
    const clause = before?.check === "missing_clause" && before.params.clause_type ? before.params.clause_type : PILOT_CLAUSE;
    return { check: a.check, params: { clause_type: clause } };
  }
  return { check: a.check, params: a.id === "law" ? { law: "DE" } : {} };
}

/** The contract type an analysis looks at first: a clause where the playbook requires it, the law in merchant
 *  agreements (as Q5), names and copies in every document. */
function startType(plan: Plan, meta: Meta): string {
  if (plan.check === "missing_clause") return meta.clauses[plan.params.clause_type]?.required_for[0] ?? "";
  return plan.check === "governing_law_not" ? "merchant_agreement" : "";
}

/** Steps 1 and 2 from the address: an example question or a check with its clause, the type, the filters. */
function prefilled(p: Prefill, meta: Meta): Ask {
  const ex = meta.examples.find((e) => e.id === p.q) ?? null;
  const check = ex?.plan.check ?? (meta.checks[p.check] ? p.check : "");
  const analysis = ANALYSES.find((a) => (p.intent === "find" && check === "missing_clause" ? a.id === "find" : a.check === check && a.id !== "find"));
  if (!analysis) return { ...FRESH, filters: p.filters, fromRegister: hasFilters(p.filters) || p.type != null };
  let plan = ex ? ex.plan : startPlan(analysis, null);
  if (!ex && p.clause && meta.clauses[p.clause]) plan = { ...plan, params: { ...plan.params, clause_type: p.clause } };
  return {
    analysis: analysis.id,
    plan,
    type: p.type ?? plan.params.doc_type ?? startType(plan, meta),
    filters: p.filters,
    fromRegister: hasFilters(p.filters) || p.type != null,
  };
}

/** The example question (Q1-Q8) this plan is, if any - its wording is stored with the run. "Find a clause"
 *  and a narrowed plan are not an example question. */
function exampleOf(meta: Meta, ask: Pick<Ask, "analysis" | "plan" | "type" | "filters">): Example | null {
  const plan = ask.plan;
  if (!plan || ask.analysis === "find" || hasFilters(ask.filters)) return null;
  const same = (k: string, e: Example) => (e.plan.params[k] ?? "") === (plan.params[k] ?? "");
  return meta.examples.find((e) => e.plan.check === plan.check && same("clause_type", e) && same("law", e)
    && (e.plan.params.doc_type ?? "") === ask.type) ?? null;
}

/** The other way round, for the steps "Analysis" and "Contracts" of an open answer: the same plan again. */
function askHref(run: Run, meta: Meta): string {
  const ex = meta.examples.find((e) => e.question === run.question && e.plan.check === run.plan.check);
  const recorded = run.plan.scope ? readRecorded(run.plan.scope.filters) : null;
  return workbenchHref({
    q: ex?.id,
    check: ex ? undefined : run.plan.check,
    clause: ex ? undefined : run.plan.params.clause_type,
    intent: run.intent === "find" ? "find" : undefined,
    type: recorded ? recorded[0] : run.plan.params.doc_type ?? "",
    ...recorded?.[1],
  });
}

export function Workbench() {
  const t = useT();
  const lang = useLang();
  const live = useRegisterLive();
  const { params } = useHashRoute();
  const runId = params.get("run");
  const docId = params.get("doc");
  const clause = params.get("clause");
  const oneFinding = !runId && !!docId && !!clause;

  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<Ask>(FRESH);
  const [run, setRun] = useState<Run | null>(null);
  const [unknownRun, setUnknownRun] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todo");
  // a contract file opened from the answer (an older answer's tile, the New strip); the answer stays as it is
  const [file, setFile] = useState<{ docId: string; clause: string | null } | null>(null);
  // the register as it is now: from the live provider of the tool layer (live.tsx), never fetched here
  const matrix = live.matrix;
  const fresh = new Set(live.newDocs.map((r) => r.doc_id));
  const newVisible = !!matrix && live.newDocs.length + live.reading.length + live.failed.length > 0;

  useEffect(() => {
    Promise.all([api.examples(), api.checks(), api.catalogue()])
      .then(([examples, checks, cat]) => setMeta({ examples, checks, clauses: cat.clauses }))
      .catch((e) => setError(t("API not reachable – is the backend running on port 8010? ({error})", { error: String(e) })));
  }, []);

  // steps 1 and 2 follow their address: #/tool/workbench is a fresh start, ?q=Q2&search=H01 a prefilled one
  const stepOneAddress = runId || docId ? null : params.toString();
  useEffect(() => {
    if (stepOneAddress != null && meta) setAsk(prefilled(readParams(new URLSearchParams(stepOneAddress)), meta));
  }, [stepOneAddress, meta]);

  // the answer in the address: loaded from the workflow database (a snapshot plus today's decisions)
  useEffect(() => {
    if (!runId) {
      setUnknownRun(null);
      return;
    }
    if (run?.run_id === runId) return;
    let cancelled = false;
    setUnknownRun(null);
    api.run(runId)
      .then((r) => !cancelled && setRun(r))
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setUnknownRun(runId);
        else setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);
  // another answer starts on "To decide" - "Find a clause" on the green ones
  useEffect(() => setFilter(run?.intent === "find" ? "green" : "todo"), [run?.run_id]);

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? serverMessage(e.status, e.message, null, t) : String(e));
    } finally {
      setBusy(false);
    }
  }
  // a new run: the confirmed plan, or the same plan again for an out-of-date answer (Ask again);
  // the old answer stays in the workflow database as it was
  const start = (sent: Plan, question: string | null, intent: "missing" | "find" | null) =>
    guard(async () => {
      const r = await api.createRun(sent, question, intent);
      setRun(r);
      navigate(workbenchHref({ run: r.run_id }));
    });
  const refresh = () => run && guard(async () => setRun(await api.run(run.run_id)));
  const batch = (rows: RunRow[]) =>
    run && guard(async () => {
      await api.confirmBatch(run.run_id, rows.map((r) => r.doc_id));
      setRun(await api.run(run.run_id));
    });
  const openDoc = (id: string) => setFile({ docId: id, clause: null });

  if (!meta) return error ? <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar> : <Spinner label={t("Loading…")} />;

  // which step: the address decides; an answer that is not (yet) loaded shows step 1 or a spinner
  const answer = run && run.run_id === runId ? run : null;
  if (runId && !answer && unknownRun !== runId) return <Spinner label={t("Loading…")} />;
  const step: Step = oneFinding ? 4 : answer ? (docId ? 4 : 3) : ask.analysis ? 2 : 1;

  // the question on the work bar: the example's wording in the chosen language, or the plan in words
  const example = exampleOf(meta, ask);
  const stored = (q: string | null) => meta.examples.find((e: Example) => e.question === q);
  const question = answer
    ? (lang === "de" && stored(answer.question)?.question_de) || answer.question || planQuestion(answer.plan, meta.clauses, t, answer.intent)
    : example ? (lang === "de" ? example.question_de : example.question)
    : ask.plan ? planQuestion(ask.plan, meta.clauses, t, ask.analysis === "find" ? "find" : null) : null;
  const hrefs: Partial<Record<Step, string>> = answer
    ? { 1: askHref(answer, meta), 2: askHref(answer, meta), 3: workbenchHref({ run: answer.run_id }) }
    : {};
  const analysis = ANALYSES.find((a) => a.id === ask.analysis) ?? null;
  const law = ask.plan?.params.law;
  const missing = analysis?.id === "law" && !/^[A-Z]{2}$/.test(law ?? "") ? "Expected law: two letters, e.g. DE" : null;

  return (
    <div className={`wb step-${step}`}>
      {oneFinding ? (
        <OneFindingBar docId={docId!} clause={t(meta.clauses[clause!]?.label ?? clause!)}
                       back={`#/tool/register?doc=${encodeURIComponent(docId!)}&clause=${encodeURIComponent(clause!)}`} />
      ) : (
        <WorkBar step={step} hrefs={hrefs} question={question}
                 right={answer && <FreshnessNote run={answer} busy={busy} onAskAgain={(plan) => start(plan, answer.question, answer.intent ?? null)} />} />
      )}

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {unknownRun && step <= 2 && (
        <MessageBar intent="warning"><MessageBarBody>{t("This answer is not in the workflow database.")}</MessageBarBody></MessageBar>
      )}

      {step <= 2 && (
        <>
          <NewStrip onOpen={openDoc} />
          <AnalysisBoxes chosen={ask.analysis} compact={newVisible}
                         onChoose={(a) => setAsk((s) => {
                           const plan = startPlan(a, s.plan);
                           return { ...s, analysis: a.id, plan, type: s.fromRegister ? s.type : startType(plan, meta) };
                         })} />
          <div className="plan-grid">
            {analysis && ask.plan ? (
              <AnalysisPanel meta={meta} analysis={analysis} plan={ask.plan}
                             onPlan={(plan, type) => setAsk((s) => ({ ...s, plan, type: type != null && !s.fromRegister ? type : s.type }))} />
            ) : (
              <section className="panel apanel waiting-panel">{t("Choose an analysis above – its question, the clause or law, and the colours of its answer appear here.")}</section>
            )}
            <ContractsStep plan={ask.plan} missing={missing} type={ask.type} filters={ask.filters} rows={matrix?.rows ?? null} busy={busy}
                           onType={(type) => setAsk((s) => ({ ...s, type }))}
                           onFilters={(filters) => setAsk((s) => ({ ...s, filters }))}
                           onConfirm={(sent) => start(sent, example?.question ?? null, ask.analysis === "find" ? "find" : ask.analysis === "missing" ? "missing" : null)} />
          </div>
        </>
      )}

      {step === 3 && answer && (
        <AnswerStep run={answer} clauses={meta.clauses} filter={filter} fresh={fresh} busy={busy}
                    onFilter={setFilter} onBatch={batch}
                    onOpen={(id) => navigate(workbenchHref({ run: answer.run_id, doc: id }))}
                    onFile={openDoc} />
      )}

      {step === 4 && answer && docId && (
        <DecideStep run={answer} docId={docId} clauses={meta.clauses} documents={matrix?.rows.length ?? 0} filter={filter}
                    fresh={fresh} busy={busy} onFilter={setFilter}
                    onOpen={(id) => navigate(workbenchHref({ run: answer.run_id, doc: id }))}
                    onChanged={refresh} onBatch={batch} onOpenDoc={openDoc} />
      )}

      {oneFinding && <DecideOne docId={docId!} clause={clause!} clauses={meta.clauses} fresh={fresh} onOpenDoc={openDoc} />}

      <ContractFile open={file} clauses={meta.clauses} onClose={() => setFile(null)} onOpen={openDoc} />
    </div>
  );
}
