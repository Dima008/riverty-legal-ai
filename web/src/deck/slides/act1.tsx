// Act 1 - the task: what Legal asks, what one question costs today, what makes it hard, and the
// one insight everything else builds on: to prove that something is missing, you read everything.
import { useState } from "react";
import { Build } from "../Build";
import type { Slide } from "../types";

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

function TwoQuestions() {
  return (
    <div className="q2">
      <Build at={1} className="card q2-card">
        <div className="label">Clause check</div>
        <div className="q2-q">Which contracts <em>lack</em> a clause?</div>
        <div className="q2-eg">e.g. no limitation of liability</div>
      </Build>
      <Build at={2} className="card q2-card">
        <div className="label">Company name</div>
        <div className="q2-q">Which contracts still name a <em>former</em> company?</div>
        <div className="q2-eg">e.g. “Arvato Financial Solutions” instead of Riverty</div>
      </Build>
    </div>
  );
}

function Today() {
  return (
    <div className="calc">
      <div className="calc-item">
        <div className="big">1,100+</div>
        <div className="calc-label">contracts<span>100+ vendors · 1,000+ merchants</span></div>
      </div>
      <Build at={1} className="calc-item">
        <div className="calc-op">×</div>
        <div className="big">5 min</div>
        <div className="calc-label">to open, search, note<span>per contract – an assumption</span></div>
      </Build>
      <Build at={2} className="calc-item calc-hl">
        <div className="calc-op">≈</div>
        <div className="big">90 h</div>
        <div className="calc-label">for one question<span>and again for the next one</span></div>
      </Build>
    </div>
  );
}

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
          <div className="doc">M05 · 2020<b>“Arvato Financial Solutions”</b></div>
          <div className="doc amend">M05-A · 2022<b>read as “Riverty GmbH”</b></div>
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

function Insight() {
  return <p className="s-support">Every contract. Every page.</p>;
}

export const ACT1: Slide[] = [
  {
    id: "title", act: 1, kind: "title", title: "Which contracts are missing something?", steps: 0, seconds: 15, Body: TitleBody,
    notes: "Hello, I'm Dima. In the next eighteen minutes I'll show how I would help Riverty's legal team answer one kind of question reliably – and a working prototype that does it.",
  },
  {
    id: "act-1", act: 1, kind: "opener", title: "The task", steps: 0, seconds: 4,
    notes: "First: what Legal actually asks.",
  },
  {
    id: "two-questions", act: 1, kind: "content", title: "Legal asks two kinds of questions.", steps: 2, seconds: 30, Body: TwoQuestions,
    notes: "The task names two: contracts that do not contain a certain text passage, and contracts in which a company name needs to be updated. → One: which contracts lack a clause – for example a limitation of liability. → Two: which contracts still name a former company – Arvato Financial Solutions instead of Riverty. Both ask about every contract, not about one.",
  },
  {
    id: "today", act: 1, kind: "content", title: "Today: open every contract, search, note it down.", steps: 2, seconds: 25, Body: Today,
    notes: "Riverty has over 100 vendor and over 1,000 merchant agreements. → If one contract takes five minutes to open, search and note – that is my assumption, to be measured with Legal in the pilot – → one question costs about ninety hours. And the next question costs the same again. The task calls it repetitive work nobody enjoys.",
  },
  {
    id: "hard", act: 1, kind: "content", title: "Three things make it hard.", steps: 3, seconds: 40, Body: Hard,
    notes: "Why not just search for a word? → Scans: some contracts are only images, like M18 here – the text has to be read by OCR first. → Amendments: M05 from 2020 still says Arvato Financial Solutions; the 2022 amendment says read it as Riverty. So the answer depends on the family, not on one file. → Wording: these three sentences all cap liability. The second one never uses the word liability, the third is German. A keyword search misses them – keep the second one in mind, we will meet it again.",
  },
  {
    id: "insight", act: 1, kind: "statement", title: "To prove that something is missing, you have to read everything.", steps: 0, seconds: 15, Body: Insight,
    notes: "This is the sentence the whole solution is built on. Finding something is easy – you stop at the first hit. Proving that something is NOT there means you have looked at every contract and every page. Keep that in mind for the next part.",
  },
];
