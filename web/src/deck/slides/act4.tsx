// Act 4 - proof. The test set as a trap map: the documents I wrote, the traps hidden in them
// (one of three questions each: read, understand, organise), and the real contracts from CUAD
// with the experts' labels. Colour means the question a trap asks, never right or wrong. The
// audience met the 47 and the 8 test questions on the card 'contracts' (act 2, decision 88), so
// this card shows the traps, not the set again; "I" for my own work, like 'contracts'.
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import {
  AMENDMENTS, ASKS, COPY_TARGETS, CUAD_AGREE, CUAD_CAP, CUAD_DIFFER, CUAD_N, CUAD_NAME, CUAD_NO_CAP, CUAD_SOURCE,
  DOCS, DPA, FOUND_BY_CUAD, MERCHANT, QUESTIONS_N, TRAPS, trapsOf, type Doc,
} from "./testset-data";
import "./act4.css";

const LAST = ASKS.length + 1;   // the build that lights the real contracts
const ALL_DOCS = DOCS.length + CUAD_N;

// Wording on this card in the main track's words (decision 88): "portfolio" and "text layer" are
// never explained, so the card says it plainly. The trap definitions stay in testset-data.ts.
const ASK: Record<number, string> = { 3: "Is the collection in order?" };
const SAY: Record<string, string> = { scan: "only an image, no text" };

function Tile({ d, step }: { d: Doc; step: number }) {
  const traps = trapsOf(d);
  const now = traps.filter((t) => t.q === step);     // this question's traps: a tag
  const past = traps.filter((t) => t.q < step);      // earlier questions: a dot each
  const cls = [
    "tm-tile",
    now.length > 0 && `a${step}`,
    step === LAST && "dim",
    step === 3 && COPY_TARGETS.has(d.id) && "orig",
    step >= 3 && d.special.startsWith("amendment") && "fam",
  ].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      {d.id}
      {now.map((t) => <small key={t.code}>{t.tag ? t.tag(d) : t.code}</small>)}
      {past.length > 0 && <span className="tm-dots">{past.map((t) => <i key={t.code} className={`d${t.q}`} />)}</span>}
    </div>
  );
}

function TrapMap() {
  const step = useStep();
  return (
    <div className="tm">
      <div className="tm-field" role="img" aria-label={`${DOCS.length} documents I wrote and ${CUAD_N} real contracts, with the traps hidden in them`}>
        <div className="tm-kicker">Written by me · {DOCS.length}</div>
        <div className="tm-groups">
          <div>
            <div className="tm-group-label">Merchant agreements · {MERCHANT.length - AMENDMENTS} + {AMENDMENTS} amendment</div>
            <div className="tm-grid">{MERCHANT.map((d) => <Tile key={d.id} d={d} step={step} />)}</div>
          </div>
          <div>
            <div className="tm-group-label">Data processing · {DPA.length}</div>
            <div className="tm-grid dpa">{DPA.map((d) => <Tile key={d.id} d={d} step={step} />)}</div>
          </div>
        </div>
        <div className="tm-strip">Answers written first · {QUESTIONS_N} test questions</div>
        <div className={`tm-cuad${step >= LAST ? " on" : ""}`}>
          <div className="tm-kicker">Not written by me · {CUAD_N} real contracts</div>
          <Build at={LAST}>
            <div className="tm-cuad-name">{CUAD_NAME}</div>
            <div className="tm-cuad-src">{CUAD_SOURCE}</div>
          </Build>
          <div className="tm-rows">
            {[["experts: cap", CUAD_CAP], ["experts: no cap", CUAD_NO_CAP]].map(([label, docs]) => (
              <div key={label as string} className="tm-row">
                <div className="tm-rowlabel">{label as string}</div>
                {(docs as typeof CUAD_CAP).map((c) => {
                  const differ = CUAD_DIFFER.has(c.id);
                  const cls = `tm-ctile${step >= LAST ? (differ ? " differ" : " agree") : ""}`;
                  return <div key={c.id} className={cls}><span>{c.id}</span>{step >= LAST && <b>{differ ? "?" : "✓"}</b>}</div>;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ol className="tm-legend">
        {ASKS.map((q) => (
          <li key={q.n} className={`tm-q a${q.n} ${step < q.n ? "wait" : step === q.n ? "now" : "past"}`}>
            <div className="tm-q-head"><span className="n">{q.n}</span>{q.name}<span className="ask">{ASK[q.n] ?? q.ask}</span></div>
            <Build at={q.n} className="tm-rows-legend">
              {TRAPS.filter((t) => t.q === q.n).map((t) => <div key={t.code}><code>{t.code}</code><span>{SAY[t.code] ?? t.say}</span></div>)}
            </Build>
          </li>
        ))}
        <li className={`tm-q a${LAST} ${step < LAST ? "wait" : "now"}`}>
          <div className="tm-q-head"><span className="n">{LAST}</span>Real<span className="ask">Does it agree with legal experts?</span></div>
          <Build at={LAST} className="tm-result">
            <div className="tm-big">{CUAD_AGREE} of {CUAD_N}</div>
            <div>agree with the experts on the liability cap</div>
            <div>{[...CUAD_DIFFER].join(", ")}: a payment on termination – a cap? <b>A question for Legal.</b></div>
            {FOUND_BY_CUAD.length > 0 && (
              // one chip per error, so "C09, C10" reads as one error, not two
              <div className="tm-found">
                {FOUND_BY_CUAD.length} errors my traps missed, all fixed:
                <div>{FOUND_BY_CUAD.map((ids) => <span key={ids} className="tm-err">{ids}</span>)}</div>
              </div>
            )}
          </Build>
        </li>
      </ol>
    </div>
  );
}

export const TEST_SET: Slide = {
  id: "test-set", act: 4, kind: "content", title: "A test set built to break the system.", steps: LAST, seconds: 48, Body: TrapMap,
  notes: [
    `You met the ${ALL_DOCS}. In my ${DOCS.length}, I hid traps – and wrote the answers first.`,
    "One: can it read? Scans, German, a cap split across two pages.",
    "Two: does it understand? Caps in other words. Look-alike clauses without a cap. A hidden instruction.",
    "Three: is the collection in order? An old name fixed by an amendment, a copy, foreign law.",
    `Real contracts, labelled by experts: on the cap, we agree on ${CUAD_AGREE} of ${CUAD_N}. ${[...CUAD_DIFFER].join(", ")} is a question for Legal. ` +
      `They showed ${FOUND_BY_CUAD.length} errors my traps missed – all fixed.`,
  ],
  words: [{ word: "Atticus", say: "AT-ih-kus" }, { word: "labelled", say: "LAY-buld" }, { word: "amendment", say: "uh-MEND-ment" }],
};

// ---------------------------------------------------------------- guards (development only)
// The data guards of the set itself are in testset-data.ts; these check what the notes say.
if (import.meta.env.DEV) {
  const problems = [
    !ASKS.some((q) => q.n === 3) && "the override 'Is the collection in order?' no longer has a question 3",
    !TRAPS.some((t) => t.code === "scan") && "the override 'only an image, no text' no longer has a trap 'scan'",
    TRAPS.filter((t) => t.q === 3).map((t) => t.code).join(",") !== "amendment,copy,law"
      && "note 3 of 'test-set' names an old name fixed by an amendment, a copy and foreign law - the traps of question 3 changed",
    FOUND_BY_CUAD.length === 0 && "note 4 of 'test-set' says the real contracts showed errors my traps missed - none are listed",
    // the errors by name (F3, F4, F10 in docs/failure-cases.md), so the count cannot drift silently
    FOUND_BY_CUAD.join(" | ") !== "C04 | C09, C10 | C11"
      && `note 4 of 'test-set' speaks of the errors C04, C09/C10 and C11 - docs/failure-cases.md now gives ${FOUND_BY_CUAD.join(" | ")}`,
    CUAD_DIFFER.size === 0 && "note 4 of 'test-set' names a contract that is a question for Legal - there is none",
  ].filter(Boolean);
  for (const p of problems) console.error(`card "test-set": ${p}`);
}
