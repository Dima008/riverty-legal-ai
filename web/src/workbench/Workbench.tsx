// Question -> plan (lawyer confirms) -> run over every contract -> results with coverage -> evidence.
import {
  Button,
  Caption1,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tag,
  Text,
  Title3,
} from "@fluentui/react-components";
import { Play16Filled } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, ApiError, type CheckSpec, type Example, type Plan, type Run } from "../api";
import { ReviewBadge, StatusBadge, TriageBadge } from "../components/Badges";
import { DOC_TYPE_LABEL } from "../labels";
import { Evidence } from "./Evidence";

interface Meta {
  examples: Example[];
  checks: Record<string, CheckSpec>;
  clauses: Record<string, { label: string; definition: string }>;
}

function PlanChips({ plan, meta }: { plan: Plan; meta: Meta }) {
  const p = plan.params;
  return (
    <div className="plan" aria-label="Plan">
      <Tag appearance="brand">{meta.checks[plan.check]?.label ?? plan.check}</Tag>
      {p.clause_type && <Tag>clause: {meta.clauses[p.clause_type]?.label ?? p.clause_type}</Tag>}
      <Tag>scope: {DOC_TYPE_LABEL[p.doc_type ?? "all documents"] ?? p.doc_type}</Tag>
      {p.law && <Tag>governing law is not {p.law}</Tag>}
    </div>
  );
}

function PlanBuilder({ meta, plan, onChange }: { meta: Meta; plan: Plan; onChange: (p: Plan) => void }) {
  const spec = meta.checks[plan.check];
  const set = (key: string, value: string) => onChange({ ...plan, params: { ...plan.params, [key]: value } });
  return (
    <div className="builder">
      <Field label="Check">
        <Dropdown
          value={spec?.label ?? ""}
          selectedOptions={[plan.check]}
          onOptionSelect={(_, d) => onChange({ check: d.optionValue ?? plan.check, params: {} })}
        >
          {Object.entries(meta.checks).map(([k, c]) => (
            <Option key={k} value={k}>{c.label}</Option>
          ))}
        </Dropdown>
      </Field>
      {spec && "clause_type" in spec.params && (
        <Field label="Clause">
          <Dropdown
            value={meta.clauses[plan.params.clause_type]?.label ?? ""}
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
            value={DOC_TYPE_LABEL[plan.params.doc_type ?? "all documents"]}
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
        <Field label="Expected law (country code)">
          <Input value={plan.params.law ?? ""} onChange={(_, d) => set("law", d.value.toUpperCase())} maxLength={2} />
        </Field>
      )}
    </div>
  );
}

function CoverageBar({ run }: { run: Run }) {
  const c = run.coverage;
  const pct = (n: number) => `${(n / Math.max(c.in_scope, 1)) * 100}%`;
  const scope = DOC_TYPE_LABEL[c.scope] ?? c.scope;
  return (
    <div>
      <Text weight="semibold">
        {c.checked} of {c.in_scope} {scope} checked · {c.reported} reported · {c.excluded.length} excluded with reason
      </Text>
      <div className="coverage-bar" role="img" aria-label={`${c.reported} reported, ${c.checked - c.reported} without finding, ${c.excluded.length} excluded`}>
        <div className="seg-reported" style={{ width: pct(c.reported) }} />
        <div className="seg-ok" style={{ width: pct(c.checked - c.reported) }} />
        <div className="seg-excluded" style={{ width: pct(c.excluded.length) }} />
      </div>
      <Caption1 className="legend">
        <span className="l-reported">reported</span>
        <span className="l-ok">checked, nothing to report</span>
        <span className="l-excluded">excluded</span>
      </Caption1>
      {c.excluded.length > 0 && (
        <Caption1 block>
          Excluded: {c.excluded.map((e) => `${e.doc_id} (${e.reason})`).join("; ")}
        </Caption1>
      )}
      {run.info.resolved_by_amendment?.length ? (
        <Caption1 block>
          Already resolved by an amendment: {run.info.resolved_by_amendment.map((r) => `${r.doc_id} (by ${r.resolved_by})`).join(", ")}
        </Caption1>
      ) : null}
      <Caption1 block>
        Cost of this question: ${run.cost.usd.toFixed(2)}, {run.cost.model_calls} model calls – answered from the register; reading all
        contracts cost ${run.cost.register_total_usd.toFixed(2)} once.
      </Caption1>
    </div>
  );
}

export function Workbench() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>({ check: "missing_clause", params: {} });
  const [run, setRun] = useState<Run | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.examples(), api.checks(), api.catalogue()])
      .then(([examples, checks, cat]) => setMeta({ examples, checks, clauses: cat.clauses }))
      .catch((e) => setError(`API not reachable – is the backend running on port 8010? (${e})`));
  }, []);

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    guard(async () => {
      const r = await api.createRun(plan, question);
      setRun(r);
      setSelected(r.rows[0]?.doc_id ?? null);
    });
  const refresh = () => run && guard(async () => setRun(await api.run(run.run_id)));
  const routine = run?.rows.filter((r) => r.triage === "CONFIRM" && !r.sample && r.review.state === "FOUND") ?? [];
  const confirmRoutine = () =>
    run && guard(async () => {
      await api.confirmBatch(run.run_id, routine.map((r) => r.doc_id));
      setRun(await api.run(run.run_id));
    });

  if (!meta) return error ? <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar> : <Spinner label="Loading…" />;
  const row = run?.rows.find((r) => r.doc_id === selected) ?? null;

  return (
    <>
      <section className="card ask" aria-label="Ask a question">
        <Title3>Ask the contract register</Title3>
        <Caption1 block>Pick a question – the plan shows exactly which check runs on which contracts. Nothing runs until you confirm.</Caption1>
        <div className="examples">
          {meta.examples.map((ex) => (
            <Button
              key={ex.id}
              size="small"
              appearance={question === ex.question ? "primary" : "secondary"}
              onClick={() => {
                setQuestion(ex.question);
                setPlan(ex.plan);
              }}
            >
              {ex.question}
            </Button>
          ))}
        </div>
        <PlanBuilder meta={meta} plan={plan} onChange={(p) => { setPlan(p); setQuestion(null); }} />
        <PlanChips plan={plan} meta={meta} />
        <div className="plan">
          <Button appearance="primary" icon={<Play16Filled />} disabled={busy} onClick={start}>
            Confirm plan and check all contracts
          </Button>
          {busy && <Spinner size="tiny" />}
        </div>
      </section>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      {run && (
        <div className="split">
          <section className="card" aria-label="Results">
            <div className="results-head">
              <Title3>{run.question ?? "Result"}</Title3>
              {routine.length > 0 && (
                <Button size="small" disabled={busy} onClick={confirmRoutine}>
                  Confirm {routine.length} routine rows
                </Button>
              )}
            </div>
            <CoverageBar run={run} />
            <Table className="rows" size="small" aria-label="Reported contracts">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Contract</TableHeaderCell>
                  <TableHeaderCell>Finding</TableHeaderCell>
                  <TableHeaderCell>Triage</TableHeaderCell>
                  <TableHeaderCell>Decision</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.rows.map((r) => (
                  <TableRow
                    key={r.doc_id}
                    className={`selectable ${r.doc_id === selected ? "selected" : ""}`}
                    tabIndex={0}
                    aria-selected={r.doc_id === selected}
                    onClick={() => setSelected(r.doc_id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(r.doc_id)}
                  >
                    <TableCell>
                      <Text weight="semibold">{r.doc_id}</Text> <Caption1>{r.counterparty_name}</Caption1>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} short />
                      {r.confidence != null && <Caption1> {r.confidence.toFixed(2)}</Caption1>}
                    </TableCell>
                    <TableCell><TriageBadge triage={r.triage} /></TableCell>
                    <TableCell><ReviewBadge state={r.review.state} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {run.rows.length === 0 && <Caption1>No contract in scope has this issue.</Caption1>}
          </section>

          <section aria-label="Evidence">
            {row ? <Evidence run={run} row={row} onChanged={refresh} /> : <Caption1>Select a contract to see the evidence.</Caption1>}
          </section>
        </div>
      )}
    </>
  );
}
