// The plan card of step 1 (spec 2.1, 4.1): the question, which contracts ("every merchant agreement",
// or narrowed down by law, date, party or IDs), which contracts that is - from POST /runs/preview, the
// same function the answer uses, so the number cannot drift (D10) - and the cost. "Confirm the plan"
// is the only main button of the screen. The preview names the contracts, never what is found in them.
import { Button, Dropdown, Field, Input, Option, Spinner } from "@fluentui/react-components";
import { ChevronDown16Regular, ChevronUp16Regular, Dismiss12Regular, Play16Filled } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, ApiError, type MatrixRow, type Plan, type Preview } from "../api";
import { applyScope, country, describe, hasFilters, NO_FILTERS, planFor, year, type ScopeFilters } from "../filters";
import { useT } from "../i18n";
import { DOC_TYPE_LABEL, EVERY_TYPE, exclusionReason, OF_TYPE, planQuestion } from "../labels";
import type { Meta } from "./AskStep";
import "./workbench.css";

const TYPES = ["merchant_agreement", "data_processing_agreement", "other_commercial_agreement", "amendment"];
const DEBOUNCE_MS = 250;

interface Props {
  meta: Meta;
  plan: Plan | null;
  type: string;                    // "" = every type
  filters: ScopeFilters;
  rows: MatrixRow[] | null;        // the register now; null while it loads
  fromRegister: boolean;           // the filters came with the address (the register's "Ask in the Workbench")
  busy: boolean;
  onType: (type: string) => void;
  onFilters: (f: ScopeFilters) => void;
  onConfirm: (sent: Plan) => void;
}

export function PlanCard({ meta, plan, type, filters, rows, fromRegister, busy, onType, onFilters, onConfirm }: Props) {
  const t = useT();
  const [narrow, setNarrow] = useState(false);
  const [preview, setPreview] = useState<{ key: string; data: Preview | null; error: string | null } | null>(null);

  const missing = plan ? (meta.checks[plan.check]?.required ?? []).filter((name) => !plan.params[name]) : [];
  // the plan that is sent: no scope for the type alone (the server's own rule), else the ids the filters keep
  const sent = plan && missing.length === 0 ? planFor(plan, type, filters, rows ?? []) : null;
  const waiting = !!sent?.scope && rows == null;                  // the filters need the register first
  const empty = !!sent?.scope && !waiting && sent.scope.doc_ids.length === 0;
  const key = sent && !waiting && !empty ? JSON.stringify(sent) : "";
  const reason = !plan ? t("Pick a question first")
    : missing.includes("clause_type") ? t("Choose the clause")
    : missing.length ? t("Expected governing law")
    : empty ? t("No contract matches these filters.") : null;

  // the preview, 250 ms after the last change; an older API without it simply shows no "In scope" row
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api.previewRun(JSON.parse(key) as Plan)
        .then((data) => !cancelled && setPreview({ key, data, error: null }))
        .catch((e) => {
          if (cancelled) return;
          const absent = e instanceof ApiError && (e.status === 404 || e.status === 405);
          setPreview({ key, data: null, error: absent ? null : e instanceof Error ? e.message : String(e) });
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key]);
  const shown = preview?.key === key ? preview : null;

  // "Contracts": every contract of the type, or "7 of 21 merchant agreements" with the filters as chips
  const all = rows ? applyScope(rows, type, NO_FILTERS).ids.length : null;
  const kept = sent?.scope && rows ? applyScope(rows, type, filters).keptIn : [];
  const terms = filters.search.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const oneByOne = fromRegister && !filters.law && !filters.from && !filters.to && terms.length > 0
    && !!rows && terms.every((q) => rows.some((r) => r.doc_id.toLowerCase() === q));
  const contracts = !sent?.scope ? t(EVERY_TYPE[type] ?? EVERY_TYPE[""])
    : oneByOne ? t("{ids} (opened from the register)", { ids: filters.search })
    : t(OF_TYPE[type] ?? OF_TYPE[""], { n: sent.scope.doc_ids.length, of: all ?? "…" });
  const set = (k: keyof ScopeFilters, v: string) => onFilters({ ...filters, [k]: v });
  const laws = rows ? [...new Set(rows.map(country).filter((c): c is string => !!c))].sort() : [];
  const years = rows ? [...new Set(rows.map(year).filter((y): y is string => !!y))].sort() : [];
  const lawText = (l: string) => (l === "none" ? t("not found") : l || t("any"));

  return (
    <aside className="panel plan-card" aria-labelledby="plan-title">
      <div className="eyebrow" id="plan-title">{t("Your plan")}</div>
      <p className="plan-lead">{t("Nothing runs before you confirm it.")}</p>
      <dl className="plan-rows">
        <dt>{t("Question")}</dt>
        <dd>{plan ? planQuestion(plan, meta.clauses, t) : <span className="muted">–</span>}</dd>

        <dt>{t("Contracts")}</dt>
        <dd>
          <span>{contracts}</span>
          {(["law", "from", "to", "search"] as const).filter((k) => filters[k] && !(k === "search" && oneByOne)).map((k) => (
            <span key={k} className="plan-chip">
              {describe({ ...NO_FILTERS, [k]: filters[k] }, t)}
              <button type="button" aria-label={t("Close")} onClick={() => set(k, "")}><Dismiss12Regular /></button>
            </span>
          ))}
          <div className="plan-links">
            <button type="button" className="link-btn" aria-expanded={narrow} onClick={() => setNarrow((o) => !o)}>
              {t("Narrow down")} {narrow ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
            </button>
            {hasFilters(filters) && (
              <button type="button" className="link-btn" onClick={() => onFilters(NO_FILTERS)}>
                {t("Use {every} instead", { every: t(EVERY_TYPE[type] ?? EVERY_TYPE[""]) })}
              </button>
            )}
          </div>
        </dd>
      </dl>
      {narrow && (
        <div className="narrow">
          <Field label={t("Contract type")} size="small" className="narrow-wide">
            <Dropdown size="small" value={t(DOC_TYPE_LABEL[type || "all documents"])} selectedOptions={[type]}
                      onOptionSelect={(_, d) => onType(d.optionValue ?? "")}>
              <Option value="">{t("all documents")}</Option>
              {TYPES.map((k) => <Option key={k} value={k}>{t(DOC_TYPE_LABEL[k])}</Option>)}
            </Dropdown>
          </Field>
          <Field label={t("Party or IDs")} size="small" className="narrow-wide">
            <Input size="small" value={filters.search} placeholder={t("M03, M08 or a party")} maxLength={100}
                   onChange={(_, d) => set("search", d.value)} />
          </Field>
          <Field label={t("Law")} size="small">
            <Dropdown size="small" value={lawText(filters.law)} selectedOptions={[filters.law]}
                      onOptionSelect={(_, d) => set("law", d.optionValue ?? "")}>
              <Option value="">{t("any")}</Option>
              {laws.map((l) => <Option key={l} value={l}>{l}</Option>)}
              <Option value="none">{t("not found")}</Option>
            </Dropdown>
          </Field>
          <Field label={t("dated from")} size="small">
            <Dropdown size="small" value={filters.from || t("any year")} selectedOptions={[filters.from]}
                      onOptionSelect={(_, d) => set("from", d.optionValue ?? "")}>
              <Option value="">{t("any year")}</Option>
              {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
            </Dropdown>
          </Field>
          <Field label={t("dated to")} size="small">
            <Dropdown size="small" value={filters.to || t("any year")} selectedOptions={[filters.to]}
                      onOptionSelect={(_, d) => set("to", d.optionValue ?? "")}>
              <Option value="">{t("any year")}</Option>
              {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
            </Dropdown>
          </Field>
        </div>
      )}
      <dl className="plan-rows">
        <dt>{t("In scope")}</dt>
        <dd>
          {shown?.data ? (
            <>
              <b>{shown.data.coverage.in_scope}</b>
              {kept.length > 0 && (
                <> · {t("kept in, the filter cannot judge them: {list}", { list: kept.map((k) => `${k.doc_id} (${t(k.why)})`).join(", ") })}</>
              )}
              {shown.data.coverage.excluded.filter((e) => !kept.some((k) => k.doc_id === e.doc_id)).map((e) => (
                <span key={e.doc_id}>
                  {" · "}
                  {e.reason.startsWith("not extracted")
                    ? t("{id}: not read yet – it will be listed, not checked", { id: e.doc_id })
                    : t("{id} will be excluded: {reason}", { id: e.doc_id, reason: exclusionReason(e.reason, t) })}
                </span>
              ))}
            </>
          ) : shown?.error ? (
            <span className="plan-error">{shown.error}</span>
          ) : empty ? (
            <span className="plan-error">{t("No contract matches these filters.")}</span>
          ) : (
            <span className="muted">–</span>
          )}
        </dd>

        <dt>{t("Cost")}</dt>
        <dd>{t("register query · no model call · $0")}</dd>
      </dl>

      <div className="plan-go">
        <Button appearance="primary" size="large" className="hero-btn" disabled={busy || !sent || waiting || empty}
                icon={busy ? <Spinner size="tiny" /> : <Play16Filled />} onClick={() => sent && onConfirm(sent)}>
          {t("Confirm the plan")}
        </Button>
        {reason && <span className="plan-why">{reason}</span>}
      </div>
    </aside>
  );
}
