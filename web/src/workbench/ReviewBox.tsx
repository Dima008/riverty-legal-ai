// Human decision on one reported row, then the archive copy (only after approval). From top to
// bottom: the approvals the row needs (two slots for four eyes), the decision form, and the archive
// copy as the locked step after them.
import { Button, Field, MessageBar, MessageBarBody, Textarea } from "@fluentui/react-components";
import { Checkmark16Regular, Dismiss16Regular, Edit16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, ApiError, type ArchiveResult, type Decision, type Run, type RunRow } from "../api";
import { ApprovalSlots, ArchiveStep, CorrectTo } from "../components/Approvals";
import { ReviewBadge } from "../components/Badges";
import { useT } from "../i18n";
import { USERS, useUser } from "../user";

const FINAL = ["CONFIRMED", "REJECTED", "CORRECTED", "DISPUTED"];

export function ReviewBox({ run, row, onChanged }: { run: Run; row: RunRow; onChanged: () => void }) {
  const t = useT();
  const user = useUser();
  const [reason, setReason] = useState("");
  // "Correct" first asks what the clause actually is; nothing is chosen in advance
  const [correcting, setCorrecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archive, setArchive] = useState<ArchiveResult | null>(null);
  // another reviewer takes over: the last one's refusal or receipt is not theirs
  useEffect(() => {
    setError(null);
    setArchive(null);
    setCorrecting(false);
  }, [user]);

  const { state, required, reviews } = row.review;
  const decided = FINAL.includes(state);
  const alreadyReviewed = reviews.some((r) => r.reviewer === user && r.decision !== "ESCALATED");
  const reasonNeeded = row.triage !== "CONFIRM";
  const canCorrect = run.plan.check === "missing_clause";
  const noReason = !reason.trim();
  // say why the buttons are still disabled, instead of leaving them grey without a word
  const hint = !noReason ? undefined
    : reasonNeeded ? t("Write what you checked in the evidence – then you can confirm, reject or correct.")
    : t("A routine row can be confirmed without a reason; rejecting or correcting needs one.");

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setReason("");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const decide = (decision: Decision, corrected?: "PRESENT" | "ABSENT") =>
    act(async () => {
      await api.review(run.run_id, {
        doc_id: row.doc_id,
        decision,
        reason: reason.trim() || undefined,
        corrected_status: decision === "CORRECTED" ? corrected : undefined,
      });
      setCorrecting(false);
    });

  const storeCopy = () => act(async () => setArchive(await api.archive(run.run_id, row.doc_id)));

  return (
    <div className="panel review">
      <div className="review-head">
        <div className="section-title">{t("Your decision")}</div>
        <ReviewBadge state={state} />
      </div>
      <ApprovalSlots review={row.review} here={run.run_id} />
      {row.sample && <p className="note">{t("spot-check sample: open the evidence before confirming")}</p>}

      {!decided && alreadyReviewed && (
        <MessageBar intent="info">
          <MessageBarBody>
            {t("You ({user}) already approved this row. The second approval must come from a different person – switch the reviewer at the top.", { user: USERS[user] })}
          </MessageBarBody>
        </MessageBar>
      )}

      {!decided && !alreadyReviewed && (
        <>
          <Field label={reasonNeeded ? t("Reason (required for this row)") : t("Reason (optional for routine rows)")} hint={hint}>
            <Textarea value={reason} onChange={(_, d) => setReason(d.value)} placeholder={t("What did you check in the evidence?")} resize="vertical" />
          </Field>
          <div className="actions">
            <Button appearance="primary" icon={<Checkmark16Regular />} disabled={busy || (reasonNeeded && noReason)} onClick={() => decide("CONFIRMED")}>
              {t("Confirm finding")}
            </Button>
            <Button icon={<Dismiss16Regular />} disabled={busy || noReason} onClick={() => decide("REJECTED")}>
              {t("Reject")}
            </Button>
            {canCorrect && (
              <Button icon={<Edit16Regular />} disabled={busy || noReason} aria-expanded={correcting} onClick={() => setCorrecting((c) => !c)}>
                {t("Correct")}
              </Button>
            )}
          </div>
          {canCorrect && correcting && (
            <CorrectTo busy={busy || noReason} onPick={(s) => decide("CORRECTED", s)} onCancel={() => setCorrecting(false)} />
          )}
        </>
      )}

      <ArchiveStep state={state} required={required} busy={busy} onStore={storeCopy} />
      {archive && (
        <MessageBar intent="success">
          <MessageBarBody>
            {archive.files.map((f) => t("{file}: {status} (receipt {id})", { file: f.file, status: t(f.status.replace(/_/g, " ")), id: f.receipt_id })).join("; ")}
            {" · "}
            {t("approved by {names}", { names: archive.approved_by.map((u) => USERS[u] ?? u).join(` ${t("and")} `) })}
          </MessageBarBody>
        </MessageBar>
      )}
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
    </div>
  );
}
