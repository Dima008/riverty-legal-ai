// Act 2 - why the usual AI approach fails. Every term is explained before it is used: first what
// a chatbot over documents (RAG) and top-k are, then why they cannot prove absence; then what an
// agent is, and why a free agent cannot prove it read everything.
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

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
          <div className="passages-label">the 5 most similar passages<b>top 5</b></div>
        </div>
      </Build>
      <Build at={3} className="flow-step">
        <span className="arrow" aria-hidden>→</span>
        <div className="node model">
          <span className="node-kind">Model</span>
          reads only these 5 and writes the answer
        </div>
      </Build>
      <Build at={2} className="term">
        <b>top-k</b>: the search returns only the <b>k</b> most similar passages – here k = 5. Everything else the model never sees.
      </Build>
      <Build at={4} className="term">
        <b>RAG</b> – retrieval-augmented generation: search first, then the model answers from what was found.
      </Build>
    </div>
  );
}

// Every passage of the register as one dot: its position is the cosine similarity of its embedding
// to the embedding of the question (tools/deck_data.py). A 2-D map was tried and rejected: it sorted
// the dots by contract group, not by meaning.
const E = deck.embedding;
const LANES = [{ g: "M", name: "M · merchant" }, { g: "V", name: "V · data processing" }, { g: "C", name: "C · CUAD" }];
const MIN = 0.12;
const MAX = 0.55;
const xPos = (sim: number) => `${((sim - MIN) / (MAX - MIN)) * 100}%`;
const yPos = (i: number) => `${16 + ((i * 37) % 68)}%`;          // spread the dots of a lane, the same every time
const NEAR = new Set(E.near.map((n) => n.id));
const SPOTS = new Map(E.spots.map((sp) => [sp.id, sp]));
const TOPK_FROM = E.near[E.near.length - 1].sim - 0.004;

function EmbeddingRuler() {
  const step = useStep();
  return (
    <div className="x-ruler" role="img"
         aria-label={`${E.passages} passages by similarity to the question; the ${E.k} closest, and M14 against M19`}>
      {LANES.map((lane) => (
        <div key={lane.g} className="x-lane">
          <span className="x-lane-name">{lane.name}</span>
          <div className="x-track">
            {E.points.map((pt, i) => {
              if (pt.g !== lane.g) return null;
              const spot = SPOTS.get(pt.id);
              const cls = ["x-dot", pt.lia && "lia", step >= 1 && NEAR.has(pt.id) && "near",
                           step >= 2 && spot && "spot", spot?.has_cap && "cap"].filter(Boolean).join(" ");
              return <span key={pt.id} className={cls} style={{ left: xPos(pt.s), top: yPos(i) }} />;
            })}
            {step >= 1 && <div className="x-topk" style={{ left: xPos(TOPK_FROM) }}>{lane.g === "M" && <span>top-{E.k}</span>}</div>}
            {step >= 2 && lane.g === "M" && E.spots.map((sp) => (
              <span key={sp.id} className={`x-spot-label${sp.has_cap ? " cap" : ""}`} style={{ left: xPos(sp.sim) }}>
                {sp.id.split(":")[0]}: {sp.has_cap ? "real cap, in German" : "no cap, only my planted note"} · {sp.sim.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="x-axis"><span /><div><span>less similar</span><span>similarity to “{E.query}” →</span><span>more similar</span></div></div>
      <div className="x-legend">
        <span><i style={{ background: "rgba(169,193,187,.5)" }} />one passage = {E.dims.toLocaleString("en")} numbers</span>
        <span><i style={{ background: "var(--mint)" }} />a section about liability</span>
        <Build at={1} className="inline"><i style={{ background: "var(--cyan)" }} />the {E.k} closest = top-{E.k}</Build>
      </div>
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
        <Build at={1}><span className="sw found" /> in the top {K} passages (k = {K}): “mentions liability”</Build>
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
    id: "rag", act: 2, kind: "content", title: "The usual approach: a chatbot over your documents.", steps: 4, seconds: 45, Body: Rag,
    notes: [
      "Most document assistants work like this. You ask, for example, about liability in the Nordlicht contract, M01.",
      "A search compares your question with every passage. It returns the most similar ones.",
      "This is called top-k. Here k is five: the five best passages, nothing else.",
      "The model reads only these five passages and writes the answer. For M01 this works well: the search finds clause 7.2.",
      "This is called RAG: retrieval-augmented generation. The model only sees what the search returns.",
    ],
    words: [{ word: "retrieval", say: "rih-TREE-vul" }, { word: "augmented", say: "awg-MEN-tid" }, { word: "similar", say: "SIM-ih-ler" }],
  },
  {
    id: "embedding-map", act: 2, kind: "content", title: "Embeddings: every passage becomes numbers, near means similar.", steps: 2, seconds: 40, Body: EmbeddingRuler,
    notes: [
      "How does a search know what is similar? With embeddings. Every passage becomes 1,536 numbers. Here every dot is one of our 938 passages. Further right means closer in meaning to the question.",
      "Top-k takes the dots on the far right. Four of the five come from the public CUAD contracts.",
      "And closer does not mean: has the clause. M14 has no cap, only my planted note. It scores higher than M19, which has a real cap in German.",
    ],
    words: [{ word: "embeddings", say: "em-BED-ingz" }, { word: "similar", say: "SIM-ih-ler" }, { word: "cap", say: "KAP" }],
  },
  {
    id: "rag-fails", act: 2, kind: "content", title: "It fails when the answer is what is not in the text.", steps: 3, seconds: 65, Body: RagFails,
    notes: [
      "Legal asks: which merchant agreements lack a limitation of liability? Our test set has 19 of them. Nineteen, not twenty: M15 is a copy of M01, one of my traps. It counts once.",
      "I search for 'limitation of liability', now with k = 10. The 10 best passages come from 8 contracts.",
      "For the search, the other 11 'lack' it.",
      "7 of the 11 are false alarms: they cap liability in other words, like M02. M14 is missed: it lacks the clause, but a note I planted, addressed to the AI, mentions liability. So it ranks high. A larger k does not help: 11 contracts never match at all. Top-k ranks what is there. It cannot prove absence. Reading everything finds all 5, no false alarm.",
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "merchant", say: "MUR-chunt" }, { word: "absence", say: "AB-sunss" }],
  },
  {
    id: "agent", act: 2, kind: "content", title: "And an AI agent that reads everything itself?", steps: 3, seconds: 45, Body: Agent,
    notes: [
      "Second idea: an agent. A model plans a step and calls a tool: open a file, search, take notes. It sees the result and repeats.",
      "The weak point: it decides when it is done. Nobody checks that it opened every file.",
      "In a 2026 study, OverclaimBench, agents had to review every file. In 68 percent of runs they skipped files. In four of five, the report hid the gap.",
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
