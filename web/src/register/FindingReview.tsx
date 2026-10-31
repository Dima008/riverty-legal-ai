// Review a finding directly in the register (decision 73). The review belongs to this version of
// the finding and is reused by every run that reports it; "Escalate" asks for four eyes.
import { Button, Field, MessageBar, MessageBarBody, Textarea } from "@fluentui/react-components";
import { Checkmark16Regular, Dismiss16Regular, Edit16Regular, Flag16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Decision, type FindingReviewState } from "../api";
import { ApprovalSlots, CorrectTo } from "../components/Approvals";
import { ReviewBadge, TriageBadge } from "../components/Badges";
import { useT } from "../i18n";
import { USERS, useSwitchUser, useUser } from "../user";

const FINAL = ["CONFIRMED", "REJECTED", "CORRECTED", "DISPUTED"];

export function FindingReview({ docId, clause, onChanged }: { docId: string; clause: string; onChanged?: () => void }) {
  const t = useT();
  const user = useUser();
  const switchUser = useSwitchUser();
  const otherUser = Object.keys(USERS).find((u) => u !== user) ?? user;
  const [review, setReview] = useState<FindingReviewState | null>(null);
  const [reason, setReason] = useState("");
  // "Correct" first asks what the clause actually is; nothing is chosen in advance
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.findingReview(docId, clause)
      .then(setReview)
      .catch((e: Error) => setError(e.message));
  }, [docId, clause]);
  useEffect(load, [load]);
  // another reviewer takes over: the last one's error is not theirs
  useEffect(() => {
    setError(null);
    setCorrecting(false);
  }, [user]);

  if (!review) {
    return error ? <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar> : null;
  }

  const decided = FINAL.includes(review.state);
  const voted = review.reviews.some((r) => r.reviewer === user && r.decision !== "ESCALATED");
  const routine = review.triage === "CONFIRM" && !review.escalated;   // UI hint only: api/findings.py enforces it
  // say why the buttons are still disabled, instead of leaving them grey without a word
  const hint = reason.trim() ? undefined
    : routine ? t("A routine finding can be confirmed without a reason; rejecting, correcting or escalating needs one.")
    : t("Write what you checked in the evidence – then you can confirm, reject, correct or escalate.");

  async function decide(decision: Decision | "ESCALATED", corrected?: "PRESENT" | "ABSENT") {
    setBusy(true);
    setError(null);
    try {
      await api.reviewFinding(docId, clause, {
        decision,
        reason: reason.trim() || undefined,
        corrected_status: decision === "CORRECTED" ? corrected : undefined,
      });
      setReason("");
      setCorrecting(false);
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="finding-review">
      <div className="review-head">
        <div className="section-title small">{t("Review in the register")}</div>
        <ReviewBadge state={review.state} />
        <TriageBadge triage={review.escalated ? "FOUR_EYES" : review.triage} />
      </div>
      {/* every review says where it was made: here in the register, or in a run (decision 73) */}
      <ApprovalSlots review={review} here="" />
      {review.earlier_reviews > 0 && (
        <p className="note">
          {t("{n} review(s) of an earlier version of this finding no longer apply: the text, the extraction or the status has changed since.", { n: review.earlier_reviews })}
        </p>
      )}
      {!decided && voted && (
        <MessageBar intent="info">
          <MessageBarBody>
            {t("You ({user}) already decided. The second approval must come from a different person.", { user: USERS[user] })}{" "}
            <Button size="small" appearance="transparent" onClick={() => switchUser(otherUser)}>
              {t("Continue as {user}", { user: USERS[otherUser] })}
            </Button>
          </MessageBarBody>
        </MessageBar>
      )}
      {!decided && !voted && (
        <>
          <Field label={routine ? t("Reason (optional for a routine finding)") : t("Reason (required)")} hint={hint}>
            <Textarea value={reason} onChange={(_, d) => setReason(d.value)} placeholder={t("What did you check in the evidence?")} resize="vertical" />
          </Field>
          <div className="actions">
            <Button appearance="primary" icon={<Checkmark16Regular />} disabled={busy || (!routine && !reason.trim())} onClick={() => decide("CONFIRMED")}>
              {t("Confirm finding")}
            </Button>
            <Button icon={<Dismiss16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("REJECTED")}>
              {t("Reject")}
            </Button>
            <Button icon={<Edit16Regular />} disabled={busy || !reason.trim()} aria-expanded={correcting} onClick={() => setCorrecting((c) => !c)}>
              {t("Correct")}
            </Button>
            {!review.escalated && (
              <Button icon={<Flag16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("ESCALATED")}>
                {t("Escalate")}
              </Button>
            )}
          </div>
          {correcting && (
            <CorrectTo busy={busy || !reason.trim()} onPick={(s) => decide("CORRECTED", s)} onCancel={() => setCorrecting(false)} />
          )}
        </>
      )}
      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
    </div>
  );
}
