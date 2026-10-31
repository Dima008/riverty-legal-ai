// Four eyes made visible: one slot per approval the finding needs (two for four eyes), filled with
// who decided what, and - in the workbench - the archive copy as the locked step after them.
// The server enforces all of it (api/review.py, api/findings.py); this only shows where it stands.
import { Avatar, Button } from "@fluentui/react-components";
import {
  Archive16Regular, Archive20Regular, CheckmarkCircle20Filled, DismissCircle20Filled, Edit20Regular, LockClosed16Regular,
  LockClosed20Regular,
} from "@fluentui/react-icons";
import { useId, type ReactElement } from "react";
import type { Review, ReviewState } from "../api";
import { useT } from "../i18n";

const DECISION_ICON: Record<string, ReactElement> = {
  CONFIRMED: <CheckmarkCircle20Filled />,
  CORRECTED: <Edit20Regular />,
  REJECTED: <DismissCircle20Filled />,
};

/** Who decided, slot by slot. `here` is the run (or "register") the reviewer is looking at: a
 *  review made somewhere else says where it was made (decision 73). */
export function ApprovalSlots({ review, here }: { review: ReviewState; here: string }) {
  const t = useT();
  const votes = review.reviews.filter((r) => r.decision !== "ESCALATED");
  const escalations = review.reviews.filter((r) => r.decision === "ESCALATED");
  const slots = Math.max(review.required, votes.length);
  const open = (i: number) =>
    review.required === 1 ? t("Decision – open") : i === 0 ? t("First approval – open") : t("Second approval – from another person");
  const where = (r: Review) =>
    r.source && r.source !== here ? (r.source === "register" ? t("in the register") : t("in run {id}", { id: r.source })) : null;
  return (
    <>
      <ol className="appr" aria-label={review.required === 2 ? t("Four-eyes principle: {done} of 2 approvals", { done: review.done }) : t("{done} of 1 decision", { done: review.done })}>
        {Array.from({ length: slots }, (_, i) => {
          const v = votes[i];
          return (
            <li key={i} className={`appr-step ${v ? `done d-${v.decision.toLowerCase()}` : "open"}`}>
              <span className="appr-mark">
                {v ? <Avatar name={v.reviewer_name} size={24} color="colorful" /> : <span className="appr-num">{i + 1}</span>}
              </span>
              <div className="appr-body">
                {v ? (
                  <div className="appr-title">
                    <b>{v.reviewer_name}</b> {t(v.decision.toLowerCase())}
                    {v.corrected_status && ` → ${t(v.corrected_status.toLowerCase())}`}
                  </div>
                ) : (
                  <div className="appr-title muted">{open(i)}</div>
                )}
                {v?.reason && <div className="appr-detail">“{v.reason}”</div>}
                {v && where(v) && <div className="appr-detail">{where(v)}</div>}
              </div>
              {v && <span className="appr-icon" aria-hidden>{DECISION_ICON[v.decision]}</span>}
            </li>
          );
        })}
      </ol>
      {escalations.map((e) => (
        <p key={e.reviewer + e.ts} className="note">
          {t("{user} escalated it to four eyes", { user: e.reviewer_name })}{e.reason && <> – “{e.reason}”</>}
        </p>
      ))}
    </>
  );
}

/** The archive copy as the step after the approvals: locked until the finding is approved. The
 *  button stays clickable on purpose (decision 71): the server is the control, not the button -
 *  before approval it refuses with 409 and writes the refusal to the audit log. */
export function ArchiveStep({ state, required, busy, onStore }:
  { state: string; required: number; busy: boolean; onStore: () => void }) {
  const t = useT();
  const approved = state === "CONFIRMED" || state === "CORRECTED";
  const notApproved = state === "REJECTED" || state === "DISPUTED";
  return (
    <div className={`appr-step archive ${approved ? "unlocked" : "locked"}`}>
      <span className="appr-mark" aria-hidden>{approved ? <Archive20Regular /> : <LockClosed20Regular />}</span>
      <div className="appr-body">
        <div className="appr-title">{t("Archive copy")}</div>
        <div className="appr-detail">
          {approved ? t("Unlocked · write-only contract storage, one copy per file")
            : notApproved ? t("Stays locked: the finding was not approved. The server refuses and logs every attempt.")
            : required === 2 ? t("Unlocks after 2 approvals. Until then the server refuses and logs every attempt.")
            : t("Unlocks after the approval. Until then the server refuses and logs every attempt.")}
        </div>
      </div>
      <Button icon={approved ? <Archive16Regular /> : <LockClosed16Regular />} disabled={busy} onClick={onStore}>
        {t("Store archive copy")}
      </Button>
    </div>
  );
}

/** After "Correct": what the clause actually is. Nothing is chosen in advance - the reviewer
 *  picks, and the pick is the decision (the reason is already written above). */
export function CorrectTo({ busy, onPick, onCancel }:
  { busy: boolean; onPick: (status: "PRESENT" | "ABSENT") => void; onCancel: () => void }) {
  const t = useT();
  const id = useId();
  return (
    <div className="correct-to" role="group" aria-labelledby={id}>
      <span className="plan-label" id={id}>{t("The clause is actually …")}</span>
      <Button disabled={busy} onClick={() => onPick("PRESENT")}>{t("present")}</Button>
      <Button disabled={busy} onClick={() => onPick("ABSENT")}>{t("missing")}</Button>
      <button type="button" className="link-btn" onClick={onCancel}>{t("Cancel")}</button>
    </div>
  );
}
