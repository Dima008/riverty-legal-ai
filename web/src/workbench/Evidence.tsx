// Evidence before verdict: the original page with the passage highlighted, what the model proposed,
// what every check said, what the register made of it - and only then the human decision.
import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { CalendarLtr16Regular, DocumentText16Regular, Scales24Regular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { api, type DocText, type DocumentInfo, type Finding, type Run, type RunRow } from "../api";
import { StatusBadge, TriageBadge } from "../components/Badges";
import { ChecksDisclosure, Quote, showChecks, Verdict } from "../components/Finding";
import { EvidenceSkeleton } from "../components/Loading";
import { PageView, TextExcerpt } from "../components/PageView";
import { ALERT_FLAGS, documentAlerts, flagName, SafetyBars, suspectHighlight, type Alert } from "../components/SafetyBar";
import { useT } from "../i18n";
import { STATUS_LABEL, warningLabels } from "../labels";
import { ReviewBox } from "./ReviewBox";

interface Loaded {
  doc: DocumentInfo;
  finding: Finding | null;
  boxes: Record<number, number[][]>;
  hint: string | null;
  suspect: boolean;
  text: DocText | null;
  firstPage: number;
  alerts: Alert[];
}

/** Highlight boxes for one finding: its quote, or the passage that hints at a missing clause.
 *  The hint stays English here; PageView translates it when it shows it. `suspect`: the passage
 *  lies in text addressed to AI systems (M14) - it is drawn in red and never called evidence. */
export async function findingBoxes(docId: string, finding: Finding | null) {
  const boxes: Record<number, number[][]> = {};
  if (!finding || !(finding.quote || finding.flags.some((f) => f.startsWith("signal_despite_absent")))) {
    return { boxes, page: finding?.page ?? 1, hint: null as string | null, suspect: false };
  }
  const [h, suspect] = await Promise.all([api.highlight(docId, finding.clause_type), suspectHighlight(docId, finding.flags)]);
  h.pages.forEach((p) => (boxes[p.page] = p.boxes));
  const hint = suspect ? "text addressed to AI systems – not evidence"
    : h.kind === "quote" ? "the model's quote" : h.kind === "signal" ? "the passage that hints at the clause" : null;
  return { boxes, page: h.pages[0]?.page ?? finding.page ?? 1, hint, suspect };
}

async function load(run: Run, row: RunRow): Promise<Loaded> {
  const doc = await api.document(row.doc_id);
  let boxes: Record<number, number[][]> = {};
  let finding: Finding | null = null;
  let firstPage = 1;
  let hint: string | null = null;
  let suspect = false;
  if (run.plan.check === "missing_clause") {
    finding = (await api.findings(row.doc_id)).find((f) => f.clause_type === run.plan.params.clause_type) ?? null;
    ({ boxes, page: firstPage, hint, suspect } = await findingBoxes(row.doc_id, finding));
  } else if (row.hits?.length) {
    for (const hit of row.hits) {
      const r = await api.locate(row.doc_id, hit.page, hit.name);
      boxes[hit.page] = [...(boxes[hit.page] ?? []), ...r.boxes];
    }
    firstPage = row.hits[0].page;
    hint = "the former company name";
  }
  const text = doc.format === "txt" ? await api.text(row.doc_id) : null;
  const alerts = await documentAlerts(doc, row.flags, text);
  return { doc, finding, boxes, hint, suspect, text, firstPage, alerts };
}

export function Evidence({ run, row, onChanged, onOpenDoc }:
  { run: Run; row: RunRow; onChanged: () => void; onOpenDoc: (docId: string) => void }) {
  const t = useT();
  const [data, setData] = useState<Loaded | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const checks = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    load(run, row)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setPage(d.firstPage);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
    // reload only when another contract or run is selected, not after every review
  }, [run.run_id, row.doc_id]);

  if (error) return <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>;
  // the shape of the evidence while it loads, so the column does not collapse and jump
  if (!data) return <EvidenceSkeleton label={t("Loading evidence for {doc}…", { doc: row.doc_id })} />;

  const { doc, finding, boxes, hint, suspect, text, alerts } = data;
  const m = doc.metadata;
  // injection and scan quality get a warning bar below the header; the other flags stay chips.
  // A "hint that the clause may exist" that lies in text addressed to AI systems is no hint: the
  // warning bar and the red marker on the page say what it is.
  const warnings = warningLabels(
    row.flags.filter((f) => !ALERT_FLAGS.has(flagName(f)) && !(suspect && flagName(f) === "signal_despite_absent")), t);

  return (
    <div className="evidence">
      <header className="panel ev-head">
        <div className="ev-title">
          <span className="ev-id">{row.doc_id}</span>
          <div>
            <h3>{m?.counterparty_name ?? t("Unknown party")}</h3>
            <div className="ev-meta">
              <span><DocumentText16Regular /> {m?.title ?? doc.source_files.join(", ")}</span>
              <span><CalendarLtr16Regular /> {m?.effective_date ?? t("no date")}</span>
              <span><Scales24Regular className="i16" /> {m?.governing_law ? t("{law} law", { law: m.governing_law }) : t("law not found")}</span>
              {doc.family.length > 1 && <span>{t("family {ids}", { ids: doc.family.join(" · ") })}</span>}
            </div>
          </div>
        </div>
        <div className="ev-badges">
          <StatusBadge status={row.status} />
          <TriageBadge triage={row.triage} />
          {warnings.map((w) => (
            <span key={w} className="warn-chip">{w}</span>
          ))}
        </div>
      </header>

      <SafetyBars alerts={alerts} onPage={text ? undefined : setPage} />

      <div className="ev-grid">
        <div className="panel ev-source">
          <div className="section-title">{t("Original document")}</div>
          {text ? (
            <TextExcerpt text={text.text} start={finding?.char_start ?? null} end={finding?.char_end ?? null} />
          ) : (
            <PageView doc={doc} page={page} onPage={setPage} boxes={boxes} hint={hint} suspect={suspect} />
          )}
        </div>

        <div className="ev-side">
          {finding && (
            <div className="panel">
              <div className="section-title">{t(finding.label)}</div>
              <Verdict finding={finding} onShowChecks={() => showChecks(checks)} />
              <Quote finding={finding} />
              {finding.rationale && <p className="note">{t("Model's reason: {reason}", { reason: finding.rationale })}</p>}
              <ChecksDisclosure key={`${row.doc_id}-${finding.clause_type}`} finding={finding} detailsRef={checks} />
              <p className="note">{t("{status} is an observation about the text, not a legal assessment.", { status: t(STATUS_LABEL[finding.status]) })}</p>
            </div>
          )}

          {row.hits && (
            <div className="panel">
              <div className="section-title">{t("Former company name")}</div>
              <ul className="hits">
                {row.hits.map((h, i) => (
                  <li key={i}>
                    <b>{h.name}</b> · {t("page {n}", { n: h.page })}
                    <div className="note">…{h.snippet}…</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {row.duplicate_of && (
            <div className="panel">
              <div className="section-title">{t("Duplicate")}</div>
              <p className="note">
                {t("Copy of {id}. The original is checked; this copy is not counted twice.", { id: row.duplicate_of })}{" "}
                <button type="button" className="link-btn" onClick={() => onOpenDoc(row.duplicate_of!)}>
                  {t("Open {id}", { id: row.duplicate_of })}
                </button>
              </p>
            </div>
          )}

          <ReviewBox key={row.doc_id} run={run} row={row} onChanged={onChanged} />
        </div>
      </div>
    </div>
  );
}
