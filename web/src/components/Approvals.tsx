// Four eyes made visible: one slot per approval the finding needs (two for four eyes), filled with
// who decided what, and - in the workbench - the archive copy as the locked step after them.
// The server enforces all of it (api/review.py, api/findings.py); this only shows where it stands.
import { Avatar, Button } from "@fluentui/react-components";
import {
  Archive16Regular, Archive20Regular, CheckmarkCircle20Filled, DismissCircle20Filled, Edit20Regular, LockClosed16Regular,
  LockClosed20Regular,
} from "@fluentui/react-icons";
import { useId, type ReactElement, type ReactNode } from "react";
import type { Review, ReviewState } from "../api";
import { useT } from "../i18n";
import { statusWord } from "../labels";

const DECISION_ICON: Record<string, ReactElement> = {
  CONFIRMED: <CheckmarkCircle20Filled />,
  CORRECTED: <Edit20Regular />,
  REJECTED: <DismissCircle20Filled />,
};

/** Who decided, slot by slot. `here` is the run (or "register") the reviewer is looking at: a
 *  review made somewhere else says where it was made (decision 73). `compact`: one 34px line per
 *  slot, the reason cut to that line and whole in the tooltip (the pinned decision panel); an
 *  escalation is then left to the finding card's "why" line. */
export function ApprovalSlots({ review, here, compact = false }: { review: ReviewState; here: string; compact?: boolean }) {
  const t = useT();
  const votes = review.reviews.filter((r) => r.decision !== "ESCALATED");
  const escalations = review.reviews.filter((r) => r.decision === "ESCALATED");
  const slots = Math.max(review.required, votes.length);
  const open = (i: number) =>
    review.required === 1 ? t("Decision – open")
    : i === 0 ? t("First approval – open")
    : compact ? t("From another person – open") : t("Second approval – from another person");
  const where = (r: Review) =>
    r.source && r.source !== here ? (r.source === "register" ? t("from the register") : t("in another answer ({id})", { id: r.source })) : null;
  return (
    <>
      <ol className={`appr${compact ? " compact" : ""}`}
          aria-label={review.required === 2 ? t("Four-eyes principle: {done} of 2 approvals", { done: review.done }) : t("{done} of 1 decision", { done: review.done })}>
        {Array.from({ length: slots }, (_, i) => {
          const v = votes[i];
          const tip = v ? [v.reason && `“${v.reason}”`, where(v)].filter(Boolean).join(" · ") : undefined;
          return (
            <li key={i} className={`appr-step ${v ? `done d-${v.decision.toLowerCase()}` : "open"}`} title={compact ? tip : undefined}>
              <span className="appr-mark">
                {v ? <Avatar name={v.reviewer_name} size={compact ? 20 : 24} color="colorful" /> : <span className="appr-num">{i + 1}</span>}
              </span>
              <div className="appr-body">
                {v ? (
                  <div className="appr-title">
                    <b>{v.reviewer_name}</b> {t(v.decision.toLowerCase())}
                    {v.corrected_status && ` → ${statusWord(v.corrected_status, t)}`}
                    {compact && v.reason && <span className="appr-reason"> “{v.reason}”</span>}
                    {compact && where(v) && <span className="appr-reason"> · {where(v)}</span>}
                  </div>
                ) : (
                  <div className="appr-title muted">{open(i)}</div>
                )}
                {!compact && v?.reason && <div className="appr-detail">“{v.reason}”</div>}
                {!compact && v && where(v) && <div className="appr-detail">{where(v)}</div>}
              </div>
              {v && <span className="appr-icon" aria-hidden>{DECISION_ICON[v.decision]}</span>}
            </li>
          );
        })}
      </ol>
      {!compact && escalations.map((e) => (
        <p key={e.reviewer + e.ts} className="note">
          {t("{user} escalated it to four eyes", { user: e.reviewer_name })}{e.reason && <> – “{e.reason}”</>}
        </p>
      ))}
    </>
  );
}

/** The archive copy as one row after the decision: locked until the finding is approved, and the
 *  result on its own line below (`children`). The button stays clickable on purpose (decision 71):
 *  the server is the control, not the button - before approval it refuses with 409 and writes the
 *  refusal to the audit log. */
export function ArchiveStep({ state, required, busy, onStore, children }:
  { state: string; required: number; busy: boolean; onStore: () => void; children?: ReactNode }) {
  const t = useT();
  const approved = state === "CONFIRMED" || state === "CORRECTED";
  const text = approved ? t("Archive copy")
    : state === "DISPUTED" ? t("The two decisions differ. Nothing is archived.")
    : state === "REJECTED" ? t("Stays locked: the finding was not approved. The server refuses and logs every attempt.")
    : required === 2 ? t("Archive copy – after 2 approvals") : t("Archive copy – after the approval");
  return (
    <div className={`archive-row ${approved ? "unlocked" : "locked"}`}>
      <div className="archive-line">
        <span className="archive-icon" aria-hidden>{approved ? <Archive20Regular /> : <LockClosed20Regular />}</span>
        <span className="archive-text">{text}</span>
        <Button size="small" icon={approved ? <Archive16Regular /> : <LockClosed16Regular />} disabled={busy} onClick={onStore}>
          {t("Store archive copy")}
        </Button>
      </div>
      {children && <div className="archive-result">{children}</div>}
    </div>
  );
}

/** After "Correct": what the contract actually says. Nothing is chosen in advance - the reviewer
 *  picks, and the pick is the decision (the reason is already written above). */
export function CorrectTo({ busy, onPick, onCancel }:
  { busy: boolean; onPick: (status: "PRESENT" | "ABSENT") => void; onCancel: () => void }) {
  const t = useT();
  const id = useId();
  return (
    <div className="correct-to" role="group" aria-labelledby={id}>
      <span className="plan-label" id={id}>{t("The contract …")}</span>
      <Button size="small" disabled={busy} onClick={() => onPick("PRESENT")}>{t("does contain it")}</Button>
      <Button size="small" disabled={busy} onClick={() => onPick("ABSENT")}>{t("does not contain it")}</Button>
      <button type="button" className="link-btn" onClick={onCancel}>{t("Cancel")}</button>
    </div>
  );
}
