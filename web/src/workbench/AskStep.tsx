// Step 1 · Ask (spec 2.1, decision 93): every question in one box - the eight example questions grouped
// by topic, the two pilot questions of the case study tagged "Pilot", and "Build your own question" at
// its end. A click only chooses: the plan card beside it shows which contracts and which check, and
// nothing runs before the lawyer confirms the plan (decision 55: a planner without a model first).
import { Dropdown, Field, Input, Option } from "@fluentui/react-components";
import {
  CheckmarkCircle20Filled, DocumentCopy20Regular, DocumentDismiss20Regular, Gavel20Regular, History20Regular,
} from "@fluentui/react-icons";
import type { ReactElement } from "react";
import type { CheckSpec, Example, Plan } from "../api";
import { newLines } from "../components/newLines";
import { useLang, useT } from "../i18n";
import { QUESTION_CATEGORY } from "../labels";
import { useRegisterLive } from "../live";
import "./workbench.css";

export interface Meta {
  examples: Example[];
  checks: Record<string, CheckSpec>;
  clauses: Record<string, { label: string; definition: string }>;
}

const STRIP_MAX = 3;

/** "New in the register" (spec 2.1, 5.1): what arrived in the last 24 hours or is being read, in the words
 *  of the talk's live-add card - the same lines as the header's register pill (newLines.ts). Hidden when
 *  nothing is new. */
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

// the case study's two pilot questions: "Which contracts lack clause X?" and "Which still name a legacy company?"
const PILOTS = ["Q1", "Q2"];

// one icon per topic: what the question looks for, in lawyers' words (labels.ts QUESTION_CATEGORY)
const TOPIC_ICON: Record<string, ReactElement> = {
  missing_clause: <DocumentDismiss20Regular />,
  legacy_names: <History20Regular />,
  governing_law_not: <Gavel20Regular />,
  duplicates: <DocumentCopy20Regular />,
};

/** Build your own question: the check, the clause, the expected law. Which contracts is the plan card's job. */
function PlanBuilder({ meta, plan, onChange }: { meta: Meta; plan: Plan | null; onChange: (p: Plan) => void }) {
  const t = useT();
  const check = plan?.check ?? "";
  const spec = meta.checks[check];
  const set = (key: string, value: string) => plan && onChange({ ...plan, params: { ...plan.params, [key]: value } });
  // a law question starts with German law, so it is never sent without one
  const start = (c: string) => onChange({ check: c, params: c === "governing_law_not" ? { law: "DE" } : {} });
  return (
    <div className="builder">
      {/* the question types in the words of the topics above (labels.ts QUESTION_CATEGORY), not the API's labels */}
      <Field label={t("Question type")}>
        <Dropdown value={spec ? t(QUESTION_CATEGORY[check] ?? spec.label) : ""} placeholder={t("Choose a question type")}
                  selectedOptions={check ? [check] : []} onOptionSelect={(_, d) => start(d.optionValue ?? check)}>
          {Object.entries(meta.checks).map(([k, c]) => (
            <Option key={k} value={k}>{t(QUESTION_CATEGORY[k] ?? c.label)}</Option>
          ))}
        </Dropdown>
      </Field>
      {spec && "clause_type" in spec.params && (
        <Field label={t("Clause")}>
          <Dropdown
            value={t(meta.clauses[plan?.params.clause_type ?? ""]?.label ?? "")}
            placeholder={t("Choose a clause")}
            selectedOptions={plan?.params.clause_type ? [plan.params.clause_type] : []}
            onOptionSelect={(_, d) => set("clause_type", d.optionValue ?? "")}
          >
            {Object.entries(meta.clauses).map(([k, c]) => (
              <Option key={k} value={k}>{t(c.label)}</Option>
            ))}
          </Dropdown>
        </Field>
      )}
      {spec && "law" in spec.params && (
        <Field label={t("Expected governing law")}>
          <Input value={plan?.params.law ?? ""} placeholder="DE" onChange={(_, d) => set("law", d.value.toUpperCase())} maxLength={2} />
        </Field>
      )}
    </div>
  );
}

interface Props {
  meta: Meta;
  picked: string | null;          // the chosen example question (Q1-Q8)
  plan: Plan | null;
  onExample: (ex: Example) => void;
  onPlan: (p: Plan) => void;      // a question built by hand
}

export function AskStep({ meta, picked, plan, onExample, onPlan }: Props) {
  const t = useT();
  const lang = useLang();
  const text = (ex: Example) => (lang === "de" ? ex.question_de : ex.question);   // the API sends both languages
  // one group per topic, in the order the examples come: clause not found, former name, law, copies
  const topics = [...new Set(meta.examples.map((e) => e.plan.check))];
  return (
    <section className="panel ask-step" aria-labelledby="ask-title">
      <h2 id="ask-title">{t("What do you want to know about the contracts?")}</h2>
      <p className="lead">{t("Pick a question. You see the plan – which contracts, which check – before anything runs.")}</p>

      <div className="q-groups">
        {topics.map((check) => (
          <div key={check} className="q-group" role="group" aria-labelledby={`q-topic-${check}`}>
            <div className="q-kind" id={`q-topic-${check}`}>
              <span className="q-kind-icon" aria-hidden>{TOPIC_ICON[check]}</span>
              {t(QUESTION_CATEGORY[check] ?? check)}
            </div>
            <ul className="q-list">
              {meta.examples.filter((e) => e.plan.check === check).map((ex) => {
                const on = picked === ex.id;
                return (
                  <li key={ex.id}>
                    <button type="button" className={`q-row${on ? " selected" : ""}`} aria-pressed={on} onClick={() => onExample(ex)}>
                      <span className="q-text">
                        {text(ex)}
                        {PILOTS.includes(ex.id) && <span className="q-pilot">{t("Pilot")}</span>}
                      </span>
                      {on && <CheckmarkCircle20Filled className="q-check" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="q-own">
        <div className="q-kind">{t("Build your own question")}</div>
        <PlanBuilder meta={meta} plan={picked ? null : plan} onChange={onPlan} />
      </div>
    </section>
  );
}
