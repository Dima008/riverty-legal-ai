// The contract file: one document with all its findings against the playbook, the original page
// with the selected evidence highlighted, its family and former company names. Original, copies
// and family members are links: each opens its own file in the same drawer.
import {
  Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, MessageBar, MessageBarBody, OverlayDrawer, Spinner,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, type ClauseSpec, type DocText, type DocumentInfo, type Finding } from "../api";
import { StatusBadge } from "../components/Badges";
import { Checks, Quote, Verdict } from "../components/Finding";
import { PageView, TextExcerpt } from "../components/PageView";
import { useT } from "../i18n";
import { DOC_TYPE_SINGULAR, STATUS_LABEL, warningLabels } from "../labels";
import { findingBoxes } from "../workbench/Evidence";
import { FindingReview } from "./FindingReview";

interface Props {
  open: { docId: string; clause: string | null } | null;
  clauses: Record<string, Pick<ClauseSpec, "label" | "definition">>;
  onClose: () => void;
  onReviewed?: () => void;
  onOpen?: (docId: string) => void;     // open another contract of the register in this drawer
}

/** Other contracts this file points to; each one opens its own file. */
function Related({ label, ids, onOpen }: { label: string; ids: string[]; onOpen?: (docId: string) => void }) {
  if (ids.length === 0) return null;
  return (
    <span>
      {label}{" "}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && " · "}
          {onOpen ? <button type="button" className="link-btn" onClick={() => onOpen(id)}>{id}</button> : id}
        </span>
      ))}
    </span>
  );
}

interface Highlight {
  boxes: Record<number, number[][]>;
  hint: string | null;
}

export function ContractFile({ open, clauses, onClose, onReviewed, onOpen }: Props) {
  const t = useT();
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
        <DrawerHeaderTitle action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} aria-label={t("Close")} />}>
          <span className="ev-id">{open?.docId}</span> {m?.counterparty_name ?? ""}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {!doc ? (
          <Spinner label={t("Loading the contract file…")} />
        ) : (
          <div className="contract-file">
            <div className="cf-meta">
              <span>{m?.title}</span>
              <span>{t(DOC_TYPE_SINGULAR[m?.doc_type ?? "unknown"] ?? m?.doc_type ?? "")}</span>
              <span>{m?.effective_date ?? t("no date")}</span>
              <span>{m?.governing_law ? t("{law} law", { law: m.governing_law }) : t("law not found")}</span>
              <span>{doc.source_files.join(", ")}</span>
              <Related label={t("Copies:")} ids={doc.copies} onOpen={onOpen} />
              <Related label={t("Family:")} onOpen={onOpen}
                       ids={doc.family.filter((id) => id !== doc.doc_id && id !== doc.duplicate_of && !doc.copies.includes(id))} />
              {m?.current_own_entity_name && <span>{t("our entity today: {name}", { name: m.current_own_entity_name })}</span>}
              {warningLabels(doc.flags, t).map((w) => (
                <span key={w} className="warn-chip">{w}</span>
              ))}
            </div>

            {doc.duplicate_of && (
              <MessageBar intent="info" className="cf-dup">
                <MessageBarBody>
                  {t("Copy of {id}. The original is checked; this copy is not counted twice.", { id: doc.duplicate_of })}{" "}
                  {onOpen && (
                    <button type="button" className="link-btn" onClick={() => onOpen(doc.duplicate_of!)}>
                      {t("Open {id}", { id: doc.duplicate_of })}
                    </button>
                  )}
                </MessageBarBody>
              </MessageBar>
            )}

            <div className="cf-grid">
              <div className="panel ev-source">
                <div className="section-title">{t("Original document")}</div>
                {text ? (
                  <TextExcerpt text={text.text} start={finding?.char_start ?? null} end={finding?.char_end ?? null} />
                ) : (
                  <PageView doc={doc} page={page} onPage={setPage} boxes={hl.boxes} hint={hl.hint} />
                )}
              </div>

              <div className="cf-side">
                <div className="panel">
                  <div className="section-title">{t("Compared with the playbook")}</div>
                  <ul className="cf-findings">
                    {findings.map((f) => (
                      <li key={f.clause_type}>
                        <button
                          type="button"
                          className={`cf-finding${f.clause_type === selected ? " selected" : ""}${f.required ? "" : " opt"}`}
                          onClick={() => setSelected(f.clause_type)}
                        >
                          <span className="cf-label">
                            {t(f.label)}
                            <span className="cf-req">{f.required ? t("required") : t("not required here")}</span>
                          </span>
                          <StatusBadge status={f.status} short />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {finding && (
                  <div className="panel">
                    <div className="section-title">{t(finding.label)}</div>
                    <Verdict finding={finding} />
                    <Quote finding={finding} />
                    {finding.rationale && <p className="note">{t("Model's reason: {reason}", { reason: finding.rationale })}</p>}
                    <div className="section-title small">{t("How the register decided")}</div>
                    <Checks finding={finding} />
                    <div className="section-title small">{t("The playbook says")}</div>
                    <p className="note">{clauses[finding.clause_type]?.definition}</p>
                    <p className="note">{t("{status} is an observation about the text, not a legal assessment.", { status: t(STATUS_LABEL[finding.status]) })}</p>
                    {open && (
                      <FindingReview key={`${open.docId}-${finding.clause_type}`} docId={open.docId}
                                     clause={finding.clause_type} onChanged={onReviewed} />
                    )}
                  </div>
                )}

                {doc.legacy_names.length > 0 && (
                  <div className="panel">
                    <div className="section-title">{t("Former company names")}</div>
                    <ul className="hits">
                      {doc.legacy_names.map((h, i) => (
                        <li key={i}>
                          <button type="button" className="link-btn" onClick={() => showName(h.name, h.page)}>
                            {h.name} · {t("page {n}", { n: h.page })}
                          </button>{" "}
                          {h.resolved_by ? <span className="name-resolved">{t("resolved by {id}", { id: h.resolved_by })}</span> : <span className="name-open">{t("open")}</span>}
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
