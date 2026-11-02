// Step 4 · Evidence & decision (decision 95, spec 1.3): a workspace of fixed height - the rail with every
// contract of the answer grouped by colour, the contract page in the middle with the passage marked and the
// verdict on the dark desk above it, the finding card on the right and, pinned below it, what can be done:
// the decision for a reported row (four eyes, archive copy - decision 91), "nothing to decide" with
// "Challenge this finding" for a green clause, or why it was not evaluated. The window does not scroll: the
// rail, the page and a long finding scroll inside their columns (D4). DecideOne is the same workspace for
// one finding opened from the register (D6): no rail and no archive copy.
import { MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type ClauseSpec, type DocumentInfo, type FindingReviewState, type Run, type RunRow } from "../api";
import { LightIcon, type Lit } from "../components/Badges";
import { DecisionPanel, type Target } from "../components/DecisionPanel";
import { load, type Loaded } from "../components/evidence";
import { FindingCard } from "../components/FindingCard";
import { PageView, TextExcerpt } from "../components/PageView";
import type { Standing } from "../components/Words";
import { useLang, useT, type T } from "../i18n";
import { DOC_TYPE_SINGULAR, exclusionReason, lawReason } from "../labels";
import { answerItems, isOpen, isReported, itemNext, lanes, passes, toDecide, type Filter, type Item } from "./answerRows";
import { BatchButton, ChipBar, Rail } from "./ToLookAt";
import "./workbench.css";

/** The evidence of one contract, loaded again only when another contract (or answer) is opened - not after
 *  every decision, so the page stays where the lawyer scrolled it. */
function useEvidence(run: Pick<Run, "plan">, row: Parameters<typeof load>[1] | null, key: string, subjectless = false) {
  const [state, setState] = useState<{ key: string; data: Loaded | null; error: string | null }>({ key: "", data: null, error: null });
  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    load(run, row, subjectless)
      .then((data) => !cancelled && setState({ key, data, error: null }))
      .catch((e) => !cancelled && setState({ key, data: null, error: String(e) }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state.key === key ? state : { key, data: null, error: null };
}

/** ID, party, and "Merchant agreement · 2024-03-18 · DE law · 3 pages · text layer" above the page. */
function ContractHead({ doc, isNew }: { doc: DocumentInfo; isNew: boolean }) {
  const t = useT();
  const m = doc.metadata;
  const facts = [
    t(DOC_TYPE_SINGULAR[m?.doc_type ?? "unknown"] ?? m?.doc_type ?? ""),
    m?.effective_date ?? t("no date"),
    m?.governing_law ? t("{law} law", { law: m.governing_law }) : t("law not found"),
    doc.page_count === 1 ? t("1 page") : t("{n} pages", { n: doc.page_count }),
    doc.ocr_mean_conf != null ? t("scan, OCR {conf} %", { conf: Math.floor(doc.ocr_mean_conf) }) : doc.format === "txt" ? t("plain text") : t("text layer"),
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

/** The finding card scrolls inside its column when it is long, and "more ↓" says so - the panel below it never moves. */
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
    const watch = new ResizeObserver(check);       // the card grows when the fold opens or "Show all" is clicked
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

// ---------------------------------------------------------------------------- the verdict above the page
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "on its one page", "on either of the 2 pages", "on any of the 5 pages". */
const onPages = (n: number, t: T) => (n === 1 ? t("on its one page") : n === 2 ? t("on either of the 2 pages") : t("on any of the {n} pages", { n }));

/** The verdict strip on the dark desk (spec 3.3): what the page shows - or, for missing information, what
 *  is not on it. Absence has no place on the paper, so it is said above it. */
export function verdict(item: Item, data: Loaded, t: T, clause: string, run: Run): { lit: Lit; lead: string; rest: string } {
  const asked = run.plan.params.law ?? "";
  const names = run.info.searched_names?.length ?? 0;
  const r = item.row;
  const n = data.doc.page_count;
  if (item.kind === "excluded" || !r) {
    return { lit: "excluded", lead: t("Not evaluated"), rest: `– ${exclusionReason(item.reason ?? "", t)}` };
  }
  const page = data.firstPage;
  switch (r.status) {
    case "ABSENT":
      return r.light_why === "poor_scan"
        ? { lit: "orange", lead: t("Not found – but this scan was read by OCR at {conf} %", { conf: Math.floor(r.ocr_mean_conf ?? 0) }),
            rest: t("(threshold 70 %). Compare with the page.") }
        : { lit: "red", lead: t("No {clause} {pages}", { clause, pages: onPages(n, t) }), rest: t("– the whole contract was read.") };
    case "UNCLEAR": {
      const number = data.finding?.quote?.match(/^\s*(\d+(?:\.\d+)+)/)?.[1];
      return data.finding?.quote
        ? { lit: "orange", lead: number ? t("The model proposed clause {n} – the checks rejected it.", { n: number }) : t("The model proposed a passage – the checks rejected it."), rest: t("Not evidence.") }
        : { lit: "orange", lead: t("The register cannot settle it."), rest: t("Read the page.") };
    }
    case "PRESENT":
      return item.lane === "green"
        ? { lit: "green", lead: t("Found on page {p}", { p: page }), rest: t("– the marked passage is the {clause}.", { clause }) }
        : { lit: "orange", lead: t("Found on page {p}", { p: page }), rest: t("– a person checks it before it counts.") };
    case "LEGACY_NAME":
      return { lit: "red", lead: t("{name} on page {p}", { name: r.hits?.[0]?.name ?? "?", p: [...new Set(r.hits?.map((h) => h.page))].join(", ") }),
               rest: t("– a former company name, marked.") };
    case "NAME_RESOLVED":
      return { lit: "green", lead: t("Former name on page {p} – replaced by {id}", { p: r.hits?.[0]?.page ?? "?", id: r.hits?.[0]?.resolved_by ?? "?" }), rest: "" };
    case "NO_FORMER_NAME":
      return { lit: "green", lead: t("None of the {k} former names {pages}", { k: names, pages: onPages(n, t) }), rest: t("– exact search over the whole text.") };
    case "NAME_NOT_RULED_OUT":
      return { lit: "orange", lead: t("The search found no former name – but this scan is too poor to prove it."), rest: "" };
    case "LAW_UNKNOWN":
      return { lit: "orange", lead: t("No choice of law {pages}", { pages: onPages(n, t) }), rest: "" };
    case "SAME_LAW_NOT_CHECKED":
      return { lit: "orange", lead: t("{law} law – read before the register quoted the law.", { law: r.governing_law ?? "?" }), rest: t("Read the choice of law yourself.") };
    case "SAME_LAW":
      return { lit: "green", lead: t("{law} law", { law: r.governing_law ?? "?" }), rest: t("– the marked passage chooses it.") };
    case "OTHER_LAW":
      return { lit: "red", lead: t("{law} law, not {asked}", { law: r.governing_law ?? "?", asked }),
               rest: r.law_flags == null ? t("– read before the register quoted the law.") : t("– the marked passage chooses it.") };
    case "LAW_NOT_CONFIRMED":
      return { lit: "orange", lead: t("{law} law – not confirmed", { law: r.governing_law ?? "?" }), rest: r.reason ? `– ${lawReason(r.reason, t)}` : "" };
    case "DUPLICATE":
      return { lit: "red", lead: t("Same text as {id}", { id: r.duplicate_of ?? "?" }), rest: t("– counted once.") };
    case "ORIGINAL":
      return { lit: "green", lead: t("{ids} is a copy of this contract", { ids: (r.copies ?? []).join(", ") }), rest: t("– counted once.") };
    case "UNIQUE":
      return item.lane === "green" ? { lit: "green", lead: t("No other document has this text."), rest: "" }
        : { lit: "orange", lead: t("No copy found – but this scan is too poor to prove it."), rest: t("Compare with the page.") };
    default:
      return { lit: item.lane === "older" ? "excluded" : item.lane, lead: r.status, rest: "" };
  }
}

/** When nothing is marked on the page, what the page bar says instead. */
function emptyHint(item: Item): string | null {
  const s = item.row?.status;
  if (item.kind === "excluded") return "not evaluated – nothing to mark";
  if (s === "ABSENT") return "nothing to mark – the clause is missing";
  if (s === "NO_FORMER_NAME" || s === "NAME_NOT_RULED_OUT") return "nothing to mark – no former name found";
  if (s === "DUPLICATE" || s === "ORIGINAL" || s === "UNIQUE") return "nothing to mark – the whole text is compared";
  if (s && ["OTHER_LAW", "SAME_LAW", "SAME_LAW_NOT_CHECKED", "LAW_UNKNOWN", "LAW_NOT_CONFIRMED"].includes(s)) return "nothing to mark – no passage stored for the law";
  return null;
}

// "Pages read 1 ✓ 2 ✓": an absence is a statement about every page
const READ_ALL = ["ABSENT", "NO_FORMER_NAME", "NAME_NOT_RULED_OUT", "LAW_UNKNOWN"];

// ---------------------------------------------------------------------------- the panel below the card
/** Legal's decision on a finding the answer does not report (D6, decision 73), decided in place. */
function FindingDecision({ docId, clause, challenge, onChanged }: { docId: string; clause: string; challenge: boolean; onChanged: () => void }) {
  const [review, setReview] = useState<FindingReviewState | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const reload = useCallback(() => {
    api.findingReview(docId, clause).then(setReview).catch((e) => setFailed(String(e)));
  }, [docId, clause]);
  useEffect(reload, [reload]);
  if (failed) return <p className="dp-error">{failed}</p>;
  if (!review) return <Spinner size="tiny" />;
  return <DecisionPanel target={{ kind: "finding", docId, clause, review }} inAnswer challenge={challenge}
                        onChanged={() => { reload(); onChanged(); }} />;
}

/** A green contract: nothing to decide. A clause can be challenged in place; names, law and copies cannot yet (G1). */
function NoDecision({ item, check, onChallenge }: { item: Item; check: string; onChallenge: (() => void) | null }) {
  const t = useT();
  const legal = item.row && !isReported(item.row) ? item.row.legal : null;
  return (
    <section className="decision no-decision" aria-label={t("Your decision")}>
      <p className="nd-head"><LightIcon light="green" /> <b>{t("Positive – nothing to decide.")}</b></p>
      <p className="dp-note">
        {legal && legal.state !== "FOUND" ? itemNext(item, t).text : t("Legal: not decided yet")}. {t("Green rows have no archive copy.")}
      </p>
      {onChallenge ? (
        <p className="nd-challenge">
          {t("Doubt it?")} <button type="button" className="link-btn" onClick={onChallenge}>{t("Challenge this finding ›")}</button>
        </p>
      ) : (
        <p className="dp-note">
          {check === "legacy_names"
            ? t("Is a name variant missing? The names are Legal's playbook – add it there and every contract is searched again.")
            : t("Challenging this result is not built yet – read the page; nothing is recorded.")}
        </p>
      )}
    </section>
  );
}

function Bottom({ run, item, data, onChanged, onOpen, focusKey }:
  { run: Run; item: Item; data: Loaded; onChanged: () => void; onOpen: (docId: string) => void; focusKey: number }) {
  const t = useT();
  const [challenge, setChallenge] = useState(false);
  const r = item.row;
  const clause = run.plan.check === "missing_clause" ? run.plan.params.clause_type : null;
  if (item.kind === "reported" && r && isReported(r)) {
    return <DecisionPanel target={{ kind: "run", run, row: r }} onChanged={onChanged} focusKey={focusKey} />;
  }
  if (item.kind === "excluded") {
    const other = item.reason?.match(/(?:duplicate|amendment) of (\S+)/)?.[1];
    return (
      <section className="decision no-decision" aria-label={t("Not evaluated")}>
        <p className="nd-head"><LightIcon light="excluded" /> <b>{t("Not evaluated – nothing to decide.")}</b></p>
        <p className="dp-note">{exclusionReason(item.reason ?? "", t)}</p>
        {other && run.coverage.checked_ids?.includes(other) && (
          <button type="button" className="link-btn" onClick={() => onOpen(other)}>{t("Open {id} →", { id: other })}</button>
        )}
      </section>
    );
  }
  if (clause && data.finding && r && (item.lane === "orange" || challenge)) {
    return <FindingDecision docId={item.id} clause={clause} challenge={item.lane === "green"} onChanged={onChanged} />;
  }
  if (item.lane === "green") return <NoDecision item={item} check={run.plan.check} onChallenge={clause && data.finding ? () => setChallenge(true) : null} />;
  // orange without a decision to record: a law read before the register quoted it (F26, decision 97)
  const law = run.plan.check === "governing_law_not";
  return (
    <section className="decision no-decision" aria-label={t("Your decision")}>
      <p className="nd-head"><LightIcon light="orange" /> <b>{law ? t("Read the choice of law on the page.") : t("Read the page.")}</b></p>
      <p className="dp-note">
        {law ? t("Nothing can be recorded yet – the contract gets its quote when the register is read again (F26).")
          : t("Nothing can be recorded here.")}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------- the workspace
interface WorkspaceProps {
  data: Loaded;
  run: Run | null;                  // null: one finding from the register
  item: Item | null;
  clause: ClauseSpec | null;
  documents: number;
  standing: Standing | null;
  target: Target | null;            // one finding from the register: its decision
  isNew: boolean;
  focusKey: number;
  onChanged: () => void;
  onOpenDoc: (docId: string) => void;
  onOpen: (docId: string) => void;
}

/** The page column and the finding column: the same for a contract of an answer and for one finding. */
function Workspace({ data, run, item, clause, documents, standing, target, isNew, focusKey, onChanged, onOpenDoc, onOpen }: WorkspaceProps) {
  const t = useT();
  const lang = useLang();
  const { doc, finding, boxes, span, hint, look, text, alerts } = data;
  const [page, setPage] = useState(data.firstPage);
  // a former name the lawyer clicked: only that name is marked
  const [name, setName] = useState<Record<number, number[][]> | null>(null);
  const showName = async (n: string, onPage: number) => {
    const r = await api.locate(doc.doc_id, onPage, n).catch(() => ({ boxes: [] as number[][] }));
    setName({ [onPage]: r.boxes });
    setPage(onPage);
  };
  const clauseWord = clause ? (lang === "en" ? lowerFirst(t(clause.label)) : t(clause.label)) : t("clause");
  const v = item && run ? verdict(item, data, t, clauseWord, run) : null;
  const strip = v && (
    <div className={`verdict v-${v.lit}`} role="status">
      <LightIcon light={v.lit} /> <b>{v.lead}</b> {v.rest}
    </div>
  );
  const status = item?.row?.status ?? finding?.status ?? "";
  const next = item && !standing ? itemNext(item, t).text : null;
  return (
    <>
      <section className="panel dk-page" aria-label={doc.doc_id}>
        <ContractHead doc={doc} isNew={isNew} />
        {text ? (
          <>
            {strip}
            <TextExcerpt text={text.text} start={span.start} end={span.end} look={look} />
          </>
        ) : (
          <PageView doc={doc} page={page} onPage={setPage} boxes={name ?? boxes} hint={name ? "the former company name" : hint}
                    look={name ? "ev" : look} fill pagesRead={READ_ALL.includes(status)} markFailed={data.markFailed}
                    empty={item ? emptyHint(item) : null} strip={strip} />
        )}
      </section>
      <div className="dk-side">
        <Scrolls>
          <FindingCard doc={doc} finding={finding} row={item?.row ?? null} item={item} check={run?.plan.check ?? "missing_clause"}
                       clause={clause} searched={run?.info.searched_names ?? []} documents={documents}
                       standing={standing} next={next} alerts={alerts} suspect={look === "suspect"} look={look}
                       onPage={text ? undefined : setPage} onName={showName} onOpenDoc={onOpenDoc} />
        </Scrolls>
        <div className="panel dp-pane">
          {target ? <DecisionPanel target={target} onChanged={onChanged} focusKey={focusKey} />
            : run && item ? <Bottom run={run} item={item} data={data} onChanged={onChanged} onOpen={onOpen} focusKey={focusKey} /> : null}
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
  clauses: Record<string, ClauseSpec>;
  documents: number;                     // how many documents the register holds (copies: "compared with all n")
  filter: Filter;
  fresh: Set<string>;
  busy: boolean;
  onFilter: (f: Filter) => void;
  onOpen: (docId: string) => void;       // another contract of the answer
  onChanged: () => void;                 // a decision was stored: reload the answer
  onBatch: (rows: RunRow[]) => void;
  onOpenDoc: (docId: string) => void;    // a contract outside the answer: its read-only file
}

export function DecideStep({ run, docId, clauses, documents, filter, fresh, busy, onFilter, onOpen, onChanged, onBatch, onOpenDoc }: Props) {
  const t = useT();
  const items = answerItems(run);
  const item = items.find((i) => i.id === docId) ?? null;
  // the reason field gets the focus when the lawyer picks a row by mouse - never on page load, and not after
  // ↑/↓, which keep the focus in the rail: a counter for the row it was picked for
  const [focus, setFocus] = useState({ doc: "", n: 0 });
  const evidenceRow = item?.row ?? (item ? { doc_id: item.id, flags: [] } : null);
  const { data, error } = useEvidence(run, evidenceRow, `${run.run_id}/${docId}`, item?.kind === "excluded" || item?.kind === "older");
  // the rail walks every contract ("To decide" is the answer's list; here it means all); the open contract
  // stays in the rail, even when a chip would hide it
  // the rail has the same groups, in the same order, as the lanes of step 3 (Q2: "No former name" and
  // "Resolved" are two green groups)
  const railFilter: Filter = filter === "todo" ? "all" : filter;
  const groups = lanes(run, items, t);
  const rail = groups.flatMap((g) => g.items).filter((i) => i.id === docId || passes(i, railFilter));
  const groupOf = Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.id, g])));
  const open = items.filter(isOpen).length;
  const clause = run.plan.params.clause_type ? clauses[run.plan.params.clause_type] ?? null : null;
  // a contract outside this answer (the original of an excluded copy is in it; anything else opens its file)
  const openDoc = (id: string) => (items.some((i) => i.id === id) ? onOpen(id) : onOpenDoc(id));
  return (
    <div className="decide">
      <nav className="panel dk-queue" aria-label={t("Every contract of the answer")}>
        <div className="dk-queue-head">
          <b>{t("{n} contracts", { n: items.length })}</b>
          <span className="todo-count">{t("{n} to decide · {open} open", { n: items.filter(toDecide).length, open })}</span>
          <ChipBar items={items} filter={filter} onFilter={onFilter} rail />
          <BatchButton rows={run.rows} busy={busy} onBatch={onBatch} />
        </div>
        <Rail items={rail} groupOf={groupOf} selected={docId} fresh={fresh}
              onOpen={(id, byKey) => {
                onOpen(id);
                if (!byKey) setFocus((f) => ({ doc: id, n: f.n + 1 }));
              }} />
      </nav>
      {!item ? (
        <div className="panel empty dk-wide">{t("This contract is not in this answer.")}</div>
      ) : data ? (
        <Workspace key={item.id} data={data} run={run} item={item} clause={clause} documents={documents}
                   standing={item.row && isReported(item.row) ? item.row : null} target={null}
                   isNew={fresh.has(item.id)} focusKey={focus.doc === item.id ? focus.n : 0} onChanged={onChanged}
                   onOpenDoc={openDoc} onOpen={onOpen} />
      ) : (
        <Waiting error={error} />
      )}
    </div>
  );
}

/** Decide one finding, opened from the register's contract file (D6) - also a Found clause can be
 *  challenged there. It uses the register's review endpoints; the decision counts for every answer. */
export function DecideOne({ docId, clause, clauses, fresh, onOpenDoc }:
  { docId: string; clause: string; clauses: Record<string, ClauseSpec>; fresh: Set<string>; onOpenDoc: (docId: string) => void }) {
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
        <Workspace key={`${docId}/${clause}`} data={data} run={null} item={null} clause={clauses[clause] ?? null} documents={0}
                   standing={{ review, triage: review.triage, sample: false }} target={{ kind: "finding", docId, clause, review }}
                   isNew={fresh.has(docId)} focusKey={0} onChanged={reload} onOpenDoc={onOpenDoc} onOpen={onOpenDoc} />
      ) : (
        <Waiting error={error ?? failed} />
      )}
    </div>
  );
}
