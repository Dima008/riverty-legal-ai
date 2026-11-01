// The Workbench (decision 91): Legal works here in three steps, one screen each - 1 Ask (a question
// becomes a plan, the lawyer confirms it), 2 Answer (every contract in scope, coverage, the list "To look
// at"), 3 Decide (page, finding, decision, four eyes, archive copy). The address says where you are
// (D2): #/tool/workbench is a fresh step 1, ?run=<id> the answer, ?run=<id>&doc=M08 one contract of it,
// ?doc=M08&clause=... one finding opened from the register (D6). So a reload, a tab switch or the audit
// log can open an answer again. Step 1 also reads the register's hand-over: ?q=Q2, ?check=&clause=,
// ?type=&law=&from=&to=&search= - they prefill the plan, nothing runs.
import { MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { api, ApiError, type Example, type Plan, type Run, type RunRow } from "../api";
import { ContractFile } from "../register/ContractFile";
import { hasFilters, NO_FILTERS, readParams, readRecorded, type Prefill, type ScopeFilters } from "../filters";
import { useLang, useT } from "../i18n";
import { planQuestion, serverMessage } from "../labels";
import { useRegisterLive } from "../live";
import { navigate, useHashRoute, workbenchHref } from "../routing";
import { AnswerStep } from "./AnswerStep";
import { AskStep, NewStrip, type Meta } from "./AskStep";
import { DecideOne, DecideStep } from "./DecideStep";
import { PlanCard } from "./PlanCard";
import { NO_CHIPS, type Chips } from "./ToLookAt";
import { FreshnessNote, OneFindingBar, WorkBar, type Step } from "./WorkBar";
import "./workbench.css";

/** What step 1 holds until the plan is confirmed. */
interface Ask {
  picked: string | null;          // the example question (Q1-Q8), or null for a question built by hand
  question: string | null;        // its English wording: the run keeps it
  plan: Plan | null;              // null: nothing chosen yet
  type: string;                   // "" = every type
  filters: ScopeFilters;          // Narrow down
  fromRegister: boolean;          // the filters came with the address
}
const FRESH: Ask = { picked: null, question: null, plan: null, type: "", filters: NO_FILTERS, fromRegister: false };

/** Step 1 from the address: an example question or a check with its clause, the type, the filters. */
function prefilled(p: Prefill, meta: Meta): Ask {
  const ex = meta.examples.find((e) => e.id === p.q) ?? null;
  const clause = p.clause && meta.clauses[p.clause] ? p.clause : "";
  const plan = ex ? ex.plan : meta.checks[p.check] ? { check: p.check, params: clause ? { clause_type: clause } : {} } : null;
  return {
    picked: ex?.id ?? null,
    question: ex?.question ?? null,
    plan,
    type: p.type ?? plan?.params.doc_type ?? "",
    filters: p.filters,
    fromRegister: hasFilters(p.filters),
  };
}

/** The other way round, for the step "Ask" of an open answer: the same question with the same plan. */
function askHref(run: Run, meta: Meta): string {
  const ex = meta.examples.find((e) => e.question === run.question && e.plan.check === run.plan.check);
  const recorded = run.plan.scope ? readRecorded(run.plan.scope.filters) : null;
  return workbenchHref({
    q: ex?.id,
    check: ex ? undefined : run.plan.check,
    clause: ex ? undefined : run.plan.params.clause_type,
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
  const [chips, setChips] = useState<Chips>(NO_CHIPS);
  // a contract file opened from the answer (a quiet tile, the original of a copy); the answer stays as it is
  const [file, setFile] = useState<{ docId: string; clause: string | null } | null>(null);
  // the register as it is now: from the live provider of the tool layer (live.tsx), never fetched here
  const matrix = live.matrix;
  const fresh = new Set(live.newDocs.map((r) => r.doc_id));

  useEffect(() => {
    Promise.all([api.examples(), api.checks(), api.catalogue()])
      .then(([examples, checks, cat]) => setMeta({ examples, checks, clauses: cat.clauses }))
      .catch((e) => setError(t("API not reachable – is the backend running on port 8010? ({error})", { error: String(e) })));
  }, []);

  // step 1 follows its address: #/tool/workbench is a fresh start, ?q=Q2&search=H01 a prefilled one
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
  // another answer starts with every row shown
  useEffect(() => setChips(NO_CHIPS), [run?.run_id]);

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
  // a new run: the plan confirmed in step 1, or the same plan again for an out-of-date answer (Ask again);
  // the old answer stays in the workflow database as it was
  const start = (sent: Plan, question: string | null) =>
    guard(async () => {
      const r = await api.createRun(sent, question);
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
  const step: Step = oneFinding ? 3 : answer ? (docId ? 3 : 2) : 1;

  // the question on the work bar: the example's wording in the chosen language, or the plan in words
  const example = (q: string | null) => meta.examples.find((e: Example) => e.question === q);
  const words = (q: string | null, plan: Plan) => (lang === "de" && example(q)?.question_de) || q || planQuestion(plan, meta.clauses, t);
  const question = answer ? words(answer.question, answer.plan) : ask.plan ? words(ask.question, ask.plan) : null;
  const hrefs: Partial<Record<Step, string>> = answer
    ? { 1: askHref(answer, meta), 2: workbenchHref({ run: answer.run_id }) }
    : {};

  return (
    <div className={`wb step-${step}`}>
      {oneFinding ? (
        <OneFindingBar docId={docId!} clause={t(meta.clauses[clause!]?.label ?? clause!)}
                       back={`#/tool/register?doc=${encodeURIComponent(docId!)}&clause=${encodeURIComponent(clause!)}`} />
      ) : (
        <WorkBar step={step} hrefs={hrefs} question={question}
                 right={answer && <FreshnessNote run={answer} busy={busy} onAskAgain={(plan) => start(plan, answer.question)} />} />
      )}

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {unknownRun && step === 1 && (
        <MessageBar intent="warning"><MessageBarBody>{t("This answer is not in the workflow database.")}</MessageBarBody></MessageBar>
      )}

      {step === 1 && <NewStrip onOpen={openDoc} />}
      {step === 1 && (
        <div className="ask-grid">
          <AskStep meta={meta} picked={ask.picked} plan={ask.plan}
                   onExample={(ex) => setAsk((a) => ({ ...a, picked: ex.id, question: ex.question, plan: ex.plan, type: ex.plan.params.doc_type ?? "" }))}
                   onPlan={(plan) => setAsk((a) => ({ ...a, picked: null, question: null, plan }))} />
          <PlanCard meta={meta} plan={ask.plan} type={ask.type} filters={ask.filters} rows={matrix?.rows ?? null}
                    fromRegister={ask.fromRegister} busy={busy}
                    onType={(type) => setAsk((a) => ({ ...a, type }))}
                    onFilters={(filters) => setAsk((a) => ({ ...a, filters }))}
                    onConfirm={(sent) => start(sent, ask.question)} />
        </div>
      )}

      {step === 2 && answer && (
        <AnswerStep run={answer} question={question ?? ""} matrix={matrix} chips={chips} fresh={fresh} busy={busy}
                    onChips={setChips} onBatch={batch}
                    onDecide={(id) => navigate(workbenchHref({ run: answer.run_id, doc: id }))}
                    onFile={(id) => setFile({ docId: id, clause: answer.plan.params.clause_type ?? null })} />
      )}

      {step === 3 && answer && docId && (
        <DecideStep run={answer} docId={docId} chips={chips} fresh={fresh} busy={busy} onChips={setChips}
                    onOpen={(id) => navigate(workbenchHref({ run: answer.run_id, doc: id }))}
                    onChanged={refresh} onBatch={batch} onOpenDoc={openDoc} />
      )}

      {oneFinding && <DecideOne docId={docId!} clause={clause!} fresh={fresh} onOpenDoc={openDoc} />}

      <ContractFile open={file} clauses={meta.clauses} onClose={() => setFile(null)} onOpen={openDoc} />
    </div>
  );
}
