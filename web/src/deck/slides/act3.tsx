// Part 3 - the technical solution (decision 90), along the map of the card 'tomorrow' from left to
// right (decision 88): the process tomorrow, one contract through the fixed steps (M18), the checks
// on a real wrong answer (M08), then the register - Q1 and Q2 become lookups, and every contract it
// lists was met before - the lawyer deciding (with M14's hidden instruction: four eyes), and what we
// use (two prompts, embeddings, the rest code). The proof card 'results' (proof.tsx) closes the part.
// The two stores (register-index), the technique table and, since decision 96, the hidden instruction
// (injection) are deep dives. Every number comes from deck-data.json
// (tools/deck_data.py reads the register), a stored evaluation file or the code (?raw) - nothing is
// typed by hand.
import measurement from "../../../../eval/results/2026-10-31_negative_search.json";
import goldQueries from "../../../../data/gold_queries.json";
import stats from "../../../../eval/results/2026-10-31_extract-v2_stats.json";
import runPy from "../../../../pipeline/run.py?raw";
import catalogueRaw from "../../../../pipeline/catalogue.py?raw";
import registerApiPy from "../../../../api/register.py?raw";
import reviewPy from "../../../../api/review.py?raw";
import storagePy from "../../../../api/storage_mock.py?raw";
import toolApi from "../../api.ts?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";
import { CHECKER, CLAUSES, PROMPTS, READER, RULES, Say, TEMPERATURE, opening, say } from "./prompts-data";

const AT_K10 = measurement.top_k.find((r) => r.k === 10)!;
/** 0.35 -> "zero point three five": the pronunciation hint of a decimal in the notes, from the data */
const spell = (x: number) => [...String(x)].map((c) => (c === "." ? "point" : say(Number(c)))).join(" ");
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
// The contract with the hidden instruction (deck.m14; the probe's original case): named on 'rag-fails',
// picked up on 'human' since the card 'injection' is a deep dive (decision 96), reviewed live on 'live'.
const INJECTED = "M14";

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

// ---------------------------------------------------------------- what we use (decision 90)
// All the AI of the system on one card (talk plan, section 3): two system prompts on one small model,
// embeddings without a prompt, everything else code. The prompts' first sentences come word for word
// from pipeline/extract.py (prompts-data.ts), the call counts from the stored evaluation of the
// register used in the talk; no costs on screen - since 'cost' is a deep dive (decision 96) note 0
// says the cents of a full run, and note 2 and the 'planned' line say what Prompt Shields is - Microsoft's
// check for hidden instructions - since this is its first word on the main track.
// Every label on it was said on an earlier card; the search index is introduced here (build 1), which
// is why the card 'register-index' could become a deep dive. Built and planned are marked.
const CALLS = (purpose: string) => stats.cost.by_purpose.find((p) => p.purpose === purpose);
const READ_CALLS = CALLS("extract");
const CHECK_CALLS = CALLS("check");
const EMBED_MODEL = CALLS("embed")?.model ?? "";
const CHAT_MODEL = stats.config.extraction[0].model;
// What a full run cost (reading, checking, the search index) - said on the deep dive 'cost' too, from
// the same file; picked up here since 'cost' left the main track (decision 96).
const FULL_RUN_CENTS = Math.round(stats.cost.cost_usd * 100);

function WhatWeUse() {
  return (
    <div className="x-wu">
      <div className="x-wu-prompts">
        <div className="x-wu-box model">
          <span className="x-wu-k">1 · Reader · system prompt</span>
          <q>{opening(READER)}</q>
          <span>{RULES} rules · Legal's playbook: {CLAUSES} clauses · one whole contract</span>
          <span className="x-wu-calls">{READ_CALLS?.calls} calls – one per contract</span>
        </div>
        <div className="x-wu-box model">
          <span className="x-wu-k">2 · Checker · system prompt</span>
          <q>{opening(CHECKER)}</q>
          <span>only a definition and a quote · says no → “found” becomes “unclear”</span>
          <span className="x-wu-calls">{CHECK_CALLS?.calls} calls – one per contract with a “found”</span>
        </div>
        <div className="x-wu-both">both on <b>{CHAT_MODEL}</b> · temperature {TEMPERATURE} · a fixed form (strict JSON) · no model writes an answer</div>
      </div>
      <div className="x-wu-rest">
        <Build at={1} className="x-wu-box emb">
          <span className="x-wu-k">3 · Embeddings · no prompt</span>
          <span>passages → numbers, for open questions only: keywords + meaning, merged</span>
          <span className="x-wu-never">never “which contracts lack …”</span>
        </Build>
        <Build at={2} className="x-wu-box code">
          <span className="x-wu-k">Code · no language model</span>
          <span><i>before</i>PDF text or OCR · cut at the headings</span>
          <span><i>after</i>quote found? · clause words · pattern check → triage</span>
          <span><i>answer</i>lookups Q1, Q2 · coverage · four eyes · archive gate</span>
        </Build>
      </div>
      <Build at={2} className="x-wu-foot">
        <span><span className="x-tag built">built</span>Python + FastAPI · React + TypeScript · SQLite · local OCR · Azure OpenAI</span>
        <span><span className="x-tag planned">planned</span>a model that drafts the plan · Prompt Shields: Microsoft's second check for hidden instructions</span>
        <a href="/api/documents/M18/prompt" target="_blank" rel="noreferrer" data-no-advance>M18's prompt →</a>
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
    !Number.isInteger(100 / TRIAGE.sample_percent) && "card 'human': the note says 'one in N opened at random' - SAMPLE_PERCENT does not divide 100",
    !TRIAGE.four_eyes.some((s) => s.includes("injection")) && "card 'human': four eyes no longer covers a hidden instruction",
    !(PS_ORIGINAL?.[0].startsWith(INJECTED) && deck.m14.finding.flags.some((f) => f.includes("injection")))
      && `card 'human': the note says the pattern check finds ${INJECTED}'s hidden instruction - the register or the probe says otherwise`,
    !(FULL_RUN_CENTS > 0 && stats.cost.by_purpose.some((p) => p.purpose === "extract" && p.calls === stats.config.documents))
      && `card 'what-we-use': the note says reading all ${stats.config.documents} once cost ${FULL_RUN_CENTS} cents - the stored run says otherwise`,
    // the prompts themselves are guarded in prompts-data.ts; here what the card says about the calls
    !(READ_CALLS && READ_CALLS.calls === stats.config.documents)
      && `card 'what-we-use': the reader says one call per contract - ${READ_CALLS?.calls} calls for ${stats.config.documents} documents`,
    !(CHECK_CALLS && CHECK_CALLS.calls === deck.patterns.checked_contracts)
      && `card 'what-we-use': the checker says one call per contract with a "found" - ${CHECK_CALLS?.calls} calls, ${deck.patterns.checked_contracts} such contracts`,
    !(READ_CALLS?.model === CHAT_MODEL && CHECK_CALLS?.model === CHAT_MODEL) && "card 'what-we-use': both prompts are said to run on one model - the stored calls say otherwise",
    !EMBED_MODEL && "card 'what-we-use': the stored evaluation has no embedding calls",
    // the note of 'register': comparing is built (GET /api/compare) but not in the tool yet
    !registerApiPy.includes('@router.get("/compare")') && "card 'register': the note says comparing is built - api/register.py has no /compare",
    toolApi.includes("/compare") && "card 'register': the note says comparing is 'API only so far' - web/src/api.ts calls /compare now",
    // the note of 'human': the server refuses before approval; the storage stores once per fingerprint, write once
    !reviewPy.includes("HTTPException(409, f\"tool gate: archive copy only after approval") && "card 'human': the note says the server refuses the copy before approval - api/review.py changed",
    !(storagePy.includes("hashlib.sha256(body)") && storagePy.includes('"already_stored"') && storagePy.includes("write once") && storagePy.includes('"receipt_id"'))
      && "card 'human': the note says each file is kept once by its fingerprint, cannot be changed later (write once), with a receipt - api/storage_mock.py changed",
  ].filter(Boolean);
  for (const p of problems) console.error(`part 3: ${p}`);
}

export const ACT3: Slide[] = [
  {
    id: "part-3", act: 3, kind: "opener", title: "The technical solution", steps: 0, seconds: 9,
    quote: ["An overall technical solution you would present to our team and how it could be implemented"],
    notes: ["Now the technical solution: how do we deliver these guarantees – and how do I know it works?"],
    words: [{ word: "guarantees", say: "gair-un-TEEZ" }],
  },
  {
    id: "tomorrow", act: 3, kind: "content", title: "Tomorrow: the system reads, the lawyer decides.", steps: 1, seconds: 42, Body: Tomorrow,
    notes: [
      "Today, a lawyer opens, searches, reads and takes notes – for every contract and every question.",
      // the core design, named once and explained where the register first appears: compile, don't search
      "Tomorrow, the system reads each contract once, as soon as it is saved in SharePoint. That's the core idea: compile, don't search. " +
        "The result goes into one table, the register, and a question becomes a lookup. " +
        "The lawyer asks, and the system shows a plan: which contracts, which check. " +
        "The lawyer confirms it, checks the evidence and approves the archive copy. The machine reads; the lawyer decides.",
    ],
    words: [{ word: "compile", say: "kum-PILE" }, { word: "register", say: "REJ-ih-ster" }, { word: "evidence", say: "EV-ih-dence" }, { word: "archive", say: "AR-kyv" }],
  },
  {
    id: "checks", act: 3, kind: "content", title: "The model is checked: M08 said “found”, the register says “unclear”.", steps: 2, seconds: 57, Body: ChecksM08,
    notes: [
      `But a model can be wrong. Take M08: the model said the liability cap is there, and quoted clause ${M08_CLAUSE}.`,
      // the task: "ensuring they comply with our corporate guidelines" - the playbook (introduced on 'case-study');
      // maker-checker: the checker prompt sees only a definition and a quote (guarded in prompts-data.ts)
      "Now our checks start. Guarantee two: the quote is really in the contract. But it lacks the words Legal's playbook expects for a liability cap. " +
        "Then a second model call checks the first. It sees only the definition and the quote, and says: this is about data protection. That's maker-checker.",
      // model_status (what the model said) and status (what the register says after the checks): both stored
      `So the register keeps both answers: the model said found, our checks say unclear, confidence ${M08.confidence} – and a lawyer looks. ` +
        "The model never decides alone: code before and after it, the guardrail sandwich.",
    ],
    words: [{ word: "playbook", say: "PLAY-book" }, { word: "guidelines", say: "GIDE-lines" }, { word: "maker-checker", say: "MAY-ker CHEK-er" },
      { word: String(M08.confidence), say: spell(M08.confidence) }, { word: "guardrail", say: "GARD-rail" }, { word: "sandwich", say: "SAND-wich" }],
  },
  {
    id: "register", act: 3, kind: "content", title: "Every contract in one table – a question becomes a lookup.", steps: 3, seconds: 68, Body: Register,
    notes: [
      "This is the register: every contract, read once, clause by clause. Green is found, red is not found, amber is unclear.",
      // recall first, named once: unclear counts with not found and goes to a lawyer - a missed contract is the expensive error
      `Q1 is one column: ${Q1.length} contracts, no model call. Red and amber count together, because recall comes first – one too many beats one missed. ` +
        `Remember: the keyword search had ${AT_K10.false_alarms.length} false alarms and missed ${AT_K10.missed.join(", ")}.`,
      // the task's "comparing them": GET /api/compare (api/register.py) - not in the tool yet (guarded);
      // guarantee one is named here since 'follow-m18' is a deep dive (decision 98)
      `Coverage: ${ROWS.length} in scope, ${CHECKED} checked, ${COPY.id} excluded with its reason – a copy of ${COPY.copy_of}. Nothing drops out silently. ` +
        "That's guarantee one: every contract was read, and we can show it. Comparing works too, so far in the API.",
      `Legal's second question, Q2: which contracts still name ${LEGACY.join(" or ")}, Riverty's former names? ${Q2.length}. ` +
        `Not ${FIXED?.id}: its amendment ${FIXED?.by} already renamed it to ${FIXED_TO}.`,
    ],
    words: [{ word: "organised", say: "OR-guh-nyzd" }, { word: "recall", say: "REE-kawl" }, { word: "coverage", say: "KUV-er-ij" },
      { word: "excluded", say: "ik-SKLOO-did" }, { word: "AfterPay", say: "AF-ter-pay" }],
  },
  {
    id: "human", act: 3, kind: "content", title: "Observations, not verdicts: a lawyer decides.", steps: 2, seconds: 70, Body: LawyerDecides,
    notes: [
      // picked up from the deep dive 'injection' (decision 96): M14's hidden instruction (first named on
      // 'rag-fails'), the pattern check, and the task's "represent the company's best interests". Who looks
      // comes from our checks, never from the model (portfolio.triage reads status and the computed
      // confidence, not model_status); sure ones are one click, SAMPLE_PERCENT of them opened.
      `Guarantee three: a lawyer decides; the system only reports what the text says. Who looks is decided by our checks, never by the model. ` +
        `A sure finding takes one click, and one in ${say(100 / TRIAGE.sample_percent)} is still opened at random. ` +
        `If it's unclear or below ${TRIAGE.review_below}, one lawyer looks. If it's risky, two people look – four eyes. ` +
        `Like ${INJECTED}: our pattern check finds its hidden instruction, because a counterparty's text must never decide for Riverty.`,
      "The lawyer sees the passage on the page first, then decides, with a reason – stored and reused.",
      // api/review.py: no approval -> 409 "tool gate", logged; api/storage_mock.py: PUT by SHA-256, write
      // once, a receipt - a repeated PUT gets 200 "already_stored", so never "exactly one call". The
      // stand-in is named before its behaviour, so nothing sounds like a fact about Riverty's real storage.
      "Riverty's storage has a REST API. Our server sends a file there only after approval; before that, the gate refuses. " +
        "Here a stand-in plays the storage: it keeps each file once, by its fingerprint, with a receipt – and it can't be changed.",
    ],
    words: [{ word: "observes", say: "ub-ZURVZ" }, { word: "triage", say: "TREE-ahzh" }, { word: String(TRIAGE.review_below), say: spell(TRIAGE.review_below) },
      { word: "counterparty's", say: "KOWN-ter-par-teez" }, { word: "approval", say: "uh-PROO-vul" }, { word: "receipt", say: "rih-SEET" }],
  },
  {
    // the task: "we encourage any form of AI usage, as long as we understand what is happening",
    // "Python with FastAPI", "Frontend written in React and TypeScript"
    id: "what-we-use", act: 3, kind: "content", title: "What we use: two prompts – one reads, one checks. The rest is code.", steps: 2, seconds: 80, Body: WhatWeUse,
    notes: [
      // the model's name, the fixed form and "one contract at a time" are said here since 'follow-m18' is a deep dive (decision 98)
      `So what do we use? ${Say(PROMPTS)} prompts and one small model, ${M18_MODEL}. The reader gets ${say(RULES)} rules, Legal's playbook and one whole contract, ` +
        "and fills a fixed form. The checker gets only a definition and a quote. The AI sees one contract at a time, and no model writes an answer. " +
        `Reading all ${stats.config.documents} documents once costs ${FULL_RUN_CENTS} cents.`,
      // pipeline/search.py: hybrid - BM25 keywords + embedding vectors, fused with RRF; embeddings are the meaning half
      "Embeddings need no prompt. With keywords, they power a search for open questions – like: what does M01 say about liability? " +
        "But they never decide that a clause is missing.",
      // OCR and its threshold are introduced here (the cards 'hard' and 'follow-m18' are deep dives, decision 98);
      // 'live-add' and 'live' rely on "if it's unsure, a person looks"
      "Everything else is code we can test. OCR – text recognition – reads the scans, and if it's unsure, a person looks. " +
        "Then the checks, triage, lookups and the approval gate. Python and FastAPI behind it, React and TypeScript in front. " +
        "Planned: a model that drafts the plan, and Microsoft's Prompt Shields as a second check for hidden instructions.",
    ],
    words: [{ word: M18_MODEL, say: "G-P-T four point one mini" }, { word: "embeddings", say: "em-BED-ingz" }, { word: "OCR", say: "oh-see-AR" },
      { word: "FastAPI", say: "fast-ay-pee-EYE" }, { word: "TypeScript", say: "TYPE-script" }, { word: "Shields", say: "SHEELDZ" }],
  },
];

// A deep dive since decision 98 (flowing speaker notes need room within 22:00): one contract step by
// step. On the main track, 'what-we-use' names the model, the fixed form and OCR, 'register' guarantee one.
export const FOLLOW_M18: Slide = {
  id: "follow-m18", act: 7, kind: "content", title: `Follow one contract: M18, a scan from ${M18_YEAR}.`, steps: 5, seconds: 71, deep: true, Body: FollowM18,
  notes: [
    "Let's follow one contract: M18, a scanned contract from the test set. It arrives in a folder, later in SharePoint.",
    // a poor scan does not go to a person as such: its findings' confidence is capped at 0.5 (extract.py),
    // so triage sends a reported one to a lawyer (portfolio.py; panel design, 'Nicht sagen'). Said as
    // "we doubt", not "capped": on this card and others "cap" is the liability cap (2.11.)
    `OCR reads ${num(J.ingest.pages)} pages: ${num(J.ingest.ocr_confidence).toFixed(0)} percent average confidence. Below ${OCR_MIN}, we doubt its findings: a lawyer looks.`,
    `We cut at the headings: ${num(J.chunking.sections)} sections. A fixed length can split a clause.`,
    `One call to a small model, ${M18_MODEL}, fills a fixed form. Per clause: status and quote.`,
    `Then the checks. ${M18_CLAUSES} clauses: ${M18_FOUND.PRESENT ?? 0} found, ${M18_FOUND.ABSENT ?? 0} not found. ` +
      `${Say(M18_DPA_ONLY)} are required only in data processing agreements.`,
    "Register: no liability cap, no data processing agreement, a former name. Fixed steps in code. The AI sees one contract at a time: a small world. " +
      "Guarantee one: 'every contract was read' is a fact.",
  ],
  words: [{ word: "OCR", say: "oh-see-AR" }, { word: "average", say: "AV-rij" }, { word: M18_MODEL, say: "G-P-T four point one mini" }, { word: "sections", say: "SEK-shunz" },
    { word: "doubt", say: "DOWT" }],
};

// A deep dive since decision 96 (the main track at most 22:00 without cuts): opened on a question,
// listed in deep.tsx. On the main track, 'human' names M14's hidden instruction, the pattern check,
// four eyes and "must not decide for Riverty" (the task's "best interests"); 'what-we-use' names
// Prompt Shields as planned. Its data and guards stay here, next to the cards it belongs to.
export const INJECTION: Slide = {
  id: "injection", act: 7, kind: "content", title: "A hidden instruction in M14 – caught, and sent to two people.", steps: 2, seconds: 39, deep: true, Body: HiddenNote,
  notes: [
    // the task: "represent the company's best interests"
    "Second danger: a hidden note in M14 tells the AI to report a cap. That is prompt injection. A counterparty's text must not decide for Riverty.",
    "Our pattern check finds it. The register still says: no cap. Two people look – four eyes.",
    `Honestly: M14 and ${REWORDED} rewordings – our pattern check found only the original, ${REGEX_HITS} of ${PS_CASES.length}. ` +
      `Microsoft's Prompt Shields: ${SHIELD_HITS} of ${PS_CASES.length} – our next step.`,
  ],
  words: [{ word: "injection", say: "in-JEK-shun" }, { word: "counterparty's", say: "KOWN-ter-par-teez" }, { word: "detector", say: "dih-TEK-ter" }, { word: "honestly", say: "ON-ist-lee" }],
};

// A deep dive since decision 90 (to keep the main track short; 'what-we-use' names the search
// index now): opened on a question, listed in deep.tsx.
export const REGISTER_INDEX: Slide = {
  id: "register-index", act: 7, kind: "content", title: "Two stores, two jobs: the register and the search index.", steps: 1, seconds: 25, deep: true, Body: TwoStores,
  notes: [
    "Are the contracts embedded too? Yes – for another job. The register answers which contracts lack something, for every contract.",
    `The search index holds the ${deck.register.passages} passages, with keywords and embeddings: hybrid search, for open questions. Never for “which contracts lack”.`,
  ],
  words: [{ word: "hybrid", say: "HY-brid" }, { word: "embedded", say: "em-BED-id" }],
};
