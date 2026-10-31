// Human decision on one reported row, then the archive copy (only after approval).
import { Button, Caption1, Field, MessageBar, MessageBarBody, Radio, RadioGroup, Text, Textarea } from "@fluentui/react-components";
import { Archive16Regular, Checkmark16Regular, Dismiss16Regular, Edit16Regular, LockClosed16Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { api, ApiError, type ArchiveResult, type Decision, type Run, type RunRow } from "../api";
import { ReviewBadge } from "../components/Badges";
import { USERS, useUser } from "../user";

const FINAL = ["CONFIRMED", "REJECTED", "CORRECTED", "DISPUTED"];
const APPROVED = ["CONFIRMED", "CORRECTED"];

export function ReviewBox({ run, row, onChanged }: { run: Run; row: RunRow; onChanged: () => void }) {
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
      <div className="section-title">Your decision</div>
      <div className="actions">
        <ReviewBadge state={state} />
        <Caption1>
          {required === 2 ? `Four-eyes principle: ${done} of 2 approvals` : `${done} of 1 decision`}
          {row.sample && " · spot-check sample: open the evidence before confirming"}
        </Caption1>
      </div>
      {reviews.length > 0 && (
        <ul>
          {reviews.map((r) => (
            <li key={r.reviewer + r.ts}>
              <Text weight="semibold">{r.reviewer_name}</Text>: {r.decision.toLowerCase()}
              {r.corrected_status && ` → ${r.corrected_status.toLowerCase()}`}
              {r.reason && <span className="muted"> – “{r.reason}”</span>}
              {r.source && r.source !== run.run_id && (
                <span className="fr-source">{r.source === "register" ? "in the register" : `in run ${r.source}`}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!decided && alreadyReviewed && (
        <MessageBar intent="info">
          <MessageBarBody>
            You ({USERS[user]}) already approved this row. The second approval must come from a different person – switch the reviewer at the top.
          </MessageBarBody>
        </MessageBar>
      )}

      {!decided && !alreadyReviewed && (
        <>
          <Field label={reasonNeeded ? "Reason (required for this row)" : "Reason (optional for routine rows)"}>
            <Textarea value={reason} onChange={(_, d) => setReason(d.value)} placeholder="What did you check in the evidence?" resize="vertical" />
          </Field>
          {canCorrect && (
            <Field label="If you correct it, the clause is actually …">
              <RadioGroup layout="horizontal" value={corrected} onChange={(_, d) => setCorrected(d.value)}>
                <Radio value="PRESENT" label="present" />
                <Radio value="ABSENT" label="missing" />
              </RadioGroup>
            </Field>
          )}
          <div className="actions">
            <Button appearance="primary" icon={<Checkmark16Regular />} disabled={busy || (reasonNeeded && !reason.trim())} onClick={() => decide("CONFIRMED")}>
              Confirm finding
            </Button>
            <Button icon={<Dismiss16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("REJECTED")}>
              Reject
            </Button>
            {canCorrect && (
              <Button icon={<Edit16Regular />} disabled={busy || !reason.trim()} onClick={() => decide("CORRECTED")}>
                Correct
              </Button>
            )}
          </div>
        </>
      )}

      <div className="actions archive-row">
        {/* Clickable on purpose (decision 71): the server is the control, not the button. Before
            approval it refuses with 409 and writes the refusal to the audit log. */}
        <Button icon={APPROVED.includes(state) ? <Archive16Regular /> : <LockClosed16Regular />} disabled={busy} onClick={storeCopy}>
          Store archive copy
        </Button>
        <Caption1>
          {APPROVED.includes(state)
            ? "Write-only contract storage, one copy per file"
            : "Locked until the finding is approved – the server refuses and logs every attempt"}
        </Caption1>
      </div>
      {archive && (
        <MessageBar intent="success">
          <MessageBarBody>
            {archive.files.map((f) => `${f.file}: ${f.status.replace(/_/g, " ")} (receipt ${f.receipt_id})`).join("; ")} · approved by{" "}
            {archive.approved_by.map((u) => USERS[u] ?? u).join(" and ")}
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
