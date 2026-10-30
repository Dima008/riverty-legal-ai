// Evidence before verdict: the original page with the passage highlighted, what the model proposed,
// what every check said, what the register made of it - and only then the human decision.
import { Spinner, MessageBar, MessageBarBody } from "@fluentui/react-components";
import {
  ArrowRight20Regular,
  CalendarLtr16Regular,
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
  DocumentText16Regular,
  Info20Regular,
  Scales24Regular,
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, type DocText, type DocumentInfo, type Finding, type Run, type RunRow } from "../api";
import { StatusBadge, TriageBadge } from "../components/Badges";
import { PageView, TextExcerpt } from "../components/PageView";
import { flagLabel, LAYER_LABEL, STATUS_LABEL, warningLabels } from "../labels";
import { ReviewBox } from "./ReviewBox";

interface Loaded {
  doc: DocumentInfo;
  finding: Finding | null;
  boxes: Record<number, number[][]>;
  hint: string | null;
  text: DocText | null;
  firstPage: number;
}

async function load(run: Run, row: RunRow): Promise<Loaded> {
  const doc = await api.document(row.doc_id);
  const boxes: Record<number, number[][]> = {};
  let finding: Finding | null = null;
  let firstPage = 1;
  let hint: string | null = null;
  if (run.plan.check === "missing_clause") {
    const clause = run.plan.params.clause_type;
    finding = (await api.findings(row.doc_id)).find((f) => f.clause_type === clause) ?? null;
    if (finding?.quote || finding?.flags.some((f) => f.startsWith("signal_despite_absent"))) {
      const h = await api.highlight(row.doc_id, clause);
      h.pages.forEach((p) => (boxes[p.page] = p.boxes));
      firstPage = h.pages[0]?.page ?? finding.page ?? 1;
      if (h.kind === "quote") hint = "the model's quote";
      if (h.kind === "signal") hint = "the passage that hints at the clause";
    }
  } else if (row.hits?.length) {
    for (const hit of row.hits) {
      const r = await api.locate(row.doc_id, hit.page, hit.name);
      boxes[hit.page] = [...(boxes[hit.page] ?? []), ...r.boxes];
    }
    firstPage = row.hits[0].page;
    hint = "the former company name";
  }
  const text = doc.format === "txt" ? await api.text(row.doc_id) : null;
  return { doc, finding, boxes, hint, text, firstPage };
}

function layerDetail(layer: string, detail: string | null | undefined): string | null {
  if (!detail) return null;
  if (layer === "document_signals") return detail.split(", ").map(flagLabel).join(", ");
  if (layer === "no_absence_signal") return `found in the text: …${detail.replace(/^'|'$/g, "")}…`;
  return detail;
}

// The guardrail sandwich as a timeline: model on top, every check, the register at the bottom.
function Checks({ finding }: { finding: Finding }) {
  const steps = finding.layers.filter((l) => l.layer !== "model" && l.layer !== "register");
  return (
    <ol className="timeline" aria-label="Checks applied to this finding">
      {steps.map((l) => {
        const state = l.passed === true ? "pass" : l.passed === false ? "fail" : "info";
        const icon =
          state === "pass" ? <CheckmarkCircle20Filled aria-label="passed" /> :
          state === "fail" ? <DismissCircle20Filled aria-label="failed" /> : <Info20Regular aria-hidden />;
        return (
          <li key={l.layer} className={`step ${state}`}>
            <span className="step-icon">{icon}</span>
            <div className="step-body">
              <div className="step-title">{LAYER_LABEL[l.layer] ?? l.layer}</div>
              {l.detail && <div className="step-detail">{layerDetail(l.layer, l.detail)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Verdict({ finding }: { finding: Finding }) {
  const checks = finding.layers.filter((l) => l.layer !== "model" && l.layer !== "register");
  const failed = checks.filter((l) => l.passed === false).length;
  return (
    <div className={`verdict${finding.changed_by_checks ? " overruled" : ""}`}>
      <div className="v-box">
        <span className="v-label">Model proposed</span>
        <StatusBadge status={finding.model_status} />
      </div>
      <div className="v-arrow">
        <ArrowRight20Regular />
        <span>{checks.length} checks{failed ? `, ${failed} failed` : ""}</span>
      </div>
      <div className="v-box result">
        <span className="v-label">Register says</span>
        <StatusBadge status={finding.status} />
        <span className="v-conf">confidence {finding.confidence.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function Evidence({ run, row, onChanged }: { run: Run; row: RunRow; onChanged: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

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
  if (!data) return <div className="panel empty"><Spinner label={`Loading evidence for ${row.doc_id}…`} /></div>;

  const { doc, finding, boxes, hint, text } = data;
  const m = doc.metadata;
  const warnings = warningLabels(row.flags);

  return (
    <div className="evidence">
      <header className="panel ev-head">
        <div className="ev-title">
          <span className="ev-id">{row.doc_id}</span>
          <div>
            <h3>{m?.counterparty_name ?? "Unknown party"}</h3>
            <div className="ev-meta">
              <span><DocumentText16Regular /> {m?.title ?? doc.source_files.join(", ")}</span>
              <span><CalendarLtr16Regular /> {m?.effective_date ?? "no date"}</span>
              <span><Scales24Regular className="i16" /> {m?.governing_law ? `${m.governing_law} law` : "law not found"}</span>
              {doc.family.length > 1 && <span>family {doc.family.join(" · ")}</span>}
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

      <div className="ev-grid">
        <div className="panel ev-source">
          <div className="section-title">Original document</div>
          {text ? (
            <TextExcerpt text={text.text} start={finding?.char_start ?? null} end={finding?.char_end ?? null} />
          ) : (
            <PageView doc={doc} page={page} onPage={setPage} boxes={boxes} hint={hint} />
          )}
        </div>

        <div className="ev-side">
          {finding && (
            <div className="panel">
              <div className="section-title">{finding.label}</div>
              <Verdict finding={finding} />
              {finding.quote ? (
                <blockquote className="quote">
                  “{finding.quote}”
                  <cite>{[finding.section, finding.page && `page ${finding.page}`].filter(Boolean).join(" · ")}</cite>
                </blockquote>
              ) : (
                <p className="note">No passage: the model read the whole contract and reported no such clause.</p>
              )}
              {finding.rationale && <p className="note">Model's reason: {finding.rationale}</p>}
              <div className="section-title small">How the register decided</div>
              <Checks finding={finding} />
              <p className="note">
                {STATUS_LABEL[finding.status]} is an observation about the text, not a legal assessment.
              </p>
            </div>
          )}

          {row.hits && (
            <div className="panel">
              <div className="section-title">Former company name</div>
              <ul className="hits">
                {row.hits.map((h, i) => (
                  <li key={i}>
                    <b>{h.name}</b> · page {h.page}
                    <div className="note">…{h.snippet}…</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {row.duplicate_of && (
            <div className="panel">
              <div className="section-title">Duplicate</div>
              <p className="note">Copy of {row.duplicate_of}. The original is checked; this copy is not counted twice.</p>
            </div>
          )}

          <ReviewBox key={row.doc_id} run={run} row={row} onChanged={onChanged} />
        </div>
      </div>
    </div>
  );
}
