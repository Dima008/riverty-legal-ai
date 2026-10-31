// Step 1: a question becomes a plan. Ready-made questions as cards, or build the check yourself.
// The plan is shown before anything runs; the lawyer confirms it (decision 55: planner without
// a model first).
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  Dropdown,
  Field,
  Input,
  Option,
  Spinner,
} from "@fluentui/react-components";
import { CheckmarkCircle20Filled, Play16Filled } from "@fluentui/react-icons";
import type { CheckSpec, Example, Plan, Scope } from "../api";
import { useLang, useT } from "../i18n";
import { DOC_TYPE_LABEL, scopeText } from "../labels";

export interface Meta {
  examples: Example[];
  checks: Record<string, CheckSpec>;
  clauses: Record<string, { label: string; definition: string }>;
}

// "UC2 negative clause search (B2B2C)" -> "Negative clause search (B2B2C)"; "UC2/UC4 inbound" -> "Inbound (DPA)"
const useCase = (uc: string) => {
  const s = uc.replace(/^(?:UC\d+\/?)+\s*/i, "");
  if (s === "inbound") return "Inbound (DPA)";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function PlanBuilder({ meta, plan, onChange }: { meta: Meta; plan: Plan; onChange: (p: Plan) => void }) {
  const t = useT();
  const spec = meta.checks[plan.check];
  const set = (key: string, value: string) => onChange({ ...plan, params: { ...plan.params, [key]: value } });
  return (
    <div className="builder">
      <Field label={t("Check")}>
        <Dropdown value={spec ? t(spec.label) : ""} selectedOptions={[plan.check]} onOptionSelect={(_, d) => onChange({ check: d.optionValue ?? plan.check, params: {} })}>
          {Object.entries(meta.checks).map(([k, c]) => (
            <Option key={k} value={k}>{t(c.label)}</Option>
          ))}
        </Dropdown>
      </Field>
      {spec && "clause_type" in spec.params && (
        <Field label={t("Clause")}>
          <Dropdown
            value={t(meta.clauses[plan.params.clause_type]?.label ?? "")}
            placeholder={t("Choose a clause")}
            selectedOptions={plan.params.clause_type ? [plan.params.clause_type] : []}
            onOptionSelect={(_, d) => set("clause_type", d.optionValue ?? "")}
          >
            {Object.entries(meta.clauses).map(([k, c]) => (
              <Option key={k} value={k}>{t(c.label)}</Option>
            ))}
          </Dropdown>
        </Field>
      )}
      {spec && "doc_type" in spec.params && (
        <Field label={t("Scope")}>
          <Dropdown
            value={t(DOC_TYPE_LABEL[plan.params.doc_type || "all documents"])}
            selectedOptions={[plan.params.doc_type ?? ""]}
            onOptionSelect={(_, d) => set("doc_type", d.optionValue ?? "")}
          >
            <Option value="">{t("all documents")}</Option>
            {["merchant_agreement", "data_processing_agreement", "other_commercial_agreement"].map((type) => (
              <Option key={type} value={type}>{t(DOC_TYPE_LABEL[type])}</Option>
            ))}
          </Dropdown>
        </Field>
      )}
      {spec && "law" in spec.params && (
        <Field label={t("Expected governing law")}>
          <Input value={plan.params.law ?? ""} placeholder="DE" onChange={(_, d) => set("law", d.value.toUpperCase())} maxLength={2} />
        </Field>
      )}
    </div>
  );
}

function PlanSummary({ plan, meta, scope }: { plan: Plan; meta: Meta; scope: Scope | null }) {
  const t = useT();
  const p = plan.params;
  const check = meta.checks[plan.check]?.label;
  const clause = p.clause_type && meta.clauses[p.clause_type]?.label;
  const parts = [
    check && t(check),
    clause && t(clause),
    p.law && t("law is not {law}", { law: p.law }),
    // the whole phrase is the key: German needs another case after "in" ("in Händlerverträgen")
    t(`in ${DOC_TYPE_LABEL[p.doc_type || "all documents"] ?? p.doc_type}`),
    scope && t("{n} selected contracts", { n: scope.doc_ids.length }),
  ].filter(Boolean);
  return (
    <ol className="plan-steps" aria-label={t("Plan")}>
      {parts.map((part, i) => (
        <li key={i}>
          {i > 0 && <span className="sep" aria-hidden>›</span>}
          <span className="chip">{part}</span>
        </li>
      ))}
    </ol>
  );
}

/** Required parameters that are still empty – the plan cannot run until they are set. */
export const missingParams = (plan: Plan, meta: Meta) =>
  (meta.checks[plan.check]?.required ?? []).filter((name) => !plan.params[name]);

interface Props {
  meta: Meta;
  question: string | null;
  plan: Plan;
  scope: Scope | null;          // contracts chosen in the register, or null = every contract of the type
  onClearScope: () => void;
  busy: boolean;
  onExample: (ex: Example) => void;
  onPlan: (p: Plan) => void;
  onRun: () => void;
}

export function AskPanel({ meta, question, plan, scope, onClearScope, busy, onExample, onPlan, onRun }: Props) {
  const t = useT();
  const lang = useLang();
  const missing = missingParams(plan, meta);
  return (
    <section className="panel ask" aria-label={t("Ask a question")}>
      <div className="panel-head">
        <div>
          <div className="eyebrow">{t("Step 1 · Ask")}</div>
          <h2>{t("What do you want to know about the contract portfolio?")}</h2>
          <p className="lead">{t("Every question runs on every contract in scope – and you see the plan before anything runs.")}</p>
        </div>
      </div>

      <div className="q-grid">
        {meta.examples.map((ex) => {
          const selected = question === ex.question;
          return (
            <button key={ex.id} type="button" className={`q-card${selected ? " selected" : ""}`} onClick={() => onExample(ex)} aria-pressed={selected}>
              <span className="q-kind">{t(useCase(ex.use_case))}</span>
              {/* the API sends every example question in both languages */}
              <span className="q-text">{lang === "de" ? ex.question_de : ex.question}</span>
              {selected && <CheckmarkCircle20Filled className="q-check" />}
            </button>
          );
        })}
      </div>

      <Accordion collapsible className="own-check">
        <AccordionItem value="builder">
          <AccordionHeader size="small">{t("Or build the check yourself")}</AccordionHeader>
          <AccordionPanel>
            <PlanBuilder meta={meta} plan={plan} onChange={onPlan} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      {scope && (
        <div className="scope-box" role="status">
          <div className="plan-label">{t("Selection")}</div>
          <div>
            <b>{t("{n} contracts chosen in the register", { n: scope.doc_ids.length })}</b>
            <span className="note"> · {scope.doc_ids.join(", ")}</span>
            {Object.keys(scope.filters).length > 0 && (
              <div className="note">{t("How they were chosen: {filters}", { filters: scopeText(scope.filters, t) })}</div>
            )}
            <div className="note">{t("Only these are checked. The run says so, and the audit records the list.")}</div>
          </div>
          <div className="spacer" />
          <button type="button" className="link-btn" onClick={onClearScope}>{t("Check all contracts instead")}</button>
        </div>
      )}

      <div className="plan-bar">
        <div className="plan-label">{t("Plan")}</div>
        <PlanSummary plan={plan} meta={meta} scope={scope} />
        <div className="spacer" />
        <span className="plan-note">
          {missing.length
            ? t("Pick a question above or choose the {params}", { params: missing.map((m) => t(m.replace(/_/g, " "))).join(", ") })
            : t("Register query · no model call · $0")}
        </span>
        <Button appearance="primary" size="large" icon={busy ? <Spinner size="tiny" /> : <Play16Filled />} disabled={busy || missing.length > 0} onClick={onRun}>
          {scope ? t("Check the {n} selected contracts", { n: scope.doc_ids.length }) : t("Check all contracts")}
        </Button>
      </div>
    </section>
  );
}
