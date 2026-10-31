// The contract file: one document with all its findings against the playbook, the original page
// with the selected evidence highlighted, its family and former company names.
import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer, Spinner } from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, type ClauseSpec, type DocText, type DocumentInfo, type Finding } from "../api";
import { StatusBadge } from "../components/Badges";
import { Checks, Quote, Verdict } from "../components/Finding";
import { PageView, TextExcerpt } from "../components/PageView";
import { DOC_TYPE_SINGULAR, STATUS_LABEL, warningLabels } from "../labels";
import { findingBoxes } from "../workbench/Evidence";
import { FindingReview } from "./FindingReview";

interface Props {
  open: { docId: string; clause: string | null } | null;
  clauses: Record<string, ClauseSpec>;
  onClose: () => void;
  onReviewed?: () => void;
}

interface Highlight {
  boxes: Record<number, number[][]>;
  hint: string | null;
}

export function ContractFile({ open, clauses, onClose, onReviewed }: Props) {
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [text, setText] = useState<DocText | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hl, setHl] = useState<Highlight>({ boxes: {}, hint: null });
  const [page, setPage] = useState(1);

  // load the document when another contract is opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDoc(null);
    Promise.all([api.document(open.docId), api.findings(open.docId)]).then(async ([d, unsorted]) => {
      if (cancelled) return;
      // playbook order, clauses required for this document type first
      const order = Object.keys(clauses);
      const f = [...unsorted].sort(
        (a, b) => Number(b.required) - Number(a.required) || order.indexOf(a.clause_type) - order.indexOf(b.clause_type),
      );
      setDoc(d);
      setFindings(f);
      setText(d.format === "txt" ? await api.text(open.docId) : null);
      setSelected(open.clause ?? f.find((x) => x.required && x.status !== "PRESENT")?.clause_type ?? f[0]?.clause_type ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, clauses]);

  // highlight the selected finding
  const finding = findings.find((f) => f.clause_type === selected) ?? null;
  useEffect(() => {
    if (!open || !finding) return;
    let cancelled = false;
    findingBoxes(open.docId, finding).then((r) => {
      if (cancelled) return;
      setHl({ boxes: r.boxes, hint: r.hint });
      setPage(r.page);
    });
    return () => {
      cancelled = true;
    };
  }, [open, finding]);

  const showName = async (name: string, onPage: number) => {
    if (!open) return;
    const r = await api.locate(open.docId, onPage, name);
    setHl({ boxes: { [onPage]: r.boxes }, hint: "the former company name" });
    setPage(onPage);
  };

  const m = doc?.metadata;
  return (
    <OverlayDrawer open={!!open} onOpenChange={(_, d) => !d.open && onClose()} position="end" size="full" className="contract-drawer">
      <DrawerHeader>
        <DrawerHeaderTitle action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} aria-label="Close" />}>
          <span className="ev-id">{open?.docId}</span> {m?.counterparty_name ?? ""}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {!doc ? (
          <Spinner label="Loading the contract file…" />
        ) : (
          <div className="contract-file">
            <div className="cf-meta">
              <span>{m?.title}</span>
              <span>{DOC_TYPE_SINGULAR[m?.doc_type ?? "unknown"] ?? m?.doc_type}</span>
              <span>{m?.effective_date ?? "no date"}</span>
              <span>{m?.governing_law ? `${m.governing_law} law` : "law not found"}</span>
              <span>{doc.source_files.join(", ")}</span>
              {doc.family.length > 1 && <span>family: {doc.family.join(" · ")}</span>}
              {m?.current_own_entity_name && <span>our entity today: {m.current_own_entity_name}</span>}
              {warningLabels(doc.flags).map((w) => (
                <span key={w} className="warn-chip">{w}</span>
              ))}
            </div>

            <div className="cf-grid">
              <div className="panel ev-source">
                <div className="section-title">Original document</div>
                {text ? (
                  <TextExcerpt text={text.text} start={finding?.char_start ?? null} end={finding?.char_end ?? null} />
                ) : (
                  <PageView doc={doc} page={page} onPage={setPage} boxes={hl.boxes} hint={hl.hint} />
                )}
              </div>

              <div className="cf-side">
                <div className="panel">
                  <div className="section-title">Compared with the playbook</div>
                  <ul className="cf-findings">
                    {findings.map((f) => (
                      <li key={f.clause_type}>
                        <button
                          type="button"
                          className={`cf-finding${f.clause_type === selected ? " selected" : ""}${f.required ? "" : " opt"}`}
                          onClick={() => setSelected(f.clause_type)}
                        >
                          <span className="cf-label">
                            {f.label}
                            <span className="cf-req">{f.required ? "required" : "not required here"}</span>
                          </span>
                          <StatusBadge status={f.status} short />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {finding && (
                  <div className="panel">
                    <div className="section-title">{finding.label}</div>
                    <Verdict finding={finding} />
                    <Quote finding={finding} />
                    {finding.rationale && <p className="note">Model's reason: {finding.rationale}</p>}
                    <div className="section-title small">How the register decided</div>
                    <Checks finding={finding} />
                    <div className="section-title small">The playbook says</div>
                    <p className="note">{clauses[finding.clause_type]?.definition}</p>
                    <p className="note">{STATUS_LABEL[finding.status]} is an observation about the text, not a legal assessment.</p>
                    {open && (
                      <FindingReview key={`${open.docId}-${finding.clause_type}`} docId={open.docId}
                                     clause={finding.clause_type} onChanged={onReviewed} />
                    )}
                  </div>
                )}

                {doc.legacy_names.length > 0 && (
                  <div className="panel">
                    <div className="section-title">Former company names</div>
                    <ul className="hits">
                      {doc.legacy_names.map((h, i) => (
                        <li key={i}>
                          <button type="button" className="link-btn" onClick={() => showName(h.name, h.page)}>
                            {h.name} · page {h.page}
                          </button>{" "}
                          {h.resolved_by ? <span className="name-resolved">resolved by {h.resolved_by}</span> : <span className="name-open">open</span>}
                          <div className="note">…{h.snippet}…</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DrawerBody>
    </OverlayDrawer>
  );
}
