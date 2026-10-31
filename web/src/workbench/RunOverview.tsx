// Step 2: the answer at a glance - one sentence, and one tile per contract in scope, as in the
// talk: coloured = to look at, in the colour of its status badge (click to open it), quiet =
// checked with nothing to report,
// hatched = excluded, with the reason written out below. Coverage first: nothing in scope is left
// out of the picture, and for a selection it says that the answer covers only the chosen
// contracts (decision 75).
import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import type { Matrix, Run, RunRow } from "../api";
import { statusColor, StatusIcon } from "../components/Badges";
import { useFormat, useT } from "../i18n";
import { DOC_TYPE_LABEL, exclusionReason, scopeText, STATUS_SHORT } from "../labels";
import { USERS } from "../user";

// The answer sentence per scope; whole sentences as keys, because German needs the dative after "von"
const ANSWER: Record<string, string> = {
  merchant_agreement: "{n} of {of} merchant agreements to look at",
  data_processing_agreement: "{n} of {of} data processing agreements to look at",
  other_commercial_agreement: "{n} of {of} other commercial agreements to look at",
  amendment: "{n} of {of} amendments to look at",
};

/** The IDs of every contract in scope. The run stores counts, not the list (for a selection it
 *  stores the list), so the scope is rebuilt from the register with the rule of
 *  pipeline/portfolio.py run_check - and used only if it matches the run's own counts. */
function scopeIds(run: Run, matrix: Matrix | null): string[] | null {
  const c = run.coverage;
  let ids: string[] | null = run.plan.scope?.doc_ids ?? null;
  if (!ids && matrix) {
    const type = run.plan.params.doc_type;
    ids = matrix.rows
      .filter((r) => !type || r.doc_type === type || r.doc_type == null || r.doc_type === "unknown")
      .map((r) => r.doc_id);
  }
  if (!ids) return null;
  const known = new Set(ids);
  const consistent = ids.length === c.in_scope
    && run.rows.every((r) => known.has(r.doc_id)) && c.excluded.every((e) => known.has(e.doc_id));
  return consistent ? [...ids].sort() : null;   // the register changed since the run: no tile is better than a wrong one
}

interface Props {
  run: Run;
  question: string | null;    // the wording to show (the run itself keeps the English question it was asked with)
  matrix: Matrix | null;
  selected: string | null;
  onSelect: (docId: string) => void;
}

export function RunOverview({ run, question, matrix, selected, onSelect }: Props) {
  const t = useT();
  const { usd } = useFormat();
  const c = run.coverage;
  const sel = c.selection;
  const rows = new Map<string, RunRow>(run.rows.map((r) => [r.doc_id, r]));
  // the server's reason is a fixed template: shown in the chosen language
  const excluded = new Map(c.excluded.map((e) => [e.doc_id, exclusionReason(e.reason, t)]));
  const ids = scopeIds(run, matrix);
  const answer = sel ? "{n} of {of} selected contracts to look at" : ANSWER[c.scope] ?? "{n} of {of} documents to look at";
  // "1 four eyes · 2 to review · 2 routine": a whole phrase per key, German needs "zur Prüfung"
  const TRIAGE_COUNT = { FOUR_EYES: "{n} four eyes", REVIEW: "{n} to review", CONFIRM: "{n} routine" } as const;
  const triage = (["FOUR_EYES", "REVIEW", "CONFIRM"] as const)
    .filter((k) => run.triage[k])
    .map((k) => t(TRIAGE_COUNT[k], { n: run.triage[k] ?? 0 }))
    .join(" · ");
  const statuses = [...new Set(run.rows.map((r) => r.status))];
  const quietCount = c.checked - c.reported;

  const tile = (id: string) => {
    const row = rows.get(id);
    if (row) {
      const label = `${id} · ${t(STATUS_SHORT[row.status] ?? row.status)}`;
      return (
        <li key={id}>
          <button type="button" className={`ctile rep t-${statusColor(row.status)}${id === selected ? " on" : ""}`}
                  onClick={() => onSelect(id)} aria-current={id === selected} aria-label={label} title={label}>
            {id}
            <StatusIcon status={row.status} />
          </button>
        </li>
      );
    }
    const reason = excluded.get(id);
    const label = reason ? `${id} · ${t("excluded")}: ${reason}` : `${id} · ${t("checked, nothing to report")}`;
    return (
      <li key={id} className={`ctile ${reason ? "excluded" : "quiet"}`} title={label} aria-label={label}>{id}</li>
    );
  };

  return (
    <section className="panel overview" aria-label={t("Answer overview")}>
      <div className="eyebrow">{t("Step 2 · Answer")}</div>
      {question && <p className="ov-question">{question}</p>}
      <h2>{t(answer, { n: c.reported, of: c.checked })}</h2>

      {sel && (
        <MessageBar intent="warning" className="scope-note">
          <MessageBarBody>
            {t("A selection: {n} of {of} contracts, chosen by {user}. This answer covers only these – not the whole portfolio.",
               { n: sel.chosen, of: sel.of, user: t(USERS[run.created_by] ?? run.created_by) })}
            {Object.keys(sel.filters).length > 0 && <> {t("How they were chosen: {filters}", { filters: scopeText(sel.filters, t) })}</>}
          </MessageBarBody>
        </MessageBar>
      )}

      <ul className="ctiles" aria-label={t("Every contract in scope")}>
        {ids ? ids.map(tile) : (
          // without the list of IDs: the reported and excluded ones by name, the rest as a count
          <>
            {[...rows.keys(), ...excluded.keys()].sort().map(tile)}
            {quietCount > 0 && <li className="ctile quiet wide">{t("+{n} checked, nothing to report", { n: quietCount })}</li>}
          </>
        )}
      </ul>
      <div className="ov-legend" aria-hidden>
        {statuses.map((s) => (
          <span key={s} className={`ov-sw t-${statusColor(s)}`}>{t(STATUS_SHORT[s] ?? s)}</span>
        ))}
        <span className="ov-sw quiet">{t("Checked, nothing to report")}</span>
        {c.excluded.length > 0 && <span className="ov-sw excluded">{t("Excluded")}</span>}
      </div>

      <p className="ov-stats">
        <span>{t("{n} in scope", { n: c.in_scope })} ({sel ? t("selected from {of}", { of: sel.of }) : t(DOC_TYPE_LABEL[c.scope] ?? c.scope)})</span>
        <span>{t("{n} read completely, with evidence", { n: c.checked })}</span>
        {triage && <span>{triage}</span>}
        <span>{t("this question: {usd} · the register was built once for {total}", { usd: usd(run.cost.usd), total: usd(run.cost.register_total_usd) })}</span>
      </p>
      {(c.excluded.length > 0 || (run.info.resolved_by_amendment?.length ?? 0) > 0) && (
        <ul className="ov-notes">
          {c.excluded.map((e) => (
            <li key={e.doc_id}><b>{e.doc_id}</b> {t("excluded")}: {excluded.get(e.doc_id)}</li>
          ))}
          {run.info.resolved_by_amendment?.map((r) => (
            <li key={r.doc_id}><b>{r.doc_id}</b> {t("former name already resolved by amendment {id}", { id: r.resolved_by })}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
