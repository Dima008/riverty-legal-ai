// The contracts to look at, as cards: what the register found, how much review it needs, and
// where the human decision stands.
import { Button } from "@fluentui/react-components";
import type { Run, RunRow } from "../api";
import { ReviewBadge, StatusBadge, TriageBadge } from "../components/Badges";

interface Props {
  run: Run;
  selected: string | null;
  busy: boolean;
  onSelect: (docId: string) => void;
  onConfirmRoutine: (rows: RunRow[]) => void;
}

export function ResultList({ run, selected, busy, onSelect, onConfirmRoutine }: Props) {
  const routine = run.rows.filter((r) => r.triage === "CONFIRM" && !r.sample && r.review.state === "FOUND");
  const open = run.rows.filter((r) => !["CONFIRMED", "REJECTED", "CORRECTED"].includes(r.review.state)).length;

  return (
    <section className="panel results" aria-label="Contracts to look at">
      <div className="results-head">
        <div>
          <div className="eyebrow">Step 3 · Review</div>
          <h3>{run.rows.length} contracts · {open} open</h3>
        </div>
        {routine.length > 0 && (
          <Button size="small" appearance="secondary" disabled={busy} onClick={() => onConfirmRoutine(routine)}>
            Confirm {routine.length} routine
          </Button>
        )}
      </div>
      {run.rows.length === 0 && <p className="lead">No contract in scope has this issue.</p>}
      <ul className="result-list">
        {run.rows.map((r) => (
          <li key={r.doc_id}>
            <button
              type="button"
              className={`result-card${r.doc_id === selected ? " selected" : ""} triage-${r.triage.toLowerCase()}`}
              onClick={() => onSelect(r.doc_id)}
              aria-current={r.doc_id === selected}
            >
              <div className="rc-top">
                <span className="rc-id">{r.doc_id}</span>
                <span className="rc-party">{r.counterparty_name ?? "unknown party"}</span>
                {r.confidence != null && <span className="rc-conf" title="confidence from the checks">{r.confidence.toFixed(2)}</span>}
              </div>
              <div className="rc-badges">
                <StatusBadge status={r.status} short />
                <TriageBadge triage={r.triage} />
                <ReviewBadge state={r.review.state} />
                {r.sample && <span className="sample-chip" title="Random spot check: open the evidence before confirming">spot check</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
