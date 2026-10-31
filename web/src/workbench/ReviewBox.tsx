// Human decision on one reported row, then the archive copy (only after approval).
import { Button, Caption1, Field, MessageBar, MessageBarBody, Radio, RadioGroup, Text, Textarea } from "@fluentui/react-components";
import { Archive16Regular, Checkmark16Regular, Dismiss16Regular, Edit16Regular, LockClosed16Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { api, ApiError, type ArchiveResult, type Decision, type Run, type RunRow } from "../api";
import { ReviewBadge } from "../components/Badges";
import { useT } from "../i18n";
import { USERS, useUser } from "../user";

const FINAL = ["CONFIRMED", "REJECTED", "CORRECTED", "DISPUTED"];
const APPROVED = ["CONFIRMED", "CORRECTED"];

export function ReviewBox({ run, row, onChanged }: { run: Run; row: RunRow; onChanged: () => void }) {
  const t = useT();
  const user = useUser();
  const [reason, setReason] = useState("");
  // a correction usually says the opposite of the system: "missing" -> actually present, otherwise -> missing
  const [corrected, setCorrected] = useState(row.status === "ABSENT" ? "PRESENT" : "ABSENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archive, setArchive] = useState<ArchiveResult | null>(null);

  const { state, required, done, reviews } = row.review;
  const decided = FINAL.includes(state);
  const alreadyReviewed = reviews.some((r) => r.reviewer === user && r.decision !== "ESCALATED");
  const reasonNeeded = row.triage !== "CONFIRM";
  const canCorrect = run.plan.check === "missing_clause";

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

  const decide = (decision: Decision) =>
    act(() =>
      api.review(run.run_id, {
        doc_id: row.doc_id,
        decision,
        reason: reason.trim() || undefined,
        corrected_status: decision === "CORRECTED" ? corrected : undefined,
      }),
    );

  const storeCopy = () => act(async () => setArchive(await api.archive(run.run_id, row.doc_id)));

  return (
    <div className="panel review">
      <div className="section-title">{t("Your decision")}</div>
      <div className="actions">
        <ReviewBadge state={state} />
        <Caption1>
          {required === 2 ? t("Four-eyes principle: {done} of 2 approvals", { done }) : t("{done} of 1 decision", { done })}
          {row.sample && ` · ${t("spot-check sample: open the evidence before confirming")}`}
        </Caption1>
      </div>
      {reviews.length > 0 && (
        <ul>
          {reviews.map((r) => (
            <li key={r.reviewer + r.ts}>
              <Text weight="semibold">{r.reviewer_name}</Text>: {t(r.decision.toLowerCase())}
              {r.corrected_status && ` → ${t(r.corrected_status.toLowerCase())}`}
              {r.reason && <span className="muted"> – “{r.reason}”</span>}
              {r.source && r.source !== run.run_id && (
                <span className="fr-source">{r.source === "register" ? t("in the register") : t("in run {id}", { id: r.source })}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!decided && alreadyReviewed && (
        <MessageBar intent="info">
          <MessageBarBody>
            {t("You ({user}) already approved this row. The second approval must come from a different person – switch the reviewer at the top.", { user: USERS[user] })}
          </MessageBarBody>
        </MessageBar>
      )}

      {!decided && !alreadyReviewed && (
        <>
          <Field label={reasonNeeded ? t("Reason (required for this row)") : t("Reason (optional for routine rows)")}>
            <Textarea value={reason} onChange={(_, d) => setReason(d.value)} placeholder={t("What did you check in the evidence?")} resize="vertical" />
          </Field>
          {canCorrect && (
            <Field label={t("If you correct it, the clause is actually …")}>
              <RadioGroup layout="horizontal" value={corrected} onChange={(_, d) => setCorrected(d.value)}>
                <Radio value="PRESENT" label={t("present")} />
                <Radio value="ABSENT" label={t("missing")} />
              </RadioGroup>
            </Field>
          )}
          <div className="actions">
            <Button appearance="primary" icon={<Checkmark16Regular />} disabled={busy || (reasonNeeded && !reason.trim())} onClick={() => decide("CONFIRMED")}>
              {t("Confirm finding")}
            </Button>
            <Button icon={<Dismiss16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("REJECTED")}>
              {t("Reject")}
            </Button>
            {canCorrect && (
              <Button icon={<Edit16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("CORRECTED")}>
                {t("Correct")}
              </Button>
            )}
          </div>
        </>
      )}

      <div className="actions archive-row">
        {/* Clickable on purpose (decision 71): the server is the control, not the button. Before
            approval it refuses with 409 and writes the refusal to the audit log. */}
        <Button icon={APPROVED.includes(state) ? <Archive16Regular /> : <LockClosed16Regular />} disabled={busy} onClick={storeCopy}>
          {t("Store archive copy")}
        </Button>
        <Caption1>
          {APPROVED.includes(state)
            ? t("Write-only contract storage, one copy per file")
            : t("Locked until the finding is approved – the server refuses and logs every attempt")}
        </Caption1>
      </div>
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
