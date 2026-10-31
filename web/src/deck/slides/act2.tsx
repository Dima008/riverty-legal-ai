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
    notes: "So how would one usually solve this with AI?",
  },
  {
    id: "rag", act: 2, kind: "content", title: "The usual approach: a chatbot over your documents.", steps: 3, seconds: 45, Body: Rag,
    notes: "Most document assistants work like this. You ask a question. → A search compares the question with every passage and returns the most similar ones – the top k, here five. The search can work with keywords or with embeddings, number vectors for meaning; the principle is the same. → The model reads only those five passages and writes the answer. → This is called RAG, retrieval-augmented generation. The important part: the model only sees what the search returns.",
  },
  {
    id: "rag-works", act: 2, kind: "content", title: "That works when the answer is in the text.", steps: 2, seconds: 20, Body: RagWorks,
    notes: "Ask what one contract says about liability. → The search finds clause 7.2 of M01, because it is very similar to the question. → The model answers from it, with the passage as source. For questions like this, RAG is a good tool – and we use it too, later, for open questions.",
  },
  {
    id: "rag-fails", act: 2, kind: "content", title: "It fails when the answer is what is not in the text.", steps: 3, seconds: 55, Body: RagFails,
    notes: "Now Legal's question: which contracts lack a limitation of liability? These are the 19 merchant agreements of our test set. → I searched for 'limitation of liability' and took the 10 best passages: they come from 8 contracts. → The only conclusion a search allows: the other 11 'lack' it. → Here is the truth. 7 of the 11 are false alarms: they do cap liability, in other words – remember M02, 'neither side will have to pay more'. And M14 is missed: it lacks the clause, but it mentions liability in a hidden note, so the search ranks it high. A larger k does not help: at k = 20 or 40 it is the same result, because 11 contracts never match at all. Top-k ranks what is there; it cannot prove what is not there. Reading every contract completely finds all 5, without a false alarm. Measured in eval/negative_search.py.",
  },
  {
    id: "agent", act: 2, kind: "content", title: "And an AI agent that reads everything itself?", steps: 3, seconds: 50, Body: Agent,
    notes: "The other idea: an agent. An agent is a model that plans a step, calls a tool – open a file, search, take a note – looks at the result and repeats. → The weak point: it decides itself when it is done. Nobody checks that it really opened every file. → That is measured: in OverclaimBench, a 2026 study, agents asked to review every file skipped files in 68 percent of runs – and in four of five of those runs the final report claimed a complete review or did not mention the gap. → Riverty's own case study says the same: agents fail on the size of the environment. Over a thousand contracts is exactly such an environment.",
  },
  {
    id: "needs", act: 2, kind: "content", title: "So we need three guarantees.", steps: 3, seconds: 25, Body: Needs,
    notes: "From this, three requirements. → Every contract is read, and we can prove it – not just claim it. → Every finding points to the passage on the page, so a lawyer can check it in seconds. → And a lawyer decides – the system makes observations, not legal judgments. Next: how the solution delivers these three.",
  },
];
