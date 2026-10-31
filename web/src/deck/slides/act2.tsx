// Act 2 - why the usual AI approach fails. Every term is explained before it is used: first what
// a chatbot over documents (RAG) and top-k are, then why they cannot prove absence; then what an
// agent is, and why a free agent cannot prove it read everything.
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";

function Rag() {
  return (
    <div className="flow-row">
      <div className="node person">
        <span className="node-kind">You ask</span>
        “What does the Nordlicht contract say about liability?”
      </div>
      <Build at={1} className="flow-step">
        <span className="arrow" aria-hidden>→</span>
        <div className="node code">
          <span className="node-kind">Search</span>
          finds the passages most similar to the question
        </div>
        <span className="arrow" aria-hidden>→</span>
        <div className="passages">
          {Array.from({ length: 5 }, (_, i) => <span key={i} />)}
          <div className="passages-label">the 5 best passages<b>= top-k, here k = 5</b></div>
        </div>
      </Build>
      <Build at={2} className="flow-step">
        <span className="arrow" aria-hidden>→</span>
        <div className="node model">
          <span className="node-kind">Model</span>
          reads only these 5 and writes the answer
        </div>
      </Build>
      <Build at={3} className="term">
        This is <b>RAG</b> – retrieval-augmented generation. The model only sees what the search returns.
      </Build>
    </div>
  );
}

const M01_QUOTE = "In all other cases, each party's total liability arising out of or in connection with this Agreement shall be limited to the total fees paid by the Merchant to the Provider in the twelve (12) months preceding the event giving rise to the claim.";

function RagWorks() {
  return (
    <div className="works">
      <div className="node person"><span className="node-kind">You ask</span>“What does M01 say about liability?”</div>
      <Build at={1} className="works-hit">
        <span className="node-kind">The search finds · M01, clause 7.2</span>
        <q>{M01_QUOTE}</q>
      </Build>
      <Build at={2} className="works-answer">
        <span className="ok" aria-hidden>✓</span> Liability is capped at the fees of the last 12 months.
      </Build>
    </div>
  );
}

// the 19 merchant agreements the measurement searched (M15 is a duplicate of M01)
const CONTRACTS = Array.from({ length: 20 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`).filter((id) => id !== "M15");
const K = 10;
const AT_K = measurement.top_k.find((r) => r.k === K)!;
const RANKED = new Set(Object.keys(measurement.first_rank_per_contract));   // a passage among the 10 best
const LACKING = new Set(measurement.expected);

function RagFails() {
  const step = useStep();
  return (
    <div className="fails">
      <div className="node person"><span className="node-kind">You ask</span>“Which merchant agreements lack a limitation of liability?”</div>
      <div className="tiles" role="img" aria-label="19 merchant agreements, coloured by what the search says and what is true">
        {CONTRACTS.map((id) => {
          const found = RANKED.has(id);
          const cls = [
            "tile",
            step >= 1 && found && "found",
            step >= 2 && !found && "flagged",
            step >= 3 && !found && !LACKING.has(id) && "false-alarm",
            step >= 3 && found && LACKING.has(id) && "missed",
          ].filter(Boolean).join(" ");
          return (
            <div key={id} className={cls}>
              {id}
              {step >= 3 && !found && !LACKING.has(id) && <small>false alarm</small>}
              {step >= 3 && found && LACKING.has(id) && <small>missed</small>}
              {step >= 3 && !found && LACKING.has(id) && <small>lacks it ✓</small>}
            </div>
          );
        })}
      </div>
      <div className="fails-legend">
        <Build at={1}><span className="sw found" /> in the {K} best passages: “mentions liability”</Build>
        <Build at={2}><span className="sw flagged" /> not found – so it “lacks the clause”?</Build>
        <Build at={3} className="fails-result">
          <b>{AT_K.false_alarms.length} false alarms</b> · <b>{AT_K.missed.join(", ")} missed</b> – it mentions liability only in a hidden note.
          <span className="vs">Read completely: {measurement.register.reported.length} of {measurement.expected.length} found, no false alarm.</span>
        </Build>
      </div>
    </div>
  );
}

function Agent() {
  return (
    <div className="agent">
      <div className="loop" aria-label="An agent: a model that calls tools in a loop">
        <div className="node model"><span className="node-kind">Model</span>plans the next step</div>
        <div className="loop-arrows" aria-hidden><span>⟶</span><span>⟵</span></div>
        <div className="node code"><span className="node-kind">Tools</span>open a file · search · take notes</div>
        <div className="loop-caption">… and repeats – <Build at={1} className="inline"><mark>until it decides it is done.</mark></Build></div>
      </div>
      <div className="agent-side">
        <Build at={2} className="stat">
          <div className="big">68 %</div>
          <div>of runs: agents asked to review every file <b>skipped files</b></div>
          <div className="stat-sub">and in 4 of 5 of those runs, the report hid it</div>
          <cite>OverclaimBench, 2026 – frontier models in their own command-line tools</cite>
        </Build>
        <Build at={3} className="quote-riverty">
          “… in day-to-day operations they often fail due to the sheer size and complexity of the environments they have to operate in.”
          <cite>Riverty, the case study</cite>
        </Build>
      </div>
    </div>
  );
}

function Needs() {
  return (
    <ol className="needs">
      <li><Build at={1}><span className="n">1</span><span>Every contract is read – <em>provably</em>.</span></Build></li>
      <li><Build at={2}><span className="n">2</span><span>Every finding shows the <em>passage</em> as evidence.</span></Build></li>
      <li><Build at={3}><span className="n">3</span><span>A <em>lawyer</em> decides.</span></Build></li>
    </ol>
  );
}

export const ACT2: Slide[] = [
  {
    id: "act-2", act: 2, kind: "opener", title: "Why the usual AI approach fails", steps: 0, seconds: 4,
    notes: [
      "How do we usually solve this with AI?",
    ],
    words: [{ word: "usually", say: "YOO-zhoo-uh-lee" }],
  },
  {
    id: "rag", act: 2, kind: "content", title: "The usual approach: a chatbot over your documents.", steps: 3, seconds: 45, Body: Rag,
    notes: [
      "Most document assistants work like this. You ask a question. For example, about liability in the Nordlicht contract.",
      "A search compares your question with every passage. It returns the most similar ones: the top k. Here k is five. The search can use keywords or embeddings. Embeddings are number vectors for meaning. The principle is the same.",
      "The model reads only these five passages. Then it writes the answer.",
      "This is called RAG: retrieval-augmented generation. The important part: the model only sees what the search returns.",
    ],
    words: [{ word: "retrieval", say: "rih-TREE-vul" }, { word: "augmented", say: "awg-MEN-tid" }, { word: "liability", say: "lie-uh-BIL-ih-tee" }],
  },
  {
    id: "rag-works", act: 2, kind: "content", title: "That works when the answer is in the text.", steps: 2, seconds: 20, Body: RagWorks,
    notes: [
      "We ask about liability in M01.",
      "The search finds clause 7.2, very similar to the question.",
      "The answer cites the passage: liability is capped at 12 months of fees. RAG works here. We use it too, later, for open questions.",
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "clause", say: "KLAWZ" }, { word: "similar", say: "SIM-ih-ler" }],
  },
  {
    id: "rag-fails", act: 2, kind: "content", title: "It fails when the answer is what is not in the text.", steps: 3, seconds: 55, Body: RagFails,
    notes: [
      "Legal asks: which merchant agreements lack a limitation of liability? Our test set has 19 of them.",
      "I search for 'limitation of liability'. The 10 best passages come from 8 contracts.",
      "For the search, the other 11 'lack' it.",
      "7 of the 11 are false alarms. They cap liability with different words. Like M02: 'neither side will have to pay more'. M14 is missed. It lacks the clause, but a hidden note mentions liability. So it ranks high. A larger k, 20 or 40, does not help. 11 contracts never match at all. Top-k ranks what is there. It cannot prove absence. Complete reading finds all 5, no false alarm.",
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "merchant", say: "MUR-chunt" }, { word: "absence", say: "AB-sunss" }],
  },
  {
    id: "agent", act: 2, kind: "content", title: "And an AI agent that reads everything itself?", steps: 3, seconds: 50, Body: Agent,
    notes: [
      "Second idea: an agent. It is a model that plans a step and calls a tool. Tools open files, search or take notes. It sees the result and repeats.",
      "The weak point: it decides when it is done. Nobody checks that it opened every file.",
      "In OverclaimBench, a 2026 study, agents had to review every file. In 68 percent of runs, they skipped files. Four of five of those reports claimed a complete review. Or they did not mention the gap.",
      "Riverty's case study agrees: agents fail on the size of the environment. Over a thousand contracts is exactly that.",
    ],
    words: [{ word: "agent", say: "AY-junt" }, { word: "OverclaimBench", say: "OH-ver-klaym-bench" }, { word: "environment", say: "en-VY-run-ment" }],
  },
  {
    id: "needs", act: 2, kind: "content", title: "So we need three guarantees.", steps: 3, seconds: 25, Body: Needs,
    notes: [
      "So we need three guarantees.",
      "One: every contract is read. We prove it, not just claim it.",
      "Two: every finding shows the passage on the page. A lawyer can check it in seconds.",
      "Three: a lawyer decides. The system makes observations, not legal judgments. Next: how we deliver them.",
    ],
    words: [{ word: "guarantees", say: "gair-un-TEEZ" }, { word: "judgments", say: "JUJ-ments" }, { word: "lawyer", say: "LOY-er" }],
  },
];
