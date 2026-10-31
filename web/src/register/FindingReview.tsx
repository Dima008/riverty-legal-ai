// Review a finding directly in the register (decision 73). The review belongs to this version of
// the finding and is reused by every run that reports it; "Escalate" asks for four eyes.
import { Button, Caption1, Field, MessageBar, MessageBarBody, Radio, RadioGroup, Text, Textarea } from "@fluentui/react-components";
import { Checkmark16Regular, Dismiss16Regular, Edit16Regular, Flag16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Decision, type FindingReviewState } from "../api";
import { ReviewBadge, TriageBadge } from "../components/Badges";
import { USERS, useSwitchUser, useUser } from "../user";

const FINAL = ["CONFIRMED", "REJECTED", "CORRECTED", "DISPUTED"];

export function FindingReview({ docId, clause, onChanged }: { docId: string; clause: string; onChanged?: () => void }) {
  const user = useUser();
  const switchUser = useSwitchUser();
  const otherUser = Object.keys(USERS).find((u) => u !== user) ?? user;
  const [review, setReview] = useState<FindingReviewState | null>(null);
  const [reason, setReason] = useState("");
  const [corrected, setCorrected] = useState("PRESENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.findingReview(docId, clause)
      .then((r) => {
        setReview(r);
        // a correction usually says the opposite of the register
        setCorrected(r.status === "ABSENT" ? "PRESENT" : "ABSENT");
      })
      .catch((e: Error) => setError(e.message));
  }, [docId, clause]);
  useEffect(load, [load]);

  if (!review) {
    return error ? <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar> : null;
  }

  const decided = FINAL.includes(review.state);
  const voted = review.reviews.some((r) => r.reviewer === user && r.decision !== "ESCALATED");
  const routine = review.triage === "CONFIRM" && !review.escalated;   // UI hint only: api/findings.py enforces it

  async function decide(decision: Decision | "ESCALATED") {
    setBusy(true);
    setError(null);
    try {
      await api.reviewFinding(docId, clause, {
        decision,
        reason: reason.trim() || undefined,
        corrected_status: decision === "CORRECTED" ? corrected : undefined,
      });
      setReason("");
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
      <div className="section-title small">Review in the register</div>
      <div className="actions">
        <ReviewBadge state={review.state} />
        <TriageBadge triage={review.escalated ? "FOUR_EYES" : review.triage} />
        <Caption1>{review.required === 2 ? `${review.done} of 2 approvals` : `${review.done} of 1 decision`}</Caption1>
      </div>
      {review.reviews.length > 0 && (
        <ul className="fr-list">
          {review.reviews.map((r) => (
            <li key={r.reviewer + r.ts + r.decision}>
              <Text weight="semibold">{r.reviewer_name}</Text>: {r.decision.toLowerCase()}
              {r.corrected_status && ` → ${r.corrected_status.toLowerCase()}`}
              {r.reason && <span className="muted"> – “{r.reason}”</span>}
              <span className="fr-source">{r.source === "register" ? "in the register" : `in run ${r.source}`}</span>
            </li>
          ))}
        </ul>
      )}
      {review.earlier_reviews > 0 && (
        <p className="note">
          {review.earlier_reviews} review(s) of an earlier version of this finding no longer apply: the text, the extraction
          or the status has changed since.
        </p>
      )}
      {!decided && voted && (
        <MessageBar intent="info">
          <MessageBarBody>
            You ({USERS[user]}) already decided. The second approval must come from a different person.{" "}
            <Button size="small" appearance="transparent" onClick={() => switchUser(otherUser)}>
              Continue as {USERS[otherUser]}
            </Button>
          </MessageBarBody>
        </MessageBar>
      )}
      {!decided && !voted && (
        <>
          <Field label={routine ? "Reason (optional for a routine finding)" : "Reason (required)"}>
            <Textarea value={reason} onChange={(_, d) => setReason(d.value)} placeholder="What did you check in the evidence?" resize="vertical" />
          </Field>
          <Field label="If you correct it, the clause is actually …">
            <RadioGroup layout="horizontal" value={corrected} onChange={(_, d) => setCorrected(d.value)}>
              <Radio value="PRESENT" label="present" />
              <Radio value="ABSENT" label="missing" />
            </RadioGroup>
          </Field>
          <div className="actions">
            <Button appearance="primary" icon={<Checkmark16Regular />} disabled={busy || (!routine && !reason.trim())} onClick={() => decide("CONFIRMED")}>
              Confirm finding
            </Button>
            <Button icon={<Dismiss16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("REJECTED")}>
              Reject
            </Button>
            <Button icon={<Edit16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("CORRECTED")}>
              Correct
            </Button>
            {!review.escalated && (
              <Button icon={<Flag16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("ESCALATED")}>
                Escalate
              </Button>
            )}
          </div>
        </>
      )}
      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
    </div>
  );
}
