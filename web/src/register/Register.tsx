// Contract register: look things up (decision 91). Every contract compared with Legal's playbook -
// rows are contracts, columns are the clauses of the playbook, the comparison standard, and cells say
// found / not found / unclear, with Legal's decision as a small mark. Nothing is decided here: the
// contract file leads to the Workbench, and "Ask in the Workbench" takes the filters there as a
// question. A filter never hides a contract silently: contracts it cannot judge (no date, no law) are
// named, and a contract that is still being read stays pinned on top under every type.
// The matrix comes from the live register (live.tsx): a new contract appears within 3 s.
import { Button, Dropdown, MessageBar, MessageBarBody, Option, SearchBox, Spinner, Switch, ToggleButton } from "@fluentui/react-components";
import {
  CheckmarkCircle16Filled,
  CheckmarkCircle16Regular,
  ChevronRight16Regular,
  DismissCircle16Filled,
  PersonAvailable16Filled,
  PersonClock16Filled,
  PersonProhibited16Filled,
  QuestionCircle16Filled,
  QuestionCircle16Regular,
  Subtract16Regular,
  Warning16Filled,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type MatrixCell, type MatrixRow, type ReviewStateName } from "../api";
import { arrivedAt, isReading } from "../components/newLines";
import {
  CLAUSE_STATUS, clauseOk, country, dateOk, formerNameToCheck, lawOk, ONLY_LABEL, onlyMatches, REVIEW_FILTER, reviewMatches,
  searchMatch, year, type Only, type ReviewFilter,
} from "../filters";
import { useLang, useT, type T } from "../i18n";
import { CLAUSE_SHORT, DOC_TYPE_LABEL, lawReason, nameReason, planQuestion, REVIEW_MARK, STAGE_WORD, STATUS_WORD, statusWord, warningLabels } from "../labels";
import { useRegisterLive } from "../live";
import { navigate, useHashRoute, workbenchHref } from "../routing";
import { ContractFile } from "./ContractFile";
import "./register.css";

// the filter labels and short type names are English; they are translated where they are shown
const TYPES = [
  { key: "", label: "All documents" },
  { key: "merchant_agreement", label: "Merchant agreements" },
  { key: "data_processing_agreement", label: "Data processing (DPA)" },
  { key: "other_commercial_agreement", label: "Other contracts (CUAD)" },
  { key: "amendment", label: "Amendments" },
];

const SHORT_TYPE: Record<string, string> = {
  merchant_agreement: "Merchant",
  data_processing_agreement: "DPA",
  other_commercial_agreement: "Other",
  amendment: "Amendment",
};

function source(r: MatrixRow, t: T): string {
  if (r.format === "pdf_text") return "PDF";
  if (r.format === "txt") return t("Text");
  const kind = t(r.format === "jpeg" ? "Photo scan" : "Scan");
  return r.ocr_mean_conf != null ? `${kind} · OCR ${Math.round(r.ocr_mean_conf)} %` : kind;
}

// the filter rules (type, search, law, date, clause, review state, "only") live in filters.ts,
// shared with the Workbench

/** Not judged by the type toggles: still being read, could not be read, or of unknown type. Pinned on
 *  top under every type, so a filter never hides it (recall first, 4.4). */
const pinned = (r: MatrixRow) => isReading(r) || r.stage === "failed" || r.doc_type == null || r.doc_type === "unknown";

// the exact state behind a mark, in the words of the next step (3.2): "in review (Four eyes · 1 of 2)"
const EXACT: Partial<Record<ReviewStateName, string>> = { REJECTED: "Rejected", CORRECTED: "Corrected", DISPUTED: "Reviewers disagree" };
const exactState = (s: ReviewStateName, t: T) =>
  s === "IN_REVIEW" || s === "ESCALATED" ? t("Four eyes · {done} of 2", { done: s === "IN_REVIEW" ? 1 : 0 }) : t(EXACT[s] ?? s);

// "6 to check for a former name (5 name one · 1 cannot be ruled out)" with the numbers in bold
const boldNumbers = (text: string): ReactNode[] => text.split(/(\d+)/).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));

// Legal's decision, drawn as a person: confirmed, disagrees, in review
const LEGAL_ICON: Record<string, ReactNode> = {
  confirmed: <PersonAvailable16Filled />,
  disagrees: <PersonProhibited16Filled />,
  "in-review": <PersonClock16Filled />,
};

function Cell({ cell, label, review, onOpen }: { cell?: MatrixCell; label: string; review?: ReviewStateName; onOpen: () => void }) {
  const t = useT();
  if (!cell) return <td className="mx-cell none">·</td>;
  // a clause the playbook does not require for this type is drawn in neutral grey, never in red:
  // "not found" there is not a gap (the words are in the tooltip, the shape stays recognisable)
  const icon = !cell.required
    ? (cell.status === "PRESENT" ? <CheckmarkCircle16Regular /> : cell.status === "ABSENT" ? <Subtract16Regular /> : <QuestionCircle16Regular />)
    : cell.status === "PRESENT" ? <CheckmarkCircle16Filled /> : cell.status === "ABSENT" ? <DismissCircle16Filled /> : <QuestionCircle16Filled />;
  // Legal's decision as one of three marks (D19): a person, so it never looks like a status icon (a check
  // here read as "found"); the exact state is in the tooltip
  const mark = review ? REVIEW_MARK[review] : undefined;
  const text =
    `${label}: ${statusWord(cell.status, t)}` +
    t(cell.required ? " – required for this type" : " – not required for this type") +
    (mark ? ` · ${t(mark.label)}${mark.kind !== "confirmed" ? ` (${exactState(review!, t)})` : ""}` : "");
  return (
    <td className={`mx-cell s-${cell.status.toLowerCase()} ${cell.required ? "req" : "opt"}`}>
      <button type="button" onClick={onOpen} aria-label={text} title={text}>
        {icon}
        {mark && <span className={`mx-rev k-${mark.kind}`} aria-hidden>{LEGAL_ICON[mark.kind]}</span>}
      </button>
    </td>
  );
}

export function Register() {
  const t = useT();
  const lang = useLang();
  const live = useRegisterLive();
  const matrix = live.matrix;
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("merchant_agreement");
  const [only, setOnly] = useState<Only>("");
  const [newOnly, setNewOnly] = useState(false);      // "New": arrived in the last 24 hours
  const [query, setQuery] = useState("");
  const [law, setLaw] = useState("");                 // "" any, "none" = no governing law found, else a country
  const [from, setFrom] = useState("");               // year of the effective date, e.g. "2020"
  const [to, setTo] = useState("");
  const [clause, setClause] = useState("");
  const [clauseStatus, setClauseStatus] = useState("GAP");
  const [review, setReview] = useState<ReviewFilter>("");
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [open, setOpen] = useState<{ docId: string; clause: string | null } | null>(null);
  // #/tool/register?doc=M01 opens a contract file directly (links from the Workbench, the pill and the talk)
  const route = useHashRoute();
  const linked = route.params.get("doc");
  const linkedClause = route.params.get("clause");
  useEffect(() => {
    if (linked) setOpen({ docId: linked, clause: linkedClause });
  }, [linked, linkedClause]);
  // #/tool/register?type=all&only=new - a filter from a link (the header pill: "Show new in the register")
  const linkedType = route.params.get("type");
  const linkedOnly = route.params.get("only");
  useEffect(() => {
    if (linkedType) setType(linkedType === "all" ? "" : linkedType);
    if (linkedOnly === "gaps" || linkedOnly === "names" || linkedOnly === "any") setOnly(linkedOnly);
    if (linkedOnly === "new") setNewOnly(true);
  }, [linkedType, linkedOnly]);
  const close = () => {
    setOpen(null);
    if (linked) navigate("/tool/register");
  };
  const openDoc = (docId: string) => setOpen({ docId, clause: null });
  // Legal's decisions, for the marks in the cells: they are made in the Workbench, so loading them when
  // the register opens is enough
  const [reviews, setReviews] = useState<Record<string, Record<string, ReviewStateName>>>({});
  useEffect(() => {
    api.reviewStates().then(setReviews).catch((e: Error) => setError(e.message));
  }, []);

  const newIds = useMemo(() => new Set(live.newDocs.map((r) => r.doc_id)), [live.newDocs]);
  // per type: the read contracts of that type; the pinned ones are shown under every type ("20 +1")
  const counts = useMemo(() => {
    const c: Record<string, number> = { "": matrix?.rows.length ?? 0 };
    matrix?.rows.filter((r) => !pinned(r)).forEach((r) => (c[r.doc_type!] = (c[r.doc_type!] ?? 0) + 1));
    return c;
  }, [matrix]);

  if (error) return <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>;
  if (!matrix) {
    return live.offline
      ? <MessageBar intent="error"><MessageBarBody>{t("API offline")}</MessageBarBody></MessageBar>
      : <Spinner label={t("Loading the register…")} />;
  }
  // the legend uses the status words in lower case: "found", "not found", "unclear"
  const word = (status: string) => t(STATUS_WORD[status]).toLowerCase();

  const clauseKeys = Object.keys(matrix.clauses);
  const laws = [...new Set(matrix.rows.map(country).filter((c): c is string => !!c))].sort();
  // whole years: a lawyer filters contracts by year, and the browser's date field showed "TT.mm.jjjj"
  // in the English tool (Chromium follows the system locale)
  const years = [...new Set(matrix.rows.map(year).filter((y): y is string => !!y))].sort();
  const pinnedCount = matrix.rows.filter(pinned).length;
  // the "New" toggle is shown only while something is new; when nothing is any more, it filters nothing
  const onlyNew = newOnly && newIds.size > 0;
  const base = matrix.rows.filter(
    (r) =>
      (!type || r.doc_type === type || pinned(r)) &&
      (!onlyNew || newIds.has(r.doc_id)) &&
      onlyMatches(r, only) &&
      searchMatch(r, query) &&
      clauseOk(r, clause, clauseStatus) && reviewMatches(r, reviews[r.doc_id], review),
  );
  const matching = base.filter((r) => lawOk(r, law) && dateOk(r, from, to));
  const rows = [...matching.filter(pinned), ...matching.filter((r) => !pinned(r))];
  // contracts a filter cannot judge are not dropped silently: they are counted and named
  const noLaw = law && law !== "none" ? base.filter((r) => r.governing_law == null && dateOk(r, from, to)) : [];
  const noDate = from || to ? base.filter((r) => r.effective_date == null && lawOk(r, law)) : [];
  const extraFilters = !!(query || law || from || to || clause || review);
  const resetFilters = () => {
    setQuery(""); setLaw(""); setFrom(""); setTo(""); setClause(""); setReview("");
  };
  const reading = matrix.rows.filter((r) => isReading(r) && r.ingested_at);

  // the summary: one rule per count; the former names with the same rule as question Q2 (D14)
  const withGaps = rows.filter((r) => r.gaps.length > 0 && !r.duplicate_of).length;
  const names = rows.filter(formerNameToCheck);
  const namesOpen = names.filter((r) => r.former_names.open > 0).length;
  const newShown = rows.filter((r) => newIds.has(r.doc_id)).length;
  const readingShown = rows.filter(isReading).length;

  // "Ask in the Workbench": the type, law, dates and search go along; a clause becomes the question
  const question = clause ? planQuestion({ check: "missing_clause", params: { clause_type: clause } }, matrix.clauses, t) : null;
  const handOver = workbenchHref({
    type, law, from, to, search: query.trim(),
    ...(clause ? { check: "missing_clause", clause } : {}),
  });

  return (
    <div className="register">
      <section className="panel rg-top">
        <div className="rg-head">
          <div>
            <div className="eyebrow">{t("Contract register")}</div>
            <h2>{t("{n} contracts, each compared with Legal's playbook", { n: matrix.rows.length })}</h2>
            <p className="lead">
              {t("Look up any contract: what it says about each playbook clause, with the page. Decisions are made in the Workbench.")}
            </p>
          </div>
          {/* the column headers carry the definitions as tooltips too */}
          <button type="button" className="link-btn rg-playbook" aria-expanded={showDefinitions}
                  onClick={() => setShowDefinitions((s) => !s)}>
            {t("Playbook: {n} clauses", { n: clauseKeys.length })}
            <ChevronRight16Regular className="checks-chevron" aria-hidden />
          </button>
        </div>
        {showDefinitions && (
          <div className="rg-definitions">
            <p className="note">{t("Legal's definitions as data (pipeline/catalogue.py) – changing one is a new prompt version.")}</p>
            <dl className="pb-list">
              {clauseKeys.map((k) => {
                const c = matrix.clauses[k];
                return (
                  <div key={k} className="pb-item">
                    <dt>
                      <span className="pb-label">{t(c.label)}</span>
                      <span className="pb-req">{t("required for {types}", { types: c.required_for.map((type) => t(DOC_TYPE_LABEL[type] ?? type)).join(", ") })}</span>
                    </dt>
                    <dd className="pb-def">{c.definition}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        {reading.map((r) => (
          <MessageBar key={r.doc_id} intent="info" className="rg-reading">
            <MessageBarBody>
              {t("{id} arrived at {time} – the model is reading it. Its findings appear in a few seconds.",
                 { id: r.doc_id, time: arrivedAt(r.ingested_at!, lang) })}
            </MessageBarBody>
          </MessageBar>
        ))}

        <div className="mx-toolbar">
          <div className="type-filter" role="group" aria-label={t("Document type")}>
            {TYPES.map((f) => (
              <ToggleButton key={f.key} size="small" checked={type === f.key} appearance={type === f.key ? "primary" : "subtle"} onClick={() => setType(f.key)}>
                {t(f.label)} <span className="count">{counts[f.key] ?? 0}{f.key && pinnedCount > 0 ? ` +${pinnedCount}` : ""}</span>
              </ToggleButton>
            ))}
            {newIds.size > 0 && (
              <ToggleButton size="small" checked={onlyNew} appearance={onlyNew ? "primary" : "subtle"} onClick={() => setNewOnly(!onlyNew)}>
                {t("New")} <span className="count">{newIds.size}</span>
              </ToggleButton>
            )}
          </div>
          <div className="spacer" />
          <Switch checked={only !== ""} onChange={(_, d) => setOnly(d.checked ? "any" : "")} label={t(ONLY_LABEL[only])} />
        </div>

        <div className="mx-filters" role="group" aria-label={t("More filters")}>
          <SearchBox size="small" placeholder={t("Search ID or party")} value={query} onChange={(_, d) => setQuery(d.value)} />
          <label>
            <span>{t("Law")}</span>
            <Dropdown size="small" className="mx-f-law" value={law === "none" ? t("not found") : law || t("any")}
                      selectedOptions={[law]} onOptionSelect={(_, d) => setLaw(d.optionValue ?? "")}>
              <Option value="">{t("any")}</Option>
              {laws.map((l) => <Option key={l} value={l}>{l}</Option>)}
              <Option value="none">{t("not found")}</Option>
            </Dropdown>
          </label>
          <label>
            <span>{t("Dated from")}</span>
            <Dropdown size="small" className="mx-f-year" value={from || t("any year")} selectedOptions={[from]}
                      onOptionSelect={(_, d) => setFrom(d.optionValue ?? "")}>
              <Option value="">{t("any year")}</Option>
              {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
            </Dropdown>
          </label>
          <label>
            <span>{t("to")}</span>
            <Dropdown size="small" className="mx-f-year" value={to || t("any year")} selectedOptions={[to]}
                      onOptionSelect={(_, d) => setTo(d.optionValue ?? "")}>
              <Option value="">{t("any year")}</Option>
              {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
            </Dropdown>
          </label>
          <label>
            <span>{t("Clause")}</span>
            <Dropdown size="small" className="mx-f-clause" value={clause ? t(matrix.clauses[clause].label) : t("any")}
                      selectedOptions={[clause]} onOptionSelect={(_, d) => setClause(d.optionValue ?? "")}>
              <Option value="">{t("any")}</Option>
              {clauseKeys.map((k) => <Option key={k} value={k}>{t(matrix.clauses[k].label)}</Option>)}
            </Dropdown>
            {clause && (
              <Dropdown size="small" className="mx-f-status" aria-label={t("Clause status")}
                        value={t(CLAUSE_STATUS.find((s) => s.key === clauseStatus)?.label ?? "")}
                        selectedOptions={[clauseStatus]} onOptionSelect={(_, d) => setClauseStatus(d.optionValue ?? "GAP")}>
                {CLAUSE_STATUS.map((s) => <Option key={s.key} value={s.key}>{t(s.label)}</Option>)}
              </Dropdown>
            )}
          </label>
          <label>
            <span>{t("Legal's decision")}</span>
            <Dropdown size="small" className="mx-f-review" value={t(REVIEW_FILTER.find((x) => x.key === review)?.label ?? "")}
                      selectedOptions={[review]} onOptionSelect={(_, d) => setReview((d.optionValue ?? "") as ReviewFilter)}>
              {REVIEW_FILTER.map((x) => <Option key={x.key} value={x.key}>{t(x.label)}</Option>)}
            </Dropdown>
          </label>
          {extraFilters && <button type="button" className="link-btn" onClick={resetFilters}>{t("Reset filters")}</button>}
        </div>

        <div className="mx-summary">
          <span><b>{rows.length}</b> {t("shown")}</span>
          {newShown > 0 && <span className="s-new">{boldNumbers(t("{n} new", { n: newShown }))}</span>}
          {readingShown > 0 && <span className="s-reading">{boldNumbers(t("being read: {n}", { n: readingShown }))}</span>}
          <span className="s-absent">{boldNumbers(t("{n} with a required clause not found or unclear", { n: withGaps }))}</span>
          {names.length > 0 && (
            <span className="s-unclear">
              {boldNumbers(t("{n} to check for a former name ({open} name one · {unsure} cannot be ruled out)",
                             { n: names.length, open: namesOpen, unsure: names.length - namesOpen }))}
            </span>
          )}
          {noLaw.length > 0 && (
            <span className="mx-unjudged"><Warning16Filled /> {t("not shown, no governing law found: {ids}", { ids: noLaw.map((r) => r.doc_id).join(", ") })}</span>
          )}
          {noDate.length > 0 && (
            <span className="mx-unjudged"><Warning16Filled /> {t("not shown, no date found: {ids}", { ids: noDate.map((r) => r.doc_id).join(", ") })}</span>
          )}
          <span className="legend-inline">
            <CheckmarkCircle16Filled className="c-ok" /> {word("PRESENT")} <DismissCircle16Filled className="c-bad" /> {word("ABSENT")}{" "}
            <QuestionCircle16Filled className="c-warn" /> {word("UNCLEAR")} · {t("grey = not required for this type")}
            {" · "}<PersonAvailable16Filled className="c-ok" /> {t("Legal's decision")}
          </span>
          <Button as="a" href={handOver} size="small" appearance="primary" className="rg-handover"
                  title={t("Carries type, law, dates and search; a clause becomes the question. Result filters (only gaps, Legal's decision) stay here.")}>
            {question ? t("Ask in the Workbench: {question} →", { question }) : t("Ask in the Workbench →")}
          </Button>
        </div>

        <div className="mx-scroll">
          <table className="matrix">
            <thead>
              <tr className="mx-group-row">
                <th className="mx-doc" rowSpan={2}>{t("Contract")}</th>
                <th className="mx-meta" rowSpan={2}>{t("Type")}</th>
                <th className="mx-meta" rowSpan={2}>{t("Date")}</th>
                <th className="mx-meta" rowSpan={2}>{t("Law")}</th>
                <th className="mx-meta" rowSpan={2}>{t("Source")}</th>
                <th className="mx-group" colSpan={clauseKeys.length} scope="colgroup">{t("Playbook clauses")}</th>
                <th className="mx-clause mx-namecol" rowSpan={2}>{t("Former name")}</th>
              </tr>
              <tr className="mx-clause-row">
                {/* short labels; the full label and Legal's definition are in the tooltip */}
                {clauseKeys.map((k) => (
                  <th key={k} className="mx-clause" scope="col" title={`${t(matrix.clauses[k].label)}: ${matrix.clauses[k].definition}`}>
                    {t(CLAUSE_SHORT[k] ?? matrix.clauses[k].label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const warnings = warningLabels(r.flags, t);
                const stage = r.stage === "failed" ? "failed" : isReading(r) ? "reading" : null;
                return (
                  <tr key={r.doc_id} className={[r.duplicate_of && "dup", stage].filter(Boolean).join(" ") || undefined}>
                    <td className="mx-doc">
                      <button type="button" className="mx-open" onClick={() => setOpen({ docId: r.doc_id, clause: r.gaps[0] ?? null })}>
                        <span className="mx-id">{r.doc_id}</span>
                        {newIds.has(r.doc_id) && <span className="mx-new">{t("New")}</span>}
                        <span className="mx-party">{r.counterparty_name ?? t("unknown party")}</span>
                      </button>
                      {(r.duplicate_of || r.is_amendment || warnings.length > 0) && (
                        <div className="mx-notes">
                          {r.duplicate_of && (
                            <button type="button" className="link-btn" onClick={() => openDoc(r.duplicate_of!)}>
                              {t("copy of {id}", { id: r.duplicate_of })}
                            </button>
                          )}
                          {r.is_amendment && (r.family_id !== r.doc_id ? (
                            <button type="button" className="link-btn" onClick={() => openDoc(r.family_id)}>
                              {t("amendment of {id}", { id: r.family_id })}
                            </button>
                          ) : <span>{t("amendment, base not in the register")}</span>)}
                          {warnings.map((w) => (
                            <span key={w} className="warn"><Warning16Filled /> {w}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="mx-meta">{r.doc_type && SHORT_TYPE[r.doc_type] ? t(SHORT_TYPE[r.doc_type]) : t("type not known yet")}</td>
                    <td className="mx-meta num">{r.effective_date ?? "–"}</td>
                    <td className="mx-meta" title={r.law_reason ? lawReason(r.law_reason, t) : undefined}>{r.governing_law ?? "–"}</td>
                    <td className="mx-meta src">
                      {source(r, t)}
                      {r.ingest_status === "LOW_QUALITY" && <span className="mx-poor">{t("poor scan")}</span>}
                    </td>
                    {stage ? (
                      <td className="mx-stage" colSpan={clauseKeys.length}>{t(STAGE_WORD[stage])}</td>
                    ) : clauseKeys.map((k) => (
                      <Cell key={k} cell={r.cells[k]} label={t(matrix.clauses[k].label)} review={reviews[r.doc_id]?.[k]}
                            onOpen={() => setOpen({ docId: r.doc_id, clause: k })} />
                    ))}
                    <td className="mx-name">
                      {r.former_names.open > 0 ? (
                        <span className="name-open">
                          {r.former_names.open === 1 ? t("1 former name") : t("{n} former names", { n: r.former_names.open })}
                        </span>
                      ) : r.former_names.not_ruled_out ? (
                        <span className="name-open name-unsure" title={r.former_names.reason ? nameReason(r.former_names.reason, t) : undefined}>
                          {t("cannot rule out")}
                        </span>
                      ) : r.former_names.resolved > 0 ? (
                        <span className="name-resolved">{t("resolved")}</span>
                      ) : (
                        // the usual case stays quiet: a grey dash; "current" for screen readers and in the tooltip
                        <span className="name-ok" title={t("current")}><span aria-hidden>–</span><span className="sr-only">{t("current")}</span></span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ContractFile open={open} clauses={matrix.clauses} onClose={close} onOpen={openDoc} />
    </div>
  );
}
