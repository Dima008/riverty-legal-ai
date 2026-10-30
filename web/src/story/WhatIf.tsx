// "Switch a safeguard off" – the live failure demo. The stored model answers are replayed without
// the safeguards you switch off, on a copy of the register: no model call, the same result every
// time (eval/what_if.py, GET /what-if). Shows which contracts would slip through and which cases
// would no longer get a second look.
import { Button, Spinner, Switch } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { api, type WhatIfLayer, type WhatIfResult, type WhatIfRow, type WhatIfSide } from "../api";
import { flagLabel, STATUS_SHORT, TRIAGE_LABEL } from "../labels";

const QUESTIONS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"];

const PRESETS: { label: string; off: string[] }[] = [
  { label: "Everything on", off: [] },
  { label: "Without vocabulary check and checker", off: ["clause_vocabulary", "checker"] },
  { label: "Without recall first", off: ["recall_first"] },
  { label: "Without injection guard", off: ["injection_guard"] },
];

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const percent = (x: number) => `${Math.round(x * 100)}%`;

export function WhatIf() {
  const [layers, setLayers] = useState<WhatIfLayer[]>([]);
  const [modelAlone, setModelAlone] = useState<string[]>([]);
  const [clauses, setClauses] = useState<Record<string, string>>({});
  const [off, setOff] = useState<string[]>([]);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [table, setTable] = useState<WhatIfRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = [...off].sort().join(",");

  useEffect(() => {
    api.whatIfLayers()
      .then((r) => { setLayers(r.layers); setModelAlone(r.model_alone); })
      .catch((e: Error) => setError(e.message));
    api.catalogue()
      .then((c) => setClauses(Object.fromEntries(Object.entries(c.clauses).map(([k, v]) => [k, v.label]))))
      .catch(() => undefined);
    api.whatIfEveryLayer().then(setTable).catch(() => setTable([]));
  }, []);

  useEffect(() => {
    let current = true;
    setBusy(true);
    api.whatIf(key ? key.split(",") : [])
      .then((r) => { if (current) { setResult(r); setError(null); } })
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setBusy(false));
    return () => { current = false; };
  }, [key]);

  const toggle = (id: string, on: boolean) => setOff((prev) => (on ? prev.filter((x) => x !== id) : [...prev, id]));
  const layerName = (id: string) =>
    id === "model_alone" ? "Model alone (all four checks on a found clause)" : layers.find((l) => l.id === id)?.label ?? id;
  const groups = [...new Set(layers.map((l) => l.group))];
  const presets = modelAlone.length ? [...PRESETS, { label: "The model alone", off: modelAlone }] : PRESETS;

  return (
    <div className="whatif">
      <div className="wi-intro">
        <p>
          The stored model answers run through the checks again – without the safeguards you switch off. On a copy of
          the register, without a model call: the same result every time.
        </p>
        <div className="wi-presets">
          {presets.map((p) => (
            <Button key={p.label} size="small" appearance={same(off, p.off) ? "primary" : "secondary"} onClick={() => setOff(p.off)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="wi-grid">
        <section className="wi-layers" aria-label="Safeguards">
          {groups.map((g) => (
            <div key={g} className="wi-group">
              <div className="section-title small">{g}</div>
              {layers.filter((l) => l.group === g).map((l) => (
                <div key={l.id} className={`wi-layer ${off.includes(l.id) ? "is-off" : ""}`}>
                  <Switch checked={!off.includes(l.id)} onChange={(_, d) => toggle(l.id, d.checked)} label={l.label} />
                  <div className="wi-guards">
                    Guards against {l.guards}
                    {l.failures.map((f) => <span key={f} className="wi-failure">{f}</span>)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section className="wi-result" aria-live="polite" aria-busy={busy}>
          {error && <div className="wi-error">{error}</div>}
          {result && <Outcome result={result} clauses={clauses} />}
          {busy && <div className="wi-busy"><Spinner size="small" label="Replaying the register…" /></div>}
        </section>
      </div>

      <section className="wi-table-wrap">
        <div className="section-title small">Each safeguard switched off on its own – click a row to try it</div>
        {!table ? (
          <Spinner size="tiny" label="Replaying the register once per safeguard (about 8 seconds)…" />
        ) : (
          <div className="wi-scroll">
            <table className="wi-table">
              <thead>
                <tr>
                  <th>Switched off</th>
                  {QUESTIONS.map((q) => <th key={q}>{q}</th>)}
                  <th>Second look lost</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.layer} className={same(off, r.off) ? "on" : undefined} onClick={() => setOff(r.off)}>
                    <td>{layerName(r.layer)}</td>
                    {QUESTIONS.map((q) => {
                      const dropped = r.recall[q] < r.recall_before[q];
                      return <td key={q} className={dropped ? "bad" : "ok"}>{dropped ? percent(r.recall[q]) : "✓"}</td>;
                    })}
                    <td>{r.second_look_lost || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">
          ✓ = every expected contract still found. One check alone changes nothing on Q1: the vocabulary check and the
          checker overlap. The quote check and the OCR guard change nothing on today's data – every quote exists and no
          scan is poor yet; they guard against cases from the failure catalogue.
        </p>
      </section>
    </div>
  );
}

function Outcome({ result, clauses }: { result: WhatIfResult; clauses: Record<string, string> }) {
  const s = result.summary;
  const nothing = s.findings_changed === 0 && s.questions_changed === 0;
  return (
    <>
      <div className={`wi-verdict ${s.contracts_missed.length ? "bad" : nothing ? "good" : "warn"}`}>
        {nothing
          ? "Nothing changes: every contract is still found and every case keeps its review."
          : [
              s.contracts_missed.length ? `${s.contracts_missed.join(", ")} slip${s.contracts_missed.length === 1 ? "s" : ""} through` : "Every expected contract is still found",
              `${s.findings_changed} finding${s.findings_changed === 1 ? "" : "s"} change`,
              `${s.second_look_lost} lose${s.second_look_lost === 1 ? "s" : ""} the second look`,
            ].join(" · ")}
      </div>
      <div className="wi-questions">
        {result.questions.map((q) => {
          const found = Math.round(q.recall[1] * q.expected.length);
          const dropped = q.recall[1] < q.recall[0];
          return (
            <div key={q.id} className={`wi-q ${dropped ? "bad" : ""}`} title={q.question}>
              <div className="wi-q-head">
                <span className="wi-q-id">{q.id}</span>
                <span className="wi-q-value">{found}/{q.expected.length}</span>
              </div>
              <div className="wi-q-text">{q.question}</div>
              {dropped && <div className="wi-q-missed">Missed: {q.missed.join(", ")}</div>}
            </div>
          );
        })}
      </div>
      {result.changes.length > 0 && (
        <div className="wi-scroll">
          <table className="wi-changes">
            <thead>
              <tr>
                <th>Contract and clause</th>
                <th>With every safeguard</th>
                <th>Without</th>
                <th>No longer raised</th>
              </tr>
            </thead>
            <tbody>
              {result.changes.map((c) => (
                <tr key={`${c.doc_id}-${c.clause_type}`}>
                  <td>
                    <div className="wi-doc">{c.doc_id}</div>
                    <div className="wi-clause">{clauses[c.clause_type] ?? c.clause_type}</div>
                  </td>
                  <td><Side s={c.before} /></td>
                  <td><Side s={c.after} /></td>
                  <td className="wi-raised">{[...new Set(c.no_longer_raised.map(flagLabel))].join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Side({ s }: { s: WhatIfSide }) {
  if (!s.reported) {
    return <span className="wi-side quiet">{s.status === "PRESENT" ? "Found – not reported" : "In no answer at all"}</span>;
  }
  return (
    <span className={`wi-side t-${s.triage}`}>
      {STATUS_SHORT[s.status] ?? s.status} · {s.triage ? TRIAGE_LABEL[s.triage] : "–"}
    </span>
  );
}
