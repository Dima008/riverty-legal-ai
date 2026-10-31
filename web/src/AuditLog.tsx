// Who did what, when and why – every run, review and archive attempt (also refused ones).
import { Avatar, Button, MessageBar, MessageBarBody } from "@fluentui/react-components";
import {
  Archive20Regular,
  ArrowSync16Regular,
  CheckmarkCircle20Filled,
  DataBarVertical20Regular,
  LockClosed20Regular,
  PersonCircle20Regular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { api, type AuditEvent } from "./api";
import { useT, type T } from "./i18n";

const ICON: Record<string, ReactElement> = {
  run_created: <DataBarVertical20Regular />,
  review_recorded: <CheckmarkCircle20Filled />,
  batch_confirmed: <CheckmarkCircle20Filled />,
  archive_copy: <Archive20Regular />,
  archive_refused: <LockClosed20Regular />,
};

// IN_REVIEW -> "in review", translated: decisions, states and check names as readable words
const word = (value: unknown, t: T) => t(String(value).toLowerCase().replace(/_/g, " "));

function summary(e: AuditEvent, t: T): string {
  const d = e.details as Record<string, unknown>;
  if (e.action === "review_recorded") return `${word(d.decision, t)}${d.reason ? ` – “${d.reason}”` : ""} → ${word(d.state_after, t)}`;
  if (e.action === "archive_refused") return t("refused by the tool gate: finding is {state}", { state: word(d.state, t) });
  if (e.action === "archive_copy") return ((d.files as { file: string; status: string }[]) ?? []).map((f) => `${f.file} ${word(f.status, t)}`).join(", ");
  if (e.action === "run_created") return `${word((d.plan as { check: string }).check, t)} · ${t("{n} to look at", { n: String(d.reported) })}`;
  if (e.action === "batch_confirmed") return t("routine rows {ids}", { ids: (d.doc_ids as string[]).join(", ") });
  return "";
}

export function AuditLog() {
  const t = useT();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A failed request is shown as an error, never as "No actions yet." (F13: an empty audit log
  // on the traceability screen would silently claim that nothing happened).
  const reload = useCallback(() => {
    api.audit()
      .then((e) => { setEvents(e); setError(null); })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  return (
    <section className="panel audit">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{t("Traceability")}</div>
          <h2>{t("Audit log")}</h2>
          <p className="lead">{t("Every run, decision and archive attempt – kept apart from the register, so it survives every rebuild.")}</p>
        </div>
        <Button icon={<ArrowSync16Regular />} onClick={reload}>{t("Refresh")}</Button>
      </div>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{t("The audit log could not be loaded: {error}", { error })}</MessageBarBody>
        </MessageBar>
      )}
      {!error && events?.length === 0 && <p className="lead">{t("No actions yet.")}</p>}
      <ol className="audit-list">
        {(events ?? []).map((e, i) => (
          <li key={i} className={`audit-item a-${e.action}`}>
            <span className="audit-icon">{ICON[e.action] ?? <PersonCircle20Regular />}</span>
            <div className="audit-body">
              <div className="audit-line">
                <b>{word(e.action, t)}</b> <span className="audit-target">{e.target}</span>
              </div>
              <div className="audit-detail">{summary(e, t)}</div>
            </div>
            <div className="audit-who">
              <Avatar name={e.actor_name} size={24} color="colorful" />
              <span>{e.actor_name}</span>
              <time>{e.ts.replace("T", " ").slice(0, 19)} UTC</time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
