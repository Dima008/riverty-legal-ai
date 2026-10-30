// Evidence before verdict: the original page with the passage highlighted, what the model proposed,
// what every check said, what the register made of it - and only then the human decision.
import { MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { CalendarLtr16Regular, DocumentText16Regular, Scales24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, type DocText, type DocumentInfo, type Finding, type Run, type RunRow } from "../api";
import { StatusBadge, TriageBadge } from "../components/Badges";
import { Checks, Quote, Verdict } from "../components/Finding";
import { PageView, TextExcerpt } from "../components/PageView";
import { STATUS_LABEL, warningLabels } from "../labels";
import { ReviewBox } from "./ReviewBox";

interface Loaded {
  doc: DocumentInfo;
  finding: Finding | null;
  boxes: Record<number, number[][]>;
  hint: string | null;
  text: DocText | null;
  firstPage: number;
}

/** Highlight boxes for one finding: its quote, or the passage that hints at a missing clause. */
export async function findingBoxes(docId: string, finding: Finding | null) {
  const boxes: Record<number, number[][]> = {};
  if (!finding || !(finding.quote || finding.flags.some((f) => f.startsWith("signal_despite_absent")))) {
    return { boxes, page: finding?.page ?? 1, hint: null as string | null };
  }
  const h = await api.highlight(docId, finding.clause_type);
  h.pages.forEach((p) => (boxes[p.page] = p.boxes));
  const hint = h.kind === "quote" ? "the model's quote" : h.kind === "signal" ? "the passage that hints at the clause" : null;
  return { boxes, page: h.pages[0]?.page ?? finding.page ?? 1, hint };
}

async function load(run: Run, row: RunRow): Promise<Loaded> {
  const doc = await api.document(row.doc_id);
  let boxes: Record<number, number[][]> = {};
  let finding: Finding | null = null;
  let firstPage = 1;
  let hint: string | null = null;
  if (run.plan.check === "missing_clause") {
    finding = (await api.findings(row.doc_id)).find((f) => f.clause_type === run.plan.params.clause_type) ?? null;
    ({ boxes, page: firstPage, hint } = await findingBoxes(row.doc_id, finding));
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
              <Quote finding={finding} />
              {finding.rationale && <p className="note">Model's reason: {finding.rationale}</p>}
              <div className="section-title small">How the register decided</div>
              <Checks finding={finding} />
              <p className="note">{STATUS_LABEL[finding.status]} is an observation about the text, not a legal assessment.</p>
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
