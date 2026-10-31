// Who did what, when and why – every run, review and archive attempt (also refused ones). The
// events are grouped by run, so a question, its reviews and its archive copy read as one story, in
// plain sentences; reviews made directly in the register (decision 73) form their own group.
import { Button, MessageBar, MessageBarBody, ToggleButton } from "@fluentui/react-components";
import {
  Archive20Regular,
  ArrowSync16Regular,
  CheckmarkCircle20Filled,
  DataBarVertical20Regular,
  DismissCircle20Regular,
  Edit20Regular,
  Flag20Regular,
  LockClosed20Regular,
  PersonCircle20Regular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { api, type AuditEvent, type Example, type RunListItem } from "./api";
import { useLang, useT, type T } from "./i18n";
import { CLAUSE_SHORT, REVIEW_LABEL } from "./labels";
import { USERS } from "./user";

type Kind = "runs" | "reviews" | "archive" | "refused";
const KIND: Record<string, Kind> = {
  run_created: "runs",
  review_recorded: "reviews",
  batch_confirmed: "reviews",
  finding_review_recorded: "reviews",
  finding_escalated: "reviews",
  archive_copy: "archive",
  archive_refused: "refused",
};
const FILTERS: { key: "" | Kind; label: string }[] = [
  { key: "", label: "All" },
  { key: "runs", label: "Runs" },
  { key: "reviews", label: "Reviews" },
  { key: "archive", label: "Archive copies" },
  { key: "refused", label: "Refused" },
];

const DECISION_ICON: Record<string, ReactElement> = {
  CONFIRMED: <CheckmarkCircle20Filled />,
  REJECTED: <DismissCircle20Regular />,
  CORRECTED: <Edit20Regular />,
  ESCALATED: <Flag20Regular />,
};
function icon(e: AuditEvent): ReactElement {
  if (e.action === "run_created") return <DataBarVertical20Regular />;
  if (e.action === "archive_copy") return <Archive20Regular />;
  if (e.action === "archive_refused") return <LockClosed20Regular />;
  if (e.action === "batch_confirmed") return <CheckmarkCircle20Filled />;
  return DECISION_ICON[String(e.details.decision)] ?? <PersonCircle20Regular />;
}

/** The run an event belongs to; "register" for reviews made in the register. */
function groupOf(e: AuditEvent): string {
  if (e.action === "run_created" || e.action === "batch_confirmed") return e.target;
  if (e.action === "review_recorded" || e.action === "archive_refused") return e.target.split("/")[0];
  if (e.action === "archive_copy") return String(e.details.run_id ?? "register");
  return "register";
}

/** "M14", or "M14 · Liability cap" for a finding reviewed in the register. */
function subject(e: AuditEvent, t: T): string {
  if (e.action === "archive_copy") return e.target;
  const [first, second] = e.target.split("/");
  if (e.action.startsWith("finding_")) return `${first} · ${t(CLAUSE_SHORT[second] ?? second)}`;
  return second ?? first;
}

const stateWord = (s: unknown, t: T) => t(REVIEW_LABEL[String(s)] ?? String(s).toLowerCase().replace(/_/g, " "));

/** One plain sentence per event, and the details below it. */
function sentence(e: AuditEvent, t: T): { text: string; detail?: string } {
  const d = e.details as Record<string, unknown>;
  const who = e.actor_name;
  const doc = subject(e, t);
  switch (e.action) {
    case "run_created": {
      const c = d.coverage as { checked?: number } | undefined;
      return {
        text: c?.checked != null
          ? t("{who} ran the check: {n} of {of} to look at", { who, n: String(d.reported), of: c.checked })
          : t("{who} ran the check: {n} to look at", { who, n: String(d.reported) }),
      };
    }
    case "review_recorded":
    case "finding_review_recorded": {
      const text =
        d.decision === "CONFIRMED" ? t("{who} confirmed {doc}", { who, doc })
        : d.decision === "REJECTED" ? t("{who} rejected {doc}", { who, doc })
        : d.decision === "CORRECTED" ? t("{who} corrected {doc} to “{status}”", { who, doc, status: t(String(d.corrected_status).toLowerCase()) })
        : t("{who} reviewed {doc}", { who, doc });
      const where = e.action === "finding_review_recorded" ? ` · ${t("in the register")}` : "";
      return { text, detail: `${d.reason ? `“${d.reason}” ` : ""}→ ${stateWord(d.state_after, t)}${where}` };
    }
    case "finding_escalated":
      return { text: t("{who} escalated {doc} to four eyes", { who, doc }), detail: d.reason ? `“${d.reason}”` : undefined };
    case "batch_confirmed": {
      const ids = (d.doc_ids as string[]) ?? [];
      const text = ids.length === 1
        ? t("{who} confirmed 1 routine row in a batch", { who })
        : t("{who} confirmed {n} routine rows at once", { who, n: ids.length });
      return { text, detail: ids.join(", ") };
    }
    case "archive_copy": {
      const files = (d.files as { file: string; status: string }[]) ?? [];
      const by = ((d.approved_by as string[]) ?? []).map((u) => USERS[u] ?? u).join(` ${t("and")} `);
      return {
        text: t("{who} stored an archive copy of {doc}", { who, doc }),
        detail: [files.map((f) => `${f.file}: ${t(f.status.replace(/_/g, " "))}`).join(", "), by && t("approved by {names}", { names: by })]
          .filter(Boolean).join(" · "),
      };
    }
    case "archive_refused":
      return {
        text: t("{who} tried to store an archive copy of {doc} – refused", { who, doc }),
        detail: t("The tool gate refused it: the finding is “{state}”, not approved.", { state: stateWord(d.state, t) }),
      };
    default:
      return { text: `${who}: ${e.action.replace(/_/g, " ")} ${e.target}` };
  }
}

export function AuditLog() {
  const t = useT();
  const lang = useLang();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [runs, setRuns] = useState<Record<string, RunListItem>>({});
  const [examples, setExamples] = useState<Example[]>([]);
  const [filter, setFilter] = useState<"" | Kind>("");
  const [error, setError] = useState<string | null>(null);
  // A failed request is shown as an error, never as "No actions yet." (F13: an empty audit log
  // on the traceability screen would silently claim that nothing happened).
  const reload = useCallback(() => {
    api.audit()
      .then((e) => { setEvents(e); setError(null); })
      .catch((e: Error) => setError(e.message));
    // only to name the runs; without them a group shows its run ID
    api.runs().then((list) => setRuns(Object.fromEntries(list.map((r) => [r.run_id, r])))).catch(() => undefined);
    api.examples().then(setExamples).catch(() => undefined);
  }, []);
  useEffect(reload, [reload]);

  // local time on screen, the stored UTC time in the tooltip
  const when = (ts: string) =>
    new Date(ts).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const utc = (ts: string) => `${ts.replace("T", " ").slice(0, 19)} UTC`;
  const all = events ?? [];
  const count = (k: "" | Kind) => (k ? all.filter((e) => KIND[e.action] === k).length : all.length);
  const shown = all.filter((e) => !filter || KIND[e.action] === filter);

  // groups ordered by their newest event (the API sends newest first); inside a group the story
  // reads from top to bottom: the question, the reviews, the archive copy
  const groups = new Map<string, AuditEvent[]>();
  shown.forEach((e) => groups.set(groupOf(e), [...(groups.get(groupOf(e)) ?? []), e]));
  const title = (key: string) => {
    if (key === "register") return t("Reviews in the register");
    const run = runs[key];
    if (!run) return t("Run {id}", { id: key });
    const de = lang === "de" ? examples.find((x) => x.question === run.question)?.question_de : null;
    return de || run.question || t("Your check");
  };

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
      {all.length > 0 && (
        <div className="type-filter au-filters" role="group" aria-label={t("Show")}>
          {FILTERS.map((f) => (
            <ToggleButton key={f.key} size="small" checked={filter === f.key} appearance={filter === f.key ? "primary" : "subtle"}
                          onClick={() => setFilter(f.key)}>
              {t(f.label)} <span className="count">{count(f.key)}</span>
            </ToggleButton>
          ))}
        </div>
      )}
      {[...groups].map(([key, list]) => {
        const run = runs[key];
        return (
          <section key={key} className="au-group" aria-label={title(key)}>
            <header className="au-group-head">
              <h3>{title(key)}</h3>
              {key !== "register" && (
                <span className="au-run">
                  {run ? t("{id} · started by {who}", { id: key, who: USERS[run.created_by] ?? run.created_by }) : key}
                </span>
              )}
            </header>
            <ol className="au-events">
              {[...list].reverse().map((e, i) => {
                const s = sentence(e, t);
                const decision = e.details.decision ? ` d-${String(e.details.decision).toLowerCase()}` : "";
                return (
                  <li key={`${e.ts}-${i}`} className={`au-event a-${e.action}${decision}`}>
                    <span className="au-icon" aria-hidden>{icon(e)}</span>
                    <div className="au-body">
                      <div className="au-text">{s.text}</div>
                      {s.detail && <div className="au-detail">{s.detail}</div>}
                    </div>
                    <time className="au-time" dateTime={e.ts} title={utc(e.ts)}>{when(e.ts)}</time>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </section>
  );
}
