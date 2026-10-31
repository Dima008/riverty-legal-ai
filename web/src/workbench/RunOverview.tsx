// Step 2: the answer at a glance. Coverage first: what was checked, what was excluded and why -
// and, for a selection, that the answer covers only the chosen contracts (decision 75).
import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import type { Run } from "../api";
import { useT } from "../i18n";
import { DOC_TYPE_LABEL, scopeText, TRIAGE_LABEL } from "../labels";
import { USERS } from "../user";

function Kpi({ value, label, sub, tone }: { value: string | number; label: string; sub?: string; tone?: string }) {
  return (
    <div className={`kpi${tone ? ` ${tone}` : ""}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// question: the wording to show (the run itself keeps the English question it was asked with)
export function RunOverview({ run, question }: { run: Run; question: string | null }) {
  const t = useT();
  const c = run.coverage;
  const sel = c.selection;
  const scope = sel ? t("selected from {of}", { of: sel.of }) : t(DOC_TYPE_LABEL[c.scope] ?? c.scope);
  const pct = (n: number) => `${(n / Math.max(c.in_scope, 1)) * 100}%`;
  const triage = (["FOUR_EYES", "REVIEW", "CONFIRM"] as const)
    .filter((k) => run.triage[k])
    .map((k) => `${run.triage[k]} ${t(TRIAGE_LABEL[k].toLowerCase())}`)
    .join(" · ");

  return (
    <section className="panel overview" aria-label={t("Answer overview")}>
      <div className="panel-head">
        <div>
          <div className="eyebrow">{t("Step 2 · Answer")}</div>
          <h2>{question ?? t("Your check")}</h2>
        </div>
      </div>

      {sel && (
        <MessageBar intent="warning" className="scope-note">
          <MessageBarBody>
            {t("A selection: {n} of {of} contracts, chosen by {user}. This answer covers only these – not the whole portfolio.",
               { n: sel.chosen, of: sel.of, user: t(USERS[run.created_by] ?? run.created_by) })}
            {Object.keys(sel.filters).length > 0 && <> {t("How they were chosen: {filters}", { filters: scopeText(sel.filters, t) })}</>}
          </MessageBarBody>
        </MessageBar>
      )}

      <div className="kpis">
        <Kpi value={c.in_scope} label={t("in scope")} sub={scope} />
        <Kpi value={c.checked} label={t("checked")} sub={t("read completely, with evidence")} tone="good" />
        <Kpi value={c.reported} label={t("to look at")} sub={triage || t("nothing to report")} tone="attention" />
        <Kpi value={c.excluded.length} label={t("excluded")} sub={c.excluded.length ? t("with reason, see below") : t("none")} tone="muted" />
        <Kpi value={`$${run.cost.usd.toFixed(2)}`} label={t("cost of this question")} sub={t("register built once for {usd}", { usd: `$${run.cost.register_total_usd.toFixed(2)}` })} />
      </div>

      <div className="coverage">
        <div className="coverage-bar" role="img" aria-label={t("{reported} to look at, {ok} without finding, {excluded} excluded", { reported: c.reported, ok: c.checked - c.reported, excluded: c.excluded.length })}>
          <div className="seg-reported" style={{ width: pct(c.reported) }} />
          <div className="seg-ok" style={{ width: pct(c.checked - c.reported) }} />
          <div className="seg-excluded" style={{ width: pct(c.excluded.length) }} />
        </div>
        <div className="legend">
          <span className="l-reported">{t("to look at")}</span>
          <span className="l-ok">{t("checked, nothing to report")}</span>
          <span className="l-excluded">{t("excluded")}</span>
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
                <b>{r.doc_id}</b> {t("former name already resolved by amendment {id}", { id: r.resolved_by })}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
