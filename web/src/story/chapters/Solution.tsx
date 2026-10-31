// Chapter 4 - Compile, don't search. Three steps: the process tomorrow (the same swimlanes as
// chapter 2 - only what changes moves), compile once vs search per question (two flows with the
// same start and end; only the position of the model differs), and five decisions as flip cards.
// The register's cost comes live from GET /summary, the F10 check live from GET /matrix.
import { Spinner, ToggleButton } from "@fluentui/react-components";
import { ArrowSync16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import { api, type Matrix } from "../../api";
import { Figure, Step, type FigureMeta } from "../Figure";
import { Flow, KIND_LABEL, type FlowEdge, type FlowNode, type NodeKind } from "../Flow";
import type { ChapterProps } from "./index";
import { AS_IS, LANES, TO_BE } from "./process/process";
import "./solution.css";

export const FIGURES: FigureMeta[] = [
  { id: "process-to-be", title: "The process tomorrow: the loop disappears, the judgement stays",
    shows: "The same swimlanes as in chapter 2: a question → the lawyer confirms the plan → every contract checked, with coverage → triage → review only what needs a look, four eyes for critical rows → approve → answer with evidence, archive copy and audit log. A switch goes back to today.",
    why: "The honest message is which human steps remain: the judgement. Legal should recognise their own work in it, not a system diagram.",
    looks: "Identical lanes and grid as today, so only what changes moves: the contract files sit where “open next contract” sat, the review where “read and judge” sat. A bold outline marks the lawyer's judgement in both.",
    refs: "decisions 13, 53, 57, 71" },
  { id: "compile-vs-search", title: "Compile once, ask many times",
    shows: "Two flows with the same start (the contract files) and the same end (an answer). Only the position of the model differs: search puts it inside every question, compiling puts it before any question, once per contract.",
    why: "It is the central decision and answers “why not plain RAG?”. Cost and completeness are labelled exactly where the comparison happens.",
    looks: "The same six columns in both rows under one band – before any question, for every question – so the eye only compares where the amber model box sits. The cost comes from the register's own call log, not from an estimate.",
    refs: "decisions 4, 18, 37, 42" },
  { id: "five-decisions", title: "Five decisions, each with the alternative I rejected",
    shows: "Front: the decision. Back: the rejected alternative, the number behind it, the decision ids and where it lives in the code.",
    why: "Interviews remember contrasts, and the code location makes “I can explain every line” testable.",
    looks: "Flip cards, because a decision and its rejected alternative are two sides of one choice. A click, Enter or Space flips a card; “Show all backs” turns all of them for questions.",
    refs: "decisions 2, 3, 4, 5, 9, 13, 37, 38, 39, 51, 53, 57, 71, 73 · F1, F10" },
];

// ---------------------------------------------------------------- step 1: the process tomorrow

const ARIA_TOMORROW =
  "The process tomorrow. A question arrives and the lawyer confirms the plan. The register checks every contract, " +
  "compiled once from the contract files, with coverage. Triage sorts the rows; the lawyer reviews what needs a look, " +
  "with four eyes for critical rows, and approves. Then the answer with evidence, an archive copy once per file, and the audit log.";
const ARIA_TODAY =
  "Today's process. For every contract the lawyer opens it in SharePoint, searches it with Ctrl+F, reads and judges, " +
  "and notes the result; after the last contract the lawyer answers by hand. There is no register.";

function Tomorrow() {
  const [today, setToday] = useState(false);
  const process = today ? AS_IS : TO_BE;
  return (
    <div className="so-process">
      <div className="so-switch" role="group" aria-label="Which process to show">
        <ToggleButton size="small" checked={today} appearance={today ? "primary" : "secondary"}
                      onClick={() => setToday(true)}>Today</ToggleButton>
        <ToggleButton size="small" checked={!today} appearance={today ? "secondary" : "primary"}
                      onClick={() => setToday(false)}>Tomorrow</ToggleButton>
      </div>
      <div className="so-flow-scroll">
        <Flow nodes={process.nodes} edges={process.edges} lanes={LANES} ariaLabel={today ? ARIA_TODAY : ARIA_TOMORROW} />
      </div>
      {today && (
        <p className="so-flow-note"><ArrowSync16Regular /> Dashed and moving: the loop, once per contract and again for every question.</p>
      )}
      <ul className="so-changes">
        <li className="c-gone"><b>Gone</b> Open, Ctrl+F and note – once per contract, again for every question.</li>
        <li className="c-new"><b>New</b> A plan the lawyer confirms, every contract checked with coverage, triage, an archive copy only after approval, an audit log.</li>
        <li className="c-stays"><b>Stays</b> The judgement: the lawyer reviews and approves (bold outline), with four eyes for critical rows.</li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- step 2: compile once vs search per question

// Same six columns in both rows: 0-2 happen before any question, 3-5 for every question. Only
// the amber model box changes place.
const SEARCH_ROW: FlowNode[] = [
  { id: "files", label: "Contract files", sub: "SharePoint", col: 0, row: 0, kind: "external" },
  { id: "chunk", label: "Cut into passages", sub: "and embed them", col: 1, row: 0, kind: "code" },
  { id: "index", label: "Search index", sub: "passages, no answers", col: 2, row: 0, kind: "data" },
  { id: "question", label: "A question", sub: "e.g. Q1", col: 3, row: 0, kind: "person" },
  { id: "model", label: "Top k + model", sub: "reads k passages", col: 4, row: 0, kind: "model", highlight: true },
  { id: "answer", label: "An answer", sub: "only what was found", col: 5, row: 0, kind: "person" },
];
const COMPILE_ROW: FlowNode[] = [
  { id: "files", label: "Contract files", sub: "SharePoint", col: 0, row: 0, kind: "external" },
  { id: "model", label: "Read every contract", sub: "whole text + checks", col: 1, row: 0, kind: "model", highlight: true },
  { id: "register", label: "Register", sub: "evidence per clause", col: 2, row: 0, kind: "data" },
  { id: "question", label: "A question", sub: "e.g. Q1", col: 3, row: 0, kind: "person" },
  { id: "query", label: "Query every contract", sub: "no model call", col: 4, row: 0, kind: "code" },
  { id: "answer", label: "An answer", sub: "with coverage", col: 5, row: 0, kind: "person" },
];
const LEGEND: NodeKind[] = ["model", "code", "data", "person", "external"];

/** An arrow from each box to the next one - except into the question, which starts a new chain. */
function arrows(nodes: FlowNode[]): FlowEdge[] {
  const edges: FlowEdge[] = [];
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i].id === "question") continue;
    edges.push({ from: nodes[i - 1].id, to: nodes[i].id });
  }
  return edges;
}

// The talk's scale: Riverty's addendum names 100+ vendors and 1,000+ merchants (docs/approach.md, ch. 1).
const RIVERTY_CONTRACTS = 1100;
// Best precision top-k reached on Q1 at any k we measured (eval/negative_search.py).
const TOPK_PRECISION = Math.max(...measurement.top_k.map((r) => r.precision));

interface Summary {
  documents: number;
  cost: { by_purpose: { purpose: string; calls: number; cost_usd: number }[] };
}

/** What compiling the register cost: every model call except "search" (a query embedding at question time). */
function compileCost(s: Summary) {
  return s.cost.by_purpose.filter((p) => p.purpose !== "search").reduce((sum, p) => sum + p.cost_usd, 0);
}

function CompileVsSearch({ summary }: { summary: Summary }) {
  const cost = compileCost(summary);
  const atScale = Math.round((cost / summary.documents) * RIVERTY_CONTRACTS);
  return (
    <div className="so-compare">
      <div className="so-compare-scroll">
        <div className="so-compare-inner">
          <div className="so-band" aria-hidden>
            <span className="b-before">Before any question</span>
            <span className="b-every">For every question</span>
          </div>

          <h3 className="so-row-title">Search per question <span>top-k RAG</span></h3>
          <Flow nodes={SEARCH_ROW} edges={arrows(SEARCH_ROW)} legend={false}
                ariaLabel="Search per question: contract files are cut into passages and indexed before any question. For every question, the search returns the top k passages and a model reads them, then answers from what was found." />
          <div className="so-labels">
            <span className="l-before">Indexing once – no answers yet</span>
            <span className="l-every warn">A model call in every question; it sees k passages, never every contract. Q1 precision at best {TOPK_PRECISION.toFixed(2)}.</span>
          </div>

          <h3 className="so-row-title">Compile once <span>the register</span></h3>
          <Flow nodes={COMPILE_ROW} edges={arrows(COMPILE_ROW)} legend={false}
                ariaLabel="Compile once: before any question, a model reads every contract completely, the checks verify it, and the result is stored in the register. For every question, a query runs over every contract without a model call and answers with coverage." />
          <div className="so-labels">
            <span className="l-before good">
              The model once per contract: <b>${cost.toFixed(2)}</b> for {summary.documents} documents,
              about <b>${atScale}</b> for {RIVERTY_CONTRACTS.toLocaleString("en")}
            </span>
            <span className="l-every good"><b>$0</b> per question – every contract, with coverage</span>
          </div>
        </div>
      </div>
      {/* one legend for both rows, below them (the flows' own legends would sit between row and labels) */}
      <ul className="flow-legend">
        {LEGEND.map((k) => <li key={k}><span className={`flow-swatch k-${k}`} aria-hidden /> {KIND_LABEL[k]}</li>)}
      </ul>
      <p className="so-note">
        The cost is the register's own call log (GET /summary), not an estimate; the scale-up is the cost per
        document × {RIVERTY_CONTRACTS.toLocaleString("en")}. A prompt, playbook or model change compiles again – that is
        a release (chapter 8).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- step 3: five decisions

interface Card {
  title: string;
  front: string;
  headline: string;   // the number behind the decision, big on the front
  caption: string;    // what that number means
  rejected: string;
  number: string;
  decisions: string;
  code: string;
}

/** The five cards (docs/approach.md, chapter 4); live numbers are passed in as text. */
function cards(n: { cost: string; documents: string; visible: string }): Card[] {
  return [
    { title: "Compile, don't search",
      front: "Every contract is read once, completely, into a register with evidence. Questions become queries.",
      headline: "$0", caption: `per question, after ${n.cost} once`,
      rejected: "An agent that searches SharePoint live for every question; top-k RAG.",
      number: `${n.cost} once for ${n.documents} documents, $0 per question. Top-k precision on Q1 at best ${TOPK_PRECISION.toFixed(2)}.`,
      decisions: "4, 37",
      code: "pipeline/extract.py run() · pipeline/queries.py missing_clause()" },
    { title: "The prompt asks, the checks enforce",
      front: "Deterministic checks before and after every model call; every finding needs a quote found in the contract.",
      headline: "1.00", caption: "Q1 recall with the checks, in every run",
      rejected: "Trusting the answer, or the model's own confidence.",
      number: "Q1 recall of the model alone 0.60–1.00 over five runs; with the checks 1.00 every time.",
      decisions: "9, 38, 39 · F1",
      code: "pipeline/extract.py check_findings(), assess()" },
    { title: "Recall first, coverage visible",
      front: "Missing and unclear are always reported together; every excluded contract is listed with its reason.",
      headline: n.visible, caption: "other commercial agreements visible to queries (F10 fixed)",
      rejected: "Promising accuracy; filters that drop contracts silently.",
      number: `F10: C11 vanished from every answer. Today ${n.visible} other commercial agreements are visible to queries.`,
      decisions: "3, 5, 51 · F10",
      code: "pipeline/portfolio.py run_check() · pipeline/extract.py check_metadata()" },
    { title: "Risk-based human in the loop",
      front: "People look where it matters: routine, review, or four eyes for critical rows.",
      headline: "1 · 2 · 2", caption: "Q1 rows for four eyes · review · routine",
      rejected: "Approve everything, approve nothing, or let the model triage.",
      number: "Q1: M14 four eyes, M08 and M10 review, M03 and M18 routine. A review belongs to the finding and is reused by every question.",
      decisions: "13, 53, 57, 73",
      code: "pipeline/portfolio.py triage() · api/review.py review_state()" },
    { title: "Storage: write-only, after approval, once",
      front: "The storage API only receives an additional copy – after approval, exactly once per file.",
      headline: "409", caption: "the server's answer to a copy before approval",
      rejected: "The storage as a data source; archiving straight after the system's proposal.",
      number: "Before approval the server refuses with 409 and logs the attempt; one copy per SHA-256.",
      decisions: "2, 57, 71",
      code: "api/review.py archive_copy() · api/storage_mock.py put_contract()" },
  ];
}

/** One card: a button that shows its front or its back. The hidden face is hidden from screen readers too. */
function FlipCard({ card, index, flipped, onFlip }: { card: Card; index: number; flipped: boolean; onFlip: () => void }) {
  return (
    <button type="button" className={`so-card${flipped ? " flipped" : ""}`} aria-pressed={flipped} onClick={onFlip}>
      <span className="so-card-inner">
        <span className="so-face so-front" aria-hidden={flipped}>
          <span className="so-card-num">{index + 1}</span>
          <span className="so-card-title">{card.title}</span>
          <span className="so-card-text">{card.front}</span>
          <span className="so-card-big"><b>{card.headline}</b> {card.caption}</span>
          <span className="so-card-hint"><ArrowSync16Regular /> the alternative I rejected</span>
        </span>
        <span className="so-face so-back" aria-hidden={!flipped}>
          <span className="so-card-title small">{index + 1} · {card.title}</span>
          <span className="so-back-label">Rejected</span>
          <span className="so-back-text">{card.rejected}</span>
          <span className="so-back-label">The number</span>
          <span className="so-back-text">{card.number}</span>
          <span className="so-back-label">Decisions</span>
          <span className="so-back-text">{card.decisions}</span>
          <span className="so-back-label">In the code</span>
          <code className="so-back-code">{card.code}</code>
        </span>
      </span>
    </button>
  );
}

function FiveDecisions({ summary, matrix }: { summary: Summary | null; matrix: Matrix | null }) {
  const [flipped, setFlipped] = useState<boolean[]>([false, false, false, false, false]);
  // F10, checked live: other commercial agreements that queries can see (amendments are skipped by queries)
  const others = matrix?.rows.filter((r) => r.doc_type === "other_commercial_agreement") ?? [];
  const list = cards({
    cost: summary ? `$${compileCost(summary).toFixed(2)}` : "…",
    documents: summary ? String(summary.documents) : "…",
    visible: matrix ? `${others.filter((r) => !r.is_amendment).length} of ${others.length}` : "…",
  });
  const allBack = flipped.every(Boolean);
  return (
    <div className="so-decisions">
      <div className="so-decisions-head">
        <ToggleButton size="small" checked={allBack} onClick={() => setFlipped(flipped.map(() => !allBack))}>
          Show all backs
        </ToggleButton>
      </div>
      <div className="so-cards">
        {list.map((c, i) => (
          <FlipCard key={c.title} card={c} index={i} flipped={flipped[i]}
                    onFlip={() => setFlipped(flipped.map((f, j) => (j === i ? !f : f)))} />
        ))}
      </div>
      <p className="so-note">
        The model choice follows the same rule: a small model plus checks. gpt-4.1 alone finds the same Q1 traps at about
        five times the cost per run – measured in chapter 6 (decisions 42, 65).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- the chapter

export function Solution({ step }: ChapterProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // GET /summary is not in the typed client (api.ts) yet, so it is fetched directly
    fetch("/api/summary")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
    api.matrix().then(setMatrix).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="ch-solution">
      <Step at={0} step={step}>
        <Figure meta={FIGURES[0]}>
          <Tomorrow />
        </Figure>
      </Step>

      <Step at={1} step={step}>
        <Figure meta={FIGURES[1]}>
          {error ? <p className="so-error">The register is not reachable ({error}) – start the API.</p>
            : summary ? <CompileVsSearch summary={summary} />
            : <Spinner size="small" label="Loading the register's cost…" />}
        </Figure>
        <p className="anchor-line">Compile, don't search.</p>
      </Step>

      <Step at={2} step={step}>
        <Figure meta={FIGURES[2]}>
          <FiveDecisions summary={summary} matrix={matrix} />
        </Figure>
        <p className="anchor-line">Agents fail on the size of the environment – so I shrink the environment first.</p>
      </Step>
    </div>
  );
}
