// The human decision on one finding (spec 2.3), pinned under the finding card in step 3: what the
// decision needs, who decided, the reason, Confirm / Reject / Correct, "Not sure? Ask for a second
// person", and - for a row of an answer - the archive copy, the only action with an external effect.
// Two targets: a row of an answer (a run), or one finding opened from the register (decide one
// finding, D6). The decision is stored per finding version either way and counts for every answer
// (decision 73). The server enforces every rule (api/review.py, api/findings.py); its refusals are
// shown as fixed sentences in lawyers' words (D17).
import { Button, Field, Textarea } from "@fluentui/react-components";
import { Checkmark16Regular, Dismiss16Regular, Edit16Regular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ArchiveResult, type Decision, type FindingReviewState, type Run, type RunRow } from "../api";
import { useT } from "../i18n";
import { nextStep, serverMessage } from "../labels";
import { USERS, useSwitchUser, useUser } from "../user";
import { ApprovalSlots, ArchiveStep, CorrectTo } from "./Approvals";
import "../workbench/workbench.css";

export type Target =
  | { kind: "run"; run: Run; row: RunRow }
  | { kind: "finding"; docId: string; clause: string; review: FindingReviewState };

const FINAL = ["CONFIRMED", "REJECTED", "CORRECTED", "DISPUTED"];

interface Props {
  target: Target;
  onChanged: () => void;        // a decision was stored: reload the run or the finding
  focusKey?: number;            // changes when the lawyer picks a row: the reason field (or "Continue as") gets the focus
}

export function DecisionPanel({ target, onChanged, focusKey = 0 }: Props) {
  const t = useT();
  const user = useUser();
  const switchUser = useSwitchUser();
  const other = Object.keys(USERS).find((u) => u !== user) ?? user;
  const [reason, setReason] = useState("");
  // "Correct" first asks what the contract actually says; nothing is chosen in advance
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archive, setArchive] = useState<ArchiveResult | null>(null);
  const reasonField = useRef<HTMLTextAreaElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  // another reviewer takes over: the last one's refusal or receipt is not theirs
  useEffect(() => {
    setError(null);
    setArchive(null);
    setCorrecting(false);
  }, [user]);
  // never on page load: only when the lawyer picked a row (focusKey > 0)
  useEffect(() => {
    if (focusKey) (reasonField.current ?? continueButton.current)?.focus({ preventScroll: true });
  }, [focusKey]);

  const review = target.kind === "run" ? target.row.review : target.review;
  const triage = target.kind === "run" ? target.row.triage : target.review.triage;
  const sample = target.kind === "run" && target.row.sample;
  // only a clause finding can be corrected or escalated; former names, law and copies are rejected instead
  const clause = target.kind === "finding" ? target.clause
    : target.run.plan.check === "missing_clause" ? target.run.plan.params.clause_type : null;
  const { state, required } = review;
  const decided = FINAL.includes(state);
  const voted = review.reviews.some((r) => r.reviewer === user && r.decision !== "ESCALATED");
  const reasonNeeded = required === 2 || triage !== "CONFIRM" || !!review.escalated;
  const noReason = !reason.trim();
  // the requirement in words, or where the decision stands once it is made
  const head = decided ? nextStep(review, triage, sample, t)
    : required === 2 ? t("Four eyes · two people, each with a reason")
    : triage === "CONFIRM" ? t("Confirm · one person, no reason needed") : t("Review · one person, with a reason");
  const votes = review.reviews.filter((r) => r.decision !== "ESCALATED");

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setReason("");
      setCorrecting(false);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? serverMessage(e.status, e.message, review, t) : String(e));
    } finally {
      setBusy(false);
    }
  }

  const decide = (decision: Decision, corrected?: "PRESENT" | "ABSENT") =>
    act(() => {
      const body = { decision, reason: reason.trim() || undefined, corrected_status: decision === "CORRECTED" ? corrected : undefined };
      return target.kind === "run"
        ? api.review(target.run.run_id, { doc_id: target.row.doc_id, ...body })
        : api.reviewFinding(target.docId, target.clause, body);
    });
  const escalate = () => act(() => api.escalate(target.kind === "run" ? target.row.doc_id : target.docId, clause!, reason.trim()));
  const store = () =>
    target.kind === "run" && act(async () => setArchive(await api.archive(target.run.run_id, target.row.doc_id)));

  return (
    <section className="decision" aria-label={t("Your decision")}>
      <div className="dp-head">
        <b>{t("Your decision")}</b> · <span>{head}</span>
      </div>
      {(required === 2 || votes.length > 0) && (
        <ApprovalSlots review={review} here={target.kind === "run" ? target.run.run_id : "register"} compact />
      )}

      {!decided && voted && (
        // four eyes: the same person cannot give the second approval (the server refuses it too)
        <div className="dp-next">
          <p>{t("You approved. The second approval must come from another person.")}</p>
          <Button ref={continueButton} onClick={() => switchUser(other)}
                  title={t("Demo stand-in for a second person signing in (Entra ID). The server still refuses the same person twice.")}>
            {t("Continue as {user}", { user: USERS[other] })}
          </Button>
        </div>
      )}

      {!decided && !voted && (
        <>
          <Field label={reasonNeeded ? t("Reason (required)") : t("Reason (optional)")} className="dp-reason">
            <Textarea ref={reasonField} rows={2} value={reason} onChange={(_, d) => setReason(d.value)}
                      placeholder={t("What did you check on the page?")} resize="none" />
          </Field>
          <div className="dp-actions">
            <Button appearance="primary" icon={<Checkmark16Regular />} disabled={busy || (reasonNeeded && noReason)}
                    onClick={() => decide("CONFIRMED")}>
              {t("Confirm finding")}
            </Button>
            <Button icon={<Dismiss16Regular />} disabled={busy || noReason} onClick={() => decide("REJECTED")}>
              {t("Reject")}
            </Button>
            {clause && (
              <Button icon={<Edit16Regular />} disabled={busy || noReason} aria-expanded={correcting} onClick={() => setCorrecting((c) => !c)}>
                {t("Correct")}
              </Button>
            )}
          </div>
          {clause && correcting && (
            <CorrectTo busy={busy || noReason} onPick={(s) => decide("CORRECTED", s)} onCancel={() => setCorrecting(false)} />
          )}
          {clause && state === "FOUND" && required === 1 && (
            // a human safety valve (D7): the finding then needs two people
            <button type="button" className="link-btn dp-escalate" disabled={busy || noReason} onClick={escalate}
                    title={t("Needs a reason: what should the second person look at?")}>
              {t("Not sure? Ask for a second person")}
            </button>
          )}
        </>
      )}

      {target.kind === "run" ? (
        <ArchiveStep state={state} required={required} busy={busy} onStore={() => store()}>
          {archive && (
            <>
              {archive.files.map((f) => t("{file}: {status} (receipt {id})", { file: f.file, status: t(f.status.replace(/_/g, " ")), id: f.receipt_id })).join("; ")}
              {" · "}
              {t("approved by {names}", { names: archive.approved_by.map((u) => USERS[u] ?? u).join(` ${t("and")} `) })}
            </>
          )}
        </ArchiveStep>
      ) : (
        <p className="dp-note">
          {state === "DISPUTED" ? t("The two decisions differ. Nothing is archived.")
            : t("The archive copy is made from an answer – ask the question in the Workbench.")}
          {(decided || voted) && (
            <>
              {" "}
              <a href={`#/tool/register?doc=${encodeURIComponent(target.docId)}&clause=${encodeURIComponent(target.clause)}`}>
                {t("Back to the register →")}
              </a>
            </>
          )}
        </p>
      )}
      {error && <p className="dp-error" role="alert">{error}</p>}
    </section>
  );
}
