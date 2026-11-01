// The contract file: one contract as the register read it - to look up, not to decide (decision 91).
// The original page with the selected passage highlighted, every finding against the playbook, the
// family and former company names. A finding shows Legal's decision as one line and leads to the
// Workbench, where decisions are made (D1, D6). Original, copies and family members are links: each
// opens its own file in the same drawer. A contract that is still being read shows its page and says so.
import {
  Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, MessageBar, MessageBarBody, OverlayDrawer,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { useEffect, useState, type MouseEvent } from "react";
import { api, ApiError, type ClauseSpec, type DocText, type DocumentInfo, type Finding } from "../api";
import { findingBoxes } from "../components/evidence";
import { FindingCard } from "../components/FindingCard";
import { EvidenceSkeleton } from "../components/Loading";
import { arrivedAt } from "../components/newLines";
import { PageView, TextExcerpt } from "../components/PageView";
import { documentAlerts, type Alert } from "../components/SafetyBar";
import { StatusWord } from "../components/Words";
import { useLang, useT, type Lang, type T } from "../i18n";
import { DOC_TYPE_SINGULAR, lawReason, nameReason, STAGE_WORD } from "../labels";
import { useRegisterLive } from "../live";
import { workbenchHref } from "../routing";
import "./register.css";

type Clauses = Record<string, Pick<ClauseSpec, "label" | "definition">>;
type Opened = { docId: string; clause: string | null };

interface Props {
  open: Opened | null;
  clauses: Clauses;
  onClose: () => void;
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
  suspect?: boolean;       // the passage lies in text addressed to AI systems: red, not evidence
}

/** One contract as loaded: its findings in playbook order (the clauses required for its type first), the
 *  text of a plain-text contract (it has no page images) and its alerts (injection page, worst OCR page). */
interface FileData {
  doc: DocumentInfo;
  findings: Finding[];
  text: DocText | null;
  alerts: Alert[];
}

async function loadFile(docId: string, order: string[]): Promise<FileData> {
  const [doc, unsorted] = await Promise.all([api.document(docId), api.findings(docId)]);
  const findings = [...unsorted].sort(
    (a, b) => Number(b.required) - Number(a.required) || order.indexOf(a.clause_type) - order.indexOf(b.clause_type),
  );
  const text = doc.format === "txt" ? await api.text(docId) : null;
  return { doc, findings, text, alerts: await documentAlerts(doc, [], text) };
}

/** The finding shown first: the clause the link asked for, else the first required one that is not found or unclear. */
function firstFinding(findings: Finding[], asked: string | null): string | null {
  if (asked && findings.some((f) => f.clause_type === asked)) return asked;
  return findings.find((f) => f.required && f.status !== "PRESENT")?.clause_type ?? findings[0]?.clause_type ?? null;
}

/** "cannot be ruled out – poor scan (OCR 61 %, threshold 70 %)", with the numbers of the server's reason (F19). */
function notRuledOut(reason: string | null, t: T): string {
  const m = reason?.match(/OCR confidence (\d+) %, threshold (\d+) %/);
  if (m) return t("cannot be ruled out – poor scan (OCR {conf} %, threshold {threshold} %)", { conf: m[1], threshold: m[2] });
  return reason ? nameReason(reason, t) : t("cannot rule out");
}

// "30 Oct 2026, 13:09": when the file arrived in the register (the first ingest, F14)
const LOCALE: Record<Lang, string> = { en: "en-GB", de: "de-DE" };
const arrivedOn = (ts: string, lang: Lang) =>
  new Date(ts).toLocaleString(LOCALE[lang], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Former company names: the exact hits with their pages, or "cannot be ruled out" on a poor scan (F19).
 *  Names are decided per question, so the link asks the pilot question Q2 for this one contract (D6). */
function FormerNames({ doc, onName }: { doc: DocumentInfo; onName: (name: string, page: number) => void }) {
  const t = useT();
  const names = doc.former_names;
  if (doc.legacy_names.length === 0 && !names.not_ruled_out) return null;
  return (
    <div className="panel">
      <div className="section-title">{t("Former company names")}</div>
      {doc.legacy_names.length > 0 && (
        <ul className="hits">
          {doc.legacy_names.map((h, i) => (
            <li key={i}>
              <button type="button" className="link-btn" onClick={() => onName(h.name, h.page)}>
                {h.name} · {t("page {n}", { n: h.page })}
              </button>{" "}
              {h.resolved_by ? <span className="name-resolved">{t("resolved by {id}", { id: h.resolved_by })}</span> : <span className="name-open">{t("open")}</span>}
              <div className="note">…{h.snippet}…</div>
            </li>
          ))}
        </ul>
      )}
      {names.not_ruled_out && (
        <>
          <p><b>{notRuledOut(names.reason, t)}</b></p>
          <p className="note">{t("The exact search found no former company name – but this scan is too poor to prove that none is there. A person reads the page.")}</p>
        </>
      )}
      {(names.open > 0 || names.not_ruled_out) && (
        <a className="fc-decide cf-ask" href={workbenchHref({ q: "Q2", search: doc.doc_id })}>
          {t("Ask about former names for this contract in the Workbench →")}
        </a>
      )}
    </div>
  );
}

/** The file of one contract. The drawer mounts it anew for every contract (key), so the page, the highlight
 *  and the selected finding always start fresh. */
function FileBody({ docId, clause, clauses, onClose, onOpen }: Opened & Omit<Props, "open">) {
  const t = useT();
  const lang = useLang();
  const [file, setFile] = useState<FileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hl, setHl] = useState<Highlight>({ boxes: {}, hint: null });
  const [page, setPage] = useState(1);

  // load the contract, and again when its stage in the live register changes: the findings of a contract
  // that was still being read then appear in the open file (and a removed one says so)
  const stage = useRegisterLive().matrix?.rows.find((r) => r.doc_id === docId)?.stage;
  const order = Object.keys(clauses).join(",");     // the order only: the register's clauses object changes on every reload
  useEffect(() => {
    let cancelled = false;
    loadFile(docId, order.split(","))
      .then((f) => {
        if (cancelled) return;
        setFile(f);
        setError(null);
        setSelected((s) => s ?? firstFinding(f.findings, clause));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError && e.status === 404 ? t("{id} removed from the register", { id: docId }) : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [docId, order, stage]);

  // highlight the selected finding on its page
  const finding = file?.findings.find((f) => f.clause_type === selected) ?? null;
  useEffect(() => {
    if (!finding) return;
    let cancelled = false;
    findingBoxes(docId, finding).then((r) => {
      if (cancelled) return;
      setHl({ boxes: r.boxes, hint: r.hint, suspect: r.suspect });
      setPage(r.page);
    });
    return () => {
      cancelled = true;
    };
  }, [docId, finding]);

  const showName = async (name: string, onPage: number) => {
    const r = await api.locate(docId, onPage, name);
    setHl({ boxes: { [onPage]: r.boxes }, hint: "the former company name" });
    setPage(onPage);
  };

  // a link to the Workbench leaves the file: it closes, or it would stay open over the next screen
  const leave = (e: MouseEvent) => {
    if ((e.target as Element).closest("a[href^='#/tool/']")) onClose();
  };

  const doc = file?.doc;
  const m = doc?.metadata;
  return (
    <>
      <DrawerHeader>
        <DrawerHeaderTitle action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} aria-label={t("Close")} />}>
          <span className="ev-id">{docId}</span> {m?.counterparty_name ?? ""}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {error ? (
          <MessageBar intent="warning"><MessageBarBody>{error}</MessageBarBody></MessageBar>
        ) : !file || !doc ? (
          <EvidenceSkeleton label={t("Loading the contract file…")} />
        ) : (
          <FileContent file={file} finding={finding} selected={selected} hl={hl} page={page} lang={lang} clauses={clauses}
                       onSelect={setSelected} onPage={setPage} onName={showName} onOpen={onOpen} onLeave={leave} />
        )}
      </DrawerBody>
    </>
  );
}

interface ContentProps {
  file: FileData;
  finding: Finding | null;
  selected: string | null;
  hl: Highlight;
  page: number;
  lang: Lang;
  clauses: Clauses;
  onSelect: (clause: string) => void;
  onPage: (page: number) => void;
  onName: (name: string, page: number) => void;
  onOpen?: (docId: string) => void;
  onLeave: (e: MouseEvent) => void;
}

/** Meta line, page, the playbook comparison, the selected finding (read-only) and the former names. */
function FileContent({ file, finding, selected, hl, page, lang, clauses, onSelect, onPage, onName, onOpen, onLeave }: ContentProps) {
  const t = useT();
  const { doc, findings, text, alerts } = file;
  const m = doc.metadata;
  // still being read, or reading failed: the page, no findings (an older API without stage shows the findings)
  const stage = doc.stage === "reading" || doc.stage === "failed" ? doc.stage : null;
  // a poor scan is known before the model has read the contract: OCR measured it
  const ocr = alerts.find((a) => a.kind === "ocr");
  const poorScan = ocr?.page != null && ocr.conf != null
    ? t("Poor scan: page {page} was read by text recognition with only {conf} % confidence. Compare with the page.",
        { page: ocr.page, conf: Math.round(ocr.conf) })
    : null;
  return (
    <div className="contract-file" onClick={onLeave}>
      <div className="cf-meta">
        {m?.title && <span>{m.title}</span>}
        {m && m.doc_type !== "unknown" ? (
          <>
            <span>{t(DOC_TYPE_SINGULAR[m.doc_type] ?? m.doc_type)}</span>
            <span>{m.effective_date ?? t("no date")}</span>
            {/* on hover: why a person checks the law (F36), else the passage that chooses it (decision 94) */}
            <span title={m.law_reason ? lawReason(m.law_reason, t) : m.governing_law_quote ?? undefined}>
              {m.governing_law ? t("{law} law", { law: m.governing_law }) : t("law not found")}
            </span>
          </>
        ) : (
          <span>{t("type not known yet")}</span>
        )}
        <span>{doc.source_files.join(", ")}</span>
        {doc.ingested_at && <span>{t("arrived {date}", { date: arrivedOn(doc.ingested_at, lang) })}</span>}
        <Related label={t("Copies:")} ids={doc.copies} onOpen={onOpen} />
        <Related label={t("Family:")} onOpen={onOpen}
                 ids={doc.family.filter((id) => id !== doc.doc_id && id !== doc.duplicate_of && !doc.copies.includes(id))} />
        {m?.current_own_entity_name && <span>{t("our entity today: {name}", { name: m.current_own_entity_name })}</span>}
      </div>

      {stage && (
        <MessageBar intent={stage === "failed" ? "warning" : "info"} className="cf-stage">
          <MessageBarBody>
            {stage === "failed"
              ? t("Reading failed – a person reads the page.")
              : doc.ingested_at
                ? t("Arrived {time} – the model is reading it …", { time: arrivedAt(doc.ingested_at, lang) })
                : t(STAGE_WORD.reading)}
            {poorScan && <> {poorScan}</>}
          </MessageBarBody>
        </MessageBar>
      )}

      {doc.duplicate_of && (
        <MessageBar intent="info" className="cf-dup">
          <MessageBarBody>
            {t("Copy of {id} – the original is checked; this copy is not counted twice.", { id: doc.duplicate_of })}{" "}
            {onOpen && (
              <button type="button" className="link-btn" onClick={() => onOpen(doc.duplicate_of!)}>
                {t("Open {id} →", { id: doc.duplicate_of })}
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
            <PageView doc={doc} page={page} onPage={onPage} boxes={hl.boxes} hint={hl.hint} suspect={hl.suspect} />
          )}
        </div>

        <div className="cf-side">
          <div className="panel">
            <div className="section-title">{t("Compared with the playbook")}</div>
            {stage ? (
              // the same words as the register's row: nothing to compare yet
              <p className={`cf-waiting ${stage}`}>{t(STAGE_WORD[stage])}</p>
            ) : (
              // required clauses first; the others under a quiet heading, in grey
              [true, false].map((required) => {
                const group = findings.filter((f) => f.required === required);
                if (group.length === 0) return null;
                return (
                  <div key={String(required)} className={`cf-group${required ? "" : " opt"}`}>
                    <div className="cf-group-title">
                      {required ? t("Required for this type") : t("Not required for this type")}
                    </div>
                    <ul className="cf-findings">
                      {group.map((f) => (
                        <li key={f.clause_type}>
                          <button
                            type="button"
                            className={`cf-finding${f.clause_type === selected ? " selected" : ""}${f.required ? "" : " opt"}`}
                            onClick={() => onSelect(f.clause_type)}
                            aria-current={f.clause_type === selected}
                          >
                            <span className="cf-label">{t(f.label)}</span>
                            <StatusWord status={f.status} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>

          {!stage && finding && (
            // read-only: what the text says, why a person looks, Legal's decision as a line, "Decide in the Workbench →"
            <div className="panel">
              <FindingCard doc={doc} finding={finding} legal alerts={alerts} suspect={hl.suspect} onPage={text ? undefined : onPage} />
            </div>
          )}
          {!stage && finding && clauses[finding.clause_type]?.definition && (
            <div className="panel cf-playbook">
              <div className="section-title">{t("The playbook says")}</div>
              <p className="note">{clauses[finding.clause_type].definition}</p>
            </div>
          )}

          {!stage && <FormerNames doc={doc} onName={onName} />}
        </div>
      </div>
    </div>
  );
}

export function ContractFile({ open, clauses, onClose, onOpen }: Props) {
  // the last contract stays in the drawer while it slides out
  const [shown, setShown] = useState(open);
  if (open && open !== shown) setShown(open);
  return (
    <OverlayDrawer open={!!open} onOpenChange={(_, d) => !d.open && onClose()} position="end" size="full" className="contract-drawer">
      {shown && (
        <FileBody key={`${shown.docId}/${shown.clause ?? ""}`} docId={shown.docId} clause={shown.clause}
                  clauses={clauses} onClose={onClose} onOpen={onOpen} />
      )}
    </OverlayDrawer>
  );
}
