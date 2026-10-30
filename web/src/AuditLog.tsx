// Who did what, when and why – every run, review and archive attempt (also refused ones).
import { Button, Caption1, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Title3 } from "@fluentui/react-components";
import { ArrowClockwise16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { api, type AuditEvent } from "./api";

function summary(e: AuditEvent): string {
  const d = e.details as Record<string, unknown>;
  if (e.action === "review_recorded") return `${d.decision}${d.reason ? ` – “${d.reason}”` : ""} → ${d.state_after}`;
  if (e.action === "archive_refused") return `refused: row is ${d.state}`;
  if (e.action === "archive_copy") return ((d.files as { file: string; status: string }[]) ?? []).map((f) => `${f.file} ${f.status}`).join(", ");
  if (e.action === "run_created") return `${(d.plan as { check: string }).check}, ${d.reported} reported`;
  if (e.action === "batch_confirmed") return `${(d.doc_ids as string[]).join(", ")}`;
  return "";
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const reload = useCallback(() => {
    api.audit().then(setEvents).catch(() => setEvents([]));
  }, []);
  useEffect(reload, [reload]);

  return (
    <section className="card">
      <div className="results-head">
        <Title3>Audit log</Title3>
        <Button size="small" icon={<ArrowClockwise16Regular />} onClick={reload}>Refresh</Button>
      </div>
      <Caption1 block>Kept in the workflow database, separate from the register: it survives every rebuild (decision 56).</Caption1>
      <Table size="small" aria-label="Audit log">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Time (UTC)</TableHeaderCell>
            <TableHeaderCell>Who</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>Target</TableHeaderCell>
            <TableHeaderCell>Details</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e, i) => (
            <TableRow key={i}>
              <TableCell>{e.ts.replace("T", " ").slice(0, 19)}</TableCell>
              <TableCell>{e.actor_name}</TableCell>
              <TableCell>{e.action.replace(/_/g, " ")}</TableCell>
              <TableCell>{e.target}</TableCell>
              <TableCell>{summary(e)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
