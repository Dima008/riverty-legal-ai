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
import type { CheckSpec, Example, Plan } from "../api";
import { DOC_TYPE_LABEL } from "../labels";

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
  const spec = meta.checks[plan.check];
  const set = (key: string, value: string) => onChange({ ...plan, params: { ...plan.params, [key]: value } });
  return (
    <div className="builder">
      <Field label="Check">
        <Dropdown value={spec?.label ?? ""} selectedOptions={[plan.check]} onOptionSelect={(_, d) => onChange({ check: d.optionValue ?? plan.check, params: {} })}>
          {Object.entries(meta.checks).map(([k, c]) => (
            <Option key={k} value={k}>{c.label}</Option>
          ))}
        </Dropdown>
      </Field>
      {spec && "clause_type" in spec.params && (
        <Field label="Clause">
          <Dropdown
            value={meta.clauses[plan.params.clause_type]?.label ?? ""}
            placeholder="Choose a clause"
            selectedOptions={plan.params.clause_type ? [plan.params.clause_type] : []}
            onOptionSelect={(_, d) => set("clause_type", d.optionValue ?? "")}
          >
            {Object.entries(meta.clauses).map(([k, c]) => (
              <Option key={k} value={k}>{c.label}</Option>
            ))}
          </Dropdown>
        </Field>
      )}
      {spec && "doc_type" in spec.params && (
        <Field label="Scope">
          <Dropdown
            value={DOC_TYPE_LABEL[plan.params.doc_type || "all documents"]}
            selectedOptions={[plan.params.doc_type ?? ""]}
            onOptionSelect={(_, d) => set("doc_type", d.optionValue ?? "")}
          >
            <Option value="">all documents</Option>
            {["merchant_agreement", "data_processing_agreement", "other_commercial_agreement"].map((t) => (
              <Option key={t} value={t}>{DOC_TYPE_LABEL[t]}</Option>
            ))}
          </Dropdown>
        </Field>
      )}
      {spec && "law" in spec.params && (
        <Field label="Expected governing law">
          <Input value={plan.params.law ?? ""} placeholder="DE" onChange={(_, d) => set("law", d.value.toUpperCase())} maxLength={2} />
        </Field>
      )}
    </div>
  );
}

function PlanSummary({ plan, meta }: { plan: Plan; meta: Meta }) {
  const p = plan.params;
  const parts = [
    meta.checks[plan.check]?.label,
    p.clause_type && meta.clauses[p.clause_type]?.label,
    p.law && `law is not ${p.law}`,
    `in ${DOC_TYPE_LABEL[p.doc_type || "all documents"] ?? p.doc_type}`,
  ].filter(Boolean);
  return (
    <ol className="plan-steps" aria-label="Plan">
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
  busy: boolean;
  onExample: (ex: Example) => void;
  onPlan: (p: Plan) => void;
  onRun: () => void;
}

export function AskPanel({ meta, question, plan, busy, onExample, onPlan, onRun }: Props) {
  const missing = missingParams(plan, meta);
  return (
    <section className="panel ask" aria-label="Ask a question">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Step 1 · Ask</div>
          <h2>What do you want to know about the contract portfolio?</h2>
          <p className="lead">Every question runs on every contract in scope – and you see the plan before anything runs.</p>
        </div>
      </div>

      <div className="q-grid">
        {meta.examples.map((ex) => {
          const selected = question === ex.question;
          return (
            <button key={ex.id} type="button" className={`q-card${selected ? " selected" : ""}`} onClick={() => onExample(ex)} aria-pressed={selected}>
              <span className="q-kind">{useCase(ex.use_case)}</span>
              <span className="q-text">{ex.question}</span>
              {selected && <CheckmarkCircle20Filled className="q-check" />}
            </button>
          );
        })}
      </div>

      <Accordion collapsible className="own-check">
        <AccordionItem value="builder">
          <AccordionHeader size="small">Or build the check yourself</AccordionHeader>
          <AccordionPanel>
            <PlanBuilder meta={meta} plan={plan} onChange={onPlan} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <div className="plan-bar">
        <div className="plan-label">Plan</div>
        <PlanSummary plan={plan} meta={meta} />
        <div className="spacer" />
        <span className="plan-note">
          {missing.length ? `Pick a question above or choose the ${missing.join(", ").replace(/_/g, " ")}` : "Register query · no model call · $0"}
        </span>
        <Button appearance="primary" size="large" icon={busy ? <Spinner size="tiny" /> : <Play16Filled />} disabled={busy || missing.length > 0} onClick={onRun}>
          Check all contracts
        </Button>
      </div>
    </section>
  );
}
