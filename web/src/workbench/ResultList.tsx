// The contracts to look at, one compact row each: ID, party, what the register found (icon), how
// much review it needs (left border, icon) and where the human decision stands (trailing icon).
// The words for all of it are in the row's label and tooltip; the full badges sit in the evidence.
import { Button } from "@fluentui/react-components";
import type { Run, RunRow } from "../api";
import { ReviewIcon, StatusIcon, TriageIcon } from "../components/Badges";
import { useFormat, useT, type T } from "../i18n";
import { confidenceWord, REVIEW_LABEL, STATUS_SHORT, TRIAGE_LABEL } from "../labels";

interface Props {
  run: Run;
  selected: string | null;
  busy: boolean;
  onSelect: (docId: string) => void;
  onConfirmRoutine: (rows: RunRow[]) => void;
}

/** Everything the icons say, in words: the row's accessible name and its tooltip. */
function describe(r: RunRow, t: T, num: (n: number) => string): string {
  return [
    `${r.doc_id} ${r.counterparty_name ?? t("unknown party")}`,
    t(STATUS_SHORT[r.status] ?? r.status),
    t(TRIAGE_LABEL[r.triage] ?? r.triage),
    t(REVIEW_LABEL[r.review.state] ?? r.review.state),
    r.confidence != null && t("confidence {word} ({c})", { word: t(confidenceWord(r.confidence)), c: num(r.confidence) }),
    r.sample && t("spot check"),
  ].filter(Boolean).join(" · ");
}

export function ResultList({ run, selected, busy, onSelect, onConfirmRoutine }: Props) {
  const t = useT();
  const { num } = useFormat();
  const routine = run.rows.filter((r) => r.triage === "CONFIRM" && !r.sample && r.review.state === "FOUND");
  const open = run.rows.filter((r) => !["CONFIRMED", "REJECTED", "CORRECTED"].includes(r.review.state)).length;

  return (
    <section className="panel results" aria-label={t("Contracts to look at")}>
      <div className="results-head">
        <div className="eyebrow">{t("Step 3 · Review")}</div>
        <h3>{t("{n} contracts · {open} open", { n: run.rows.length, open })}</h3>
        {routine.length > 0 && (
          <Button size="small" appearance="secondary" disabled={busy} onClick={() => onConfirmRoutine(routine)}>
            {t("Confirm {n} routine", { n: routine.length })}
          </Button>
        )}
      </div>
      {run.rows.length === 0 && <p className="lead">{t("No contract in scope has this issue.")}</p>}
      <ul className="result-list">
        {run.rows.map((r) => {
          const label = describe(r, t, num);
          return (
            <li key={r.doc_id}>
              <button
                type="button"
                className={`rl-row${r.doc_id === selected ? " selected" : ""} triage-${r.triage.toLowerCase()}`}
                onClick={() => onSelect(r.doc_id)}
                aria-current={r.doc_id === selected}
                aria-label={label}
                title={label}
              >
                <span className="rl-id">{r.doc_id}</span>
                {r.sample && <span className="rl-sample" aria-hidden />}
                <span className="rl-party">{r.counterparty_name ?? t("unknown party")}</span>
                <span className="rl-icons">
                  <StatusIcon status={r.status} />
                  <TriageIcon triage={r.triage} />
                  <ReviewIcon state={r.review.state} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {run.rows.length > 0 && (
        <p className="rl-legend" aria-hidden>
          {/* each icon with its word in one piece, so a line never ends between them */}
          {run.rows.some((r) => r.sample) && <span className="rl-key"><span className="rl-sample" /> {t("spot check")}</span>}
          <span className="rl-key"><ReviewIcon state="FOUND" /> {t("open")}</span>
          <span className="rl-key"><ReviewIcon state="CONFIRMED" /> {t("decided")}</span>
        </p>
      )}
    </section>
  );
}
