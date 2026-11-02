// Step 1 · Analysis (decision 95, spec 1.1): five boxes, one per kind of analysis - clearly separated, each
// with its question and how the register proves it. Below the boxes, panel ① asks the one thing the analysis
// needs (which clause, which law) and says in which three colours the answer will show every contract.
// A click only chooses: nothing runs before the lawyer confirms the plan in panel ② (ContractsStep).
import { Input } from "@fluentui/react-components";
import {
  CheckmarkCircle20Filled, DocumentCopy20Regular, DocumentDismiss20Regular, DocumentSearch20Regular, Gavel20Regular,
  History20Regular,
} from "@fluentui/react-icons";
import type { ReactElement } from "react";
import type { CheckSpec, ClauseSpec, Example, Plan } from "../api";
import { LightIcon } from "../components/Badges";
import { newLines } from "../components/newLines";
import { useLang, useT } from "../i18n";
import { ANALYSES, DOC_TYPE_LABEL, type Analysis, type AnalysisId } from "../labels";
import { useRegisterLive } from "../live";
import "./workbench.css";

export interface Meta {
  examples: Example[];
  checks: Record<string, CheckSpec>;
  clauses: Record<string, ClauseSpec>;
}

const STRIP_MAX = 3;

/** "New in the register": what arrived in the last 24 hours or is being read, in the words of the talk's
 *  live-add card - the same lines as the header's register pill (newLines.ts). Hidden when nothing is new. */
export function NewStrip({ onOpen }: { onOpen: (docId: string) => void }) {
  const t = useT();
  const lang = useLang();
  const live = useRegisterLive();
  if (!live.matrix) return null;
  const busy = new Set([...live.newDocs, ...live.reading, ...live.failed].map((r) => r.doc_id));
  const rows = live.matrix.rows.filter((r) => busy.has(r.doc_id));
  if (rows.length === 0) return null;
  return (
    <section className="new-strip" aria-label={t("New in the register")}>
      <div className="eyebrow">{t("New in the register")}</div>
      <ul>
        {rows.slice(0, STRIP_MAX).map((r) => (
          <li key={r.doc_id}>
            <b>{r.doc_id}</b>
            {newLines(r, live.matrix!.clauses, t, lang).map((l) => (
              <span key={l.text} className={l.warn ? "warn" : undefined}> · {l.text}</span>
            ))}{" "}
            <button type="button" className="link-btn" onClick={() => onOpen(r.doc_id)}>{t("Open file")}</button>
          </li>
        ))}
      </ul>
      {rows.length > STRIP_MAX && (
        <a className="new-more" href="#/tool/register?type=all&only=new">{t("+{n} more in the register ›", { n: rows.length - STRIP_MAX })}</a>
      )}
    </section>
  );
}

const ICON: Record<AnalysisId, ReactElement> = {
  missing: <DocumentDismiss20Regular />,
  find: <DocumentSearch20Regular />,
  names: <History20Regular />,
  law: <Gavel20Regular />,
  copies: <DocumentCopy20Regular />,
};

/** The five boxes: one radio group; the chosen box has a mint border and ✓ (mint = your choice). */
export function AnalysisBoxes({ chosen, compact, onChoose }: { chosen: AnalysisId | null; compact: boolean; onChoose: (a: Analysis) => void }) {
  const t = useT();
  return (
    <section className="analysis" aria-labelledby="analysis-title">
      <div className="analysis-head">
        <div className="eyebrow" id="analysis-title">{t("1 · Which analysis?")}</div>
        <p className="analysis-lead">{t("Choose one analysis, then the contracts. Nothing runs before you confirm the plan.")}</p>
      </div>
      <div className={`boxes${compact ? " compact" : ""}`} role="radiogroup" aria-labelledby="analysis-title">
        {ANALYSES.map((a) => {
          const on = chosen === a.id;
          return (
            <button key={a.id} type="button" role="radio" aria-checked={on} className={`abox${on ? " on" : ""}`}
                    onClick={() => onChoose(a)} title={`${t(a.question)} – ${t(a.proof)}`}>
              <span className="abox-top">
                <span className="abox-icon" aria-hidden>{ICON[a.id]}</span>
                {a.pilot && <span className="q-pilot">{t("Pilot")}</span>}
                {on && <CheckmarkCircle20Filled className="abox-check" aria-hidden />}
              </span>
              <span className="abox-title">{t(a.title)}</span>
              <span className="abox-q">{t(a.question)}</span>
              <span className="abox-proof">{t(a.proof)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface PanelProps {
  meta: Meta;
  analysis: Analysis;
  plan: Plan;
  onPlan: (plan: Plan, type?: string) => void;     // a new parameter; a clause also sets its contract type
}

/** Panel ①: the analysis' one parameter, what the register looks for, and the legend of its answer. */
export function AnalysisPanel({ meta, analysis, plan, onPlan }: PanelProps) {
  const t = useT();
  const law = plan.params.law ?? "DE";
  const clauseKey = plan.params.clause_type;
  const names = meta.checks.legacy_names?.names ?? [];
  const legend = analysis.legend.map(([word, line], i): [string, string, "red" | "orange" | "green"] => {
    // "Find a clause" lists green first; "Expected law" names the law
    const lit = analysis.id === "find" ? (["green", "orange", "red"] as const)[i] : (["red", "orange", "green"] as const)[i];
    return [word === "Expected law" ? t("{law} law", { law }) : t(word), t(line), lit];
  });
  return (
    <section className="panel apanel" aria-labelledby="apanel-title">
      <div className="eyebrow" id="apanel-title">
        {analysis.check === "missing_clause" ? t("1 · {analysis} – which clause?", { analysis: t(analysis.title) })
          : analysis.id === "law" ? t("1 · {analysis} – which law is expected?", { analysis: t(analysis.title) })
          : t("1 · {analysis} – what is searched", { analysis: t(analysis.title) })}
      </div>

      {analysis.check === "missing_clause" && (
        <>
          <div className="clause-list" role="radiogroup" aria-label={t("Clause")}>
            {Object.entries(meta.clauses).map(([k, c]) => (
              <label key={k} className={`clause-row${k === clauseKey ? " on" : ""}`}>
                <input type="radio" name="clause" checked={k === clauseKey}
                       onChange={() => onPlan({ ...plan, params: { ...plan.params, clause_type: k } }, c.required_for[0] ?? "")} />
                <span className="clause-name">{t(c.label)}{k === "liability_limitation" && <span className="q-pilot">{t("Pilot")}</span>}</span>
                <span className="clause-type">{c.required_for.map((d) => t(DOC_TYPE_LABEL[d] ?? d)).join(", ")}</span>
              </label>
            ))}
          </div>
          {clauseKey && meta.clauses[clauseKey] && (
            // two lines here; the whole definition in the tooltip and in the playbook
            <p className="looked-for clamp-2" title={meta.clauses[clauseKey].definition}>
              <b>{t("What we look for")}</b> {meta.clauses[clauseKey].definition}
            </p>
          )}
        </>
      )}
      {analysis.id === "names" && (
        <p className="looked-for">
          <b>{t("Exact search over the whole text for")}</b> {names.join(" · ")}
        </p>
      )}
      {analysis.id === "law" && (
        <div className="law-field">
          <label htmlFor="expected-law"><b>{t("Expected law")}</b></label>
          <Input id="expected-law" value={plan.params.law ?? ""} placeholder="DE" maxLength={2}
                 onChange={(_, d) => onPlan({ ...plan, params: { ...plan.params, law: d.value.toUpperCase() } })} />
          <span className="note">{t("Two letters, e.g. DE. Contracts read before the register quoted the law show “not checked yet” (orange).")}</span>
        </div>
      )}
      {analysis.id === "copies" && (
        <p className="looked-for">
          <b>{t("A copy is")}</b> {t("the same text (fingerprint), or at least 98 % the same text for the same party.")}
        </p>
      )}

      <div className="legend-box">
        <div className="legend-title">{t("You will see every contract – in one of three colours")}</div>
        <ul>
          {legend.map(([word, line, lit]) => (
            <li key={lit}>
              <LightIcon light={lit} /> <b className={`sw-${lit}`}>{word}</b> <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="note">{t("Contracts that cannot be evaluated are named, with the reason – never dropped.")}</p>
      </div>
    </section>
  );
}
