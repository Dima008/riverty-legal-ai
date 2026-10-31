// Act 4 - proof. The test set as a trap map: the documents we wrote, the traps hidden in them
// (one of three questions each: read, understand, organise), and the real contracts from CUAD
// with the experts' labels. Colour means the question a trap asks, never right or wrong.
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import {
  AMENDMENTS, ASKS, COPY_TARGETS, CUAD_AGREE, CUAD_CAP, CUAD_DIFFER, CUAD_N, CUAD_NAME, CUAD_NO_CAP,
  CUAD_NO_CAP_AGREED, CUAD_SOURCE, DOCS, DPA, FOUND_BY_CUAD, MERCHANT, QUESTIONS_N, TRAPS, trapsOf, type Doc,
} from "./testset-data";
import "./act4.css";

const LAST = ASKS.length + 1;   // the build that lights the real contracts

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
      <div className="tm-field" role="img" aria-label={`${DOCS.length} documents we wrote and ${CUAD_N} real contracts, with the traps hidden in them`}>
        <div className="tm-kicker">Written by us · {DOCS.length}</div>
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
        <div className="tm-strip">Answer key written before the pipeline · {QUESTIONS_N} questions</div>
        <div className={`tm-cuad${step >= LAST ? " on" : ""}`}>
          <div className="tm-kicker">Not written by us · {CUAD_N} real contracts</div>
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
            <div className="tm-q-head"><span className="n">{q.n}</span>{q.name}<span className="ask">{q.ask}</span></div>
            <Build at={q.n} className="tm-rows-legend">
              {TRAPS.filter((t) => t.q === q.n).map((t) => <div key={t.code}><code>{t.code}</code><span>{t.say}</span></div>)}
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
              <div className="tm-found">Real contracts showed {FOUND_BY_CUAD.length} errors our traps missed: {FOUND_BY_CUAD.join(" · ")} – all fixed.</div>
            )}
          </Build>
        </li>
      </ol>
    </div>
  );
}

export const TEST_SET: Slide = {
  id: "test-set", act: 4, kind: "content", title: "A test set built to break the system.", steps: LAST, seconds: 50, Body: TrapMap,
  notes: [
    `Riverty can't share contracts. So we wrote ${DOCS.length} – and wrote down the answers first.`,
    "Then we hid traps. One: can it read? Scans, German, a cap split by a page break.",
    "Two: does it understand? Caps in other words. Look-alike clauses, but no cap. A hidden instruction for the AI.",
    "Three: is the portfolio in order? An old name, fixed by an amendment. A copy. Foreign law.",
    `Real contracts: CUAD, the Contract Understanding Atticus Dataset, labelled by experts. On the liability cap, we agree on ${CUAD_AGREE} of ${CUAD_N} – all ${CUAD_NO_CAP_AGREED} without a cap included. ${[...CUAD_DIFFER].join(", ")} is a question for Legal.`,
  ],
  words: [{ word: "Atticus", say: "AT-ih-kus" }, { word: "portfolio", say: "port-FOH-lee-oh" }, { word: "amendment", say: "uh-MEND-ment" }],
};
