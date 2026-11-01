// Act 2 - why the usual AI approaches fail. First the test bench (47 documents with known answers,
// moved here from act 1, decision 88), then every term before it is used: what a chatbot over
// documents (RAG) and top-k are, then why they cannot prove absence; then what an agent is, and why
// a free agent cannot prove it read everything. The register's own result is NOT shown here: act 3
// reveals it. Numbers come from the test-set files, deck-data.json, eval/results and docs (?raw).
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import negativeSearchPy from "../../../../eval/negative_search.py?raw";
import caseStudy from "../../../../docs/context/case-study.md?raw";
import research from "../../../../docs/research.md?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";
import { CUAD, DOCS, QUESTIONS_N } from "./testset-data";

// ---------------------------------------------------------------- the test bench
// The 47 documents as tiles in three groups: the ids (M, V, C) are used on every later card, so the
// audience meets them here first - and M18, M05/M05-A and M02 are the examples the card 'hard' showed.
const ids = (type: string) => DOCS.filter((d) => d.type === type).map((d) => d.id);
const M_IDS = ids("merchant_agreement");
const A_IDS = ids("amendment");
const V_IDS = ids("data_processing_agreement");
const C_IDS = CUAD.map((c) => c.id);
const ALL_DOCS = DOCS.length + CUAD.length;
const range = (list: string[]) => `${list[0]} to ${list[list.length - 1]}`;
const GROUPS = [
  { at: 1, prefix: "M", ids: DOCS.filter((d) => d.type === "merchant_agreement" || d.type === "amendment").map((d) => d.id),
    title: `${M_IDS.length} merchant agreements + ${A_IDS.length} amendment`, sub: "written for this case study – every trap is on purpose" },
  { at: 2, prefix: "V", ids: V_IDS, title: `${V_IDS.length} data processing agreements`, sub: "the vendor side, Art. 28 GDPR" },
  { at: 3, prefix: "C", ids: C_IDS, title: `${C_IDS.length} real public contracts`, sub: "CUAD dataset, labelled by legal experts – real contract language" },
];

function TestSet() {
  return (
    <div className="tset x-tset">
      {GROUPS.map((g) => (
        <Build key={g.prefix} at={g.at} className={`tset-group g-${g.prefix.toLowerCase()}`}>
          <div className="tset-head">
            <span className="tset-prefix">{g.prefix}</span>
            <div>
              <div className="tset-title">{g.title}</div>
              <div className="tset-sub">{g.sub}</div>
            </div>
          </div>
          <div className="tset-tiles">
            {g.ids.map((id) => <span key={id}>{id}</span>)}
          </div>
        </Build>
      ))}
      <Build at={3} className="tset-total">
        {ALL_DOCS} documents · {QUESTIONS_N} test questions, every answer known · synthetic or public, nothing from Riverty
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- RAG
const E = deck.embedding;
const M01_CLAUSE = deck.m01.quote.split(" ")[0];                    // "7.2"

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
          {Array.from({ length: E.k }, (_, i) => <span key={i} />)}
          <div className="passages-label">the {E.k} most similar passages<b>top {E.k}</b></div>
        </div>
      </Build>
      <Build at={3} className="flow-step">
        <span className="arrow" aria-hidden>→</span>
        <div className="node model">
          <span className="node-kind">Model</span>
          reads only these {E.k} and writes the answer
        </div>
      </Build>
      <Build at={2} className="term">
        <b>top-k</b>: the search returns only the <b>k</b> most similar passages – here k = {E.k}. Everything else the model never sees.
      </Build>
      <Build at={4} className="term">
        <b>RAG</b> – retrieval-augmented generation: search first, then the model answers from what was found.
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- embeddings
// Every passage of the register as one dot: its position is the cosine similarity of its embedding
// to the embedding of the question (tools/deck_data.py). A 2-D map was tried and rejected: it sorted
// the dots by contract group, not by meaning. The M14-against-M19 build was cut (decision 88): it
// used M14's hidden instruction before act 2 explains it; the deep dive 'decoy' keeps that point.
const LANES = [{ g: "M", name: "M · merchant" }, { g: "V", name: "V · data processing" }, { g: "C", name: "C · CUAD" }];
const MIN = 0.12;
const MAX = 0.55;
const xPos = (sim: number) => `${((sim - MIN) / (MAX - MIN)) * 100}%`;
const yPos = (i: number) => `${16 + ((i * 37) % 68)}%`;          // spread the dots of a lane, the same every time
const NEAR = new Set(E.near.map((x) => x.id));
const NEAR_CUAD = E.near.filter((x) => x.id.startsWith("C")).length;
const NEAR_M = E.near.filter((x) => x.id.startsWith("M")).length;      // the merchant agreements among the closest
const TOPK_FROM = E.near[E.near.length - 1].sim - 0.004;
const DIMS_ROUND = Math.round(E.dims / 100) * 100;                 // 1,536 -> "about 1,500"

function EmbeddingRuler() {
  const step = useStep();
  return (
    <div className="x-ruler" role="img" aria-label={`${E.passages} passages by similarity to the question, and the ${E.k} closest`}>
      {LANES.map((lane) => (
        <div key={lane.g} className="x-lane">
          <span className="x-lane-name">{lane.name}</span>
          <div className="x-track">
            {E.points.map((pt, i) => {
              if (pt.g !== lane.g) return null;
              const cls = ["x-dot", pt.lia && "lia", step >= 1 && NEAR.has(pt.id) && "near"].filter(Boolean).join(" ");
              return <span key={pt.id} className={cls} style={{ left: xPos(pt.s), top: yPos(i) }} />;
            })}
            {step >= 1 && <div className="x-topk" style={{ left: xPos(TOPK_FROM) }}>{lane.g === "M" && <span>top-{E.k}</span>}</div>}
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

// ---------------------------------------------------------------- RAG fails: Q1
// Measured with a keyword search (BM25, eval/negative_search.py) over the merchant agreements, not
// with the embeddings of the card before - the card and the notes say so, because some numbers hold
// only for keywords ("never match"). About embeddings the note says only what holds in principle
// (they rank too), no result: no embedding top-k was measured over these contracts. The merchant
// agreements the measurement searched (M15 is a copy of M01 and counts once):
const CONTRACTS = Array.from({ length: 20 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`).filter((id) => id !== "M15");
const K = 10;
const AT_K = measurement.top_k.find((r) => r.k === K)!;
const RANKED = new Set(Object.keys(measurement.first_rank_per_contract));   // a passage among the 10 best
const LACKING = new Set(measurement.expected);
const NOT_RANKED = measurement.contracts - AT_K.contracts_in_top_k;          // "lack it", for the search
const NEVER = measurement.contracts - measurement.contracts_matching_at_all; // no k helps them
const COPY = deck.register.rows.find((r) => r.copy_of)!;                     // M15, a copy of M01

function RagFails() {
  const step = useStep();
  return (
    <div className="fails">
      <div className="node person"><span className="node-kind">You ask · Q1</span>“Which merchant agreements lack a limitation of liability?”</div>
      <div className="tiles" role="img" aria-label={`${measurement.contracts} merchant agreements, coloured by what the search says and what is true`}>
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
        <Build at={1}><span className="sw found" /> in the top {K} passages of a keyword search (k = {K}): “mentions liability”</Build>
        <Build at={2}><span className="sw flagged" /> not found – so it “lacks the clause”?</Build>
        <Build at={3} className="fails-result">
          <b>{AT_K.false_alarms.length} false alarms</b> · <b>{AT_K.missed.join(", ")} missed</b> – it mentions liability only in a hidden instruction for the AI.
        </Build>
        <Build at={4} className="x-fails-key">Top-k ranks what is there. It cannot prove what is missing.</Build>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- an agent
// The study's numbers are read from docs/research.md, Riverty's sentence from the case study.
const RESEARCH = research.replace(/\s+/g, " ");
const STUDY = /did not read every file in ([\d.]+) % of runs, and in ([\d.]+) % of those runs/.exec(RESEARCH);
const SKIPPED = Math.round(Number(STUDY?.[1]));                     // 67.9 % -> 68 %
const HID_OF_5 = Math.round(Number(STUDY?.[2]) / 20);               // 80.4 % -> 4 of 5
const STUDY_YEAR = /OverclaimBench, (\d{4})/.exec(RESEARCH)?.[1] ?? "";
const STUDY_MODELS = /(\d+) frontier models in their production CLIs plus (\d+) open-weight models/.exec(RESEARCH);
const RIVERTY_AGENTS = "in day-to-day operations they often fail due to the sheer size and complexity of the environments they have to operate in.";

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
          <div className="big">{SKIPPED} %</div>
          <div>of runs: agents asked to review every file <b>skipped files</b></div>
          <div className="stat-sub">and in {HID_OF_5} of 5 of those runs, the report hid it</div>
          <cite>OverclaimBench, {STUDY_YEAR} – {STUDY_MODELS?.[1]} frontier and {STUDY_MODELS?.[2]} open-weight models</cite>
        </Build>
        <Build at={3} className="quote-riverty">
          “… {RIVERTY_AGENTS}”
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

// ---------------------------------------------------------------- guards (development only)
if (import.meta.env.DEV) {
  const problems = [
    ALL_DOCS !== deck.register.documents && `card 'contracts': ${ALL_DOCS} documents in the test-set files, ${deck.register.documents} in the register`,
    !M_IDS.includes("M18") || !A_IDS.includes("M05-A") ? "card 'contracts': the note names M18 and M05-A, the test set has no such documents" : false,
    !deck.m01.quote.startsWith(M01_CLAUSE) && "card 'rag': M01's liability quote does not start with its clause number",
    measurement.contracts !== CONTRACTS.length && `card 'rag-fails': ${measurement.contracts} contracts searched, ${CONTRACTS.length} tiles`,
    COPY?.id !== "M15" && "card 'rag-fails': the note says M15 is the copy - the register says otherwise",
    AT_K.missed.join() !== "M14" && "card 'rag-fails': the notes say only M14 is missed at k = 10",
    !AT_K.false_alarms.includes("M02") && "card 'rag-fails': the notes give M02 as a false alarm",
    !AT_K.false_alarms.every((id) => DOCS.some((d) => d.id === id && d.cap !== "absent" && (d.cap === "paraphrased" || d.language === "DE")))
      && "card 'rag-fails': the note says every false alarm caps liability in other words or in German - data/ground_truth.csv says otherwise",
    DOCS.find((d) => d.id === "M02")?.cap !== "paraphrased" && "card 'rag-fails': the note gives M02 as a cap in other words",
    !(NEAR_CUAD + NEAR_M === E.k && NEAR_M === 1)
      && "card 'embedding-map': the note says the closest passages are CUAD's and only one from a merchant agreement",
    !negativeSearchPy.includes("search.bm25_ranking(") && "card 'rag-fails': the card says 'keyword search' - eval/negative_search.py no longer ranks with BM25",
    measurement.doc_type !== "merchant_agreement" && "card 'rag-fails': the notes say the search ran over the merchant agreements",
    !(SKIPPED > 0 && HID_OF_5 > 0) && "card 'agent': the OverclaimBench numbers are no longer in docs/research.md",
    !STUDY_MODELS && "card 'agent': the citation gives the study's frontier and open-weight models - docs/research.md no longer has them",
    !caseStudy.replace(/\s+/g, " ").includes(RIVERTY_AGENTS) && "card 'agent': Riverty's sentence is not in the case study word for word",
  ].filter(Boolean);
  for (const p of problems) console.error(`act 2: ${p}`);
}

export const ACT2: Slide[] = [
  {
    id: "act-2", act: 2, kind: "opener", title: "Why the usual AI approaches fail", steps: 0, seconds: 4,
    notes: [
      "Do the usual approaches work? I tested them.",
    ],
    words: [{ word: "approaches", say: "uh-PROH-chiz" }],
  },
  {
    id: "contracts", act: 2, kind: "content", title: `Riverty cannot share contracts – so I put together ${ALL_DOCS} with known answers.`, steps: 3, seconds: 40, Body: TestSet,
    notes: [
      "To test any approach, I need known answers. Riverty can't share contracts, so I built a test set.",
      // the ranges of V and C are on screen (prefix and tiles) - said only for M, to keep the card in time
      `${M_IDS.length} merchant agreements I wrote, ${range(M_IDS)}, with traps. M18: the scan you saw. M05 and its amendment M05-A: the former name. M02: a cap in other words.`,
      `${V_IDS.length} data processing agreements: the vendor side.`,
      `${C_IDS.length} real public contracts from CUAD, labelled by experts. For ${QUESTIONS_N} test questions, I wrote the answers first.`,
    ],
    words: [{ word: "amendment", say: "uh-MEND-ment" }, { word: "labelled", say: "LAY-buld" }, { word: "CUAD", say: "KWAD" }],
  },
  {
    id: "rag", act: 2, kind: "content", title: "The usual approach: a chatbot over your documents.", steps: 4, seconds: 46, Body: Rag,
    notes: [
      "Most document assistants work like this. You ask, for example, about liability in the Nordlicht contract, M01.",
      "A search compares your question with every passage – a short piece of a contract – and returns the most similar ones.",
      `This is called top-k. Here k is ${E.k}: the ${E.k} best passages, nothing else.`,
      `The model – the AI that writes – reads only these ${E.k} and answers. For M01 this works: the search finds clause ${M01_CLAUSE}.`,
      "This is called RAG: retrieval-augmented generation. The model only sees what the search returns.",
    ],
    words: [{ word: "retrieval", say: "rih-TREE-vul" }, { word: "augmented", say: "awg-MEN-tid" }, { word: "similar", say: "SIM-ih-ler" }],
  },
  {
    id: "embedding-map", act: 2, kind: "content", title: "Embeddings: every passage becomes numbers, near means similar.", steps: 1, seconds: 30, Body: EmbeddingRuler,
    notes: [
      `How does a search know what is similar? With embeddings. Every passage becomes about ${DIMS_ROUND.toLocaleString("en")} numbers. Here every dot is one of our ${E.passages} passages. Further right means closer in meaning to the question.`,
      `Top-k takes the dots on the far right: ${NEAR_CUAD} CUAD passages, only ${NEAR_M} from a merchant agreement. So: does top-k answer Legal's question?`,
    ],
    words: [{ word: "embeddings", say: "em-BED-ingz" }, { word: "similar", say: "SIM-ih-ler" }],
  },
  {
    id: "rag-fails", act: 2, kind: "content", title: "It fails when the answer is what is not in the text.", steps: 4, seconds: 62, Body: RagFails,
    notes: [
      `Legal's question, our Q1: which merchant agreements lack a limitation of liability – a cap like the ones you saw? ${measurement.contracts} contracts: ${COPY.id} is a copy of ${COPY.copy_of} and counts once.`,
      `Now a keyword search over these ${measurement.contracts}: '${measurement.query}', top ${K}. The ${K} best passages come from ${AT_K.contracts_in_top_k} contracts.`,
      `For the search, the other ${NOT_RANKED} 'lack' it.`,
      `${AT_K.false_alarms.length} of the ${NOT_RANKED} are false alarms: they cap liability in other words or in German, like M02. And ${AT_K.missed.join(", ")} is missed: no cap, but its hidden instruction for the AI mentions liability – so it ranks high.`,
      `A larger k does not help: ${NEVER} contracts never match the keywords. Embeddings rank too. Top-k ranks what is there. It cannot prove what is missing.`,
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "merchant", say: "MUR-chunt" }, { word: "instruction", say: "in-STRUK-shun" }],
  },
  {
    id: "agent", act: 2, kind: "content", title: "And an AI agent that reads everything itself?", steps: 3, seconds: 43, Body: Agent,
    notes: [
      "Second idea: an agent. A model plans a step, calls a tool – open a file, search, take notes – and repeats.",
      "The weak point: it decides when it is done. Nobody checks that it opened every file.",
      `A ${STUDY_YEAR} study, OverclaimBench: agents told to review every file skipped files in ${SKIPPED} percent of runs – and ${HID_OF_5} in 5 reports hid it.`,
      "Riverty's own task says agents fail on the size of the environment. A thousand contracts is exactly that.",
    ],
    words: [{ word: "agent", say: "AY-junt" }, { word: "OverclaimBench", say: "OH-ver-klaym-bench" }, { word: "environment", say: "en-VY-run-ment" }],
  },
  {
    id: "needs", act: 2, kind: "content", title: "So we need three guarantees.", steps: 3, seconds: 25, Body: Needs,
    notes: [
      "So we need three guarantees.",
      "One: every contract is read. We prove it, not just claim it.",
      "Two: every finding shows the passage on the page. A lawyer can check it in seconds.",
      "Three: a lawyer decides.",
    ],
    words: [{ word: "guarantees", say: "gair-un-TEEZ" }, { word: "lawyer", say: "LOY-er" }],
  },
];
