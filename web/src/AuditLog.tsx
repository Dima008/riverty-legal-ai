// Who did what, when and why – every question, decision and archive attempt (also refused ones),
// and what the register did on its own: a contract arrived, was read, could not be read, was
// removed. The events are grouped by question, so a question, its decisions and its archive copy
// read as one story, in plain sentences; each question opens its answer again. Decisions on a single
// finding (decision 73) and the register's own events form their own groups.
import { Button, MessageBar, MessageBarBody, ToggleButton } from "@fluentui/react-components";
import {
  Archive20Regular,
  ArrowSync16Regular,
  CheckmarkCircle20Filled,
  DataBarVertical20Regular,
  Delete20Regular,
  DismissCircle20Regular,
  DocumentAdd20Regular,
  DocumentError20Regular,
  DocumentSearch20Regular,
  Edit20Regular,
  Flag20Regular,
  LockClosed20Regular,
  PersonCircle20Regular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { api, type AuditEvent, type Example, type RegisterEvent, type RunListItem } from "./api";
import { useLang, useT, type Lang, type T } from "./i18n";
import { CLAUSE_SHORT, REVIEW_LABEL } from "./labels";
import { useRegisterLive } from "./live";
import { workbenchHref } from "./routing";
import { USERS } from "./user";

type Kind = "questions" | "decisions" | "archive" | "refused" | "register";
const KIND: Record<string, Kind> = {
  run_created: "questions",
  review_recorded: "decisions",
  batch_confirmed: "decisions",
  finding_review_recorded: "decisions",
  finding_escalated: "decisions",
  archive_copy: "archive",
  archive_refused: "refused",
  // the register's own events (GET /changes)
  ingested: "register",
  ingest_failed: "register",
  extracted: "register",
  extraction_failed: "register",
  forgotten: "register",
};
const FILTERS: { key: "" | Kind; label: string }[] = [
  { key: "", label: "All" },
  { key: "questions", label: "Questions" },
  { key: "decisions", label: "Decisions" },
  { key: "archive", label: "Archive copies" },
  { key: "refused", label: "Refused" },
  { key: "register", label: "Register" },
];

const FEED_LINES = 10;     // the register's events shown before "Show all"

/** A pipeline event of the register, in the shape of the Workbench's audit events: the pipeline is the actor. */
const fromRegister = (e: RegisterEvent): AuditEvent =>
  ({ ts: e.ts, actor: "pipeline", actor_name: "Pipeline", action: e.action, target: e.doc_id, details: e.details });

// "photo scan, 1 page, poor scan (OCR 61 %)"; German nouns keep their capital
function arrival(d: RegisterEvent["details"], t: T, lang: Lang): string {
  const kind = d.format === "pdf_text" ? "PDF" : t(d.format === "txt" ? "Text" : d.format === "jpeg" ? "Photo scan" : "Scan");
  const parts = [lang === "en" && kind !== "PDF" ? kind.toLowerCase() : kind];
  if (d.pages != null) parts.push(d.pages === 1 ? t("1 page") : t("{n} pages", { n: d.pages }));
  if (d.status === "LOW_QUALITY") {
    parts.push(d.ocr_mean_conf != null ? t("poor scan (OCR {conf} %)", { conf: Math.round(d.ocr_mean_conf) }) : t("poor scan"));
  }
  return parts.join(", ");
}

const DECISION_ICON: Record<string, ReactElement> = {
  CONFIRMED: <CheckmarkCircle20Filled />,
  REJECTED: <DismissCircle20Regular />,
  CORRECTED: <Edit20Regular />,
  ESCALATED: <Flag20Regular />,
};
const REGISTER_ICON: Record<string, ReactElement> = {
  ingested: <DocumentAdd20Regular />,
  extracted: <DocumentSearch20Regular />,
  ingest_failed: <DocumentError20Regular />,
  extraction_failed: <DocumentError20Regular />,
  forgotten: <Delete20Regular />,
};
function icon(e: AuditEvent): ReactElement {
  if (e.action === "run_created") return <DataBarVertical20Regular />;
  if (e.action === "archive_copy") return <Archive20Regular />;
  if (e.action === "archive_refused") return <LockClosed20Regular />;
  if (e.action === "batch_confirmed") return <CheckmarkCircle20Filled />;
  if (REGISTER_ICON[e.action]) return REGISTER_ICON[e.action];
  return DECISION_ICON[String(e.details.decision)] ?? <PersonCircle20Regular />;
}

/** The run an event belongs to; "register" for decisions on a single finding, "pipeline" for the register's own events. */
function groupOf(e: AuditEvent): string {
  if (KIND[e.action] === "register") return "pipeline";
  if (e.action === "run_created" || e.action === "batch_confirmed") return e.target;
  if (e.action === "review_recorded" || e.action === "archive_refused") return e.target.split("/")[0];
  if (e.action === "archive_copy") return String(e.details.run_id ?? "register");
  return "register";
}

// what a refused archive copy still needed, from the state it was in; for an open finding the number of
// approvals depends on its triage, which the event does not record
const STILL_NEEDED: Record<string, { k: number; done: number }> = { IN_REVIEW: { k: 2, done: 1 }, ESCALATED: { k: 2, done: 0 } };

/** "M14", or "M14 · Liability cap" for a decision on a single finding (decide one finding, D6). */
function subject(e: AuditEvent, t: T): string {
  if (e.action === "archive_copy") return e.target;
  const [first, second] = e.target.split("/");
  if (e.action.startsWith("finding_")) return `${first} · ${t(CLAUSE_SHORT[second] ?? second)}`;
  return second ?? first;
}

const stateWord = (s: unknown, t: T) => t(REVIEW_LABEL[String(s)] ?? String(s).toLowerCase().replace(/_/g, " "));

/** One plain sentence per event, and the details below it. */
function sentence(e: AuditEvent, t: T, lang: Lang): { text: string; detail?: string } {
  const d = e.details as Record<string, unknown>;
  const who = e.actor_name;
  const doc = subject(e, t);
  switch (e.action) {
    case "run_created": {
      const c = d.coverage as { checked?: number } | undefined;
      return {
        text: c?.checked != null
          ? t("{who} asked: {n} of {of} to look at", { who, n: String(d.reported), of: c.checked })
          : t("{who} asked: {n} to look at", { who, n: String(d.reported) }),
      };
    }
    case "review_recorded":
    case "finding_review_recorded": {
      const text =
        d.decision === "CONFIRMED" ? t("{who} confirmed {doc}", { who, doc })
        : d.decision === "REJECTED" ? t("{who} rejected {doc}", { who, doc })
        : d.decision === "CORRECTED" ? t("{who} corrected {doc} to “{status}”", { who, doc, status: t(String(d.corrected_status).toLowerCase()) })
        : t("{who} reviewed {doc}", { who, doc });
      const where = e.action === "finding_review_recorded" ? ` · ${t("from the register")}` : "";
      return { text, detail: `${d.reason ? `“${d.reason}” ` : ""}→ ${stateWord(d.state_after, t)}${where}` };
    }
    case "finding_escalated":
      return { text: t("{who} escalated {doc} to four eyes", { who, doc }), detail: d.reason ? `“${d.reason}”` : undefined };
    case "batch_confirmed": {
      const ids = (d.doc_ids as string[]) ?? [];
      const text = ids.length === 1
        ? t("{who} confirmed 1 row at once", { who })
        : t("{who} confirmed {n} rows at once", { who, n: ids.length });
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
    case "archive_refused": {
      // the server's refusal in the fixed words of the decision panel (D17); who tried it below
      const needed = typeof d.required === "number" ? { k: d.required, done: Number(d.done ?? 0) } : STILL_NEEDED[String(d.state)];
      if (needed) {
        const text = needed.k === 1
          ? "Archive copy of {doc} refused: needs 1 approval ({done} so far)"
          : "Archive copy of {doc} refused: needs {k} approvals ({done} so far)";
        return { text: t(text, { doc, ...needed }), detail: who };
      }
      return {
        text: t("{who} tried to store an archive copy of {doc} – refused", { who, doc }),
        detail: t("Refused by the server: the finding is “{state}”, not approved.", { state: stateWord(d.state, t) }),
      };
    }
    // the register's own events: the pipeline, not a person
    case "ingested":
      return { text: t("{id} arrived – {details}", { id: e.target, details: arrival(e.details as RegisterEvent["details"], t, lang) }) };
    case "extracted":
      return { text: t("{id} read by the model ({model}, {prompt})", { id: e.target, model: String(d.model ?? "?"), prompt: String(d.prompt_version ?? "?") }) };
    case "extraction_failed":
      return { text: t("{id}: reading failed – {error}", { id: e.target, error: String(d.error ?? "?") }) };
    case "ingest_failed":
      return { text: t("{id}: could not be taken in – {error}", { id: e.target, error: String(d.error ?? "?") }) };
    case "forgotten":
      return { text: t("{id} removed from the register", { id: e.target }) };
    default:
      return { text: `${who}: ${e.action.replace(/_/g, " ")} ${e.target}` };
  }
}

export function AuditLog() {
  const t = useT();
  const lang = useLang();
  const live = useRegisterLive();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [pipeline, setPipeline] = useState<AuditEvent[]>([]);
  const [runs, setRuns] = useState<Record<string, RunListItem>>({});
  const [examples, setExamples] = useState<Example[]>([]);
  const [filter, setFilter] = useState<"" | Kind>("");
  const [error, setError] = useState<string | null>(null);
  const [wholeFeed, setWholeFeed] = useState(false);
  // the register's own events, the newest 200, newest first like the audit; an older API without /changes has none
  const loadPipeline = useCallback(() => {
    api.changes(0).then((c) => setPipeline(c.events.map(fromRegister).reverse())).catch(() => setPipeline([]));
  }, []);
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
  // on opening, and whenever a contract arrived, was read or removed: the register's version changed (live.tsx)
  useEffect(loadPipeline, [loadPipeline, live.version]);

  // local time on screen, the stored UTC time in the tooltip
  const when = (ts: string) =>
    new Date(ts).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const utc = (ts: string) => `${ts.replace("T", " ").slice(0, 19)} UTC`;
  // the Workbench's events and the register's in one timeline, newest first
  const all = events ? [...events, ...pipeline].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)) : [];
  const count = (k: "" | Kind) => (k ? all.filter((e) => KIND[e.action] === k).length : all.length);
  const shown = all.filter((e) => !filter || KIND[e.action] === filter);

  // groups ordered by their newest event; inside a group the story reads from top to bottom: the
  // question, the decisions, the archive copy
  const groups = new Map<string, AuditEvent[]>();
  shown.forEach((e) => groups.set(groupOf(e), [...(groups.get(groupOf(e)) ?? []), e]));
  const title = (key: string) => {
    if (key === "pipeline") return t("Register (pipeline)");
    if (key === "register") return t("Decisions on single findings");
    const run = runs[key];
    if (!run) return t("Question {id}", { id: key });
    const de = lang === "de" ? examples.find((x) => x.question === run.question)?.question_de : null;
    return de || run.question || t("Your own question");
  };

  return (
    <section className="panel audit">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{t("Traceability")}</div>
          <h2>{t("Audit log")}</h2>
          <p className="lead">{t("Every question, decision and archive attempt – kept apart from the register, so it survives every rebuild.")}</p>
        </div>
        <Button icon={<ArrowSync16Regular />} onClick={() => { reload(); loadPipeline(); }}>{t("Refresh")}</Button>
      </div>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{t("The audit log could not be loaded: {error}", { error })}</MessageBarBody>
        </MessageBar>
      )}
      {!error && events && all.length === 0 && <p className="lead">{t("No actions yet.")}</p>}
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
        // a question reads as a story, top to bottom; the register's events are a feed, newest first -
        // its first build alone is about a hundred lines, so only the newest ones until "Show all"
        const story = key === "pipeline" ? list : [...list].reverse();
        const feedCut = key === "pipeline" && !wholeFeed && story.length > FEED_LINES;
        return (
          <section key={key} className="au-group" aria-label={title(key)}>
            <header className="au-group-head">
              <h3>{title(key)}</h3>
              {key !== "register" && key !== "pipeline" && (
                <>
                  <span className="au-run">
                    {run ? t("{id} · started by {who}", { id: key, who: USERS[run.created_by] ?? run.created_by }) : key}
                  </span>
                  {/* the stored answer, as it was given; the work bar says if the register changed since */}
                  <a className="link-btn au-open" href={workbenchHref({ run: key })}>{t("Open the answer →")}</a>
                </>
              )}
            </header>
            <ol className="au-events">
              {(feedCut ? story.slice(0, FEED_LINES) : story).map((e, i) => {
                const s = sentence(e, t, lang);
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
            {feedCut && (
              <button type="button" className="link-btn au-more" onClick={() => setWholeFeed(true)}>
                {t("Show all")} ({story.length})
              </button>
            )}
          </section>
        );
      })}
    </section>
  );
}
