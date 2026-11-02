// Part 2 - my approach (decisions 90, 99; Dima, 2.11.: "what did I identify, where are the biggest
// levers, how did I work"): how I work (the roadmap), then the levers - today's process per step and
// what my approach does with it - then the options I tested for the biggest lever, on a test bench
// (47 documents with known answers, decision 88): a chatbot over documents (RAG, top-k) cannot prove
// absence, a free agent cannot prove it read everything. From that, three guarantees. The register's
// own result is NOT shown here: part 3 reveals it. The embedding map is a deep dive since decision 90.
// Numbers come from the test-set files, deck-data.json, eval/results and docs (?raw).
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import negativeSearchPy from "../../../../eval/negative_search.py?raw";
import caseStudy from "../../../../docs/context/case-study.md?raw";
import research from "../../../../docs/research.md?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import { CONTRACTS as PORTFOLIO, HOURS, n } from "./act1";
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

// Build 3 picks up "As our future teammate, we encourage you to do the same" (AI usage): said as
// "every", not as a count - every commit carries the Co-Authored-By trailer today (CLAUDE.md rule),
// and a number would go stale with the next commit.
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
      <Build at={3} className="x-ai">
        Built with <b>Claude Code</b> · every AI commit marked in git · <b>I can explain every line.</b>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- the levers (decision 99)
// Today's process for one question, as the case study describes it ("open the documents, search for the
// relevant content, and verify the results themselves") plus noting and deciding, and per step what my
// approach does with it: three levers, numbered by their effect, and the one step that is not automated
// on purpose. The kinds are the colours of the architecture card: code, AI, register, person.
const LEVERS = [
  { today: "open every contract", at: 1, kind: "code", now: "arrives once, from SharePoint" },
  { today: "search and read", at: 1, kind: "model", now: "the AI reads it once – into a register", lever: "1 · biggest" },
  { today: "note the result", at: 2, kind: "store", now: "a question becomes a lookup", lever: "2" },
  { today: "verify", at: 3, kind: "code", now: "the passage on the page – only unclear goes to a person", lever: "3" },
  { today: "decide", at: 3, kind: "person", now: "stays with the lawyer – on purpose" },
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
  ].filter(Boolean);
  for (const p of problems) console.error(`act 2: ${p}`);
}

export const ACT2: Slide[] = [
  {
    id: "part-2", act: 2, kind: "opener", title: "My approach", steps: 0, seconds: 7,
    quote: ["A solution explaining how you would tackle the challenge"],
    notes: [
      "My approach: how I work, my levers, and the options I tested.",
    ],
    words: [{ word: "levers", say: "LEE-verz" }],
  },
  {
    // "How I work": steps 8 and 9 (platform, adoption) are planned, not done (order pass #6)
    id: "how-i-worked", act: 2, kind: "content", title: "How I work: from the problem to the platform.", steps: 3, seconds: 53, Body: HowIWorked,
    notes: [
      // steps 1 to 3: the pilot (part 1), today's process and its rethinking (the next card, 'levers')
      "I work in three phases. First, understand: I qualified the pilot – your two questions – mapped today's process and looked for the biggest levers.",
      "Then design: for every step, code or AI – and as little freedom for the AI as works. The architecture follows from that.",
      "Then deliver: I evaluated the prototype on contracts with known answers. Azure and the rollout are planned, not built yet.",
      // decision 32: AI as sparring partner and accelerator; priorities, decisions and checks are Dima's
      "You encourage AI, and I used it: I built this with Claude Code. Every AI-assisted commit is marked in git, every decision is documented, " +
        "and I can explain every line.",
    ],
    words: [{ word: "pilot", say: "PIE-lut" }, { word: "process", say: "PROH-ses" }, { word: "architecture", say: "AR-kih-tek-cher" }, { word: "Claude", say: "KLAWD" }],
  },
  {
    // decision 99 (Dima, 2.11.: "where are the biggest levers, where do I see the most automation") - the
    // former card 'tomorrow' (a deep dive now), turned into the levers; the architecture opens part 3
    id: "levers", act: 2, kind: "content", title: "Three levers – the biggest: read every contract only once.", steps: 3, seconds: 53, Body: Levers,
    notes: [
      "To find the levers, I mapped today's process for one question, step by step.",
      "The biggest lever is the reading. It grows with every contract and is repeated for every question. " +
        "So the AI reads every contract only once, when it arrives, into a structured register: compile, don't search.",
      `Second: with the register, a new question becomes a lookup – seconds instead of about ${HOURS} hours, always over every contract.`,
      "Third, verifying: the lawyer sees the exact passage on the page, and only unclear findings need a person. " +
        "One step I deliberately don't automate: the decision stays with the lawyer.",
    ],
    words: [{ word: "levers", say: "LEE-verz" }, { word: "compile", say: "kum-PILE" }, { word: "deliberately", say: "dih-LIB-er-it-lee" }, { word: "register", say: "REJ-ih-ster" }],
  },
  {
    id: "contracts", act: 2, kind: "content", title: `Riverty cannot share contracts – so I put together ${ALL_DOCS} with known answers.`, steps: 3, seconds: 53, Body: TestSet,
    notes: [
      "To test the options, I need contracts with known answers. You can't share yours, so I built a test set.",
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
  },
  {
    id: "rag", act: 2, kind: "content", title: "The usual approach: a chatbot over your documents.", steps: 4, seconds: 55, Body: Rag,
    notes: [
      "For the biggest lever, the reading, I first tested the usual option: a chatbot over your documents. Say you ask about liability in M01.",
      // the first word on embeddings (rag-fails says "Embeddings rank too"; the map is a deep dive)
      "A search compares your question with every passage of every contract, by meaning: each passage becomes a list of numbers, an embedding.",
      `It keeps only the ${E.k} most similar passages. That is top-k – here k is ${E.k}.`,
      `A language model reads only these ${E.k} and writes the answer. For M01 it works: the search finds clause ${M01_CLAUSE}.`,
      "This is RAG, retrieval-augmented generation: the model sees only what the search returns.",
    ],
    words: [{ word: "Nordlicht", say: "NORD-likht" }, { word: "embeddings", say: "em-BED-ingz" }, { word: "top-k", say: "top-KAY" },
      { word: "retrieval", say: "rih-TREE-vul" }, { word: "augmented", say: "awg-MEN-tid" }],
  },
  {
    id: "rag-fails", act: 2, kind: "content", title: "It fails when the answer is what is not in the text.", steps: 4, seconds: 76, Body: RagFails,
    notes: [
      `Now your real question, Q1: which merchant agreements lack a limitation of liability – a cap on what a party must pay? ` +
        `That's ${measurement.contracts} contracts, because ${COPY.id} is a copy of ${COPY.copy_of}.`,
      `A keyword search for '${measurement.query}' keeps the top ${K} passages. They come from only ${AT_K.contracts_in_top_k} contracts.`,
      `So for the search, the other ${NOT_RANKED} seem to lack the clause.`,
      `But ${AT_K.false_alarms.length} of them are false alarms: they cap liability in other words or in German, like M02. ` +
        `And ${AT_K.missed.join(", ")} is missed: it has no cap, but a hidden instruction for the AI mentions liability.`,
      // Dima's wish (Notion card 10, 1.11.), in his own words (decision 98): why top-k can never prove absence
      `A missing clause has no passage, so it can never show up – and a larger k does not help: ${NEVER} contracts never match the keywords. ` +
        "Embeddings rank too. Top-k ranks what is there – search can't prove that something is missing.",
    ],
    words: [{ word: "merchant", say: "MUR-chunt" }, { word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "instruction", say: "in-STRUK-shun" }],
  },
  {
    id: "agent", act: 2, kind: "content", title: "And an AI agent that reads everything itself?", steps: 3, seconds: 70, Body: Agent,
    notes: [
      "The second option is an agent: a model plans a step, calls a tool – open a file, search, take notes – and repeats.",
      // Dima's wish (Notion card 11, 1.11.), in his own words (decision 98)
      "The weak point: it decides itself when it has seen enough – so it can stop early, and nobody notices.",
      `A ${STUDY_YEAR} study, OverclaimBench, told agents to review every file. They skipped files in ${SKIPPED} percent of the runs, ` +
        `and in ${HID_OF_5} of 5 of those runs, the report hid it.`,
      // Dima's wish (Notion cards 3 and 11, 1.11.), in his own words (decision 98): Riverty's sentence on agents, and
      // why every contract is read once. The count is the one of 'today' (act1.tsx, parsed from the case study).
      // Riverty's sentence stays on screen too - Dima's one exception to decision 90c. "to read it": the reader
      // is one call per contract (guarded on 'what-we-use'); the checker is a second call for each "found".
      `Your case study says agents fail on the size of the environment – and over ${n(PORTFOLIO)} contracts fit into no context window, so an agent sees only a part. ` +
        "A missed contract never shows up, and the answer still sounds complete. That's why I read every contract once, completely: one AI call per contract to read it.",
    ],
    words: [{ word: "agent", say: "AY-junt" }, { word: "OverclaimBench", say: "OH-ver-klaym-bench" }, { word: "environment", say: "en-VY-run-ment" },
      { word: "context window", say: "KON-tekst WIN-doh" }],
  },
  {
    id: "needs", act: 2, kind: "content", title: "So we need three guarantees.", steps: 3, seconds: 25, Body: Needs,
    notes: [
      "From all this, I derived three guarantees.",
      "First, every contract is read – and we can prove it, not just claim it.",
      "Second, every finding shows its passage on the page, so a lawyer can check it in seconds.",
      "And third, a lawyer decides.",
    ],
    words: [{ word: "guarantees", say: "gair-un-TEEZ" }, { word: "lawyer", say: "LOY-er" }],
  },
];

// A deep dive since decision 90 (to keep the main track short): opened on a question,
// listed in deep.tsx. Its data and guard stay here, next to the RAG cards it belongs to.
export const EMBEDDING_MAP: Slide = {
  id: "embedding-map", act: 7, kind: "content", title: "Embeddings: every passage becomes numbers, near means similar.", steps: 1, seconds: 30, deep: true, Body: EmbeddingRuler,
  notes: [
    `How does a search know what is similar? With embeddings. Every passage becomes about ${DIMS_ROUND.toLocaleString("en")} numbers. Here every dot is one of our ${E.passages} passages. Further right means closer in meaning to the question.`,
    `Top-k takes the dots on the far right: ${NEAR_CUAD} CUAD passages, only ${NEAR_M} from a merchant agreement. Near in meaning – but it cannot tell which contract lacks a cap.`,
  ],
  words: [{ word: "embeddings", say: "em-BED-ingz" }, { word: "similar", say: "SIM-ih-ler" }],
};
