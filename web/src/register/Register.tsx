// Contract register: every document compared with Legal's playbook. Rows are documents, columns are
// the clauses of the playbook - the comparison standard - and cells say found / not found / unclear.
// Legal filters and ticks contracts and checks exactly those in the Workbench (decision 75); a
// filter never hides a contract silently - contracts it cannot judge (no date, no law) are counted.
import {
  Button, Checkbox, Dropdown, Input, MessageBar, MessageBarBody, Option, SearchBox, Spinner, Switch, ToggleButton,
} from "@fluentui/react-components";
import {
  CheckmarkCircle16Filled,
  DismissCircle16Filled,
  Play16Filled,
  QuestionCircle16Filled,
  Warning16Filled,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Matrix, type MatrixCell, type MatrixRow, type ReviewStateName } from "../api";
import { navigate, useHashRoute } from "../routing";
import { useT, type T } from "../i18n";
import { DOC_TYPE_LABEL, REVIEW_LABEL, STATUS_LABEL, STATUS_SHORT, warningLabels } from "../labels";
import { ContractFile } from "./ContractFile";

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
  unknown: "Unknown",
};

function source(r: MatrixRow, t: T): string {
  if (r.format === "pdf_text") return "PDF";
  if (r.format === "txt") return t("Text");
  const kind = t(r.format === "jpeg" ? "Photo scan" : "Scan");
  return r.ocr_mean_conf != null ? `${kind} · OCR ${Math.round(r.ocr_mean_conf)} %` : kind;
}

// filters beyond type and search (decision 75); the labels are English keys, translated where shown
const CLAUSE_STATUS = [
  { key: "GAP", label: "not found or unclear" },
  { key: "ABSENT", label: "not found" },
  { key: "UNCLEAR", label: "unclear" },
  { key: "PRESENT", label: "clause found" },
];
type ReviewFilter = "" | "open" | "reviewed" | "flagged";
const REVIEW_FILTER: { key: ReviewFilter; label: string }[] = [
  { key: "", label: "any" },
  { key: "open", label: "Gaps not yet reviewed" },
  { key: "reviewed", label: "Gaps reviewed" },
  { key: "flagged", label: "Escalated or disputed" },
];
const FINAL: ReviewStateName[] = ["CONFIRMED", "CORRECTED", "REJECTED"];

function reviewMatches(r: MatrixRow, states: Record<string, ReviewStateName> | undefined, f: ReviewFilter): boolean {
  if (!f) return true;
  if (f === "flagged") return Object.values(states ?? {}).some((s) => s === "ESCALATED" || s === "DISPUTED");
  const open = r.gaps.filter((k) => !states?.[k] || !FINAL.includes(states[k]));
  return f === "open" ? open.length > 0 : r.gaps.length > 0 && open.length === 0;
}

const country = (r: MatrixRow) => r.governing_law?.split("-")[0] ?? null;

// review state of a finding in the register (decision 73): a small mark in the corner of the cell
const REVIEW_MARK: Partial<Record<ReviewStateName, string>> = {
  CONFIRMED: "✓", CORRECTED: "✓", REJECTED: "✗", IN_REVIEW: "½", ESCALATED: "⚑", DISPUTED: "!",
};

function Cell({ cell, label, review, onOpen }: { cell?: MatrixCell; label: string; review?: ReviewStateName; onOpen: () => void }) {
  const t = useT();
  if (!cell) return <td className="mx-cell none">·</td>;
  const icon =
    cell.status === "PRESENT" ? <CheckmarkCircle16Filled /> : cell.status === "ABSENT" ? <DismissCircle16Filled /> : <QuestionCircle16Filled />;
  const changed = cell.model_status !== cell.status;
  const text =
    `${label}: ${t(STATUS_LABEL[cell.status])}` +
    t(cell.required ? " – required for this type" : " – not required for this type") +
    (changed ? t(". The model said “{status}”, the checks changed it.", { status: t(STATUS_LABEL[cell.model_status]) }) : "") +
    (review ? t(". Review: {state}.", { state: t(REVIEW_LABEL[review] ?? review) }) : "");
  return (
    <td className={`mx-cell s-${cell.status.toLowerCase()} ${cell.required ? "req" : "opt"}`}>
      <button type="button" onClick={onOpen} aria-label={text} title={text}>
        {icon}
        {changed && <span className="mx-dot" aria-hidden />}
        {review && REVIEW_MARK[review] && <span className={`mx-rev r-${review.toLowerCase()}`} aria-hidden>{REVIEW_MARK[review]}</span>}
      </button>
    </td>
  );
}

export function Register() {
  const t = useT();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("merchant_agreement");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [query, setQuery] = useState("");
  const [law, setLaw] = useState("");                 // "" any, "none" = no governing law found, else a country
  const [from, setFrom] = useState("");               // effective date, ISO
  const [to, setTo] = useState("");
  const [clause, setClause] = useState("");
  const [clauseStatus, setClauseStatus] = useState("GAP");
  const [review, setReview] = useState<ReviewFilter>("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [open, setOpen] = useState<{ docId: string; clause: string | null } | null>(null);
  // #/tool/register?doc=M01 opens a contract file directly (links from the Workbench and the talk)
  const route = useHashRoute();
  const linked = route.params.get("doc");
  const linkedClause = route.params.get("clause");
  useEffect(() => {
    if (linked) setOpen({ docId: linked, clause: linkedClause });
  }, [linked, linkedClause]);
  const close = () => {
    setOpen(null);
    if (linked) navigate("/tool/register");
  };
  const openDoc = (docId: string) => setOpen({ docId, clause: null });
  const [reviews, setReviews] = useState<Record<string, Record<string, ReviewStateName>>>({});
  const loadReviews = useCallback(() => {
    api.reviewStates().then(setReviews).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(loadReviews, [loadReviews]);

  useEffect(() => {
    api.matrix().then(setMatrix).catch((e) => setError(t("API not reachable ({error})", { error: String(e) })));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": matrix?.rows.length ?? 0 };
    matrix?.rows.forEach((r) => (c[r.doc_type ?? "unknown"] = (c[r.doc_type ?? "unknown"] ?? 0) + 1));
    return c;
  }, [matrix]);

  if (error) return <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>;
  if (!matrix) return <Spinner label={t("Loading the register…")} />;
  // the legend uses the words of the short status badges, in lower case: "found", "missing", "unclear"
  const short = (status: string) => t(STATUS_SHORT[status]).toLowerCase();

  const clauseKeys = Object.keys(matrix.clauses);
  const laws = [...new Set(matrix.rows.map(country).filter((c): c is string => !!c))].sort();
  const q = query.trim().toLowerCase();
  const clauseOk = (r: MatrixRow) => {
    if (!clause) return true;
    const c = r.cells[clause];
    return clauseStatus === "GAP" ? !c || c.status !== "PRESENT" : c?.status === clauseStatus;  // no finding = a gap
  };
  const lawOk = (r: MatrixRow) => !law || (law === "none" ? r.governing_law == null : country(r) === law);
  const dateOk = (r: MatrixRow) =>
    (!from && !to) || (r.effective_date != null && (!from || r.effective_date >= from) && (!to || r.effective_date <= to));
  const base = matrix.rows.filter(
    (r) =>
      (!type || r.doc_type === type) &&
      (!onlyGaps || r.gaps.length > 0 || r.former_names.open > 0) &&
      (!q || r.doc_id.toLowerCase().includes(q) || (r.counterparty_name ?? "").toLowerCase().includes(q)) &&
      clauseOk(r) && reviewMatches(r, reviews[r.doc_id], review),
  );
  const rows = base.filter((r) => lawOk(r) && dateOk(r));
  // contracts a filter cannot judge are not dropped silently: they are counted and named
  const noLaw = law && law !== "none" ? base.filter((r) => r.governing_law == null && dateOk(r)) : [];
  const noDate = from || to ? base.filter((r) => r.effective_date == null && lawOk(r)) : [];
  const shownIds = rows.map((r) => r.doc_id);
  const pickedHidden = [...picked].filter((id) => !shownIds.includes(id));
  const allShown = shownIds.length > 0 && shownIds.every((id) => picked.has(id));
  const someShown = shownIds.some((id) => picked.has(id));
  const toggle = (id: string) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleShown = () => setPicked((s) => {
    const next = new Set(s);
    shownIds.forEach((id) => (allShown ? next.delete(id) : next.add(id)));
    return next;
  });
  const extraFilters = !!(law || from || to || clause || review);
  const resetFilters = () => {
    setLaw(""); setFrom(""); setTo(""); setClause(""); setReview("");
  };
  // how the list was made, stored with the run and in the audit (never re-applied)
  const describeFilters = (): Record<string, string> => {
    const f: Record<string, string> = {};
    if (type) f.type = type;
    if (onlyGaps) f.only = "with gaps or former names";
    if (law) f.law = law === "none" ? "not found" : law;
    if (from) f.from = from;
    if (to) f.to = to;
    if (clause) {
      f.clause = matrix.clauses[clause].label;
      f.clause_status = CLAUSE_STATUS.find((s) => s.key === clauseStatus)?.label ?? clauseStatus;
    }
    if (review) f.review = REVIEW_FILTER.find((x) => x.key === review)?.label ?? review;
    if (q) f.search = query.trim();
    return f;
  };
  const checkInWorkbench = (docIds: string[], filters: Record<string, string>) =>
    navigate(`/tool/workbench?scope=${encodeURIComponent(JSON.stringify({ doc_ids: docIds, filters }))}`);
  const withGaps = rows.filter((r) => r.gaps.length > 0 && !r.duplicate_of).length;
  const openNames = rows.filter((r) => r.former_names.open > 0 && !r.duplicate_of && !r.is_amendment).length;

  return (
    <div className="register">
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">{t("Contract register")}</div>
            <h2>{t("{n} documents, each compared with Legal's playbook", { n: matrix.rows.length })}</h2>
            <p className="lead">
              {t("Every contract was read once, completely. Each column is a clause from the playbook – the standard we compare against. Click a cell or a contract to open its file with the evidence.")}
            </p>
          </div>
        </div>

        <div className="playbook">
          <div className="playbook-head">
            <span className="plan-label">{t("Playbook")}</span>
            <span className="note">{t("Legal's definitions as data (pipeline/catalogue.py) – changing one is a new prompt version.")}</span>
            <button type="button" className="link-btn" onClick={() => setShowDefinitions((s) => !s)}>
              {showDefinitions ? t("Hide definitions") : t("Show definitions")}
            </button>
          </div>
          <div className={`playbook-grid${showDefinitions ? " open" : ""}`}>
            {clauseKeys.map((k) => {
              const c = matrix.clauses[k];
              return (
                <div key={k} className="pb-card">
                  <div className="pb-label">{t(c.label)}</div>
                  <div className="pb-req">{t("required for {types}", { types: c.required_for.map((type) => t(DOC_TYPE_LABEL[type] ?? type)).join(", ") })}</div>
                  <div className="pb-def">{c.definition}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="mx-toolbar">
          <div className="type-filter" role="group" aria-label={t("Document type")}>
            {TYPES.map((f) => (
              <ToggleButton key={f.key} size="small" checked={type === f.key} appearance={type === f.key ? "primary" : "subtle"} onClick={() => setType(f.key)}>
                {t(f.label)} <span className="count">{counts[f.key] ?? 0}</span>
              </ToggleButton>
            ))}
          </div>
          <div className="spacer" />
          <Switch checked={onlyGaps} onChange={(_, d) => setOnlyGaps(d.checked)} label={t("Only with gaps or former names")} />
          <SearchBox placeholder={t("Search ID or party")} value={query} onChange={(_, d) => setQuery(d.value)} />
        </div>

        <div className="mx-filters" role="group" aria-label={t("More filters")}>
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
            <Input size="small" type="date" value={from} onChange={(_, d) => setFrom(d.value)} />
          </label>
          <label>
            <span>{t("to")}</span>
            <Input size="small" type="date" value={to} onChange={(_, d) => setTo(d.value)} />
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
            <span>{t("Review state")}</span>
            <Dropdown size="small" className="mx-f-review" value={t(REVIEW_FILTER.find((x) => x.key === review)?.label ?? "")}
                      selectedOptions={[review]} onOptionSelect={(_, d) => setReview((d.optionValue ?? "") as ReviewFilter)}>
              {REVIEW_FILTER.map((x) => <Option key={x.key} value={x.key}>{t(x.label)}</Option>)}
            </Dropdown>
          </label>
          {extraFilters && <button type="button" className="link-btn" onClick={resetFilters}>{t("Reset filters")}</button>}
        </div>

        <div className="mx-summary">
          <span><b>{rows.length}</b> {t("shown")}</span>
          <span className="s-absent"><b>{withGaps}</b> {t("with a required clause missing or unclear")}</span>
          <span className="s-unclear"><b>{openNames}</b> {t("still naming a former company")}</span>
          {noLaw.length > 0 && (
            <span className="mx-unjudged"><Warning16Filled /> {t("not shown, no governing law found: {ids}", { ids: noLaw.map((r) => r.doc_id).join(", ") })}</span>
          )}
          {noDate.length > 0 && (
            <span className="mx-unjudged"><Warning16Filled /> {t("not shown, no date found: {ids}", { ids: noDate.map((r) => r.doc_id).join(", ") })}</span>
          )}
          <span className="legend-inline">
            <CheckmarkCircle16Filled className="c-ok" /> {short("PRESENT")} <DismissCircle16Filled className="c-bad" /> {short("ABSENT")}{" "}
            <QuestionCircle16Filled className="c-warn" /> {short("UNCLEAR")} · {t("faded = not required for this type")} · {t("dot = checks overruled the model")}
          </span>
        </div>

        <div className="mx-select" aria-live="polite">
          {picked.size > 0 ? (
            <>
              <span>
                <b>{picked.size}</b> {t("selected")}
                {pickedHidden.length > 0 && <span className="note"> · {t("{ids} hidden by the filters", { ids: pickedHidden.join(", ") })}</span>}
              </span>
              <Button appearance="primary" size="small" icon={<Play16Filled />}
                      onClick={() => checkInWorkbench([...picked].sort(), { picked: "by hand" })}>
                {t("Check these {n} in the Workbench", { n: picked.size })}
              </Button>
              <button type="button" className="link-btn" onClick={() => setPicked(new Set())}>{t("Clear selection")}</button>
            </>
          ) : (
            <>
              <span className="note">{t("Tick contracts to check only those – or check everything shown.")}</span>
              <Button appearance="secondary" size="small" icon={<Play16Filled />} disabled={rows.length === 0}
                      onClick={() => checkInWorkbench(shownIds, describeFilters())}>
                {t("Check the {n} shown in the Workbench", { n: rows.length })}
              </Button>
            </>
          )}
        </div>

        <div className="mx-scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th className="mx-pick">
                  <Checkbox checked={allShown ? true : someShown ? "mixed" : false} onChange={toggleShown}
                            aria-label={t("Select all shown")} disabled={rows.length === 0} />
                </th>
                <th className="mx-doc">{t("Contract")}</th>
                <th>{t("Type")}</th>
                <th>{t("Date")}</th>
                <th>{t("Law")}</th>
                <th>{t("Source")}</th>
                {clauseKeys.map((k) => (
                  <th key={k} className="mx-clause" title={matrix.clauses[k].definition}>{t(matrix.clauses[k].label)}</th>
                ))}
                <th className="mx-clause">{t("Company name")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const warnings = warningLabels(r.flags, t);
                return (
                  <tr key={r.doc_id} className={[r.duplicate_of && "dup", picked.has(r.doc_id) && "picked"].filter(Boolean).join(" ") || undefined}>
                    <td className="mx-pick">
                      <Checkbox checked={picked.has(r.doc_id)} onChange={() => toggle(r.doc_id)} aria-label={t("Select {id}", { id: r.doc_id })} />
                    </td>
                    <td className="mx-doc">
                      <button type="button" className="mx-open" onClick={() => setOpen({ docId: r.doc_id, clause: r.gaps[0] ?? null })}>
                        <span className="mx-id">{r.doc_id}</span>
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
                          ) : <span>{t("amendment, base not in register")}</span>)}
                          {warnings.map((w) => (
                            <span key={w} className="warn"><Warning16Filled /> {w}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{t(SHORT_TYPE[r.doc_type ?? "unknown"])}</td>
                    <td className="num">{r.effective_date ?? "–"}</td>
                    <td>{r.governing_law ?? "–"}</td>
                    <td className="src">{source(r, t)}</td>
                    {clauseKeys.map((k) => (
                      <Cell key={k} cell={r.cells[k]} label={t(matrix.clauses[k].label)} review={reviews[r.doc_id]?.[k]}
                            onOpen={() => setOpen({ docId: r.doc_id, clause: k })} />
                    ))}
                    <td className="mx-name">
                      {r.former_names.open > 0 ? (
                        <span className="name-open">{t("{n} former", { n: r.former_names.open })}</span>
                      ) : r.former_names.resolved > 0 ? (
                        <span className="name-resolved">{t("resolved")}</span>
                      ) : (
                        <span className="name-ok">{t("current")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ContractFile open={open} clauses={matrix.clauses} onClose={close} onReviewed={loadReviews} onOpen={openDoc} />
    </div>
  );
}
