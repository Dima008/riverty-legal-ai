// Step 2 · Contracts (decision 95, spec 1.1, panel ②): which contracts the analysis runs on - a type with its
// count, and law, dates and "Party or IDs", always open. Which contracts that is comes from POST
// /runs/preview, the same function the answer uses, so the number cannot drift (D10): the contracts in
// scope as neutral chips, every exclusion with its reason, the ones a filter left out. The preview names
// the contracts, never what is found in them. "Confirm the plan" is the only main button of the screen.
import { Button, Dropdown, Field, Input, Option, Spinner } from "@fluentui/react-components";
import { Play16Filled } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, ApiError, type MatrixRow, type Plan, type Preview } from "../api";
import { LightIcon } from "../components/Badges";
import { applyScope, country, describe, hasFilters, NO_FILTERS, planFor, year, type ScopeFilters } from "../filters";
import { useT } from "../i18n";
import { exclusionReason, IN_SCOPE_EVERY, OF_TYPE } from "../labels";
import "./workbench.css";

const TYPES: [string, string][] = [
  ["merchant_agreement", "Merchant agreements"],
  ["data_processing_agreement", "Data processing agreements"],
  ["other_commercial_agreement", "Other"],
  ["", "All"],
];
const DEBOUNCE_MS = 250;
const CHIPS_MAX = 22;              // two rows at 1366 px, with room for "+n more" on the second
const NOT_CHOSEN_MAX = 12;         // the ids a filter left out, named up to here, then "+n more"

interface Props {
  plan: Plan | null;               // null: no analysis chosen yet
  missing: string | null;          // what the analysis still needs ("Expected law")
  type: string;                    // "" = every type
  filters: ScopeFilters;
  rows: MatrixRow[] | null;        // the register now; null while it loads
  busy: boolean;
  onType: (type: string) => void;
  onFilters: (f: ScopeFilters) => void;
  onConfirm: (sent: Plan) => void;
}

export function ContractsStep({ plan, missing, type, filters, rows, busy, onType, onFilters, onConfirm }: Props) {
  const t = useT();
  const [preview, setPreview] = useState<{ key: string; data: Preview | null; error: string | null } | null>(null);

  // the plan that is sent: no scope for the type alone (the server's own rule), else the ids the filters keep
  const sent = plan && !missing ? planFor(plan, type, filters, rows ?? []) : null;
  const waiting = !!sent?.scope && rows == null;                  // the filters need the register first
  const empty = !!sent?.scope && !waiting && sent.scope.doc_ids.length === 0;
  const key = sent && !waiting && !empty ? JSON.stringify(sent) : "";

  // the preview, 250 ms after the last change
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api.previewRun(JSON.parse(key) as Plan)
        .then((data) => !cancelled && setPreview({ key, data, error: null }))
        .catch((e) => !cancelled && setPreview({ key, data: null, error: e instanceof ApiError ? e.message : String(e) }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key]);
  const cov = preview?.key === key ? preview.data?.coverage ?? null : null;
  const previewError = preview?.key === key ? preview.error : null;

  const count = (k: string) => (rows ? applyScope(rows, k, NO_FILTERS).ids.length : null);
  const all = rows ? applyScope(rows, type, NO_FILTERS).ids : [];
  const chosen = new Set([...(cov?.checked_ids ?? []), ...(cov?.excluded.map((e) => e.doc_id) ?? [])]);
  const excluded = new Map(cov?.excluded.map((e) => [e.doc_id, e.reason]) ?? []);
  const notChosen = sent?.scope ? all.filter((id) => !chosen.has(id)) : [];
  const kept = sent?.scope && rows ? applyScope(rows, type, filters).keptIn : [];
  // the chosen contracts first, then the ones a filter left out - so a narrow selection is never hidden
  const chips = [...new Set([...all, ...chosen])].sort((a, b) => Number(!chosen.has(a)) - Number(!chosen.has(b)) || a.localeCompare(b));
  const notChosenText = notChosen.length > NOT_CHOSEN_MAX
    ? `${notChosen.slice(0, NOT_CHOSEN_MAX).join(", ")} ${t("+{n} more", { n: notChosen.length - NOT_CHOSEN_MAX })}` : notChosen.join(", ");
  const set = (k: keyof ScopeFilters, v: string) => onFilters({ ...filters, [k]: v });
  const laws = rows ? [...new Set(rows.map(country).filter((c): c is string => !!c))].sort() : [];
  const years = rows ? [...new Set(rows.map(year).filter((y): y is string => !!y))].sort() : [];
  const lawText = (l: string) => (l === "none" ? t("not found") : l || t("any"));

  return (
    <section className="panel cpanel" aria-labelledby="cpanel-title">
      <div className="eyebrow" id="cpanel-title">{t("2 · Which contracts?")}</div>

      <div className="type-seg" role="radiogroup" aria-label={t("Contract type")}>
        {TYPES.map(([k, label]) => (
          <button key={k || "all"} type="button" role="radio" aria-checked={type === k} className={`seg${type === k ? " on" : ""}`}
                  disabled={!plan} onClick={() => onType(k)}>
            {t(label)} <span className="seg-n">{count(k) ?? ""}</span>
          </button>
        ))}
      </div>
      <div className="c-fields">
        <Field label={t("Law")} size="small">
          <Dropdown size="small" value={lawText(filters.law)} selectedOptions={[filters.law]} disabled={!plan}
                    onOptionSelect={(_, d) => set("law", d.optionValue ?? "")}>
            <Option value="">{t("any")}</Option>
            {laws.map((l) => <Option key={l} value={l}>{l}</Option>)}
            <Option value="none">{t("not found")}</Option>
          </Dropdown>
        </Field>
        <Field label={t("Dated from")} size="small">
          <Dropdown size="small" value={filters.from || t("any")} selectedOptions={[filters.from]} disabled={!plan}
                    onOptionSelect={(_, d) => set("from", d.optionValue ?? "")}>
            <Option value="">{t("any")}</Option>
            {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
          </Dropdown>
        </Field>
        <Field label={t("to")} size="small">
          <Dropdown size="small" value={filters.to || t("any")} selectedOptions={[filters.to]} disabled={!plan}
                    onOptionSelect={(_, d) => set("to", d.optionValue ?? "")}>
            <Option value="">{t("any")}</Option>
            {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
          </Dropdown>
        </Field>
        <Field label={t("Party or IDs")} size="small" className="c-wide">
          <Input size="small" value={filters.search} placeholder={t("M03, M08 or a party")} maxLength={100} disabled={!plan}
                 onChange={(_, d) => set("search", d.value)} />
        </Field>
      </div>

      <div className="c-scope" aria-live="polite">
        {!plan ? (
          <p className="muted">{t("Choose an analysis first.")}</p>
        ) : missing ? (
          <p className="plan-error">{t(missing)}</p>
        ) : empty ? (
          <p className="plan-error">{t("No contract matches these filters.")}</p>
        ) : previewError ? (
          <p className="plan-error">{previewError}</p>
        ) : !cov ? (
          <div className="muted"><Spinner size="tiny" /> {t("Loading…")}</div>
        ) : (
          <>
            <p className="c-line1">
              {sent?.scope ? (
                <>
                  <b>{t(OF_TYPE[type] ?? OF_TYPE[""], { n: cov.in_scope, of: all.length })}</b> {t("chosen")}
                  {hasFilters(filters) && <> · {describe(filters, t)} · <button type="button" className="link-btn" onClick={() => onFilters(NO_FILTERS)}>{t("Clear")}</button></>}
                </>
              ) : (
                <b>{t(IN_SCOPE_EVERY[type] ?? IN_SCOPE_EVERY[""], { n: cov.in_scope })}</b>
              )}
            </p>
            <p className="c-line2">
              <b>{t("{n} will be evaluated", { n: cov.checked })}</b>
              {cov.excluded.length > 0 && <> · {t("{n} not evaluated, each with its reason:", { n: cov.excluded.length })}</>}
              {cov.excluded.map((e, i) => (
                <span key={e.doc_id}>{i > 0 && " ·"} <LightIcon light="excluded" /> <b>{e.doc_id}</b> {exclusionReason(e.reason, t)}</span>
              ))}
            </p>
            {kept.length > 0 && (
              <p className="note">{t("kept in, the filter cannot judge them: {list}", { list: kept.map((k) => `${k.doc_id} (${t(k.why)})`).join(", ") })}</p>
            )}
            {notChosen.length > 0 && (
              <p className="note">{t("Not chosen ({n}): {ids}", { n: notChosen.length, ids: notChosenText })}</p>
            )}
            <p className="note">{t("The answer is not shown before you confirm – these are only the contracts.")}</p>
            <ul className="id-chips" aria-label={t("The contracts of the plan")}>
              {chips.slice(0, CHIPS_MAX).map((id) => (
                <li key={id} className={`idc${excluded.has(id) ? " excl" : chosen.has(id) ? "" : " out"}`}
                    title={excluded.has(id) ? exclusionReason(excluded.get(id)!, t) : chosen.has(id) ? id : t("not chosen")}>
                  {id}
                </li>
              ))}
              {chips.length > CHIPS_MAX && <li className="idc more">{t("+{n} more", { n: chips.length - CHIPS_MAX })}</li>}
            </ul>
          </>
        )}
      </div>

      <div className="plan-go">
        <Button appearance="primary" size="large" className="hero-btn" disabled={busy || !sent || waiting || empty || !cov}
                icon={busy ? <Spinner size="tiny" /> : <Play16Filled />} onClick={() => sent && onConfirm(sent)}>
          {t("Confirm the plan")}
        </Button>
        <span className="plan-why">
          {!cov ? t("register query · no model call · $0")
            : cov.checked === 1 ? t("evaluates 1 contract · from the register · no model call · $0")
            : t("evaluates {n} contracts · from the register · no model call · $0", { n: cov.checked })}
        </span>
      </div>
    </section>
  );
}
