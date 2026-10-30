// Question -> plan (lawyer confirms) -> run over every contract -> overview with coverage ->
// contracts to look at -> evidence and decision.
import { MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { DocumentSearch24Regular, PeopleTeam24Regular, ShieldCheckmark24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, ApiError, type Plan, type Run, type RunRow } from "../api";
import { AskPanel, type Meta } from "./AskPanel";
import { Evidence } from "./Evidence";
import { ResultList } from "./ResultList";
import { RunOverview } from "./RunOverview";

function Promises() {
  const items = [
    { icon: <ShieldCheckmark24Regular />, title: "Complete", text: "Every contract in scope is read in full – or listed as excluded, with the reason. Nothing drops out silently." },
    { icon: <DocumentSearch24Regular />, title: "Evidence first", text: "Every finding points to the passage on the original page, and shows which checks it passed." },
    { icon: <PeopleTeam24Regular />, title: "You decide", text: "The system reports observations. Critical cases need two people, and nothing leaves the system without approval." },
  ];
  return (
    <section className="promises" aria-label="How it works">
      {items.map((i) => (
        <div key={i.title} className="promise">
          <div className="promise-icon">{i.icon}</div>
          <div>
            <h3>{i.title}</h3>
            <p>{i.text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

export function Workbench() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>({ check: "missing_clause", params: {} });
  const [run, setRun] = useState<Run | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.examples(), api.checks(), api.catalogue()])
      .then(([examples, checks, cat]) => setMeta({ examples, checks, clauses: cat.clauses }))
      .catch((e) => setError(`API not reachable – is the backend running on port 8010? (${e})`));
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
      const r = await api.createRun(plan, question);
      setRun(r);
      setSelected(r.rows[0]?.doc_id ?? null);
    });
  const refresh = () => run && guard(async () => setRun(await api.run(run.run_id)));
  const confirmRoutine = (rows: RunRow[]) =>
    run && guard(async () => {
      await api.confirmBatch(run.run_id, rows.map((r) => r.doc_id));
      setRun(await api.run(run.run_id));
    });

  if (!meta) return error ? <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar> : <Spinner label="Loading…" />;
  const row = run?.rows.find((r) => r.doc_id === selected) ?? null;

  return (
    <div className="workbench">
      <AskPanel
        meta={meta}
        question={question}
        plan={plan}
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
      />

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      {!run && <Promises />}

      {run && (
        <>
          <RunOverview run={run} />
          <div className="master-detail">
            <ResultList run={run} selected={selected} busy={busy} onSelect={setSelected} onConfirmRoutine={confirmRoutine} />
            <section aria-label="Evidence">
              {row ? (
                <Evidence run={run} row={row} onChanged={refresh} />
              ) : (
                <div className="panel empty">Select a contract to see the evidence.</div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
