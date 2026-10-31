// Question -> plan (lawyer confirms) -> run over every contract -> overview with coverage ->
// contracts to look at -> evidence and decision.
import { MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Matrix, type Plan, type RegisterSummary, type Run, type RunRow, type Scope } from "../api";
import { ContractFile } from "../register/ContractFile";
import { useFormat, useLang, useT } from "../i18n";
import { navigate, useHashRoute } from "../routing";
import { AskPanel, type Meta } from "./AskPanel";
import { Evidence } from "./Evidence";
import { ResultList } from "./ResultList";
import { RunOverview } from "./RunOverview";

/** #/tool/workbench?scope={"doc_ids":[...],"filters":{...}} - the selection made in the register. */
function parseScope(raw: string | null): Scope | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!Array.isArray(s?.doc_ids) || s.doc_ids.length === 0) return null;
    return { doc_ids: s.doc_ids.map(String), filters: s.filters && typeof s.filters === "object" ? s.filters : {} };
  } catch {
    return null;       // a broken link falls back to every contract - and the panel shows no selection
  }
}

/** Before a question: the portfolio as it stands, from the register (no model call). Each number
 *  opens the register with the matching filter; the counts follow the register's own summary line. */
function PortfolioToday({ matrix, summary }: { matrix: Matrix; summary: RegisterSummary | null }) {
  const t = useT();
  const { usd } = useFormat();
  const gaps = matrix.rows.filter((r) => r.gaps.length > 0 && !r.duplicate_of).length;
  const names = matrix.rows.filter((r) => r.former_names.open > 0 && !r.duplicate_of && !r.is_amendment).length;
  const items: { n: string; label: string; to?: string; tone?: string }[] = [
    { n: String(matrix.rows.length), label: t("documents in the register"), to: "/tool/register?type=all" },
    { n: String(gaps), label: t("with a required clause missing or unclear"), to: "/tool/register?type=all&only=gaps", tone: "hit" },
    { n: String(names), label: t("still naming a former company"), to: "/tool/register?type=all&only=names", tone: "unsure" },
  ];
  if (summary) items.push({ n: usd(summary.cost.cost_usd), label: t("to build the register, once – every question after that is free") });
  return (
    <section className="panel portfolio" aria-label={t("Portfolio today")}>
      <div className="eyebrow">{t("Portfolio today")}</div>
      <ul className="pf-items">
        {items.map((i) => (
          <li key={i.label}>
            {i.to ? (
              <a className={`pf-item${i.tone ? ` ${i.tone}` : ""}`} href={`#${i.to}`}>
                <span className="pf-n">{i.n}</span> <span className="pf-label">{i.label}</span>
              </a>
            ) : (
              <span className="pf-item static"><span className="pf-n">{i.n}</span> <span className="pf-label">{i.label}</span></span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Workbench() {
  const t = useT();
  const lang = useLang();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>({ check: "missing_clause", params: {} });
  const [run, setRun] = useState<Run | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // the selection from the register (decision 75): in the address, so a reload keeps it
  const scopeParam = useHashRoute().params.get("scope");
  const [scope, setScope] = useState<Scope | null>(() => parseScope(scopeParam));
  useEffect(() => setScope(parseScope(scopeParam)), [scopeParam]);
  const clearScope = () => navigate("/tool/workbench");
  // a contract file opened from the evidence (e.g. the original of a copy); the run stays as it is
  const [file, setFile] = useState<{ docId: string; clause: string | null } | null>(null);
  const openDoc = (docId: string) => setFile({ docId, clause: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the register as it stands: the start strip, and the contract tiles of the answer
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [summary, setSummary] = useState<RegisterSummary | null>(null);
  const detail = useRef<HTMLDivElement>(null);
  // Step 1 folds into one line once a run exists, and the answer moves to the top of the window
  const [askOpen, setAskOpen] = useState(true);
  const answer = useRef<HTMLDivElement>(null);
  const scrollToAnswer = useRef(false);
  useEffect(() => {
    if (!run || !scrollToAnswer.current) return;
    scrollToAnswer.current = false;
    answer.current?.scrollIntoView({ block: "start" });
  }, [run]);

  useEffect(() => {
    Promise.all([api.examples(), api.checks(), api.catalogue()])
      .then(([examples, checks, cat]) => setMeta({ examples, checks, clauses: cat.clauses }))
      .catch((e) => setError(t("API not reachable – is the backend running on port 8010? ({error})", { error: String(e) })));
    // optional extras: without them the strip and the tiles are left out, the workbench still works
    api.matrix().then(setMatrix).catch(() => setMatrix(null));
    api.summary().then(setSummary).catch(() => setSummary(null));
  }, []);

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    guard(async () => {
      const r = await api.createRun(scope ? { ...plan, scope } : plan, question);
      scrollToAnswer.current = true;   // only after a new run, not after a review refreshes it
      setRun(r);
      setSelected(r.rows[0]?.doc_id ?? null);
      setAskOpen(false);
    });
  const refresh = () => run && guard(async () => setRun(await api.run(run.run_id)));
  // a tile in the answer opens that contract's evidence below it
  const pickTile = (docId: string) => {
    setSelected(docId);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    detail.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
  };
  const confirmRoutine = (rows: RunRow[]) =>
    run && guard(async () => {
      await api.confirmBatch(run.run_id, rows.map((r) => r.doc_id));
      setRun(await api.run(run.run_id));
    });

  if (!meta) return error ? <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar> : <Spinner label={t("Loading…")} />;
  const row = run?.rows.find((r) => r.doc_id === selected) ?? null;
  // The run keeps the English question it was asked with; in German the example's German wording is shown.
  const shownQuestion = (lang === "de" && meta.examples.find((e) => e.question === run?.question)?.question_de) || run?.question || null;

  return (
    <div className="workbench">
      <AskPanel
        meta={meta}
        question={question}
        plan={plan}
        scope={scope}
        onClearScope={clearScope}
        busy={busy}
        onExample={(ex) => {
          setQuestion(ex.question);
          setPlan(ex.plan);
        }}
        onPlan={(p) => {
          setPlan(p);
          setQuestion(null);
        }}
        onRun={start}
        compact={!!run && !askOpen}
        onExpand={() => setAskOpen(true)}
      />

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      {!run && matrix && <PortfolioToday matrix={matrix} summary={summary} />}

      {run && (
        <div className="answer" ref={answer}>
          <RunOverview run={run} question={shownQuestion} matrix={matrix} selected={selected} onSelect={pickTile} />
          <div className="master-detail" ref={detail}>
            <ResultList run={run} selected={selected} busy={busy} onSelect={setSelected} onConfirmRoutine={confirmRoutine} />
            <section aria-label={t("Evidence")}>
              {row ? (
                <Evidence run={run} row={row} onChanged={refresh} onOpenDoc={openDoc} />
              ) : (
                <div className="panel empty">{t("Select a contract to see the evidence.")}</div>
              )}
            </section>
          </div>
          <ContractFile open={file} clauses={meta.clauses} onClose={() => setFile(null)} onOpen={openDoc} />
        </div>
      )}
    </div>
  );
}
