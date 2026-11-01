// Act 1 - the task: the roadmap of the talk (how I worked), what Riverty wrote (six sentences,
// verbatim), what one question costs today, what makes it hard, and the lever everything else
// builds on: to prove that something is missing you read everything - and today that reading
// starts again for every new question. Numbers come from the case study (?raw) and deck-data.json.
import { useState } from "react";
import caseStudy from "../../../../docs/context/case-study.md?raw";
import { Build } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

// 47 documents in the register; the ones lacking a required clause glow (decorative)
const GAPS = new Set([2, 7, 9, 13, 17, 22, 30, 36, 41]);

function TitleBody() {
  return (
    <div className="t-title">
      <div className="t-kicker">Riverty · Case study · Software Engineer (RAG)</div>
      <h1 className="t-head">Which contracts are<br />missing something?</h1>
      <p className="t-sub">An AI assistant for Riverty's legal team</p>
      <div className="t-by">Dmitrij Graf</div>
      <div className="t-field" aria-hidden>
        {Array.from({ length: 47 }, (_, i) => <span key={i} className={GAPS.has(i) ? "gap" : undefined} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- how I worked: the roadmap
// The path from the problem to the platform (docs/context/briefing.md, section 4) and the order of
// the talk: act 4 evaluates, act 5 runs it on the platform and brings it to the lawyers (decision 88).
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

function HowIWorked() {
  return (
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
  );
}

// ---------------------------------------------------------------- the task, sentence by sentence
// Six sentences from docs/context/case-study.md, word for word (checked below), and what each one
// means for the solution: the problem analysis starts from Riverty's words, not from a technology
// (decision 1). Build 1 is today's work - nothing on this card reaches ahead to agents (decision 88).
const SNIPPETS = [
  { at: 0, quote: "contracts that do not contain a certain text passage", means: "Prove what is missing – in every contract" },
  { at: 0, quote: "contracts in which a company name needs to be updated", means: "Find every former name, with its page" },
  { at: 1, quote: "they have to open the documents, search for the relevant content, and verify the results themselves", means: "By hand, contract by contract" },
  { at: 1, quote: "Some of them are scans of really old, handwritten contracts that exist only as JPEG files", means: "Read the images first" },
  { at: 2, quote: "You may solely use it to store an additional copy of a contract", means: "Write only a copy – after approval" },
  { at: 2, quote: "as long as we understand what is happening", means: "Evidence for every finding" },
];
const SNIPPET_GROUP = ["the two questions", "today", "the rules"];

function TaskSnippets() {
  return (
    <div className="x-snips">
      {SNIPPETS.map((s) => (
        <Build key={s.quote} at={s.at} className="x-snip">
          <span className="x-snip-label">{SNIPPET_GROUP[s.at]}</span>
          <q>{s.quote}</q>
          <b>→ {s.means}</b>
        </Build>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- today: one question in hours
// The partner counts are Riverty's (the addendum of the case study); five minutes per contract is
// my assumption, to be measured with Legal in the pilot.
const CASE = caseStudy.replace(/\s+/g, " ");
const over = (who: string) => Number(new RegExp(`over ([\\d,]+) ${who}`).exec(CASE)?.[1].replace(/,/g, "") ?? NaN);
const VENDORS = over("vendors");
const MERCHANTS = over("merchants");
const CONTRACTS = VENDORS + MERCHANTS;
const MINUTES = 5;                                                   // per contract - an assumption
const HOURS = Math.round((CONTRACTS * MINUTES) / 60 / 10) * 10;      // 91.7 h -> "≈ 90 h"
const n = (x: number) => x.toLocaleString("en");

function Today() {
  return (
    <div className="calc">
      <div className="calc-item">
        <div className="big">{n(CONTRACTS)}+</div>
        <div className="calc-label">contracts<span>{n(VENDORS)}+ vendors · {n(MERCHANTS)}+ merchants</span></div>
      </div>
      <Build at={1} className="calc-item">
        <div className="calc-op">×</div>
        <div className="big">{MINUTES} min</div>
        <div className="calc-label">to open, search, note<span>per contract – an assumption</span></div>
      </Build>
      <Build at={2} className="calc-item calc-hl">
        <div className="calc-op">≈</div>
        <div className="big">{HOURS} h</div>
        <div className="calc-label">for one question<span>and again for the next one</span></div>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- what makes it hard
// No ids here: the test set and its ids come at the start of act 2 (decision 88), and the card
// 'contracts' then names them by pointing back to this card.
const RENAME = deck.register.renames[0];
const year = (date: string | null | undefined) => (date ?? "").slice(0, 4);

/** A page of the scanned contract M18, served by the register; an outline if the API is down. */
function ScanThumb() {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="scan-thumb empty" /> : (
    <img className="scan-thumb" src="/api/documents/M18/pages/1/image" alt="" onError={() => setFailed(true)} />
  );
}

function Hard() {
  return (
    <div className="three">
      <Build at={1} className="card hard">
        <div className="hard-visual"><ScanThumb /></div>
        <div className="hard-title">Scans and photos</div>
        <div className="hard-text">Old contracts exist only as images. The text has to be read first.</div>
      </Build>
      <Build at={2} className="card hard">
        <div className="hard-visual docs">
          <div className="doc">{year(RENAME.amends_date)}<b>“{RENAME.old}”</b></div>
          <div className="doc amend">Amendment · {year(RENAME.date)}<b>read as “{RENAME.to}”</b></div>
        </div>
        <div className="hard-title">Amendments change contracts</div>
        <div className="hard-text">The answer depends on the contract and every amendment.</div>
      </Build>
      <Build at={3} className="card hard">
        <div className="hard-visual quotes">
          <q>total <b>liability</b> … limited to the total fees paid</q>
          <q>neither side will have to pay the other more than … the fees</q>
          <q>Gesamthaftung … auf die Summe der Entgelte begrenzt</q>
        </div>
        <div className="hard-title">Same clause, different words</div>
        <div className="hard-text">Three contracts, one cap on liability – not one common keyword.</div>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- the lever
function Insight() {
  return (
    <>
      <p className="s-support">Every contract. Every page.</p>
      <Build at={1} className="x-again">Today: again for every new question.</Build>
    </>
  );
}

// ---------------------------------------------------------------- guards (development only)
if (import.meta.env.DEV) {
  const problems = [
    ...SNIPPETS.filter((s) => !CASE.includes(s.quote)).map((s) => `card 'task' quotes a sentence that is not in the case study: "${s.quote}"`),
    !(VENDORS > 0 && MERCHANTS > 0) && "card 'today': the vendor or merchant count is no longer in the case study",
    !RENAME?.contract && "card 'hard': the register has no amendment that renames a contract",
    RENAME && year(RENAME.amends_date) !== year(deck.register.rows.find((r) => r.id === RENAME.contract)?.date)
      && "card 'hard': the amendment's date of the amended contract is not the contract's date",
  ].filter(Boolean);
  for (const p of problems) console.error(`act 1: ${p}`);
}

export const ACT1: Slide[] = [
  {
    id: "title", act: 1, kind: "title", title: "Which contracts are missing something?", steps: 0, seconds: 15, Body: TitleBody,
    notes: [
      "Hello, I'm Dima. Riverty's lawyers keep asking one kind of question: which contracts are missing something? In under twenty minutes I show how I'd answer it – with a working prototype.",
    ],
    words: [{ word: "Riverty's", say: "RIV-er-teez" }, { word: "prototype", say: "PROH-tuh-type" }],
  },
  {
    id: "how-i-worked", act: 1, kind: "content", title: "How I worked: from the problem to the platform.", steps: 2, seconds: 26, Body: HowIWorked,
    notes: [
      "This is how I worked – and the order of my talk. Understand: the pilot – our first question – today's process, a better one.",
      "Design: code or AI for each step, as little freedom for the AI as works, then the architecture.",
      "Deliver: test it, run it on Azure, bring it to the lawyers.",
    ],
    words: [{ word: "pilot", say: "PIE-lut" }, { word: "architecture", say: "AR-kih-tek-cher" }],
  },
  {
    id: "act-1", act: 1, kind: "opener", title: "The task", steps: 0, seconds: 4,
    notes: [
      "First, understand: what does Legal actually ask?",
    ],
    words: [],
  },
  {
    id: "task", act: 1, kind: "content", title: "I read Riverty's task sentence by sentence.", steps: 2, seconds: 40, Body: TaskSnippets,
    notes: [
      "I started with Riverty's own words, sentence by sentence. Two sentences are Legal's questions: contracts without a certain passage, and contracts with a former company name. Both are about every contract.",
      "Today it is done by hand: open, search, verify. And some contracts are old handwritten scans, only images.",
      "Two sentences set the rules. The storage may only receive a copy. And Riverty wants to understand what happens. So every finding needs evidence.",
    ],
    words: [{ word: "passage", say: "PASS-ij" }, { word: "verify", say: "VER-ih-fy" }, { word: "evidence", say: "EV-ih-dence" }],
  },
  {
    id: "today", act: 1, kind: "content", title: "Today: open every contract, search, note it down.", steps: 2, seconds: 26, Body: Today,
    notes: [
      `What does one question cost today? Riverty has over ${n(CONTRACTS)} contracts. Over ${n(VENDORS)} vendors, over ${n(MERCHANTS)} merchants.`,
      `I assume ${MINUTES} minutes per contract: open, search, note. We'd measure it with Legal in the pilot.`,
      `That's about ${HOURS} hours for one question. And again for the next one.`,
    ],
    words: [{ word: "merchants", say: "MUR-chunts" }, { word: "assume", say: "uh-SOOM" }, { word: "measure", say: "MEZH-er" }],
  },
  {
    id: "hard", act: 1, kind: "content", title: "Three things make it hard.", steps: 3, seconds: 36, Body: Hard,
    notes: [
      "Why not just search for a word?",
      "First, scans. Some contracts are only images, like this one. OCR – text recognition – reads them first. Later I'll show a handwritten one, live.",
      `Second, amendments. A contract from ${year(RENAME.amends_date)} names ${RENAME.old.split(" ")[0]}; its ${year(RENAME.date)} amendment says: read as ${RENAME.to.split(" ")[0]}. The answer needs both.`,
      "Third, wording. All three cap liability. The second never says liability, the third is German. Keywords miss them. Remember the second one.",
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "amendment", say: "uh-MEND-ment" }, { word: "recognition", say: "rek-ug-NISH-un" }],
  },
  {
    id: "insight", act: 1, kind: "statement", title: "To prove that something is missing, you have to read everything.", steps: 1, seconds: 22, Body: Insight,
    notes: [
      "Finding is easy: you stop at the first hit. To prove something is not there, you must read every contract, every page.",
      "And today that reading starts again for every new question. That is the lever: read everything once – and prove it.",
    ],
    words: [{ word: "prove", say: "PROOV" }, { word: "lever", say: "LEE-ver" }],
  },
];
