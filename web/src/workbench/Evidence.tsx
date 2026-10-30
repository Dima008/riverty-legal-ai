// Evidence before verdict: the passage on the page, what the model said, what every check said,
// and what the register made of it. Then the human decision.
import { Badge, Caption1, MessageBar, MessageBarBody, Spinner, Text } from "@fluentui/react-components";
import { CheckmarkCircle16Filled, DismissCircle16Filled, Info16Regular } from "@fluentui/react-icons";
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
  text: DocText | null;
  firstPage: number;
}

async function load(run: Run, row: RunRow): Promise<Loaded> {
  const doc = await api.document(row.doc_id);
  const boxes: Record<number, number[][]> = {};
  let finding: Finding | null = null;
  let firstPage = 1;
  if (run.plan.check === "missing_clause") {
    const clause = run.plan.params.clause_type;
    finding = (await api.findings(row.doc_id)).find((f) => f.clause_type === clause) ?? null;
    if (finding?.quote) {
      const h = await api.highlight(row.doc_id, clause);
      h.pages.forEach((p) => (boxes[p.page] = p.boxes));
      firstPage = h.pages[0]?.page ?? finding.page ?? 1;
    }
  } else if (row.hits?.length) {
    for (const hit of row.hits) {
      const r = await api.locate(row.doc_id, hit.page, hit.name);
      boxes[hit.page] = [...(boxes[hit.page] ?? []), ...r.boxes];
    }
    firstPage = row.hits[0].page;
  }
  const text = doc.format === "txt" ? await api.text(row.doc_id) : null;
  return { doc, finding, boxes, text, firstPage };
}

function layerDetail(layer: string, detail: string | null | undefined): string | null {
  if (!detail) return null;
  if (layer === "document_signals") return detail.split(", ").map(flagLabel).join(", ");
  if (layer === "no_absence_signal") return `found in the text: …${detail.replace(/^'|'$/g, "")}…`;
  return detail;
}

function Layers({ finding }: { finding: Finding }) {
  return (
    <ul className="layers" aria-label="Checks applied to this finding">
      {finding.layers.map((l) => {
        const icon =
          l.passed === true ? <CheckmarkCircle16Filled color="var(--colorPaletteGreenForeground1)" aria-label="passed" /> :
          l.passed === false ? <DismissCircle16Filled color="var(--colorPaletteRedForeground1)" aria-label="failed" /> :
          <Info16Regular aria-hidden />;
        return (
          <li key={l.layer} className={l.layer === "register" ? "result" : undefined}>
            {icon}
            <div>
              {LAYER_LABEL[l.layer] ?? l.layer}
              {l.result && `: ${STATUS_LABEL[l.result] ?? l.result}`}
              {l.detail && <div className="detail">{layerDetail(l.layer, l.detail)}</div>}
            </div>
          </li>
        );
      })}
    </ul>
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
  if (!data) return <Spinner label={`Loading evidence for ${row.doc_id}…`} />;

  const { doc, finding, boxes, text } = data;
  const m = doc.metadata;
  return (
    <div className="evidence">
      <div className="card">
        <h3>
          {row.doc_id} · {m?.counterparty_name ?? "unknown party"}
        </h3>
        <div className="meta">
          <Text>{m?.title}</Text>
          <Caption1>
            {m?.effective_date ?? "no date"} · law {m?.governing_law ?? "not found"} · {doc.source_files.join(", ")}
          </Caption1>
          {doc.family.length > 1 && <Caption1>family: {doc.family.join(", ")}</Caption1>}
        </div>
        <div className="meta" style={{ marginTop: 8 }}>
          <StatusBadge status={row.status} />
          <TriageBadge triage={row.triage} />
          {warningLabels(row.flags).map((f) => (
            <Badge key={f} appearance="outline" color="warning">{f}</Badge>
          ))}
        </div>
      </div>

      {finding && (
        <div className="card">
          <h3>{finding.label}</h3>
          <Text>
            Register says <b>{STATUS_LABEL[finding.status]}</b>
            {finding.changed_by_checks && <> – the model said “{STATUS_LABEL[finding.model_status]}”, the checks overruled it</>}
            {" "}· confidence {finding.confidence.toFixed(2)}
          </Text>
          {finding.quote ? (
            <blockquote>
              “{finding.quote}”
              <Caption1 block>
                {finding.section ?? ""} {finding.page ? `· page ${finding.page}` : ""}
              </Caption1>
            </blockquote>
          ) : (
            <Caption1 block>No passage: the model read the whole contract and reported no such clause.</Caption1>
          )}
          {finding.rationale && <Caption1 block>Model's reason: {finding.rationale}</Caption1>}
          <div style={{ marginTop: 10 }}>
            <Layers finding={finding} />
          </div>
        </div>
      )}

      {row.hits && (
        <div className="card">
          <h3>Former company name</h3>
          <ul>
            {row.hits.map((h, i) => (
              <li key={i}>
                “{h.name}” on page {h.page}: <span className="muted">…{h.snippet}…</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.duplicate_of && <MessageBar intent="info"><MessageBarBody>Copy of {row.duplicate_of}. The original is checked.</MessageBarBody></MessageBar>}

      {/* evidence before verdict: the source comes before the decision */}
      <div className="card">
        <h3>Source</h3>
        {text ? (
          <TextExcerpt text={text.text} start={finding?.char_start ?? null} end={finding?.char_end ?? null} />
        ) : (
          <PageView doc={doc} page={page} onPage={setPage} boxes={boxes} />
        )}
      </div>

      <ReviewBox key={row.doc_id} run={run} row={row} onChanged={onChanged} />
    </div>
  );
}
