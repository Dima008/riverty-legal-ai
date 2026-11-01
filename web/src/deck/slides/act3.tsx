// Act 3 - our solution, along the map of the card 'tomorrow' from left to right (decision 88): the
// process tomorrow, one contract through the fixed steps (M18), the checks on a real wrong answer
// (M08), the hidden instruction (M14), then the register - Q1 and Q2 become lookups, and every
// contract it lists was met before - the two stores, and the lawyer deciding. The method card moved
// to act 1 (roadmap), the technique table to the deep dives. Every number comes from deck-data.json
// (tools/deck_data.py reads the register), a stored evaluation file or the code (?raw) - nothing is
// typed by hand.
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import goldQueries from "../../../../data/gold_queries.json";
import runPy from "../../../../pipeline/run.py?raw";
import catalogueRaw from "../../../../pipeline/catalogue.py?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

const AT_K10 = measurement.top_k.find((r) => r.k === 10)!;
const short = (name: string) => name.split(" ")[0];                   // "Arvato Financial Solutions" -> "Arvato"
const year = (date: string | null | undefined) => (date ?? "").slice(0, 4);

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

// ---------------------------------------------------------------- one contract: M18
const J = Object.fromEntries(deck.m18.stations.map((s) => [s.station, s.facts])) as Record<string, Record<string, unknown>>;
const num = (v: unknown) => Number(v ?? 0);
const NB = " ";                     // no line break between a number and its unit
const WATCH_S = Number(/"--interval", type=int, default=(\d+)/.exec(runPy)?.[1]);   // the inbox watcher
const OCR_MIN = deck.ocr.threshold;      // mean OCR confidence below this -> a person checks the scan
const M18_FOUND = (J.checks.findings ?? {}) as Record<string, number>;
const M18_CLAUSES = Object.values(M18_FOUND).reduce((a, b) => a + b, 0);
const M18_MODEL = String(J.extract.model ?? "");
const M18_YEAR = year(deck.register.rows.find((r) => r.id === "M18")?.date);
const M18_REQUIRED_NOT_FOUND = (J.register.required_not_found as string[]) ?? [];
// not found, but required only in data processing agreements (pipeline/catalogue.py: sub-processors, audit)
const M18_DPA_ONLY = (M18_FOUND.ABSENT ?? 0) - M18_REQUIRED_NOT_FOUND.length;
const CATALOGUE_DPA_ONLY = (catalogueRaw.match(/"required_for": \["data_processing_agreement"\]/g) ?? []).length;

function FollowM18() {
  const ingest = J.ingest;
  const extract = J.extract;
  const checker = (J.checks.checker ?? {}) as Record<string, unknown>;
  const notFound = M18_REQUIRED_NOT_FOUND;
  const families = J.families;
  const stations = [
    { at: 0, kind: "code", tag: "code", name: "Arrives", fact: <>a new file · prototype: a folder, checked every {WATCH_S}{NB}s · later: SharePoint</> },
    { at: 1, kind: "code", tag: "code", name: "OCR", fact: <><b>{num(ingest.pages)} pages</b> read from the image · average confidence <b>{num(ingest.ocr_confidence).toFixed(0)}{NB}%</b> · below {OCR_MIN}{NB}%: a person</> },
    { at: 2, kind: "code", tag: "code", name: "Sections", fact: <>cut at the headings: <b>{num(J.chunking.sections)} sections</b> · a fixed size would cut a clause in half</> },
    { at: 3, kind: "model", tag: "AI", name: "One model call", fact: <>fills a fixed form: status, section, quote per clause · <b>{num(extract.seconds)}{NB}s · ${num(extract.cost_usd).toFixed(4)}</b></> },
    { at: 4, kind: "model", tag: "code + AI", name: "Checks", fact: <>quote, words, a second model call ({num(checker.seconds)}{NB}s) · <b>{M18_FOUND.PRESENT ?? 0}{NB}found, {M18_FOUND.ABSENT ?? 0}{NB}not{NB}found</b></> },
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
const M08 = deck.m08;
const M08_CLAUSE = M08.quote.split(" ")[0];                              // "6.2"

function ChecksM08() {
  const f = M08;
  const checker = f.flags.find((x) => x.startsWith("checker_rejected"))?.split(": ").slice(1).join(": ") ?? "";
  return (
    <div className="x-sand">
      <div className="x-claim">
        <span className="node-kind" style={{ color: "var(--violet)" }}>The model said · M08</span>
        <span className="x-status found">Liability cap: found</span>
        <q>“{f.quote.length > 210 ? `${f.quote.slice(0, 210)} …` : f.quote}”</q>
        <span className="x-step-proof">clause {M08_CLAUSE} · page {f.page}</span>
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
const PS = deck.prompt_shields;
// The probe's cases: M14's own instruction and its rewordings (eval/prompt_shields_probe.py). The
// pattern check finds only the original - so the card says "only the original, 1 of 4" (guarded).
const PS_CASES = Object.values(PS.cases);
const PS_ORIGINAL = Object.entries(PS.cases).find(([name]) => name.startsWith("M14"));
const REWORDED = PS_CASES.length - 1;
const REGEX_HITS = PS_CASES.filter((c) => c.regex_detects).length;
const SHIELD_HITS = PS_CASES.filter((c) => c.prompt_shields_detects).length;

function HiddenNote() {
  const note = deck.m14.note.split("\n");
  return (
    <div className="x-note-grid">
      <div className="x-paper">
        <div className="x-paper-h">M14 · {note[0]}</div>
        <mark>{note.slice(1).join(" ")}</mark>
      </div>
      <div className="x-side">
        <Build at={1} className="x-fact">
          Text written for the AI → the register still says <b>no cap</b>, and <b>two people</b> look (four eyes).
        </Build>
        <Build at={2} className="x-fact">
          Honest: M14 and {REWORDED} rewordings – our pattern check found only the original,{" "}
          <span className="bad">{REGEX_HITS} of {PS_CASES.length}</span>.
          Microsoft's detector, Prompt Shields, found <b>{SHIELD_HITS} of {PS_CASES.length}</b> – with {PS.flagged.length - 1} false alarm in {PS.chunks} passages. Our next step.
        </Build>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the register: Q1 and Q2
// Q1 = the liability column; red and amber count together (recall first). Q2 = the former-name
// column: only names still open; M05's are fixed by its amendment M05-A, so M05 is not counted.
const SHORT: Record<string, string> = { PRESENT: "✓", ABSENT: "✗", UNCLEAR: "?" };
const ROWS = deck.register.rows;
const Q1 = ROWS.filter((r) => !r.copy_of && r.cells[0] !== "PRESENT").map((r) => r.id);
const Q2 = ROWS.filter((r) => !r.copy_of && r.legacy.length > 0).map((r) => r.id);
const LEGACY = [...new Set(ROWS.flatMap((r) => r.legacy))].map(short);       // "Arvato", "AfterPay"
const FIXED = deck.register.resolved[0];                                       // M05, fixed by M05-A
const FIXED_TO = short(deck.register.renames.find((r) => r.amendment === FIXED?.by)?.to ?? "");
const COPY = ROWS.find((r) => r.copy_of)!;                                     // M15, a copy of M01
const CHECKED = ROWS.filter((r) => !r.copy_of).length;

function Register() {
  const step = useStep();
  const mode = step >= 3 ? " x-q2" : step >= 1 ? " x-q1" : "";   // which question the matrix answers
  return (
    <div className="x-reg">
      <div>
      <div className="x-mx-kicker">Merchant agreements · {ROWS.length} of {deck.register.documents} documents</div>
      <div className={`x-mx${mode}`} role="img" aria-label={`The register: ${ROWS.length} merchant agreements against three required clauses and former names`}>
        <span className="x-mx-h" />
        {deck.register.clauses.map((c, i) => <span key={c} className={`x-mx-h${i === 0 && step >= 1 && step < 3 ? " on" : ""}`}>{c}</span>)}
        <span className={`x-mx-h${step >= 3 ? " on" : ""}`}>Former name</span>
        {ROWS.map((r) => (
          <div key={r.id} className={`x-mx-row${r.copy_of && step >= 2 ? " copy" : ""}`} style={{ display: "contents" }}>
            <span className="x-mx-id"><b>{r.id}</b></span>
            {r.cells.map((cell, i) => <span key={i} className={`x-cell c${i} ${cell}`}>{SHORT[cell]}</span>)}
            {r.legacy.length > 0
              ? <span className="x-name hit">{r.legacy.map(short).join(", ")}</span>
              : <span className={r.id === FIXED?.id ? `x-name fx${step >= 3 ? " on" : ""}` : "x-name"}>{r.id === FIXED?.id ? `fixed: ${FIXED.by}` : ""}</span>}
          </div>
        ))}
      </div>
      </div>
      <div className="x-reg-side">
        <Build at={1} className="x-fact">
          <b>Q1</b> – which lack a limitation of liability?
          <span className="big2">{Q1.length} contracts</span>
          {Q1.join(" · ")} · no model call
          <span className="x-fact-line">Keyword search: <span className="bad">{AT_K10.false_alarms.length} false alarms, {AT_K10.missed.join(", ")} missed</span></span>
        </Build>
        <Build at={2} className="x-fact">
          {ROWS.length} in scope · {CHECKED} checked · <b>{COPY.id}</b> shown as excluded: a copy of {COPY.copy_of}. Nothing drops out silently.
        </Build>
        <Build at={3} className="x-fact">
          <b>Q2</b> · former name: <b>{Q2.length} contracts</b> – {Q2.join(" · ")}.
          <span className="x-fact-line">{FIXED?.id} not counted: its amendment {FIXED?.by} fixed the name.</span>
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
    </div>
  );
}

// ---------------------------------------------------------------- the lawyer decides
const TRIAGE = deck.triage;

function LawyerDecides() {
  return (
    <div>
      <div className="x-lanes3">
        <div className="x-lane3 ok"><h3>Confirm</h3><p>the checks agree · a {TRIAGE.sample_percent} % random sample is still looked at</p></div>
        <div className="x-lane3 rv"><h3>Review</h3><p>unclear, or confidence below {TRIAGE.review_below} → one lawyer</p></div>
        <div className="x-lane3 fe"><h3>Four eyes</h3><p>a hidden instruction or an amendment that contradicts its contract → two different people</p></div>
      </div>
      <Build at={1} className="x-flow2">
        <span className="x-box person">the passage on the page first</span><span className="x-arrow">→</span>
        <span className="x-box person">decide, with a reason<small className="x-box-sub">stored – reused next time</small></span><span className="x-arrow">→</span>
        <Build at={2} className="x-gate inline">archive copy – only after approval, only once</Build>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- guards (development only)
if (import.meta.env.DEV) {
  const gold = (id: string) => goldQueries.find((g) => g.id === id);
  const same = (a: string[], b: string[] = []) => a.length === b.length && a.every((x) => b.includes(x));
  const problems = [
    !same(Q1, gold("Q1")?.expected) && `card 'register': Q1 reads ${Q1}, the answer key says ${gold("Q1")?.expected}`,
    !same(Q1, measurement.register.reported) && "card 'register': Q1 differs from the stored search-vs-register measurement",
    !same(Q2, gold("Q2")?.expected) && `card 'register': Q2 reads ${Q2}, the answer key says ${gold("Q2")?.expected}`,
    !same(deck.register.resolved.map((r) => r.id), gold("Q2")?.expected_already_resolved)
      && "card 'register': the contracts an amendment fixed are not the answer key's 'already resolved'",
    (FIXED?.id !== "M05" || FIXED?.by !== "M05-A") && "card 'register': the notes say M05 is fixed by M05-A",
    !same(LEGACY, ["Arvato", "AfterPay"]) && `card 'register': the notes say "Arvato or AfterPay", the register has ${LEGACY}`,
    (COPY?.id !== "M15" || COPY?.copy_of !== "M01") && "card 'register': the copy is no longer M15 = M01",
    !(WATCH_S > 0) && "card 'follow-m18': the watcher's interval is no longer in pipeline/run.py",
    !(M18_DPA_ONLY > 0 && M18_DPA_ONLY === CATALOGUE_DPA_ONLY)
      && `card 'follow-m18': the note says ${M18_DPA_ONLY} of M18's 'not found' are required only in data processing agreements - the playbook has ${CATALOGUE_DPA_ONLY} such clauses`,
    !(ROWS.length < deck.register.documents && ROWS.every((r) => /^M\d\d$/.test(r.id)))
      && "card 'register': the kicker says the matrix shows the merchant agreements only",
    !/^\d+\.\d+$/.test(M08_CLAUSE) && "card 'checks': M08's quote no longer starts with its clause number",
    !(M08.status === "UNCLEAR" && M08.model_status === "PRESENT") && "card 'checks': M08 is no longer 'model said found, register says unclear'",
    !/limitation of liability/i.test(deck.m14.note) && "card 'injection': the notes say M14's instruction asks the AI to report a cap",
    deck.m14.finding.status !== "ABSENT" && "card 'injection': the register no longer says 'no cap' for M14",
    !(PS_ORIGINAL?.[1].regex_detects && REGEX_HITS === 1)
      && "card 'injection': the card says the pattern check found only M14's original - the probe says otherwise",
    !TRIAGE.four_eyes.includes("amendment_contradiction") && "card 'human': four eyes no longer covers an amendment that contradicts its contract",
    !TRIAGE.four_eyes.some((s) => s.includes("injection")) && "card 'human': four eyes no longer covers a hidden instruction",
  ].filter(Boolean);
  for (const p of problems) console.error(`act 3: ${p}`);
}

export const ACT3: Slide[] = [
  {
    id: "act-3", act: 3, kind: "opener", title: "Our solution: read once, then look up", steps: 0, seconds: 4,
    notes: ["Design: how do we deliver the three guarantees?"],
  },
  {
    id: "tomorrow", act: 3, kind: "content", title: "Tomorrow: the system reads, the lawyer decides.", steps: 1, seconds: 30, Body: Tomorrow,
    notes: [
      "Today a lawyer opens, searches, reads and notes – every contract, every question.",
      "Tomorrow the system reads each contract once, when it is saved in SharePoint – into one table, the register. The lawyer asks; the system shows a plan – which contracts, which check – the lawyer confirms it, checks the evidence and approves the archive copy. The machine reads. The lawyer decides.",
    ],
    words: [{ word: "register", say: "REJ-ih-ster" }, { word: "evidence", say: "EV-ih-dence" }, { word: "archive", say: "AR-kive" }],
  },
  {
    id: "follow-m18", act: 3, kind: "content", title: `Follow one contract: M18, a scan from ${M18_YEAR}.`, steps: 5, seconds: 56, Body: FollowM18,
    notes: [
      "Follow M18, the scan from the start. It arrives in a folder – later, SharePoint.",
      `OCR reads ${num(J.ingest.pages)} pages, ${num(J.ingest.ocr_confidence).toFixed(0)} percent average confidence. Below ${OCR_MIN}, a person looks.`,
      `We cut at the headings: ${num(J.chunking.sections)} sections – the passages the search uses.`,
      `One call to a small model, ${M18_MODEL}, fills a fixed form: status and quote per clause.`,
      `The checks – next card. ${M18_CLAUSES} clauses: ${M18_FOUND.PRESENT ?? 0} found, ${M18_FOUND.ABSENT ?? 0} not found – ` +
        `${M18_DPA_ONLY} of them are required only in data processing agreements.`,
      "Register: no liability cap, no data processing agreement, a former name. Fixed steps in code; the AI sees one contract at a time – a small world. Guarantee one: 'every contract was read' is a fact.",
    ],
    words: [{ word: "OCR", say: "oh-see-AR" }, { word: M18_MODEL, say: "G-P-T four point one mini" }, { word: "sections", say: "SEK-shunz" }],
  },
  {
    id: "checks", act: 3, kind: "content", title: "The model is checked: M08 said “found”, the register says “unclear”.", steps: 2, seconds: 37, Body: ChecksM08,
    notes: [
      `But a model can be wrong. M08: the model said: limitation of liability, found. Its quote is clause ${M08_CLAUSE}.`,
      "Guarantee two: the quote is really there. But it lacks the words Legal's playbook expects – the playbook is Legal's clause list, as data. And a second model call says: this is about data protection.",
      `So the register says unclear, ${M08.confidence}, and a lawyer looks. Code before and after the model: the guardrail sandwich.`,
    ],
    words: [{ word: "playbook", say: "PLAY-book" }, { word: "guardrail", say: "GARD-rail" }, { word: "unclear", say: "un-KLEER" }],
  },
  {
    id: "injection", act: 3, kind: "content", title: "A hidden instruction in M14 – caught, and sent to two people.", steps: 2, seconds: 29, Body: HiddenNote,
    notes: [
      "Second danger: M14's hidden instruction tells the AI to report a cap. That is a prompt injection.",
      "Our pattern check finds it. The register still says: no cap. Two people look – four eyes.",
      `Honestly: M14 and ${REWORDED} rewordings – our pattern check found only the original, ${REGEX_HITS} of ${PS_CASES.length}. ` +
        `Prompt Shields, Microsoft's detector: ${SHIELD_HITS} of ${PS_CASES.length}. Our next step.`,
    ],
    words: [{ word: "injection", say: "in-JEK-shun" }, { word: "detector", say: "dih-TEK-ter" }, { word: "honestly", say: "ON-ist-lee" }],
  },
  {
    id: "register", act: 3, kind: "content", title: "Every contract in one table – a question becomes a lookup.", steps: 3, seconds: 47, Body: Register,
    notes: [
      "Every contract, read like M18, in one table: the register. The merchant agreements: required clauses, former names. Green found, red not found, amber unclear.",
      `Q1 is one column: ${Q1.length} contracts, no model call. Red and amber count together – one too many beats one missed. Keyword search: ${AT_K10.false_alarms.length} false alarms, ${AT_K10.missed.join(", ")} missed.`,
      `Coverage: ${ROWS.length} in scope, ${CHECKED} checked, ${COPY.id} excluded as a copy of ${COPY.copy_of}. Nothing drops out silently.`,
      `Legal's second question, Q2: which contracts still name ${LEGACY.join(" or ")} – Riverty's former names? ${Q2.length}. Not ${FIXED?.id}: its amendment ${FIXED?.by} renamed it to ${FIXED_TO}.`,
    ],
    words: [{ word: "register", say: "REJ-ih-ster" }, { word: "coverage", say: "KUV-er-ij" }, { word: "excluded", say: "ik-SKLOO-did" }],
  },
  {
    id: "register-index", act: 3, kind: "content", title: "Two stores, two jobs: the register and the search index.", steps: 1, seconds: 25, Body: TwoStores,
    notes: [
      "Are the contracts embedded too? Yes – for another job. The register answers which contracts lack something, for every contract.",
      `The search index holds the ${deck.register.passages} passages, with keywords and embeddings: hybrid search, for open questions. Never for “which contracts lack”.`,
    ],
    words: [{ word: "hybrid", say: "HY-brid" }, { word: "embedded", say: "em-BED-id" }],
  },
  {
    id: "human", act: 3, kind: "content", title: "Observations, not verdicts: a lawyer decides.", steps: 2, seconds: 35, Body: LawyerDecides,
    notes: [
      `Guarantee three: a lawyer decides; the system only observes. Triage sorts each finding: sure ones get a spot check; unclear, or below ${TRIAGE.review_below} confidence, one lawyer; risky ones two – four eyes.`,
      "The lawyer sees the passage on the page first, then decides with a reason – stored, and reused next time.",
      "Only after approval may we store a copy in the contract storage. Once. It may receive nothing else.",
    ],
    words: [{ word: "observes", say: "ub-ZURVZ" }, { word: "triage", say: "TREE-ahzh" }, { word: "approval", say: "uh-PROO-vul" }],
  },
];
