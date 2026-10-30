// Who did what, when and why – every run, review and archive attempt (also refused ones).
import { Avatar, Button } from "@fluentui/react-components";
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

const ICON: Record<string, ReactElement> = {
  run_created: <DataBarVertical20Regular />,
  review_recorded: <CheckmarkCircle20Filled />,
  batch_confirmed: <CheckmarkCircle20Filled />,
  archive_copy: <Archive20Regular />,
  archive_refused: <LockClosed20Regular />,
};

function summary(e: AuditEvent): string {
  const d = e.details as Record<string, unknown>;
  if (e.action === "review_recorded") return `${String(d.decision).toLowerCase()}${d.reason ? ` – “${d.reason}”` : ""} → ${String(d.state_after).toLowerCase().replace(/_/g, " ")}`;
  if (e.action === "archive_refused") return `refused by the tool gate: finding is ${String(d.state).toLowerCase().replace(/_/g, " ")}`;
  if (e.action === "archive_copy") return ((d.files as { file: string; status: string }[]) ?? []).map((f) => `${f.file} ${f.status.replace(/_/g, " ")}`).join(", ");
  if (e.action === "run_created") return `${(d.plan as { check: string }).check.replace(/_/g, " ")} · ${d.reported} to look at`;
  if (e.action === "batch_confirmed") return `routine rows ${(d.doc_ids as string[]).join(", ")}`;
  return "";
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const reload = useCallback(() => {
    api.audit().then(setEvents).catch(() => setEvents([]));
  }, []);
  useEffect(reload, [reload]);

  return (
    <section className="panel audit">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Traceability</div>
          <h2>Audit log</h2>
          <p className="lead">Every run, decision and archive attempt – kept apart from the register, so it survives every rebuild.</p>
        </div>
        <Button icon={<ArrowSync16Regular />} onClick={reload}>Refresh</Button>
      </div>
      {events.length === 0 && <p className="lead">No actions yet.</p>}
      <ol className="audit-list">
        {events.map((e, i) => (
          <li key={i} className={`audit-item a-${e.action}`}>
            <span className="audit-icon">{ICON[e.action] ?? <PersonCircle20Regular />}</span>
            <div className="audit-body">
              <div className="audit-line">
                <b>{e.action.replace(/_/g, " ")}</b> <span className="audit-target">{e.target}</span>
              </div>
              <div className="audit-detail">{summary(e)}</div>
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
