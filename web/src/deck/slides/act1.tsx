// Part 1 - the problem (decision 90): Riverty's case study as Riverty wrote it - sentence screenshots
// of the PDF, part by part, with what I took from each (decision 98) - and the lever everything else
// builds on: to prove that something is missing you read everything, and today that reading starts
// again for every new question. The roadmap (how I worked) opens part 2. The former cards 'task',
// 'today' and 'hard' are deep dives now (decision 98); their points are said on 'case-study'.
// Numbers come from the case study (?raw), deck-data.json and pipeline/catalogue.py.
import { useState } from "react";
import caseStudy from "../../../../docs/context/case-study.md?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";
import { CLAUSES, say } from "./prompts-data";

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
const HOURS = Math.round((CONTRACTS * MINUTES) / 60 / 10) * 10;      // 91.7 h -> "≈ 90 h"
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
          <q>neither side will have to pay the other more than … charged in fees</q>
          <q>Gesamthaftung … auf die Summe der Entgelte begrenzt</q>
        </div>
        <div className="hard-title">Same clause, different words</div>
        <div className="hard-text">Three contracts, one cap on liability – not one common keyword.</div>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- the case study, as Riverty wrote it
// Decision 98: part 1 starts from Riverty's own document. Each crop is a sentence screenshot of the
// case-study PDF with the sentence highlighted (tools/case_study_snips.py -> web/public/case-study/
// <id>.png); its alt text is that sentence, checked against docs/context/case-study.md below. Each build
// shows one part of the document on the left and adds what I took from it on the right. The points of
// the former cards 'task', 'today' and 'hard' (deep dives since decision 98) are said here.
interface Crop { id: string; sentence: string }
const SECTIONS: { label: string; crops: Crop[]; took: string[] }[] = [
  { label: "Problem description",
    crops: [
      { id: "engineers", sentence: "create more with the same number of engineers" },
      { id: "agents-fail", sentence: "in day-to-day operations they often fail due to the sheer size and complexity of the environments they have to operate in." },
    ],
    took: ["The same lawyers answer more questions", "Every contract, not a sample – provably"] },
  { label: "Technical outline",
    crops: [
      { id: "workload", sentence: "the main workload still consists of organizing and reviewing contracts, comparing them, and ensuring they comply with our corporate guidelines and represent the company's best interests." },
      { id: "sharepoint", sentence: "Most documents reside on SharePoint and are in PDF format. Some of them are scans of really old, handwritten contracts that exist only as JPEG files." },
      { id: "storage", sentence: "You may solely use it to store an additional copy of a contract in a legally compliant manner." },
      { id: "principles", sentence: "First, we evaluate best-of-breed solutions and what they offer. Second, as we are a Microsoft shop, we compare these solutions against what Microsoft provides." },
    ],
    took: ["Guidelines as data: Legal's playbook", "Read text and images", "Only a copy – after approval", "Best of breed, compared with Microsoft"] },
  { label: "The task",
    crops: [
      { id: "the-task", sentence: "contracts that do not contain a certain text passage or contracts in which a company name needs to be updated." },
      { id: "semi-manual", sentence: "So far, this is semi-manual work: they have to open the documents, search for the relevant content, and verify the results themselves." },
      { id: "repetitive", sentence: "They approached us to ask whether AI could help with this task, as it is purely repetitive work that nobody enjoys doing." },
    ],
    took: ["Prove what is missing – in every contract", "Every former name – with its page",
      `${n(CONTRACTS)}+ contracts × ${MINUTES} min ≈ ${HOURS} h per question`, "Hard: scans, amendments, other words"] },
  { label: "AI usage",
    crops: [{ id: "understand", sentence: "As a team, we encourage any form of AI usage, as long as we understand what is happening." }],
    took: ["Evidence for every finding"] },
];

function CaseStudyCard() {
  const step = Math.min(useStep(), SECTIONS.length - 1);
  const part = SECTIONS[step];
  return (
    <div className="x-cs">
      {/* keyed by the build, so each part of the document fades in on its own */}
      <div key={step} className="x-cs-doc">
        <div className="x-cs-label">Your case study · {part.label}</div>
        {part.crops.map((c) => <img key={c.id} className="x-cs-crop" src={`/case-study/${c.id}.png`} alt={c.sentence} />)}
      </div>
      <div className="x-cs-took">
        <div className="x-cs-label">What I took from it</div>
        <ul>
          {SECTIONS.slice(0, step + 1).flatMap((s, i) => s.took.map((t) => <li key={t} className={i === step ? "now" : undefined}>{t}</li>))}
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
    // the crops' sentences, word for word (the PDF has typographic apostrophes, the .md plain ones)
    ...SECTIONS.flatMap((s) => s.crops).filter((c) => !CASE.includes(c.sentence.replace(/’/g, "'")))
      .map((c) => `card 'case-study': crop '${c.id}' is not a sentence of the case study: "${c.sentence}"`),
    SECTIONS.length !== 4 && `card 'case-study' has ${SECTIONS.length} parts - its notes walk through 4`,
    SNIPPETS.length !== 6 && `card 'task': the title says six sentences - the card shows ${SNIPPETS.length}`,
    // Dima's opener note picks up the case study's "whether AI could help ... purely repetitive work"
    !(CASE.includes("whether AI could help") && CASE.includes("purely repetitive work") && CASE.includes("nobody enjoys"))
      && "card 'part-1': the note picks up 'whether AI could help', 'purely repetitive work' and 'nobody enjoys' - the case study no longer says so",
    !(VENDORS > 0 && MERCHANTS > 0) && "card 'today': the vendor or merchant count is no longer in the case study",
    !RENAME?.contract && "card 'hard': the register has no amendment that renames a contract",
    !(RENAME?.old.startsWith("Arvato") && RENAME?.to.startsWith("Riverty")) && "card 'hard': the note calls the old name Riverty's old name - the amendment renames something else",
    RENAME && year(RENAME.amends_date) !== year(deck.register.rows.find((r) => r.id === RENAME.contract)?.date)
      && "card 'hard': the amendment's date of the amended contract is not the contract's date",
  ].filter(Boolean);
  for (const p of problems) console.error(`act 1: ${p}`);
}

export const ACT1: Slide[] = [
  {
    // The seconds are the note's need at about 115 wpm plus about 15 s for Dima's own introduction
    // (the line in square brackets: shown in the presenter view, not spoken by the script's count).
    // TODO(Dima): write that introduction yourself - Riverty: "we want to get to know you, not only
    // your slides". Not invented for you on purpose; replace the bracketed line with your own words.
    // Each point is said once across the first cards: here what the project is and the agenda along
    // Riverty's outline; 'part-1' Legal's ask; 'case-study' what the case study says and what I took from it.
    id: "title", act: 1, kind: "title", title: "Which contracts are missing something?", steps: 0, seconds: 43, Body: TitleBody,
    notes: [
      "Hello, I'm Dima. [Here you introduce yourself – in your own words.] " +
        "Riverty asked for an AI assistant for the legal team, and I built a working prototype. " +
        "It checks every contract, shows the passage on the page as proof, and leaves the decision to a lawyer. " +
        "I'll follow the outline of your case study, and at the end you'll see it running live.",
    ],
    words: [{ word: "Riverty's", say: "RIV-er-teez" }, { word: "assistant", say: "uh-SIS-tunt" }, { word: "infrastructure", say: "IN-fruh-struk-cher" },
      { word: "adoption", say: "uh-DOP-shun" }, { word: "prototype", say: "PROH-tuh-type" }],
  },
  {
    id: "part-1", act: 1, kind: "opener", title: "The problem", steps: 0, seconds: 11,
    quote: ["One of these challenges is making our legal team more efficient."],
    notes: [
      // Dima's wish (Notion card 2, 1.11.), in his own words again (decision 98)
      "First, the problem. Legal asked whether AI could help with this purely repetitive work – so the team gets more done.",
    ],
    words: [{ word: "repetitive", say: "rih-PET-ih-tiv" }, { word: "whether", say: "WEH-ther" }],
  },
  {
    // decision 98: Riverty's case study as sentence screenshots, part by part, and what I took from it
    id: "case-study", act: 1, kind: "content", title: "Your case study – and what I took from it.", steps: 3, seconds: 125, Body: CaseStudyCard,
    notes: [
      "I started with your case study, sentence by sentence. You describe productivity in one line: create more with the same number of engineers. " +
        "For Legal, that means the same lawyers answer more questions. " +
        "You also write that agents often fail because of the sheer size and complexity of their environment. " +
        "So my solution must work on every contract – and prove it.",
      // the task: "comply with our corporate guidelines" - the playbook is our implementation of them
      // (pipeline/catalogue.py); its clauses are an assumption, because Riverty shares no real guidelines
      "Next, the technical outline. Legal reviews and compares contracts, and checks them against your corporate guidelines. " +
        "In my prototype, those guidelines become Legal's playbook: the required clauses, stored as data and owned by Legal. " +
        `Its ${say(CLAUSES)} clauses are my assumption, because I have no real guidelines. ` +
        "Most documents are PDFs on SharePoint, and some are old handwritten scans – so the system must read images, too. " +
        "The storage may solely get a copy, so nothing goes there without approval. And you compare best of breed with Microsoft.",
      // the numbers of the former card 'today' and the three difficulties of 'hard' (both deep dives now)
      "Then the task, with two examples: contracts without a certain text passage, and contracts with a company name to update. " +
        "Today this is semi-manual work: open, search, verify. " +
        `With over ${n(VENDORS)} vendors and over ${n(MERCHANTS)} merchants, that is over ${n(CONTRACTS)} contracts – ` +
        `at ${MINUTES} minutes each, about ${HOURS} hours for one question. ` +
        "And it is harder than it looks: scans, amendments that change contracts, and the same clause in different words.",
      "And one sentence I kept in mind: you encourage AI, as long as you understand what is happening. So every finding comes with its evidence.",
    ],
    words: [{ word: "productivity", say: "proh-duk-TIV-ih-tee" }, { word: "complexity", say: "kum-PLEK-sih-tee" }, { word: "guidelines", say: "GIDE-lines" },
      { word: "playbook", say: "PLAY-book" }, { word: "solely", say: "SOHL-lee" }, { word: "merchants", say: "MUR-chunts" }, { word: "amendments", say: "uh-MEND-ments" }],
  },
  {
    id: "insight", act: 1, kind: "statement", title: "To prove that something is missing, you have to read everything.", steps: 1, seconds: 25, Body: Insight,
    notes: [
      "Finding is easy: you stop at the first hit. But to prove that something is missing, you have to read every contract and every page.",
      "And today, that reading starts again with every new question. That is the lever: read everything once, and be able to prove it.",
    ],
    words: [{ word: "prove", say: "PROOV" }, { word: "lever", say: "LEE-ver" }],
  },
];

// Deep dives since decision 98: their points are said on 'case-study'; listed in deep.tsx.
export const TASK: Slide = {
  id: "task", act: 7, kind: "content", title: "Six sentences that shaped the solution.", steps: 2, seconds: 40, deep: true, Body: TaskSnippets,
  notes: [
    "I started with your words, sentence by sentence. Two are Legal's questions. First: contracts without a certain passage. Second: contracts with a former company name. Both are about every contract.",
    "Today, lawyers do it by hand: open, search, verify. Some contracts are old handwritten scans, only images.",
    "Two sentences set the rules. The storage may only get a copy. You want to understand what happens. So every finding needs evidence.",
  ],
  words: [{ word: "passage", say: "PASS-ij" }, { word: "former", say: "FOR-mer" }, { word: "verify", say: "VER-ih-fy" }, { word: "evidence", say: "EV-ih-dence" }],
};

// proof.tsx reads "about N hours" from this card's note.
export const TODAY: Slide = {
  id: "today", act: 7, kind: "content", title: "Today: open every contract, search, note it down.", steps: 2, seconds: 26, deep: true, Body: Today,
  notes: [
    // "again for every new question" is said once, on 'insight' (2.11.); the steps are the card's title
    `What does one question cost today? You work with over ${n(VENDORS)} vendors and over ${n(MERCHANTS)} merchants. So over ${n(CONTRACTS)} contracts.`,
    `I assume ${MINUTES} minutes per contract. We'd measure it with Legal first.`,
    `That's about ${HOURS} hours for one question.`,     // proof.tsx reads "about N hours" from this note
  ],
  words: [{ word: "vendors", say: "VEN-derz" }, { word: "merchants", say: "MUR-chunts" }, { word: "assume", say: "uh-SOOM" }, { word: "measure", say: "MEZH-er" }],
};

// The three difficulties, with the scan, the amendment and the three wordings.
export const HARD: Slide = {
  id: "hard", act: 7, kind: "content", title: "Three things make it hard.", steps: 3, seconds: 48, deep: true, Body: Hard,
  notes: [
    "Why not search for a word?",
    "First, scans. Most PDFs have text: we read it directly. Some are only images, like this one. OCR, text recognition, reads them. Later, a handwritten one, live.",
    `Second, amendments. A contract from ${year(RENAME.amends_date)} names ${RENAME.old.split(" ")[0]}, Riverty's old name. Its ${year(RENAME.date)} amendment says: read as ${RENAME.to.split(" ")[0]}. The answer needs both.`,
    "Third, wording. All three cap liability. The second never says liability. The third is German. Keywords miss them. Remember the second one.",
  ],
  words: [{ word: "PDFs", say: "pee-dee-EFFS" }, { word: "OCR", say: "oh-see-AR" }, { word: "recognition", say: "rek-ug-NISH-un" },
    { word: "Arvato", say: "ar-VAH-toh" }, { word: "amendment", say: "uh-MEND-ment" }, { word: "liability", say: "lie-uh-BIL-ih-tee" }],
};
