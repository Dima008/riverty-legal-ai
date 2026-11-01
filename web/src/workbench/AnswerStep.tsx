// Step 2 · Answer (spec 2.2): the answer in one sentence, one tile per contract in scope - from the
// answer's own snapshot, so a contract that arrives later never changes it (A3) - the coverage with
// every exclusion and its reason, and the table "To look at". A reported tile opens the contract in
// step 3; a quiet or excluded tile opens its read-only contract file.
import { Button } from "@fluentui/react-components";
import type { Matrix, Run, RunRow } from "../api";
import { statusColor, StatusIcon } from "../components/Badges";
import { statusLabel } from "../components/Words";
import { describe, readRecorded } from "../filters";
import { useFormat, useT } from "../i18n";
import { DOC_TYPE_LABEL, exclusionReason, OF_TYPE, OPEN_STATES, scopeText } from "../labels";
import { BatchButton, ChipBar, chipRows, Showing, ToLookAtTable, type Chips } from "./ToLookAt";
import "./workbench.css";

// The answer sentence per scope; whole sentences as keys, because German needs the dative after "von"
const ANSWER: Record<string, string> = {
  merchant_agreement: "{n} of {of} merchant agreements to look at",
  data_processing_agreement: "{n} of {of} data processing agreements to look at",
  other_commercial_agreement: "{n} of {of} other commercial agreements to look at",
  amendment: "{n} of {of} amendments to look at",
};

/** The IDs of every contract in scope. A run stores them (coverage.checked_ids, A3); an older run stored
 *  only counts, so its scope is rebuilt from the register with the rule of pipeline/portfolio.py
 *  run_check - and used only if it matches the run's own counts. null: summarise the quiet ones. */
function scopeIds(run: Run, matrix: Matrix | null): string[] | null {
  const c = run.coverage;
  if (c.checked_ids) return [...c.checked_ids, ...c.excluded.map((e) => e.doc_id)].sort();
  let ids: string[] | null = run.plan.scope?.doc_ids ?? null;
  if (!ids && matrix) {
    const type = run.plan.params.doc_type;
    ids = matrix.rows.filter((r) => !type || r.doc_type === type || r.doc_type == null || r.doc_type === "unknown").map((r) => r.doc_id);
  }
  if (!ids) return null;
  const known = new Set(ids);
  const consistent = ids.length === c.in_scope && run.rows.every((r) => known.has(r.doc_id)) && c.excluded.every((e) => known.has(e.doc_id));
  return consistent ? [...ids].sort() : null;   // the register changed since the run: no tile is better than a wrong one
}

interface Props {
  run: Run;
  question: string;
  matrix: Matrix | null;
  chips: Chips;
  fresh: Set<string>;               // contracts that arrived in the last 24 hours
  busy: boolean;
  onChips: (c: Chips) => void;
  onDecide: (docId: string) => void;     // step 3 for this contract
  onFile: (docId: string) => void;       // the read-only contract file
  onBatch: (rows: RunRow[]) => void;
}

export function AnswerStep({ run, question, matrix, chips, fresh, busy, onChips, onDecide, onFile, onBatch }: Props) {
  const t = useT();
  const { usd } = useFormat();
  const c = run.coverage;
  const sel = c.selection;
  const rows = new Map<string, RunRow>(run.rows.map((r) => [r.doc_id, r]));
  const shown = chipRows(run.rows, chips, fresh);
  const visible = new Set(shown.map((r) => r.doc_id));
  // the server's reason is a fixed template: shown in the chosen language
  const excluded = new Map(c.excluded.map((e) => [e.doc_id, exclusionReason(e.reason, t)]));
  const ids = scopeIds(run, matrix);
  const statuses = [...new Set(run.rows.map((r) => r.status))];
  const recorded = sel ? readRecorded(sel.filters) : null;
  // "Decide →" opens the first row the chips show that still needs a person
  const firstOpen = shown.find((r) => OPEN_STATES.includes(r.review.state)) ?? shown[0];

  const tile = (id: string) => {
    const row = rows.get(id);
    if (row) {
      const label = `${id} · ${statusLabel(row.status, t)}`;
      // hidden by a chip: outline only, never faded (the text keeps its contrast)
      return (
        <li key={id}>
          <button type="button" className={`ctile rep t-${statusColor(row.status)}${visible.has(id) ? "" : " dim"}`}
                  onClick={() => onDecide(id)} aria-label={label} title={label}>
            {id}
            <StatusIcon status={row.status} />
          </button>
        </li>
      );
    }
    const reason = excluded.get(id);
    const label = reason ? `${id} · ${t("Excluded")}: ${reason}` : `${id} · ${t("Read, nothing to report")}`;
    return (
      <li key={id}>
        <button type="button" className={`ctile ${reason ? "excluded" : "quiet"}`} onClick={() => onFile(id)} aria-label={label} title={label}>
          {id}
        </button>
      </li>
    );
  };

  return (
    <>
      <section className="panel answer-sum" aria-label={t("Answer")}>
        <p className="ov-question">{question}</p>
        <h2>{t(ANSWER[c.scope] ?? "{n} of {of} documents to look at", { n: c.reported, of: c.checked })}</h2>
        {sel && (
          <p className="sel-line">
            {t("A selection: {part} ({filters}) – this answer covers only these.", {
              part: t(OF_TYPE[""], { n: sel.chosen, of: sel.of }),
              filters: recorded ? [recorded[0] && scopeText({ type: recorded[0] }, t), describe(recorded[1], t)].filter(Boolean).join(" · ")
                : scopeText(sel.filters, t),
            })}
          </p>
        )}

        <ul className="ctiles" aria-label={t("Every contract in scope")}>
          {ids ? ids.map(tile) : (
            // an older answer without the list: the reported and excluded ones by name, the rest as a count
            <>
              {[...rows.keys(), ...excluded.keys()].sort().map(tile)}
              {c.checked - c.reported > 0 && (
                <li className="ctile quiet wide">{t("+{n} read, nothing to report", { n: c.checked - c.reported })}</li>
              )}
            </>
          )}
        </ul>
        <div className="ov-legend" aria-hidden>
          {statuses.map((s) => <span key={s} className={`ov-sw t-${statusColor(s)}`}>{statusLabel(s, t)}</span>)}
          <span className="ov-sw quiet">{t("Read, nothing to report")}</span>
          {c.excluded.length > 0 && <span className="ov-sw excluded">{t("Excluded")}</span>}
          {!ids && <span>{t("(older answer – quiet contracts summarised)")}</span>}
        </div>

        <p className="ov-stats">
          <span>{t("{n} in scope ({types})", { n: c.in_scope, types: t(DOC_TYPE_LABEL[c.scope] ?? c.scope) })}</span>
          <span>{t("{n} read completely, with evidence", { n: c.checked })}</span>
          {c.excluded.map((e) => <span key={e.doc_id}>{t("{id} excluded: {reason}", { id: e.doc_id, reason: excluded.get(e.doc_id) ?? e.reason })}</span>)}
          {run.info.resolved_by_amendment?.map((r) => (
            <span key={r.doc_id}><b>{r.doc_id}</b> {t("former name already resolved by amendment {id}", { id: r.resolved_by })}</span>
          ))}
          <span>{t("this question: {usd} – reading every contract cost {total}, once", { usd: usd(run.cost.usd), total: usd(run.cost.register_total_usd) })}</span>
        </p>
      </section>

      <section className="panel tla-panel" aria-labelledby="tla-title">
        <div className="tla-head">
          <h3 id="tla-title">{t("To look at")}</h3>
          {run.rows.length > 0 && <ChipBar rows={run.rows} chips={chips} fresh={fresh} onChips={onChips} />}
          <div className="spacer" />
          <BatchButton rows={run.rows} busy={busy} onBatch={onBatch} />
          {firstOpen && (
            <Button appearance="primary" size="small" onClick={() => onDecide(firstOpen.doc_id)}>{t("Decide →")}</Button>
          )}
        </div>
        <Showing shown={shown.length} rows={run.rows} chips={chips} onChips={onChips} />
        {run.rows.length === 0 ? (
          <p className="lead">
            {c.excluded.length > 0
              ? t("No contract in scope has this issue – {n} read, {k} excluded ({ids}).", { n: c.checked, k: c.excluded.length, ids: c.excluded.map((e) => e.doc_id).join(", ") })
              : t("No contract in scope has this issue.")}
          </p>
        ) : (
          <ToLookAtTable rows={shown} fresh={fresh} onOpen={onDecide} />
        )}
      </section>
    </>
  );
}
