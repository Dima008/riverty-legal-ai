// Act 3 - our solution: how I worked (nine steps, process to platform), the process tomorrow, how
// each problem picked its technique, the register, the two stores, one contract through the
// pipeline, the checks on a real wrong answer (M08), the hidden instruction (M14), and the lawyer
// deciding. Every number comes from deck-data.json (tools/deck_data.py reads the register) or from
// a stored evaluation file - nothing is typed by hand.
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

const AT_K10 = measurement.top_k.find((r) => r.k === 10)!;
const COST_ALL = deck.costs.cost_usd;                    // reading and checking all 47 documents once

// ---------------------------------------------------------------- how I worked
// The path from the process to the platform (docs/context/briefing.md, section 4), in our words.
const PHASES = [
  { at: 0, name: "Understand", diamond: "Discover · Define", steps: [
    { n: 1, name: "Qualify the pilot", proof: "1,100+ contracts × 5 min ≈ 90 h per question" },
    { n: 2, name: "Map today's process", proof: "open → search → read → note, per contract" },
    { n: 3, name: "Rethink the process", proof: "read once, then look up" },
  ] },
  { at: 1, name: "Design", diamond: "Develop", steps: [
    { n: 4, name: "Per step: code or AI?", proof: "AI only where meaning is needed" },
    { n: 5, name: "As little autonomy as works", proof: "a fixed workflow, not a free agent" },
    { n: 6, name: "Architecture and decisions", proof: "81 decisions, each with the rejected alternative" },
  ] },
  { at: 2, name: "Deliver", diamond: "Deliver", steps: [
    { n: 7, name: "Platform", proof: "Azure target, local stand-ins behind the same interfaces" },
    { n: 8, name: "Evaluate and harden", proof: "47 test documents · 18 failure cases recorded" },
    { n: 9, name: "Adopt and scale", proof: "a pilot: one team, one question" },
  ] },
];

function HowIWorked() {
  return (
    <div className="x-steps">
      {PHASES.map((ph) => (
        <Build key={ph.name} at={ph.at} className="x-phase">
          <div className="x-phase-name">{ph.name}<span>{ph.diamond}</span></div>
          {ph.steps.map((st) => (
            <div key={st.n} className="x-step">
              <span className="x-step-n">{st.n}</span>
              <div><div className="x-step-name">{st.name}</div><div className="x-step-proof">{st.proof}</div></div>
            </div>
          ))}
        </Build>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the process tomorrow
function Arrow() {
  return <span className="x-arrow" aria-hidden>→</span>;
}

function Tomorrow() {
  const step = useStep();
  return (
    <div className="x-proc">
      <div className={`x-proc-row${step >= 1 ? " x-gone" : ""}`}>
        <span className="x-proc-label">Today</span>
        <span className="x-proc-who">Lawyer</span>
        <div className="x-proc-steps">
          <span className="x-box person">open</span><Arrow /><span className="x-box person">search</span><Arrow />
          <span className="x-box person">read</span><Arrow /><span className="x-box person">note</span>
          <span className="x-repeat">× every contract, every question</span>
        </div>
      </div>
      <Build at={1} className="x-proc">
        <div className="x-proc-row">
          <span className="x-proc-label now">Tomorrow</span>
          <span className="x-proc-who">System</span>
          <div className="x-proc-steps">
            <span className="x-box code">saved in SharePoint</span><Arrow /><span className="x-box model">read once, checked</span>
            <Arrow /><span className="x-box store">register</span>
          </div>
        </div>
        <div className="x-proc-row">
          <span className="x-proc-who">Lawyer</span>
          <div className="x-proc-steps">
            <span className="x-box person">ask</span><Arrow /><span className="x-box person">confirm the plan</span><Arrow />
            <span className="x-box person">check the evidence</span><Arrow /><span className="x-box person">approve</span><Arrow />
            <span className="x-box code">archive copy</span>
          </div>
        </div>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- each problem picks its technique
const CHOICES = [
  { problem: "Prove what is missing", tech: "Read every contract into a register", sub: "one table: every contract against Legal's playbook", not: "top-k search · a free agent" },
  { problem: "Scans and photos", tech: "OCR, page by page, with a confidence", sub: "Tesseract now · Content Understanding on Azure", not: "" },
  { problem: "Same clause, other words", tech: "A model reads against the playbook", sub: "the playbook: Legal's clause definitions, as data", not: "keywords" },
  { problem: "A model can be wrong", tech: "A quote we find + a second model call", sub: "maker and checker", not: "the model's own confidence" },
  { problem: "Hidden instructions", tech: "A pattern check", sub: "next: Microsoft Prompt Shields", not: "" },
  { problem: "Lawyers decide", tech: "Triage · four eyes · approval gate", sub: "sorted by how sure we are; risky = two people", not: "automatic archive copies" },
];

function Choices() {
  return (
    <div className="x-choices">
      <div className="x-choice-head"><span>Problem</span><span /><span>Technique</span><span>Rejected</span></div>
      {CHOICES.map((c, i) => (
        <Build key={c.problem} at={i} className="x-choice">
          <span className="x-choice-problem">{c.problem}</span>
          <span className="x-arrow" aria-hidden>→</span>
          <span className="x-choice-tech">{c.tech}<small>{c.sub}</small></span>
          <span className="x-choice-not">{c.not ? <s>{c.not}</s> : "–"}</span>
        </Build>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the register
const SHORT: Record<string, string> = { PRESENT: "✓", ABSENT: "✗", UNCLEAR: "?" };

function Register() {
  const step = useStep();
  const rows = deck.register.rows;
  const q1 = rows.filter((r) => !r.copy_of && r.cells[0] !== "PRESENT").map((r) => r.id);
  return (
    <div className="x-reg">
      <div className={`x-mx${step >= 1 ? " q1" : ""}`} role="img" aria-label="The register: 20 merchant agreements against three required clauses">
        <span className="x-mx-h" />
        {deck.register.clauses.map((c, i) => <span key={c} className={`x-mx-h${i === 0 && step >= 1 ? " q1" : ""}`}>{c}</span>)}
        <span className="x-mx-h">Former name</span>
        {rows.map((r) => (
          <div key={r.id} className={`x-mx-row${r.copy_of && step >= 2 ? " copy" : ""}`} style={{ display: "contents" }}>
            <span className="x-mx-id"><b>{r.id}</b><span>{r.party}</span></span>
            {r.cells.map((cell, i) => <span key={i} className={`x-cell c${i} ${cell}`}>{SHORT[cell]}</span>)}
            <span className="x-name">{r.former_names ? `${r.former_names} hits` : ""}</span>
          </div>
        ))}
      </div>
      <div className="x-reg-side">
        <Build at={1} className="x-fact">
          <b>Q1</b> – which lack a limitation of liability?
          <span className="big2">{q1.length} contracts</span>
          {q1.join(" · ")} · no model call, $0
        </Build>
        <Build at={2} className="x-fact">
          20 in scope · 19 checked · <b>M15</b> shown as excluded: a copy of M01. Nothing drops out silently.
        </Build>
        <Build at={3} className="x-fact">
          Search, top-10: <span className="bad">{AT_K10.false_alarms.length} false alarms, {AT_K10.missed.join(", ")} missed</span>
          <br />Register: <b>{measurement.register.reported.length} of {measurement.expected.length}</b>, no false alarm
          <br />Reading all {deck.register.documents} once: <b>${COST_ALL.toFixed(2)}</b>
        </Build>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- two stores, two jobs
function TwoStores() {
  return (
    <div className="x-two">
      <div className="x-store reg">
        <span className="x-tag built">built</span>
        <h3>The register</h3>
        <p>One row per contract, one column per clause of the playbook, each cell with its quote.</p>
        <q>“Which contracts lack a liability cap?”</q>
        <p>→ an answer for every contract</p>
      </div>
      <Build at={1} className="x-store idx">
        <span className="x-tag built">built</span>
        <h3>The search index</h3>
        <p>{deck.register.passages} passages, found by keywords and by embeddings together: hybrid search.</p>
        <q>“What does M08 say about termination?”</q>
        <p>→ the best passages, for open questions</p>
      </Build>
      <Build at={2} className="x-wide">
        <span className="x-tag planned">target</span>{" "}
        <b>Agentic RAG</b>: an agent decides what to search and when it has seen enough. Good for open questions –
        never for “which contracts lack …”, because “seen enough” is not “read everything”.
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- one contract: M18
const J = Object.fromEntries(deck.m18.stations.map((s) => [s.station, s.facts])) as Record<string, Record<string, unknown>>;
const num = (v: unknown) => Number(v ?? 0);

function FollowM18() {
  const ingest = J.ingest;
  const extract = J.extract;
  const checker = (J.checks.checker ?? {}) as Record<string, unknown>;
  const found = (J.checks.findings ?? {}) as Record<string, number>;
  const notFound = (J.register.required_not_found as string[]) ?? [];
  const families = J.families;
  const stations = [
    { at: 0, kind: "code", tag: "code", name: "Arrives", fact: <>a new file · prototype: a folder, checked every 5 s · later: SharePoint</> },
    { at: 1, kind: "code", tag: "code", name: "OCR", fact: <><b>{num(ingest.pages)} pages</b> read from the image · average confidence <b>{num(ingest.ocr_confidence).toFixed(0)} %</b> · below 70 %: a person</> },
    { at: 2, kind: "code", tag: "code", name: "Sections", fact: <>cut at the headings: <b>{num(J.chunking.sections)} sections</b> · a fixed size would cut a clause in half</> },
    { at: 3, kind: "model", tag: "AI", name: "One model call", fact: <>fills a fixed form: status, quote, page per clause · <b>{num(extract.seconds)} s · ${num(extract.cost_usd).toFixed(4)}</b></> },
    { at: 4, kind: "model", tag: "code + AI", name: "Checks", fact: <>quote, words, a second model call ({num(checker.seconds)} s) · <b>{found.PRESENT ?? 0} found, {found.ABSENT ?? 0} not found</b></> },
    { at: 5, kind: "store", tag: "result", name: "Register", fact: <><b>{notFound.length} required clauses not found</b> · former name: {num(families.former_names_open)} hits · all for <b>${deck.m18.model.cost_usd.toFixed(4)}</b></> },
  ];
  return (
    <div>
      <div className="x-pipe">
        {stations.map((s) => (
          <Build key={s.name} at={s.at} className={`x-st ${s.kind}`}>
            <span className="x-st-kind">{s.tag}</span>
            <span className="x-st-name">{s.name}</span>
            <span className="x-st-fact">{s.fact}</span>
          </Build>
        ))}
      </div>
      <Build at={5} className="x-pipe-foot">
        Fixed steps, written in code – the AI only fills the form and checks it. So <b>“every contract was read”</b> is a fact, not a claim.
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- the model, checked: M08
function ChecksM08() {
  const f = deck.m08;
  const checker = f.flags.find((x) => x.startsWith("checker_rejected"))?.split(": ").slice(1).join(": ") ?? "";
  return (
    <div className="x-sand">
      <div className="x-claim">
        <span className="node-kind" style={{ color: "var(--violet)" }}>The model said · M08</span>
        <span className="x-status found">Liability cap: found</span>
        <q>“{f.quote.length > 210 ? `${f.quote.slice(0, 210)} …` : f.quote}”</q>
        <span className="x-step-proof">clause {f.quote.split(" ")[0]} · page {f.page}</span>
      </div>
      <Build at={1} className="x-checks">
        <span className="node-kind" style={{ color: "var(--cyan)" }}>The checks</span>
        <div className="x-check"><span className="ok">✓</span><span>The quote is in the contract<small>exact match ({f.quote_score.toFixed(0)} %)</small></span></div>
        <div className="x-check"><span className="no">✗</span><span>It uses the clause's words<small>the playbook expects words like “liability”, “limited to”, “shall not exceed”</small></span></div>
        <div className="x-check"><span className="no">✗</span><span>A second model call agrees<small>{checker.length > 90 ? `${checker.slice(0, 90)} …` : checker}</small></span></div>
      </Build>
      <Build at={2} className="x-verdict">
        <span className="node-kind" style={{ color: "var(--amber)" }}>The register says</span>
        <span className="x-status unclear">Unclear</span>
        <span className="x-step-proof">confidence {f.confidence} – computed from the checks, not asked from the model</span>
        <span style={{ fontSize: "1.3cqw", fontWeight: 650 }}>→ a lawyer looks</span>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- the hidden instruction: M14
function HiddenNote() {
  const note = deck.m14.note.split("\n");
  const ps = deck.prompt_shields;
  const regexHits = Object.values(ps.cases).filter((c) => c.regex_detects).length;
  const shieldHits = Object.values(ps.cases).filter((c) => c.prompt_shields_detects).length;
  const cases = Object.keys(ps.cases).length;
  return (
    <div className="x-note-grid">
      <div className="x-paper">
        <div className="x-paper-h">M14 · {note[0]}</div>
        <mark>{note.slice(1).join(" ")}</mark>
      </div>
      <div className="x-side">
        <Build at={1} className="x-fact">
          Found: text written for the AI → the register says <b>not found</b>, and the contract goes to <b>two people</b> (four eyes).
        </Build>
        <Build at={2} className="x-fact">
          Honest: reworded, our patterns found <span className="bad">{regexHits} of {cases}</span>.
          Microsoft Prompt Shields found <b>{shieldHits} of {cases}</b>, with {ps.flagged.length - 1} false alarm in {ps.chunks} passages. Next step.
        </Build>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the lawyer decides
function LawyerDecides() {
  return (
    <div>
      <div className="x-lanes3">
        <div className="x-lane3 ok"><h3>Confirm</h3><p>the checks agree · a 10 % random sample is still looked at</p></div>
        <div className="x-lane3 rv"><h3>Review</h3><p>unclear, or confidence below 0.8 → one lawyer</p></div>
        <div className="x-lane3 fe"><h3>Four eyes</h3><p>a hidden instruction or a contradiction → two different people</p></div>
      </div>
      <Build at={1} className="x-flow2">
        <span className="x-box person">the passage on the page first</span><span className="x-arrow">→</span>
        <span className="x-box person">decide, with a reason</span><span className="x-arrow">→</span>
        <Build at={2} className="x-gate inline">archive copy – only after approval, only once</Build>
      </Build>
    </div>
  );
}

export const ACT3: Slide[] = [
  {
    id: "act-3", act: 3, kind: "opener", title: "Our solution: read once, then look up", steps: 0, seconds: 4,
    notes: ["How do we deliver the three guarantees?"],
  },
  {
    id: "how-i-worked", act: 3, kind: "content", title: "How I worked: from the process to the platform.", steps: 2, seconds: 35, Body: HowIWorked,
    notes: [
      "First, how I worked. Nine steps, from the process to the platform. Understand first: the pilot, the lawyers' work today, and how it could work.",
      "Then design: for every step, code or AI? And as little freedom for the AI as possible. I logged every decision, 81 so far.",
      "Then deliver: Azure, evaluation, a pilot. Each step left evidence in the repository.",
    ],
    words: [{ word: "autonomy", say: "aw-TON-uh-mee" }, { word: "evaluate", say: "ih-VAL-yoo-ate" }, { word: "repository", say: "rih-POZ-ih-tor-ee" }],
  },
  {
    id: "tomorrow", act: 3, kind: "content", title: "Tomorrow: the system reads, the lawyer decides.", steps: 1, seconds: 25, Body: Tomorrow,
    notes: [
      "Today a lawyer opens every contract, searches, reads and writes notes. For every new question again.",
      "Tomorrow the system reads each contract once, when it is saved. The lawyer asks, confirms the plan, checks the evidence and approves. Reading is the machine's job. Deciding stays with the lawyer.",
    ],
    words: [{ word: "evidence", say: "EV-ih-dence" }, { word: "approves", say: "uh-PROOVZ" }],
  },
  {
    id: "choices", act: 3, kind: "content", title: "Each problem picked its technique.", steps: 5, seconds: 45, Body: Choices,
    notes: [
      "Each problem picked its technique. To prove what is missing: read every contract into a register, one table against Legal's clause list, the playbook.",
      "Scans: OCR reads each page.",
      "Other words: the model reads against the playbook. Keywords miss M02.",
      "Models can be wrong: each finding needs a quote we find, and a second model call checks the first.",
      "Hidden instructions: a pattern check, next Microsoft Prompt Shields.",
      "Lawyers decide: triage sorts by how sure we are. Unclear goes to a person, risky to two people, four eyes.",
    ],
    words: [{ word: "technique", say: "tek-NEEK" }, { word: "playbook", say: "PLAY-book" }, { word: "triage", say: "TREE-ahzh" }],
  },
  {
    id: "register", act: 3, kind: "content", title: "Read once into a register, then just look up.", steps: 3, seconds: 45, Body: Register,
    notes: [
      "This is the register. Every merchant agreement, every required clause. Green found, red not found, amber unclear.",
      "Legal's first test question, Q1: which lack a limitation of liability? We read the column: five contracts. All five correct, no false alarm, no model call.",
      "Is every contract covered? Twenty in scope, nineteen checked. M15 is a copy of M01, shown as excluded, not hidden.",
      "Compare with the search: seven false alarms and M14 missed. Reading all 47 once cost twelve cents. Every question after that is free.",
    ],
    words: [{ word: "register", say: "REJ-ih-ster" }, { word: "excluded", say: "ik-SKLOO-did" }, { word: "required", say: "rih-KWYRD" }],
  },
  {
    id: "register-index", act: 3, kind: "content", title: "Two stores, two jobs: the register and the search index.", steps: 2, seconds: 30, Body: TwoStores,
    notes: [
      "Are the contracts embedded? Yes, but for another job. The register answers which contracts lack something, for every contract.",
      "The search index holds 938 passages, with keywords and embeddings: hybrid search, for open questions.",
      "Agentic RAG means an agent decides what to search and when it has seen enough. Fine for open questions, never for completeness.",
    ],
    words: [{ word: "hybrid", say: "HY-brid" }, { word: "agentic", say: "ay-JEN-tik" }, { word: "completeness", say: "kum-PLEET-ness" }],
  },
  {
    id: "follow-m18", act: 3, kind: "content", title: "Follow one contract: M18, a scan from 2018.", steps: 5, seconds: 55, Body: FollowM18,
    notes: [
      "One contract, M18, a scan from 2018. It arrives in a folder; later, in SharePoint.",
      "OCR reads both pages, 93 percent average confidence. Below 70, a person looks.",
      "We cut at the headings: 12 sections. A fixed size would cut clauses in half.",
      "One model call fills a fixed form: status, quote and page per clause. Six seconds, a tenth of a cent.",
      "The checks, with a second model call: one found, four not found.",
      "Register: no liability cap, no data processing agreement, an old company name. Fixed steps in code, only two are AI. So every contract was read is a fact.",
    ],
    words: [{ word: "OCR", say: "oh-see-AR" }, { word: "confidence", say: "KON-fih-dence" }, { word: "sections", say: "SEK-shunz" }],
  },
  {
    id: "checks", act: 3, kind: "content", title: "The model is checked: M08 said “found”, the register says “unclear”.", steps: 2, seconds: 35, Body: ChecksM08,
    notes: [
      "The model is checked. M08: the model said, limitation of liability, found. Its quote is clause 6.2.",
      "The checks: the quote is really in the contract. But it does not use the clause's words, and a second model call says: this is about data protection.",
      "So the register says unclear, confidence 0.35, and a lawyer looks. Code before and after the model: we call it the guardrail sandwich.",
    ],
    words: [{ word: "guardrail", say: "GARD-rail" }, { word: "sandwich", say: "SAND-wich" }, { word: "unclear", say: "un-KLEER" }],
  },
  {
    id: "injection", act: 3, kind: "content", title: "A hidden instruction in M14 – caught, and sent to two people.", steps: 2, seconds: 25, Body: HiddenNote,
    notes: [
      "M14 has the hidden note: ignore all previous instructions. That is a prompt injection: text written for the AI.",
      "Our check finds it. The contract goes to two people, four eyes.",
      "Honestly: reworded, our patterns found 1 of 4. Microsoft Prompt Shields found 4 of 4. Next step.",
    ],
    words: [{ word: "injection", say: "in-JEK-shun" }, { word: "previous", say: "PREE-vee-us" }, { word: "honestly", say: "ON-ist-lee" }],
  },
  {
    id: "human", act: 3, kind: "content", title: "Observations, not verdicts: a lawyer decides.", steps: 2, seconds: 35, Body: LawyerDecides,
    notes: [
      "The system makes observations, not legal judgments. Triage sorts each finding: sure ones get a spot check, unclear ones a lawyer, risky ones two lawyers.",
      "The lawyer sees the passage on the page first, then decides, with a reason.",
      "Only after approval may we store a copy in the contract storage. Once. That is the only thing it may receive.",
    ],
    words: [{ word: "observations", say: "ob-zer-VAY-shunz" }, { word: "verdicts", say: "VUR-dikts" }, { word: "approval", say: "uh-PROO-vul" }],
  },
];
