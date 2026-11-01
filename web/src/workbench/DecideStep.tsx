// Step 3 · Decide (spec 2.3): a workspace of fixed height - the queue, the original page with the
// passage highlighted, the finding card and, pinned below it, the decision. The window does not scroll:
// the queue, the page and a long finding scroll inside their columns, so the decision can never be
// pushed below the fold (D4). DecideOne is the same workspace for one finding opened from the register
// (D6): no queue and no archive copy.
import { MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type DocumentInfo, type FindingReviewState, type Run, type RunRow } from "../api";
import { DecisionPanel, type Target } from "../components/DecisionPanel";
import { load, type Loaded } from "../components/evidence";
import { FindingCard } from "../components/FindingCard";
import { PageView, TextExcerpt } from "../components/PageView";
import type { Standing } from "../components/Words";
import { useT } from "../i18n";
import { DOC_TYPE_SINGULAR, OPEN_STATES } from "../labels";
import { BatchButton, ChipBar, chipRows, Queue, Showing, type Chips } from "./ToLookAt";
import "./workbench.css";

/** The evidence of one contract, loaded again only when another contract (or answer) is opened - not
 *  after every decision, so the page stays where the lawyer scrolled it. */
function useEvidence(run: Pick<Run, "plan">, row: Pick<RunRow, "doc_id" | "hits" | "flags"> | null, key: string) {
  const [state, setState] = useState<{ key: string; data: Loaded | null; error: string | null }>({ key: "", data: null, error: null });
  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    load(run, row)
      .then((data) => !cancelled && setState({ key, data, error: null }))
      .catch((e) => !cancelled && setState({ key, data: null, error: String(e) }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state.key === key ? state : { key, data: null, error: null };
}

/** ID, party, and "Merchant agreement · 2024-03-18 · DE law · 3 pages" above the page; no badges. */
function ContractHead({ doc, isNew }: { doc: DocumentInfo; isNew: boolean }) {
  const t = useT();
  const m = doc.metadata;
  const facts = [
    t(DOC_TYPE_SINGULAR[m?.doc_type ?? "unknown"] ?? m?.doc_type ?? ""),
    m?.effective_date ?? t("no date"),
    m?.governing_law ? t("{law} law", { law: m.governing_law }) : t("law not found"),
    doc.page_count === 1 ? t("1 page") : t("{n} pages", { n: doc.page_count }),
  ];
  return (
    <header className="dk-head">
      <span className="dk-id">{doc.doc_id}</span>
      <div className="dk-title">
        <h3>{m?.counterparty_name ?? t("Unknown party")}</h3>
        <p className="dk-meta">
          {facts.join(" · ")}
          {isNew && <span className="new-tag">{t("New")}</span>}
          {doc.family.length > 1 && <span> · {t("family {ids}", { ids: doc.family.join(" · ") })}</span>}
        </p>
      </div>
    </header>
  );
}

/** The finding card scrolls inside its column when it is long, and "more ↓" says so - the decision below it never moves. */
function Scrolls({ children }: { children: ReactNode }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const check = useCallback(() => {
    const el = box.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    check();
    // the card grows when the fold opens or "Show all" is clicked
    const watch = new ResizeObserver(check);
    watch.observe(el);
    if (el.firstElementChild) watch.observe(el.firstElementChild);
    return () => watch.disconnect();
  }, [check]);
  return (
    <div className={`panel fc-pane${more ? " more" : ""}`}>
      <div className="fc-scroll" ref={box} onScroll={check}>{children}</div>
      {more && (
        <button type="button" className="fc-more" onClick={() => box.current?.scrollBy({ top: box.current.clientHeight * 0.7 })}>
          {t("more ↓")}
        </button>
      )}
    </div>
  );
}

interface WorkspaceProps {
  data: Loaded;
  row: RunRow | null;               // the run row (null: one finding from the register)
  standing: Standing;
  target: Target;
  isNew: boolean;
  focusKey: number;
  onChanged: () => void;
  onOpenDoc: (docId: string) => void;
}

/** The page column and the finding column: the same for a run row and for one finding. */
function Workspace({ data, row, standing, target, isNew, focusKey, onChanged, onOpenDoc }: WorkspaceProps) {
  const { doc, finding, boxes, span, hint, suspect, text, alerts } = data;
  const [page, setPage] = useState(data.firstPage);
  // a former name the lawyer clicked: only that name is highlighted
  const [name, setName] = useState<Record<number, number[][]> | null>(null);
  const showName = async (n: string, onPage: number) => {
    const r = await api.locate(doc.doc_id, onPage, n);
    setName({ [onPage]: r.boxes });
    setPage(onPage);
  };
  return (
    <>
      <section className="panel dk-page" aria-label={doc.doc_id}>
        <ContractHead doc={doc} isNew={isNew} />
        {text ? (
          <TextExcerpt text={text.text} start={span.start} end={span.end} />
        ) : (
          <PageView doc={doc} page={page} onPage={setPage} boxes={name ?? boxes} hint={name ? "the former company name" : hint}
                    suspect={!name && suspect} fill />
        )}
      </section>
      <div className="dk-side">
        <Scrolls>
          <FindingCard doc={doc} finding={finding} row={row} standing={standing} alerts={alerts} suspect={suspect}
                       onPage={text ? undefined : setPage} onName={showName} onOpenDoc={onOpenDoc} />
        </Scrolls>
        <div className="panel dp-pane">
          <DecisionPanel target={target} onChanged={onChanged} focusKey={focusKey} />
        </div>
      </div>
    </>
  );
}

/** While the evidence loads: the same columns, so nothing jumps. */
function Waiting({ error }: { error: string | null }) {
  const t = useT();
  if (error) return <MessageBar intent="error" className="dk-wide"><MessageBarBody>{error}</MessageBarBody></MessageBar>;
  return (
    <>
      <section className="panel dk-page dk-wait"><Spinner size="small" label={t("Loading…")} /></section>
      <div className="dk-side"><div className="panel fc-pane" /><div className="panel dp-pane" /></div>
    </>
  );
}

interface Props {
  run: Run;
  docId: string;
  chips: Chips;
  fresh: Set<string>;
  busy: boolean;
  onChips: (c: Chips) => void;
  onOpen: (docId: string) => void;       // another contract of the answer
  onChanged: () => void;                 // a decision was stored: reload the answer
  onBatch: (rows: RunRow[]) => void;
  onOpenDoc: (docId: string) => void;    // the read-only contract file (the original of a copy)
}

export function DecideStep({ run, docId, chips, fresh, busy, onChips, onOpen, onChanged, onBatch, onOpenDoc }: Props) {
  const t = useT();
  const row = run.rows.find((r) => r.doc_id === docId) ?? null;
  // the reason field gets the focus when the lawyer picks a row by mouse - never on page load, and not after
  // ↑/↓, which keep the focus in the queue: a counter for the row it was picked for
  const [focus, setFocus] = useState({ doc: "", n: 0 });
  const { data, error } = useEvidence(run, row, `${run.run_id}/${docId}`);
  const shown = chipRows(run.rows, chips, fresh);
  // the open contract stays in the queue, even when a chip would hide it
  const queue = run.rows.filter((r) => r.doc_id === docId || shown.includes(r));
  const open = run.rows.filter((r) => OPEN_STATES.includes(r.review.state)).length;
  return (
    <div className="decide">
      <nav className="panel dk-queue" aria-label={t("To look at")}>
        <div className="dk-queue-head">
          <b>{t("{n} to decide · {open} open", { n: run.rows.length, open })}</b>
          <ChipBar rows={run.rows} chips={chips} fresh={fresh} onChips={onChips} />
          <Showing shown={shown.length} rows={run.rows} chips={chips} onChips={onChips} />
          <BatchButton rows={run.rows} busy={busy} onBatch={onBatch} />
        </div>
        <Queue rows={queue} selected={docId} fresh={fresh}
               onOpen={(id, byKey) => {
                 onOpen(id);
                 if (!byKey) setFocus((f) => ({ doc: id, n: f.n + 1 }));
               }} />
      </nav>
      {!row ? (
        <div className="panel empty dk-wide">{t("Select a contract to see the evidence.")}</div>
      ) : data ? (
        <Workspace key={row.doc_id} data={data} row={row} standing={row} target={{ kind: "run", run, row }}
                   isNew={fresh.has(row.doc_id)} focusKey={focus.doc === row.doc_id ? focus.n : 0} onChanged={onChanged}
                   onOpenDoc={onOpenDoc} />
      ) : (
        <Waiting error={error} />
      )}
    </div>
  );
}

/** Decide one finding, opened from the register's contract file (D6) - also a Found clause can be
 *  challenged there. It uses the register's review endpoints; the decision counts for every answer. */
export function DecideOne({ docId, clause, fresh, onOpenDoc }:
  { docId: string; clause: string; fresh: Set<string>; onOpenDoc: (docId: string) => void }) {
  const run = useMemo(() => ({ plan: { check: "missing_clause", params: { clause_type: clause } } }), [clause]);
  const finding = useMemo(() => ({ doc_id: docId, flags: [] }), [docId]);
  const { data, error } = useEvidence(run, finding, `${docId}/${clause}`);
  const [review, setReview] = useState<FindingReviewState | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const reload = useCallback(() => {
    api.findingReview(docId, clause).then(setReview).catch((e) => setFailed(String(e)));
  }, [docId, clause]);
  useEffect(reload, [reload]);
  return (
    <div className="decide one">
      {data && review ? (
        <Workspace key={`${docId}/${clause}`} data={data} row={null} standing={{ review, triage: review.triage, sample: false }}
                   target={{ kind: "finding", docId, clause, review }} isNew={fresh.has(docId)} focusKey={0}
                   onChanged={reload} onOpenDoc={onOpenDoc} />
      ) : (
        <Waiting error={error ?? failed} />
      )}
    </div>
  );
}
