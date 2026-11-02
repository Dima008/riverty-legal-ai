// Part 1 - the problem (decision 101, the rebuild of 2.11.: 18 cards, one line of title, a few words on
// screen): the two questions of the task, what one question costs today, and three things that make it
// hard - scans, the same clause in other words, and the case study's own sentence on agents. Every card
// shows the sentence of the case study it comes from (decision 98: sentence screenshots of the PDF).
// The numbered list of problems ('case-study'), the hinge ('insight') and the six sentences ('task')
// are deep dives now; their points are said on these three cards.
// Numbers come from the case study (?raw), deck-data.json and pipeline/catalogue.py.
import { useState } from "react";
import caseStudy from "../../../../docs/context/case-study.md?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";
import { say } from "./prompts-data";

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

// ---------------------------------------------------------------- the two questions (decision 101)
const TASK_SENTENCE = "contracts that do not contain a certain text passage or contracts in which a company name needs to be updated.";

function TwoQuestions() {
  return (
    <div className="x-q2">
      <div className="q2">
        <div className="card q2-card">
          <div className="label">Question 1</div>
          <div className="q2-q">Which contracts lack clause X?</div>
          <div className="q2-eg">for example a limitation of liability</div>
        </div>
        <Build at={1} className="card q2-card">
          <div className="label">Question 2</div>
          <div className="q2-q">Which contracts still name a former company?</div>
          <div className="q2-eg">after a rename</div>
        </Build>
      </div>
      <Build at={2} className="x-from">
        <img className="x-cs-crop" src="/case-study/the-task.png" alt={TASK_SENTENCE} />
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- today: one question in hours
// The partner counts are Riverty's (the addendum of the case study); "over 1,100 contracts" is my
// lower bound from them - at least one contract per partner - and the note says so (order pass #38).
// Five minutes per contract is my assumption, to be measured with Legal first. CONTRACTS and n are
// also used by the card 'agent' (act2.tsx), so both cards say the same number.
const CASE = caseStudy.replace(/\s+/g, " ");
const over = (who: string) => Number(new RegExp(`over ([\\d,]+) ${who}`).exec(CASE)?.[1].replace(/,/g, "") ?? NaN);
const VENDORS = over("vendors");
const MERCHANTS = over("merchants");
export const CONTRACTS = VENDORS + MERCHANTS;
const MINUTES = 5;                                                   // per contract - an assumption
export const HOURS = Math.round((CONTRACTS * MINUTES) / 60 / 10) * 10;      // 91.7 h -> "≈ 90 h"
export const n = (x: number) => x.toLocaleString("en");

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
// No ids here: the test set and its ids come early in part 2 (decisions 88, 90), and the card
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

// ---------------------------------------------------------------- three things make it hard (decision 101)
// Scans (M18's page), the same clause in other words (three wordings), and the case study's own
// sentence on agents - the problem the approach of part 2 starts from.
const AGENTS_SENTENCE = "in day-to-day operations they often fail due to the sheer size and complexity of the environments they have to operate in.";

function HardThree() {
  return (
    <div className="three">
      <Build at={1} className="card hard">
        <div className="hard-visual"><ScanThumb /></div>
        <div className="hard-title">Scans – only images</div>
        <div className="hard-text">The text has to be read first.</div>
      </Build>
      <Build at={2} className="card hard">
        <div className="hard-visual quotes">
          <q>total <b>liability</b> … limited to the total fees paid</q>
          <q>neither side will have to pay the other more than … charged in fees</q>
          <q>Gesamthaftung … auf die Summe der Entgelte begrenzt</q>
        </div>
        <div className="hard-title">Same clause, other words</div>
        <div className="hard-text">Keywords miss two of three.</div>
      </Build>
      <Build at={3} className="card hard">
        <div className="hard-visual crop"><img className="x-cs-crop" src="/case-study/agents-fail.png" alt={AGENTS_SENTENCE} /></div>
        <div className="hard-title">Agents fail on size</div>
        <div className="hard-text">{n(CONTRACTS)}+ contracts fit into no context window.</div>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- the case study, as Riverty wrote it
// Decision 98: part 1 starts from Riverty's own document. Each crop is a sentence screenshot of the
// case-study PDF with the sentence highlighted (tools/case_study_snips.py -> web/public/case-study/
// <id>.png); its alt text is that sentence, checked against docs/context/case-study.md below. Each build
// shows one part of the document on the left and adds what I identified in it on the right - findings
// and requirements, never the solution (decision 99). The order is the story, not the document's: the
// task, then the environment, then the conditions. The points of the former cards 'task', 'today' and
// 'hard' (deep dives since decision 98) are said here.
interface Crop { id: string; sentence: string }
/** What I identified in a part of the document: a problem to solve, a rule to keep, or the goal. */
interface Found { kind: "problem" | "rule" | "goal"; text: string }
const P = (text: string): Found => ({ kind: "problem", text });
const R = (text: string): Found => ({ kind: "rule", text });
const G = (text: string): Found => ({ kind: "goal", text });
const SECTIONS: { label: string; crops: Crop[]; found: Found[] }[] = [
  { label: "The task",
    crops: [
      { id: "the-task", sentence: "contracts that do not contain a certain text passage or contracts in which a company name needs to be updated." },
      { id: "semi-manual", sentence: "So far, this is semi-manual work: they have to open the documents, search for the relevant content, and verify the results themselves." },
      { id: "repetitive", sentence: "They approached us to ask whether AI could help with this task, as it is purely repetitive work that nobody enjoys doing." },
    ],
    found: [P("Prove that a passage is missing – in every contract"), P("Find every former company name"),
      P(`By hand today: ${n(CONTRACTS)}+ contracts ≈ ${HOURS} h per question`)] },
  { label: "Technical outline",
    crops: [
      { id: "workload", sentence: "the main workload still consists of organizing and reviewing contracts, comparing them, and ensuring they comply with our corporate guidelines and represent the company's best interests." },
      { id: "sharepoint", sentence: "Most documents reside on SharePoint and are in PDF format. Some of them are scans of really old, handwritten contracts that exist only as JPEG files." },
      { id: "storage", sentence: "You may solely use it to store an additional copy of a contract in a legally compliant manner." },
      { id: "principles", sentence: "First, we evaluate best-of-breed solutions and what they offer. Second, as we are a Microsoft shop, we compare these solutions against what Microsoft provides." },
    ],
    found: [P("Guidelines: the same clause in other words, amendments"),
      P("Some contracts are only images"),
      R("The storage API: an additional copy only"),
      R("Best of breed, compared with Microsoft")] },
  { label: "Problem description",
    crops: [
      { id: "engineers", sentence: "create more with the same number of engineers" },
      { id: "agents-fail", sentence: "in day-to-day operations they often fail due to the sheer size and complexity of the environments they have to operate in." },
    ],
    found: [G("More with the same people"), P("Agents fail on the size of the environment – coverage must be proven")] },
  { label: "AI usage",
    crops: [{ id: "understand", sentence: "As a team, we encourage any form of AI usage, as long as we understand what is happening." }],
    found: [R("Evidence for every result")] },
];
/** P1, P2 ... for problems, R1 ... for rules, G1 the goal - numbered across the parts, so later cards can point back. */
export const FOUND = (() => {
  const counters: Record<Found["kind"], number> = { problem: 0, rule: 0, goal: 0 };
  return SECTIONS.flatMap((s, part) => s.found.map((f) => ({ ...f, part, id: `${f.kind[0].toUpperCase()}${++counters[f.kind]}` })));
})();
export const PROBLEMS = FOUND.filter((f) => f.kind === "problem").length;

function CaseStudyCard() {
  const step = Math.min(useStep(), SECTIONS.length - 1);
  const part = SECTIONS[step];
  return (
    <div className="x-cs">
      {/* keyed by the build, so each part of the document fades in on its own */}
      <div key={step} className="x-cs-doc">
        <div className="x-cs-label">Case study · {part.label}</div>
        {part.crops.map((c) => <img key={c.id} className="x-cs-crop" src={`/case-study/${c.id}.png`} alt={c.sentence} />)}
      </div>
      <div className="x-cs-took">
        <div className="x-cs-label">What I identified</div>
        <ul>
          {FOUND.filter((f) => f.part <= step).map((f) => (
            <li key={f.id} className={`${f.kind}${f.part === step ? " now" : ""}`}>
              <span className="x-cs-n">{f.id}</span><span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
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
    !CASE.includes(TASK_SENTENCE) && "card 'questions': the task sentence is not in the case study word for word",
    !CASE.includes(AGENTS_SENTENCE) && "card 'hard': the agent sentence is not in the case study word for word",
    // the crops' sentences, word for word (the PDF has typographic apostrophes, the .md plain ones)
    ...SECTIONS.flatMap((s) => s.crops).filter((c) => !CASE.includes(c.sentence.replace(/’/g, "'")))
      .map((c) => `card 'case-study': crop '${c.id}' is not a sentence of the case study: "${c.sentence}"`),
    SECTIONS.length !== 4 && `card 'case-study' has ${SECTIONS.length} parts - its notes walk through 4`,
    PROBLEMS !== 6 && `card 'case-study': the notes say 'the sixth problem' - the list has ${PROBLEMS} problems`,
    FOUND.filter((f) => f.kind === "goal").length !== 1 && "card 'case-study': the title says one goal",
    SNIPPETS.length !== 6 && `card 'task': the title says six sentences - the card shows ${SNIPPETS.length}`,
    // the title note: "Your case study is about making your legal team more efficient", "the repetitive part"
    !(CASE.includes("making our legal team more efficient") && CASE.includes("purely repetitive work"))
      && "card 'title': the note says the case study is about making the legal team more efficient, and the repetitive part - the case study no longer says so",
    SECTIONS[0].label !== "The task" && "card 'case-study': the notes start with the task (decision 99)",
    !(VENDORS > 0 && MERCHANTS > 0) && "card 'today': the vendor or merchant count is no longer in the case study",   // 'today' (a deep dive) still names both
    !RENAME?.contract && "card 'hard': the register has no amendment that renames a contract",
    !(RENAME?.old.startsWith("Arvato") && RENAME?.to.startsWith("Riverty")) && "card 'hard': the note calls the old name Riverty's old name - the amendment renames something else",
    RENAME && year(RENAME.amends_date) !== year(deck.register.rows.find((r) => r.id === RENAME.contract)?.date)
      && "card 'hard': the amendment's date of the amended contract is not the contract's date",
  ].filter(Boolean);
  for (const p of problems) console.error(`act 1: ${p}`);
}

// On the main track (decision 101); proof.tsx reads "about N hours" from its notes.
export const TODAY: Slide = {
  id: "today", act: 1, kind: "content", title: "Today: open, search, note – by hand.", steps: 2, seconds: 38, Body: Today,
  notes: [
    "I then mapped how a lawyer answers one of these questions today.",
    `There are over ${n(VENDORS)} vendors and over ${n(MERCHANTS)} merchants – more than ${n(CONTRACTS)} contracts.`,
    `At an assumed ${MINUTES} minutes to open, search and record the result for each contract, one portfolio question takes about ${HOURS} hours. ` +
      "The next question starts the same manual process again. That makes this workflow a strong candidate for automation – if we can automate it reliably.",     // proof.tsx reads "about N hours" from this note
  ],
  words: [{ word: "vendors", say: "VEN-derz" }, { word: "merchants", say: "MUR-chunts" }, { word: "assume", say: "uh-SOOM" }],
};
const TODAY_CARD = TODAY;

export const ACT1: Slide[] = [
  {
    // The seconds are the note's need plus about 15 s for Dima's own introduction (the line in square
    // brackets: shown in the presenter view, not spoken by the script's count).
    // TODO(Dima): write that introduction yourself - Riverty: "we want to get to know you, not only
    // your slides". Not invented for you on purpose; replace the bracketed line with your own words.
    id: "title", act: 1, kind: "title", title: "Which contracts are missing something?", steps: 0, seconds: 46, Body: TitleBody,
    notes: [
      "Hello, I'm Dima. [Here you introduce yourself – in your own words.] " +
        "Your case study asks how technology can remove repetitive work from Legal. I focused on one workflow: answering questions across the whole contract portfolio. " +
        "I'll first show why that takes so much time today. Then I'll explain how I redesigned the process, how I implemented it, and finally demonstrate the prototype live.",
    ],
    words: [{ word: "infrastructure", say: "IN-fruh-struk-cher" }, { word: "adoption", say: "uh-DOP-shun" }, { word: "prototype", say: "PROH-tuh-type" }],
  },
  {
    id: "part-1", act: 1, kind: "opener", title: "The problem · what I identified", steps: 0, seconds: 2,
    quote: ["One of these challenges is making our legal team more efficient."],
    notes: ["First, the problem."],
  },
  {
    id: "questions", act: 1, kind: "content", title: "Two questions define the pilot.", steps: 2, seconds: 31, Body: TwoQuestions,
    notes: [
      "After analysing the case study, I chose two questions for the pilot. First: which contracts are missing a required clause – for example a limitation of liability?",
      "Second: which contracts still use a former company name that needs to be updated?",
      "I chose them because both require Legal to check the complete portfolio, not just find one relevant document.",
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "former", say: "FOR-mer" }],
  },
  TODAY_CARD,
  {
    id: "hard", act: 1, kind: "content", title: "Three challenges the automation must handle.", steps: 3, seconds: 53, Body: HardThree,
    notes: [
      "To automate that process reliably, the solution has to handle three challenges.",
      "First, the documents are inconsistent. Some PDFs contain text, while old scans contain only an image and must be converted into text before they can be analysed.",
      "Second, legal meaning is not tied to one phrase. These three clauses all limit liability, although one uses different words and another is written in German. A keyword search would miss them.",
      `Third, the result must be complete. More than ${n(CONTRACTS)} contracts do not fit into one model's context, so we need a process that can prove that every relevant contract was checked.`,
    ],
    words: [{ word: "OCR", say: "oh-see-AR" }, { word: "Gesamthaftung", say: "geh-ZAMT-haf-tung" }, { word: "environment", say: "en-VY-run-ment" }, { word: "context window", say: "KON-tekst WIN-doh" }],
  },
];

// Deep dives (decision 98, 101): their points are said on the three cards above; listed in deep.tsx.
export const CASE_STUDY: Slide = {
  id: "case-study", act: 7, kind: "content", title: `The case study, sentence by sentence: ${say(PROBLEMS)} problems, ${say(FOUND.filter((f) => f.kind === "rule").length)} rules, one goal.`, steps: 3, seconds: 84, deep: true, Body: CaseStudyCard,
  notes: [
    "I went through the case study sentence by sentence and sorted what I found: a problem, a rule, or the goal. " +
      "The task gives two problems: prove that a passage is missing, and find every former company name. " +
      `The third is the cost today: open, search, check by hand – over ${n(CONTRACTS)} contracts, at an assumed ${MINUTES} minutes each about ${HOURS} hours per question.`,
    "The technical outline adds two more: the same clause comes in other words, and amendments change older contracts – " +
      "and some contracts are handwritten scans, only images. Two rules: the storage may only receive an additional copy, and best of breed is compared with Microsoft.",
    "The problem description gives the goal – more with the same people – and the sixth problem: agents often fail on the sheer size of their environment. " +
      "So coverage must be proven, not claimed.",
    "And the last rule: AI is welcome, as long as the team understands what is happening – so every result needs its evidence.",
  ],
  words: [{ word: "identified", say: "eye-DEN-tih-fyd" }, { word: "amendments", say: "uh-MEND-ments" }, { word: "coverage", say: "KUV-er-ij" }],
};

export const INSIGHT: Slide = {
  id: "insight", act: 7, kind: "statement", title: "To prove that something is missing, you have to read everything.", steps: 1, seconds: 25, deep: true, Body: Insight,
  notes: [
    "Both questions need every contract. To prove that a passage is missing, or that no old name is left, you have to read every contract and every page.",
    "And today, that reading starts again with every new question.",
  ],
  words: [{ word: "prove", say: "PROOV" }],
};

export const TASK: Slide = {
  id: "task", act: 7, kind: "content", title: "Six sentences that shaped the solution.", steps: 2, seconds: 40, deep: true, Body: TaskSnippets,
  notes: [
    "I started with the case study's words, sentence by sentence. Two are Legal's questions. First: contracts without a certain passage. Second: contracts with a former company name. Both are about every contract.",
    "Today, lawyers do it by hand: open, search, verify. Some contracts are old handwritten scans, only images.",
    "Two sentences set the rules. The storage may only get a copy. The team wants to understand what happens. So every finding needs evidence.",
  ],
  words: [{ word: "passage", say: "PASS-ij" }, { word: "verify", say: "VER-ih-fy" }, { word: "evidence", say: "EV-ih-dence" }],
};
