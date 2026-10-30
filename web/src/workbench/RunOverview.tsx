// Step 2: the answer at a glance. Coverage first: what was checked, what was excluded and why.
import type { Run } from "../api";
import { DOC_TYPE_LABEL, TRIAGE_LABEL } from "../labels";

function Kpi({ value, label, sub, tone }: { value: string | number; label: string; sub?: string; tone?: string }) {
  return (
    <div className={`kpi${tone ? ` ${tone}` : ""}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function RunOverview({ run }: { run: Run }) {
  const c = run.coverage;
  const scope = DOC_TYPE_LABEL[c.scope] ?? c.scope;
  const pct = (n: number) => `${(n / Math.max(c.in_scope, 1)) * 100}%`;
  const triage = (["FOUR_EYES", "REVIEW", "CONFIRM"] as const)
    .filter((t) => run.triage[t])
    .map((t) => `${run.triage[t]} ${TRIAGE_LABEL[t].toLowerCase()}`)
    .join(" · ");

  return (
    <section className="panel overview" aria-label="Answer overview">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Step 2 · Answer</div>
          <h2>{run.question ?? "Your check"}</h2>
        </div>
      </div>

      <div className="kpis">
        <Kpi value={c.in_scope} label="in scope" sub={scope} />
        <Kpi value={c.checked} label="checked" sub="read completely, with evidence" tone="good" />
        <Kpi value={c.reported} label="to look at" sub={triage || "nothing to report"} tone="attention" />
        <Kpi value={c.excluded.length} label="excluded" sub={c.excluded.length ? "with reason, see below" : "none"} tone="muted" />
        <Kpi value={`$${run.cost.usd.toFixed(2)}`} label="cost of this question" sub={`register built once for $${run.cost.register_total_usd.toFixed(2)}`} />
      </div>

      <div className="coverage">
        <div className="coverage-bar" role="img" aria-label={`${c.reported} to look at, ${c.checked - c.reported} without finding, ${c.excluded.length} excluded`}>
          <div className="seg-reported" style={{ width: pct(c.reported) }} />
          <div className="seg-ok" style={{ width: pct(c.checked - c.reported) }} />
          <div className="seg-excluded" style={{ width: pct(c.excluded.length) }} />
        </div>
        <div className="legend">
          <span className="l-reported">to look at</span>
          <span className="l-ok">checked, nothing to report</span>
          <span className="l-excluded">excluded</span>
        </div>
        {c.excluded.length > 0 && (
          <ul className="exclusions">
            {c.excluded.map((e) => (
              <li key={e.doc_id}>
                <b>{e.doc_id}</b> {e.reason}
              </li>
            ))}
          </ul>
        )}
        {run.info.resolved_by_amendment?.length ? (
          <ul className="exclusions">
            {run.info.resolved_by_amendment.map((r) => (
              <li key={r.doc_id}>
                <b>{r.doc_id}</b> former name already resolved by amendment {r.resolved_by}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
