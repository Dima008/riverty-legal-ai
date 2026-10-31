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

// The 47 documents of the test set, as tiles in three groups: the ids (M, V, C) are used on every
// later card, so the audience must meet them here first.
const GROUPS = [
  { at: 1, prefix: "M", ids: [...Array.from({ length: 20 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`), "M05-A"],
    title: "20 merchant agreements + 1 amendment", sub: "written for this case study – every trap is on purpose" },
  { at: 2, prefix: "V", ids: Array.from({ length: 6 }, (_, i) => `V${String(i + 1).padStart(2, "0")}`),
    title: "6 data processing agreements", sub: "the vendor side, Art. 28 GDPR" },
  { at: 3, prefix: "C", ids: Array.from({ length: 20 }, (_, i) => `C${String(i + 1).padStart(2, "0")}`),
    title: "20 real public contracts", sub: "CUAD dataset, labelled by legal experts – real contract language" },
];

function TestSet() {
  return (
    <div className="tset">
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
      <Build at={3} className="tset-total">47 documents · every correct answer is known · all synthetic or public, nothing from Riverty</Build>
    </div>
  );
}

function Insight() {
  return <p className="s-support">Every contract. Every page.</p>;
}

export const ACT1: Slide[] = [
  {
    id: "title", act: 1, kind: "title", title: "Which contracts are missing something?", steps: 0, seconds: 15, Body: TitleBody,
    notes: [
      "Hello, I'm Dima. In the next eighteen minutes, I show how I'd help Riverty's legal team. The goal: answer one kind of question reliably. And a working prototype does it.",
    ],
    words: [{ word: "reliably", say: "rih-LIE-uh-blee" }, { word: "prototype", say: "PROH-tuh-type" }],
  },
  {
    id: "act-1", act: 1, kind: "opener", title: "The task", steps: 0, seconds: 4,
    notes: [
      "First: what Legal actually asks.",
    ],
    words: [],
  },
  {
    id: "two-questions", act: 1, kind: "content", title: "Legal asks two kinds of questions.", steps: 2, seconds: 30, Body: TwoQuestions,
    notes: [
      "The task names two kinds of questions. Contracts without a certain text passage. And contracts with a company name to update.",
      "One: which contracts lack a clause? For example, a limitation of liability.",
      "Two: which contracts still name a former company? For example, Arvato Financial Solutions instead of Riverty. Both questions ask about every contract, not just one.",
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "passage", say: "PASS-ij" }, { word: "Financial", say: "fy-NAN-shul" }],
  },
  {
    id: "today", act: 1, kind: "content", title: "Today: open every contract, search, note it down.", steps: 2, seconds: 25, Body: Today,
    notes: [
      "Riverty has over 1,100 contracts. Over 100 vendors, over 1,000 merchants.",
      "I assume five minutes per contract: open, search, note. We measure it with Legal in the pilot.",
      "That's about ninety hours for one question. And again for the next one. The task calls it repetitive work nobody enjoys.",
    ],
    words: [{ word: "merchants", say: "MUR-chunts" }, { word: "assume", say: "uh-SOOM" }, { word: "repetitive", say: "rih-PET-ih-tiv" }],
  },
  {
    id: "contracts", act: 1, kind: "content", title: "Riverty cannot share contracts – so I built 47 with known answers.", steps: 3, seconds: 45, Body: TestSet,
    notes: [
      "Riverty cannot share real contracts. So I built a test set where I know every answer.",
      "Twenty merchant agreements, M01 to M20, and one amendment, M05-A: a later change to a contract. I wrote them myself and hid traps in them: a missing clause, an old company name, a scan.",
      "Six data processing agreements, V01 to V06. That is the vendor side.",
      "And twenty real public contracts, C01 to C20, from the CUAD dataset. Legal experts labelled them. So when I say M14 later, you know: one of my test contracts.",
    ],
    words: [{ word: "amendment", say: "uh-MEND-ment" }, { word: "labelled", say: "LAY-buld" }, { word: "synthetic", say: "sin-THET-ik" }],
  },
  {
    id: "hard", act: 1, kind: "content", title: "Three things make it hard.", steps: 3, seconds: 40, Body: Hard,
    notes: [
      "Why not search for a word?",
      "First, scans. Some contracts are only images, like M18 here. Text recognition, called OCR, must read them first.",
      "Second, amendments. M05 from 2020 still says Arvato Financial Solutions. The 2022 amendment says: read as Riverty GmbH. The answer depends on the family: the contract and every amendment.",
      "Third, wording. All three sentences limit liability. The second never says liability. The third is German. A keyword search misses them. Remember the second one for later.",
    ],
    words: [{ word: "liability", say: "lie-uh-BIL-ih-tee" }, { word: "amendment", say: "uh-MEND-ment" }, { word: "recognition", say: "rek-ug-NISH-un" }],
  },
  {
    id: "insight", act: 1, kind: "statement", title: "To prove that something is missing, you have to read everything.", steps: 0, seconds: 15, Body: Insight,
    notes: [
      "My solution builds on this sentence. Finding is easy: you stop at the first hit. To prove it's NOT there, you read every contract, every page. Keep that in mind.",
    ],
    words: [{ word: "prove", say: "PROOV" }, { word: "every", say: "EV-ree" }],
  },
];
