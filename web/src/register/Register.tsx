// Contract register: every document compared with Legal's playbook. Rows are documents, columns are
// the clauses of the playbook - the comparison standard - and cells say found / missing / unclear.
import { MessageBar, MessageBarBody, SearchBox, Spinner, Switch, ToggleButton } from "@fluentui/react-components";
import {
  CheckmarkCircle16Filled,
  DismissCircle16Filled,
  QuestionCircle16Filled,
  Warning16Filled,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Matrix, type MatrixCell, type MatrixRow, type ReviewStateName } from "../api";
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
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [open, setOpen] = useState<{ docId: string; clause: string | null } | null>(null);
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
  const q = query.trim().toLowerCase();
  const rows = matrix.rows.filter(
    (r) =>
      (!type || r.doc_type === type) &&
      (!onlyGaps || r.gaps.length > 0 || r.former_names.open > 0) &&
      (!q || r.doc_id.toLowerCase().includes(q) || (r.counterparty_name ?? "").toLowerCase().includes(q)),
  );
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

        <div className="mx-summary">
          <span><b>{rows.length}</b> {t("shown")}</span>
          <span className="s-absent"><b>{withGaps}</b> {t("with a required clause missing or unclear")}</span>
          <span className="s-unclear"><b>{openNames}</b> {t("still naming a former company")}</span>
          <span className="legend-inline">
            <CheckmarkCircle16Filled className="c-ok" /> {short("PRESENT")} <DismissCircle16Filled className="c-bad" /> {short("ABSENT")}{" "}
            <QuestionCircle16Filled className="c-warn" /> {short("UNCLEAR")} · {t("faded = not required for this type")} · {t("dot = checks overruled the model")}
          </span>
        </div>

        <div className="mx-scroll">
          <table className="matrix">
            <thead>
              <tr>
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
                  <tr key={r.doc_id} className={r.duplicate_of ? "dup" : undefined}>
                    <td className="mx-doc">
                      <button type="button" className="mx-open" onClick={() => setOpen({ docId: r.doc_id, clause: r.gaps[0] ?? null })}>
                        <span className="mx-id">{r.doc_id}</span>
                        <span className="mx-party">{r.counterparty_name ?? t("unknown party")}</span>
                      </button>
                      {(r.duplicate_of || r.is_amendment || warnings.length > 0) && (
                        <div className="mx-notes">
                          {r.duplicate_of && <span>{t("copy of {id}", { id: r.duplicate_of })}</span>}
                          {r.is_amendment && <span>{r.family_id !== r.doc_id ? t("amendment of {id}", { id: r.family_id }) : t("amendment, base not in register")}</span>}
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

      <ContractFile open={open} clauses={matrix.clauses} onClose={() => setOpen(null)} onReviewed={loadReviews} />
    </div>
  );
}
