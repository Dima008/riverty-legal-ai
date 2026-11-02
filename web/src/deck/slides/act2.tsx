// Part 2 - my approach (decision 101, the rebuild of 2.11.): the levers (today's process per step and what
// my approach does with it), the two usual options tested on contracts with known answers - a search
// cannot prove what is missing, an agent stops when it decides it is done - then per step code or AI,
// and the three guarantees. The roadmap, the bridge question, the test set and the RAG explanation are
// deep dives; the test set is said in one sentence on 'rag-fails'.
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import negativeSearchPy from "../../../../eval/negative_search.py?raw";
import caseStudy from "../../../../docs/context/case-study.md?raw";
import research from "../../../../docs/research.md?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import { CONTRACTS as PORTFOLIO, HOURS } from "./act1";
import "./acts.css";
import deck from "./deck-data.json";
import { CUAD, DOCS, QUESTIONS_N } from "./testset-data";

// ---------------------------------------------------------------- how I worked: the roadmap
// The path from the problem to the platform (docs/context/briefing.md, section 4). It opens part 2,
// 'My approach' (decision 90): part 1 walked the first steps (the pilot question, today's process).
const PHASES = [
  { at: 0, name: "Understand", steps: [
    { n: 1, name: "Qualify the pilot" },
    { n: 2, name: "Map today's process" },
    { n: 3, name: "Rethink the process" },
  ] },
  { at: 1, name: "Design", steps: [
    { n: 4, name: "Per step: code or AI?" },
    { n: 5, name: "As little freedom for the AI as works" },
    { n: 6, name: "Architecture and decisions" },
  ] },
  { at: 2, name: "Deliver", steps: [
    { n: 7, name: "Evaluate and harden" },
    { n: 8, name: "Platform" },
    { n: 9, name: "Adopt and scale" },
  ] },
];

// The AI line under the roadmap ("Built with Claude Code") was cut on 2.11. (decision 100); how AI was
// used is said when asked (docs/check-questions.md).
function HowIWorked() {
  return (
    <div>
      <div className="x-steps">
        {PHASES.map((ph) => (
          <Build key={ph.name} at={ph.at} className="x-phase">
            <div className="x-phase-name">{ph.name}</div>
            {ph.steps.map((st) => (
              <div key={st.n} className="x-step">
                <span className="x-step-n">{st.n}</span>
                <div className="x-step-name">{st.name}</div>
              </div>
            ))}
          </Build>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the levers (decision 99)
// Today's process for one question, as the case study describes it ("open the documents, search for the
// relevant content, and verify the results themselves") plus noting and deciding, and per step what my
// approach does with it: three levers, numbered by their effect, and the one step that is not automated
// on purpose. The kinds are the colours of the architecture card: code, AI, register, person.
const LEVERS = [
  { today: "Open the contract", at: 1, kind: "code", now: "Arrives once – from SharePoint" },
  { today: "Search and read", at: 1, kind: "model", now: "AI reads it once – into a register", lever: "1 · biggest" },
  { today: "Note the result", at: 2, kind: "store", now: "A question becomes a lookup", lever: "2" },
  { today: "Verify", at: 3, kind: "code", now: "The passage on the page – only unclear goes to a person", lever: "3" },
  { today: "Decide", at: 3, kind: "person", now: "Stays with the lawyer – on purpose" },
];

function Levers() {
  return (
    <div className="x-lev">
      <span className="x-lev-h">Today · per question, by hand</span><span /><span className="x-lev-h now">My approach</span><span />
      {LEVERS.map((l) => (
        <div key={l.today} style={{ display: "contents" }}>
          <span className="x-box person">{l.today}</span>
          <Build at={l.at} className="x-arrow">→</Build>
          <Build at={l.at} className={`x-box ${l.kind}`}>{l.now}</Build>
          <Build at={l.at} className="x-lev-n">{l.lever ? `lever ${l.lever}` : ""}</Build>
        </div>
      ))}
      <span className="x-lev-again">× every contract · again for every question</span>
    </div>
  );
}

// ---------------------------------------------------------------- why do the usual AI approaches fail here?
// The bridge Dima asked for (decision 100): the sixth problem of part 1 - the case study's own sentence
// on agents - becomes the question, the two usual options are named, and both are tested on the test
// bench before one is chosen. Riverty's sentence is on screen as its crop (decision 98: a screenshot of
// the PDF), its alt text checked against the case study below.
const RIVERTY_AGENTS = "in day-to-day operations they often fail due to the sheer size and complexity of the environments they have to operate in.";

function WhyFail() {
  return (
    <div className="x-why">
      <img className="x-cs-crop" src="/case-study/agents-fail.png" alt={RIVERTY_AGENTS} />
      <div className="x-why-opts">
        <Build at={1} className="x-why-opt">
          <span className="x-why-k">Option A</span>
          <b>A chatbot over the documents</b>
          <span>search first, then answer – RAG</span>
        </Build>
        <Build at={1} className="x-why-opt">
          <span className="x-why-k">Option B</span>
          <b>An AI agent that reads by itself</b>
          <span>opens, searches, notes – until it decides it is done</span>
        </Build>
      </div>
      <Build at={2} className="x-why-foot">Both tested on contracts with known answers – before choosing.</Build>
    </div>
  );
}

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
          the {E.k} passages most similar to the question
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
          answers from these {E.k} – and nothing else
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
        <Build at={1}><span className="sw found" /> in the top {K} passages: “mentions liability”</Build>
        <Build at={2}><span className="sw flagged" /> not in the top {K} – “lacks the clause”?</Build>
        <Build at={3} className="fails-result">
          <b>{AT_K.false_alarms.length} false alarms</b> · <b>{AT_K.missed.join(", ")} missed</b> – liability only in a hidden instruction for the AI
        </Build>
        <Build at={4} className="x-fails-key">Top-k ranks what is there. It cannot prove what is missing.</Build>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- an agent
// The study's numbers are read from docs/research.md; Riverty's sentence (RIVERTY_AGENTS, on 'why-fail'
// as the crop) is quoted again next to the measurement.
const RESEARCH = research.replace(/\s+/g, " ");
const STUDY = /did not read every file in ([\d.]+) % of runs, and in ([\d.]+) % of those runs/.exec(RESEARCH);
const SKIPPED = Math.round(Number(STUDY?.[1]));                     // 67.9 % -> 68 %
const HID_OF_5 = Math.round(Number(STUDY?.[2]) / 20);               // 80.4 % -> 4 of 5
const STUDY_YEAR = /OverclaimBench, (\d{4})/.exec(RESEARCH)?.[1] ?? "";
const STUDY_MODELS = /(\d+) frontier models in their production CLIs plus (\d+) open-weight models/.exec(RESEARCH);
function Agent() {
  return (
    <div className="agent">
      <div className="loop" aria-label="An agent: a model that calls tools in a loop">
        <div className="node model"><span className="node-kind">Model</span>decides the next step</div>
        <div className="loop-arrows" aria-hidden><span>⟶</span><span>⟵</span></div>
        <div className="node code"><span className="node-kind">Tools</span>open a file · search · note</div>
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

// ---------------------------------------------------------------- per step: code or AI? (decision 100)
// The decision Dima asked to see derived, not told: every step of the process, the problem of part 1 it
// answers (its id from FOUND, guarded below), and whether deterministic code or a model does it - with the
// reason. The rule of the roadmap's step 5: as little freedom for the AI as works. The kinds are the
// colours of the architecture card: code, AI, register, person.
const STEPS = [
  { at: 0, step: "Read the text – or OCR for an image", kind: "code", who: "Code", why: "text, with a confidence", p: "" },
  { at: 1, step: "Find each clause – in any words", kind: "model", who: "AI", why: "the only step that needs meaning", p: "" },
  { at: 1, step: "Check: is the quote in the text?", kind: "code", who: "Code", why: "a model can be wrong", p: "" },
  { at: 2, step: "Answer: which contracts lack X?", kind: "store", who: "Code · a lookup", why: "every contract is a row", p: "" },
  { at: 2, step: "Decide", kind: "person", who: "A lawyer", why: "observations, not verdicts", p: "" },
];

function CodeOrAi() {
  return (
    <div className="x-coa">
      <span className="x-coa-h">Step</span><span className="x-coa-h">Who does it</span><span className="x-coa-h">Why</span>
      {STEPS.map((st) => (
        <Build key={st.step} at={st.at} className="x-coa-row">
          <span className="x-coa-step">{st.step}</span>
          <span className={`x-box ${st.kind}`}>{st.who}</span>
          <span className="x-coa-why">{st.why}{st.p && <small>{st.p}</small>}</span>
        </Build>
      ))}
      <Build at={2} className="x-coa-foot">The AI reads. Code checks and answers. A lawyer decides.</Build>
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
    E.near.find((x) => x.id.startsWith("M01:"))?.title !== deck.m01.section
      && "card 'rag': the note says the search finds M01's clause - its section is no longer among the closest passages",
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
    !(PORTFOLIO > 1000) && `card 'agent': the note says over ${PORTFOLIO} contracts fit into no context window - the count of 'today' (act1.tsx, from the case study) is no longer over a thousand`,
    // the problems 'code-or-ai' points back to (act1.tsx FOUND): the ids must still mean what the rows say
    STEPS.filter((st) => st.kind === "model").length !== 1 && "card 'code-or-ai': the foot says the AI reads - one model row",
  ].filter(Boolean);
  for (const p of problems) console.error(`act 2: ${p}`);
}

export const ACT2: Slide[] = [
  {
    id: "part-2", act: 2, kind: "opener", title: "My approach · how I narrowed it down", steps: 0, seconds: 5,
    quote: ["A solution explaining how you would tackle the challenge"],
    notes: ["My approach: where the lever is, what I tested, and what I decided."],
    words: [{ word: "lever", say: "LEE-ver" }],
  },
  {
    // decision 99 (Dima, 2.11.: "where are the biggest levers, where do I see the most automation")
    id: "levers", act: 2, kind: "content", title: "The biggest lever: read every contract only once.", steps: 3, seconds: 48, Body: Levers,
    notes: [
      "I mapped today's process for one question: open, search and read, note, verify, decide – for every contract, and again for every question.",
      "The biggest lever is the reading. So the AI reads every contract only once, when it arrives, into a structured register: compile, don't search.",
      `Then a question becomes a lookup – seconds instead of about ${HOURS} hours, always over every contract.`,
      "Verifying means the passage on the page; only unclear goes to a person. The decision stays with the lawyer – on purpose.",
    ],
    words: [{ word: "compile", say: "kum-PILE" }, { word: "register", say: "REJ-ih-ster" }],
  },
  {
    // the test set is said here in one sentence (its card is a deep dive, decision 101)
    id: "rag-fails", act: 2, kind: "content", title: "A search cannot prove what is missing.", steps: 4, seconds: 80, Body: RagFails,
    notes: [
      "Before I built that, I tested the usual approach: a chatbot over the documents – search first, then a model answers. " +
        `I wrote ${ALL_DOCS} test contracts with known answers, because Riverty's are confidential. Question 1 on the merchant agreements: ` +
        `${measurement.contracts} contracts, ${COPY.id} is a copy of ${COPY.copy_of}.`,
      `A search keeps only the passages most similar to the question – here the top ${K}. They come from only ${AT_K.contracts_in_top_k} contracts.`,
      `So for the search, the other ${NOT_RANKED} lack the clause?`,
      `No: ${AT_K.false_alarms.length} are false alarms – they cap liability in other words or in German, like M02. ` +
        `And ${AT_K.missed.join(", ")} is missed: no cap, but a hidden instruction for the AI mentions liability.`,
      // Dima's wish (Notion card 10, 1.11.), in his own words (decision 98): why top-k can never prove absence
      `A missing clause has no passage, so it never shows up – a larger k does not help: ${NEVER} contracts never match. ` +
        "A search ranks what is there; it cannot prove what is missing.",
    ],
    words: [{ word: "merchant", say: "MUR-chunt" }, { word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "instruction", say: "in-STRUK-shun" }],
  },
  {
    id: "agent", act: 2, kind: "content", title: "An agent stops when it decides it is done.", steps: 3, seconds: 50, Body: Agent,
    notes: [
      "The second usual option: an agent. A model decides a step, calls a tool – open a file, search, note – and repeats.",
      // Dima's wish (Notion card 11, 1.11.), in his own words (decision 98)
      "It decides itself when it is done – so it can stop early, and nobody notices.",
      `A ${STUDY_YEAR} study, OverclaimBench, told agents to review every file: they skipped files in ${SKIPPED} percent of the runs, ` +
        `and in ${HID_OF_5} of 5 of those, the report hid it.`,
      // "one model call per contract": the reader; the checker is a second call for each "found" (said on 'code-or-ai')
      `That is the sentence from the case study. So I read every contract once, completely: one model call per contract.`,
    ],
    words: [{ word: "agent", say: "AY-junt" }, { word: "OverclaimBench", say: "OH-ver-klaym-bench" }],
  },
  {
    // decision 100: the decision per step, derived from the problems
    id: "code-or-ai", act: 2, kind: "content", title: "Per step: code – AI only where meaning is needed.", steps: 2, seconds: 50, Body: CodeOrAi,
    notes: [
      "From that, per step: code or a model? My rule: as little freedom for the AI as works. Reading the text is code – OCR for an image, with a confidence.",
      "One step needs meaning: find a clause in any words. Only here a model reads – and because it can be wrong, " +
        "code checks that its quote is really in the text, and a second model call gives an opinion.",
      "The question itself is a lookup over every row of the register: coverage is a fact. And a lawyer decides.",
    ],
    words: [{ word: "OCR", say: "oh-see-AR" }, { word: "verdicts", say: "VUR-dikts" }],
  },
  {
    id: "needs", act: 2, kind: "content", title: "So we need three guarantees.", steps: 3, seconds: 22, Body: Needs,
    notes: [
      "From all this, three guarantees.",
      "First, every contract is read – and we can prove it, not just claim it.",
      "Second, every finding shows its passage on the page.",
      "And third, a lawyer decides.",
    ],
    words: [{ word: "guarantees", say: "gair-un-TEEZ" }],
  },
];

// Deep dives since decision 101: the bridge question and the test set (said in one sentence on 'rag-fails').
export const WHY_FAIL: Slide = {
    id: "why-fail", act: 7, kind: "content", title: "Why do the usual AI approaches fail at this task?", steps: 2, seconds: 36, deep: true, Body: WhyFail,
    notes: [
      "Before I chose how the AI reads, I took the sixth problem seriously: the case study itself says that agents often fail on the size of the environment. " +
        "I wanted to see that on the biggest lever, the reading.",
      "Two usual options: A, a chatbot over the documents; B, an AI agent that reads by itself.",
      "I tested both on contracts with known answers. First, the test set.",
    ],
    words: [{ word: "approaches", say: "uh-PROH-chiz" }, { word: "environment", say: "en-VY-run-ment" }, { word: "agent", say: "AY-junt" }],
};

export const TEST_CONTRACTS: Slide = {
    id: "contracts", act: 7, kind: "content", title: `A test set: ${ALL_DOCS} contracts, every answer known.`, steps: 3, seconds: 53, deep: true, Body: TestSet,
    notes: [
      "To test the options, I need contracts with known answers. Riverty's are confidential, so I built a test set.",
      // Riverty's addendum: "These agreements cover both B2B and B2B2C business models"; the scan card 'hard'
      // is a deep dive since decision 98, so M18, M05/M05-A and M02 are introduced here
      `I wrote ${M_IDS.length} merchant agreements, ${range(M_IDS)}, B2B and B2B2C, with traps: M18 is a scan, ` +
        "M05 names the former company and its amendment M05-A renames it, and M02 limits liability in other words.",
      `Then ${V_IDS.length} data processing agreements, the vendor side.`,
      // the evaluation: known answers (the answer key, written first) and CUAD - public contracts with experts' labels
      `And ${C_IDS.length} real public contracts from CUAD, labelled by legal experts. For all ${QUESTIONS_N} test questions, I wrote the answers first.`,
    ],
    words: [{ word: "B2B2C", say: "bee-two-bee-two-SEE" }, { word: "M05-A", say: "em-zero-five-AY" }, { word: "amendment", say: "uh-MEND-ment" },
      { word: "labelled", say: "LAY-buld" }, { word: "CUAD", say: "KWAD" }],
};

export const HOW_I_WORKED: Slide = {
    id: "how-i-worked", act: 7, kind: "content", title: "How I work: from the problem to the platform.", steps: 2, seconds: 40, deep: true, Body: HowIWorked,
    notes: [
      // steps 1 to 3: the pilot (part 1), today's process and its rethinking (the next card, 'levers')
      "I work in three phases. First, understand: I qualified the pilot – the two questions – mapped today's process and looked for the biggest levers.",
      "Then design: for every step, code or AI – and as little freedom for the AI as works. The architecture follows from that.",
      "Then deliver: I evaluated the prototype on contracts with known answers. Azure and the rollout are planned, not built yet.",
    ],
    words: [{ word: "pilot", say: "PIE-lut" }, { word: "process", say: "PROH-ses" }, { word: "architecture", say: "AR-kih-tek-cher" }],
};

// Deep dives (decisions 90, 100 - to keep the main track under 22:00): opened on a question, listed in
// deep.tsx. Their data and guards stay here, next to the cards they belong to. 'rag' explains option A
// step by step; on the main track 'rag-fails' says top-k in one sentence.
export const RAG: Slide = {
    id: "rag", act: 7, kind: "content", title: "Option A in detail: a chatbot over the documents – search first, then answer.", steps: 4, seconds: 50, deep: true, Body: Rag,
    notes: [
      "Option A in detail, the usual chatbot over documents. Say a lawyer asks what M01 says about liability.",
      // the first word on embeddings (rag-fails says "Embeddings rank too"; the map is a deep dive)
      "A search compares the question with every passage of every contract, by meaning: each passage becomes a list of numbers, an embedding.",
      `It keeps only the ${E.k} most similar passages. That is top-k – here k is ${E.k}.`,
      `A language model reads only these ${E.k} and writes the answer. For M01 it works: the search finds clause ${M01_CLAUSE}.`,
      "This is RAG, retrieval-augmented generation: the model sees only what the search returns.",
    ],
    words: [{ word: "Nordlicht", say: "NORD-likht" }, { word: "embeddings", say: "em-BED-ingz" }, { word: "top-k", say: "top-KAY" },
      { word: "retrieval", say: "rih-TREE-vul" }, { word: "augmented", say: "awg-MEN-tid" }],
};

export const EMBEDDING_MAP: Slide = {
  id: "embedding-map", act: 7, kind: "content", title: "Embeddings: every passage becomes numbers, near means similar.", steps: 1, seconds: 30, deep: true, Body: EmbeddingRuler,
  notes: [
    `How does a search know what is similar? With embeddings. Every passage becomes about ${DIMS_ROUND.toLocaleString("en")} numbers. Here every dot is one of our ${E.passages} passages. Further right means closer in meaning to the question.`,
    `Top-k takes the dots on the far right: ${NEAR_CUAD} CUAD passages, only ${NEAR_M} from a merchant agreement. Near in meaning – but it cannot tell which contract lacks a cap.`,
  ],
  words: [{ word: "embeddings", say: "em-BED-ingz" }, { word: "similar", say: "SIM-ih-ler" }],
};
