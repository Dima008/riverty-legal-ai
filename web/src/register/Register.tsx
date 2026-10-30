// Contract register: every document compared with Legal's playbook. Rows are documents, columns are
// the clauses of the playbook - the comparison standard - and cells say found / missing / unclear.
import { MessageBar, MessageBarBody, SearchBox, Spinner, Switch, ToggleButton } from "@fluentui/react-components";
import {
  CheckmarkCircle16Filled,
  DismissCircle16Filled,
  QuestionCircle16Filled,
  Warning16Filled,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";
import { api, type Matrix, type MatrixCell, type MatrixRow } from "../api";
import { DOC_TYPE_LABEL, STATUS_LABEL, warningLabels } from "../labels";
import { ContractFile } from "./ContractFile";

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

function source(r: MatrixRow): string {
  if (r.format === "pdf_text") return "PDF";
  if (r.format === "txt") return "Text";
  const kind = r.format === "jpeg" ? "Photo scan" : "Scan";
  return r.ocr_mean_conf != null ? `${kind} · OCR ${Math.round(r.ocr_mean_conf)} %` : kind;
}

function Cell({ cell, label, onOpen }: { cell?: MatrixCell; label: string; onOpen: () => void }) {
  if (!cell) return <td className="mx-cell none">·</td>;
  const icon =
    cell.status === "PRESENT" ? <CheckmarkCircle16Filled /> : cell.status === "ABSENT" ? <DismissCircle16Filled /> : <QuestionCircle16Filled />;
  const changed = cell.model_status !== cell.status;
  const text =
    `${label}: ${STATUS_LABEL[cell.status]}` +
    (cell.required ? " – required for this type" : " – not required for this type") +
    (changed ? `. The model said “${STATUS_LABEL[cell.model_status]}”, the checks changed it.` : "");
  return (
    <td className={`mx-cell s-${cell.status.toLowerCase()} ${cell.required ? "req" : "opt"}`}>
      <button type="button" onClick={onOpen} aria-label={text} title={text}>
        {icon}
        {changed && <span className="mx-dot" aria-hidden />}
      </button>
    </td>
  );
}

export function Register() {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("merchant_agreement");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [query, setQuery] = useState("");
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [open, setOpen] = useState<{ docId: string; clause: string | null } | null>(null);

  useEffect(() => {
    api.matrix().then(setMatrix).catch((e) => setError(`API not reachable (${e})`));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": matrix?.rows.length ?? 0 };
    matrix?.rows.forEach((r) => (c[r.doc_type ?? "unknown"] = (c[r.doc_type ?? "unknown"] ?? 0) + 1));
    return c;
  }, [matrix]);

  if (error) return <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>;
  if (!matrix) return <Spinner label="Loading the register…" />;

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
            <div className="eyebrow">Contract register</div>
            <h2>{matrix.rows.length} documents, each compared with Legal's playbook</h2>
            <p className="lead">
              Every contract was read once, completely. Each column is a clause from the playbook – the standard we compare
              against. Click a cell or a contract to open its file with the evidence.
            </p>
          </div>
        </div>

        <div className="playbook">
          <div className="playbook-head">
            <span className="plan-label">Playbook</span>
            <span className="note">Legal's definitions as data (pipeline/catalogue.py) – changing one is a new prompt version.</span>
            <button type="button" className="link-btn" onClick={() => setShowDefinitions((s) => !s)}>
              {showDefinitions ? "Hide definitions" : "Show definitions"}
            </button>
          </div>
          <div className={`playbook-grid${showDefinitions ? " open" : ""}`}>
            {clauseKeys.map((k) => {
              const c = matrix.clauses[k];
              return (
                <div key={k} className="pb-card">
                  <div className="pb-label">{c.label}</div>
                  <div className="pb-req">required for {c.required_for.map((t) => DOC_TYPE_LABEL[t] ?? t).join(", ")}</div>
                  <div className="pb-def">{c.definition}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="mx-toolbar">
          <div className="type-filter" role="group" aria-label="Document type">
            {TYPES.map((t) => (
              <ToggleButton key={t.key} size="small" checked={type === t.key} appearance={type === t.key ? "primary" : "subtle"} onClick={() => setType(t.key)}>
                {t.label} <span className="count">{counts[t.key] ?? 0}</span>
              </ToggleButton>
            ))}
          </div>
          <div className="spacer" />
          <Switch checked={onlyGaps} onChange={(_, d) => setOnlyGaps(d.checked)} label="Only with gaps or former names" />
          <SearchBox placeholder="Search ID or party" value={query} onChange={(_, d) => setQuery(d.value)} />
        </div>

        <div className="mx-summary">
          <span><b>{rows.length}</b> shown</span>
          <span className="s-absent"><b>{withGaps}</b> with a required clause missing or unclear</span>
          <span className="s-unclear"><b>{openNames}</b> still naming a former company</span>
          <span className="legend-inline">
            <CheckmarkCircle16Filled className="c-ok" /> found <DismissCircle16Filled className="c-bad" /> missing{" "}
            <QuestionCircle16Filled className="c-warn" /> unclear · faded = not required for this type · dot = checks overruled the model
          </span>
        </div>

        <div className="mx-scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th className="mx-doc">Contract</th>
                <th>Type</th>
                <th>Date</th>
                <th>Law</th>
                <th>Source</th>
                {clauseKeys.map((k) => (
                  <th key={k} className="mx-clause" title={matrix.clauses[k].definition}>{matrix.clauses[k].label}</th>
                ))}
                <th className="mx-clause">Company name</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const warnings = warningLabels(r.flags);
                return (
                  <tr key={r.doc_id} className={r.duplicate_of ? "dup" : undefined}>
                    <td className="mx-doc">
                      <button type="button" className="mx-open" onClick={() => setOpen({ docId: r.doc_id, clause: r.gaps[0] ?? null })}>
                        <span className="mx-id">{r.doc_id}</span>
                        <span className="mx-party">{r.counterparty_name ?? "unknown party"}</span>
                      </button>
                      {(r.duplicate_of || r.is_amendment || warnings.length > 0) && (
                        <div className="mx-notes">
                          {r.duplicate_of && <span>copy of {r.duplicate_of}</span>}
                          {r.is_amendment && <span>{r.family_id !== r.doc_id ? `amendment of ${r.family_id}` : "amendment, base not in register"}</span>}
                          {warnings.map((w) => (
                            <span key={w} className="warn"><Warning16Filled /> {w}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{SHORT_TYPE[r.doc_type ?? "unknown"]}</td>
                    <td className="num">{r.effective_date ?? "–"}</td>
                    <td>{r.governing_law ?? "–"}</td>
                    <td className="src">{source(r)}</td>
                    {clauseKeys.map((k) => (
                      <Cell key={k} cell={r.cells[k]} label={matrix.clauses[k].label} onOpen={() => setOpen({ docId: r.doc_id, clause: k })} />
                    ))}
                    <td className="mx-name">
                      {r.former_names.open > 0 ? (
                        <span className="name-open">{r.former_names.open} former</span>
                      ) : r.former_names.resolved > 0 ? (
                        <span className="name-resolved">resolved</span>
                      ) : (
                        <span className="name-ok">current</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ContractFile open={open} clauses={matrix.clauses} onClose={() => setOpen(null)} />
    </div>
  );
}
