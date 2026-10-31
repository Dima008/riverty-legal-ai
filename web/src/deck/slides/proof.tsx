// Act 4 - proof, after the trap map: how many answers were complete and how sure we can be, a
// safeguard switched off live (the stored model answers replayed on a copy of the register), and
// what reading costs - and whether a bigger model would help. Every number is read from a stored
// evaluation file or from the running API - nothing is typed by hand.
import { useEffect, useRef, useState } from "react";
import goldQueries from "../../../../data/gold_queries.json";
import firstRun from "../../../../eval/results/2026-10-29_extract-v2.txt?raw";
import firstRunAblation from "../../../../eval/results/2026-10-30_extract-v2_ablation.txt?raw";
import mini1 from "../../../../eval/results/2026-10-30_extract-v2_consistency_run1.json";
import mini2 from "../../../../eval/results/2026-10-30_extract-v2_consistency_run2.json";
import mini3 from "../../../../eval/results/2026-10-30_extract-v2_consistency_run3.json";
import big1 from "../../../../eval/results/2026-10-30_extract-v2_gpt-4.1_run1.json";
import big2 from "../../../../eval/results/2026-10-30_extract-v2_gpt-4.1_run2.json";
import laptop from "../../../../eval/results/2026-10-30_extract-v2_laptop.json";
import stats from "../../../../eval/results/2026-10-31_extract-v2_stats.json";
import stored from "../../../../eval/results/2026-10-31_what_if.json";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./proof.css";

const pct = (x: number) => `${Math.round(x * 100)} %`;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const usd = (x: number) => `$${x.toFixed(2)}`;
/** [0.0914, 0.1123] -> "0.09–0.11", [5, 5] -> "5" */
const range = (xs: number[], fmt: (x: number) => string = String) => {
  const [lo, hi] = [fmt(Math.min(...xs)), fmt(Math.max(...xs))];
  return lo === hi ? lo : `${lo}–${hi}`;
};

// ================================================================ the stored runs
// Every stored full run of the current prompt (extract-v2) over all documents, for the results card
// and the cost card alike: the first one (29 Oct, kept only as the text report - eval.check_register
// could not write JSON yet), the production register, three repeated runs with the small model and
// two with the bigger one. The run with the older prompt (2026-10-29_extract-v1.txt) is not counted.
interface Run {
  file: string;
  model: string;
  version: string;
  complete: boolean;          // recall and precision 1 on every gold question
  cost: number;               // reading + checking (extract and check calls) - without the search index
  seconds: number | null;     // measured only by eval.repeat
  aloneQ1: number;            // Q1 recall of the model alone, every check off
  reads: number;              // extract calls: one per document
}
interface RunJson {
  config: { extraction: { model: string; prompt_version: string }[] };
  questions: { id: string; recall: number; precision: number }[];
  ablation: { id: string; recall_model: number }[];
  cost: { by_purpose: { purpose: string; calls: number; cost_usd: number }[] };
  seconds?: number;
}
const isComplete = (qs: { id: string; recall: number; precision: number }[]) =>
  qs.length === goldQueries.length && qs.every((q) => q.recall === 1 && q.precision === 1);

function fromJson(file: string, f: RunJson): Run {
  const of = (purpose: string) => f.cost.by_purpose.find((p) => p.purpose === purpose);
  return {
    file, model: f.config.extraction[0].model, version: f.config.extraction[0].prompt_version,
    complete: isComplete(f.questions),
    cost: (of("extract")?.cost_usd ?? NaN) + (of("check")?.cost_usd ?? 0),
    seconds: f.seconds ?? null,
    aloneQ1: f.ablation.find((a) => a.id === "Q1")?.recall_model ?? NaN,
    reads: of("extract")?.calls ?? 0,
  };
}

/** The text report of eval.check_register: "Q1  1.00  1.00  [...]" per question, one cost line per
 *  purpose ("  extract  gpt-4.1-mini  47 calls  $0.0982"). Its "model alone" numbers come from the
 *  ablation report of the next day, made on the same register (the same cost line, checked below). */
const costLine = (report: string) => report.match(/^Cost so far: [^\r\n]*/m)?.[0] ?? "";
function fromReport(file: string, version: string, report: string, ablation: string): Run {
  const questions = [...report.matchAll(/^(Q\d+)\s+(\d\.\d+)\s+(\d\.\d+)\s+\[/gm)]
    .map(([, id, precision, recall]) => ({ id, precision: Number(precision), recall: Number(recall) }));
  const calls = (purpose: string) => report.match(new RegExp(`^\\s+${purpose}\\s+(\\S+)\\s+(\\d+) calls\\s+\\$(\\d+\\.\\d+)`, "m"));
  const extract = calls("extract"), check = calls("check");
  const alone = ablation.split(/^Ablation[^\r\n]*/m)[1]?.match(/^Q1\s+(\d\.\d+)\s/m);
  return {
    file, version, model: extract?.[1] ?? "?", complete: isComplete(questions),
    cost: Number(extract?.[3] ?? NaN) + Number(check?.[3] ?? 0),
    seconds: null,
    aloneQ1: Number(alone?.[1] ?? NaN),
    reads: Number(extract?.[2] ?? 0),
  };
}

const RUNS: Run[] = [
  fromReport("2026-10-29_extract-v2.txt", "extract-v2", firstRun, firstRunAblation),   // version: from the file name
  fromJson("laptop.json (production register)", laptop),
  fromJson("consistency_run1.json", mini1),
  fromJson("consistency_run2.json", mini2),
  fromJson("consistency_run3.json", mini3),
  fromJson("gpt-4.1_run1.json", big1),
  fromJson("gpt-4.1_run2.json", big2),
];
const RUNS_COMPLETE = RUNS.filter((r) => r.complete).length;
const MODELS = [...new Set(RUNS.map((r) => r.model))];
const runsOf = (model: string) => RUNS.filter((r) => r.model === model);

// ================================================================ results: complete, and how sure
const QS = stats.questions;
const Q1 = QS.find((q) => q.id === "Q1")!;
const COMPLETE = QS.filter((q) => q.recall === 1).length;
const POOLED = stats.pooled;
const DISTINCT = new Set(QS.flatMap((q) => q.expected)).size;           // 28 answers, but fewer contracts
const WEAKEST = QS.reduce((a, q) => (q.recall_lower_95 < a.recall_lower_95 ? q : a));

// The questions in a few words (data/gold_queries.json has them in full).
const SHORT: Record<string, string> = {
  Q1: "no liability cap", Q2: "a legacy company name", Q3: "no consumer terms at checkout",
  Q4: "no data processing agreement", Q5: "not German law", Q6: "processing: no audit clause",
  Q7: "processing: no sub-processors", Q8: "duplicates",
};

function Ruler({ id, name, of, recall, low, band }: { id: string; name: string; of: string; recall: number; low: number; band: boolean }) {
  return (
    <div className="p-row">
      <span className="p-qid">{id}</span>
      <span className="p-qname">{name}</span>
      <span className="p-of">{of}</span>
      <div className="p-track">
        <span className={`p-band${band ? " on" : ""}${low > 0.7 ? " narrow" : ""}`} style={{ left: `${low * 100}%`, right: `${(1 - recall) * 100}%` }}>
          <b>≥ {pct(low)}</b>
        </span>
        <span className="p-dot" style={{ left: `${recall * 100}%` }} />
      </div>
    </div>
  );
}

function Results() {
  const step = useStep();
  return (
    <div className="p-res">
      <div className="p-rows" role="img" aria-label={`${COMPLETE} of ${QS.length} questions complete, with the 95 % lower bound per question`}>
        <div className="p-row p-head">
          <span /><span>which contracts …</span><span />
          <div className="p-axis"><span>0 %</span><span>100 % found</span></div>
        </div>
        {QS.map((q) => (
          <Ruler key={q.id} id={q.id} name={SHORT[q.id] ?? q.id} of={`${q.found.filter((d) => q.expected.includes(d)).length} of ${q.expected.length}`}
            recall={q.recall} low={q.recall_lower_95} band={step >= 1} />
        ))}
        <Build at={2} className="p-pooled">
          <Ruler id="All" name="every answer together" of={`${POOLED.found} of ${POOLED.expected}`}
            recall={POOLED.found / POOLED.expected} low={POOLED.recall_lower_95} band />
        </Build>
        <Build at={1} className="p-foot">band: 95 % sure the true rate is at least here (one-sided, Clopper–Pearson)</Build>
      </div>
      <div className="p-side">
        <Build at={0} className="p-fact">
          {RUNS_COMPLETE === RUNS.length
            ? <><b>All {RUNS.length} stored runs</b>: complete, no false alarm</>
            : <><b>{RUNS_COMPLETE} of {RUNS.length} stored runs</b> complete</>}
        </Build>
        <Build at={1} className="p-fact p-amber">
          <span className="p-swatch" /><span className="p-nb">{WEAKEST.expected.length} of {WEAKEST.expected.length}</span> → <span className="p-nb">could be {pct(WEAKEST.recall_lower_95)}</span>
        </Build>
        <Build at={2} className="p-fact">
          <b>{DISTINCT} contracts</b>, and we tuned on them → <b>sealed test set</b> <span className="p-tag">planned</span>
        </Build>
      </div>
    </div>
  );
}

// ================================================================ what-if: a safeguard switched off
interface Side { status: string; confidence: number; reported: boolean; triage: string | null }
interface Change { doc_id: string; clause_type: string; before: Side; after: Side; no_longer_raised: string[] }
interface Question { id: string; expected: string[]; recall: number[]; precision: number[]; missed: string[] }
interface Replay { off: string[]; questions: Question[]; changes: Change[] }

const STORED: Replay[] = stored.scenarios.map((s) => s.result);
const SCENARIOS = stored.scenarios.map((s) => s.off);          // build 1, 2, 3
const Q1_CLAUSE = "liability_limitation";                        // the clause Q1 asks about

// The four checks on a found clause, in the words of act 3 (cards "choices" and "checks"). The
// injection switch turns off only the pattern check: the stored answers were made with the prompt
// that tells the model to treat the contract as untrusted data, and a replay does not change that.
const SWITCHES = [
  { id: "quote_found", name: "The quote is in the contract" },
  { id: "clause_vocabulary", name: "It uses the clause's words" },
  { id: "checker", name: "A second model call agrees" },
  { id: "injection_guard", name: "Hidden instructions flagged", sub: "(pattern check)" },
];
const WHO: Record<string, string> = { FOUR_EYES: "two people", REVIEW: "one lawyer", CONFIRM: "a spot check" };
const who = (t: string | null) => (t ? WHO[t] ?? t : "nobody");
const q1Of = (r: Replay) => r.questions.find((q) => q.id === "Q1")!;

/** Each replay runs on the API when its build is first shown on a main screen, so the time on the
 *  card is the time from that click to the answer. They run one after another and are kept for the
 *  page's lifetime. A preview (the presenter's "next" card, the overview: classes from
 *  Presenter.tsx and Overview.tsx) never calls the API - it shows the stored replay. The stored file
 *  is also the fallback when the API is offline or slow. */
const PREVIEW = ".pv-next, .thumb-card";
const TIMEOUT_MS = 5000;
interface Live { data: Replay; ms: number }
const running = new Map<number, Promise<Live>>();
const answered = new Map<number, Live>();
let queue: Promise<unknown> = Promise.resolve();

async function replay(off: string[]): Promise<Replay> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`/api/what-if?off=${encodeURIComponent(off.join(","))}`, { signal: ctl.signal });
    if (!r.ok) throw new Error(`what-if: HTTP ${r.status}`);
    const data = (await r.json()) as Replay;
    if (!Array.isArray(data?.questions) || !Array.isArray(data.changes) || !data.questions.some((q) => q.id === "Q1")) {
      throw new Error("what-if: unexpected answer");
    }
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

function replayOnce(i: number): Promise<Live> {
  let run = running.get(i);
  if (!run) {
    const t0 = performance.now();                              // the click, not the start of the request
    run = queue.then(() => replay(SCENARIOS[i])).then((data) => {
      const live = { data, ms: performance.now() - t0 };
      answered.set(i, live);
      if (import.meta.env.DEV && (q1Of(data).missed.join(",") !== q1Of(STORED[i]).missed.join(",") || data.changes.length !== STORED[i].changes.length)) {
        console.warn(`card "what-if": the live register differs from the stored replay (${SCENARIOS[i].join("+")}) - notes may be out of date`);
      }
      return live;
    });
    queue = run.catch(() => undefined);
    run.catch(() => running.delete(i));                          // offline: try again the next time
    running.set(i, run);
  }
  return run;
}

type Source = "live" | "stored" | "offline";
interface View { data: Replay; ms: number | null; source: Source }

/** The replay for build i + 1: null while it is still running on the API. */
function useReplay(i: number | null) {
  const root = useRef<HTMLDivElement>(null);
  const [got, setGot] = useState<{ i: number; view: View } | null>(null);
  useEffect(() => {
    if (i === null || answered.has(i)) return;
    if (root.current?.closest(PREVIEW)) {
      setGot({ i, view: { data: STORED[i], ms: null, source: "stored" } });
      return;
    }
    let on = true;
    replayOnce(i)
      .then((l) => on && setGot({ i, view: { data: l.data, ms: l.ms, source: "live" } }))
      .catch(() => on && setGot({ i, view: { data: STORED[i], ms: null, source: "offline" } }));
    return () => { on = false; };
  }, [i]);
  const done = i === null ? undefined : answered.get(i);
  const view: View | null = done ? { ...done, source: "live" } : got && got.i === i ? got.view : null;
  return { root, view };
}

function WhatIf() {
  const step = useStep();
  const i = step >= 1 ? Math.min(step, SCENARIOS.length) - 1 : null;
  const { root, view } = useReplay(i);
  const off = new Set(i === null ? [] : SCENARIOS[i]);           // the switches move with the click
  const now = view?.data ?? null;                                 // null: all checks on, or still replaying
  const waiting = i !== null && !view;
  const q1 = q1Of(now ?? STORED[0]);
  const n = q1.expected.length;
  const missed = new Set(now ? q1.missed : []);
  const found = Math.round((now ? q1.recall[1] : q1.recall[0]) * n);
  const q1Change = (doc: string) => now?.changes.find((c) => c.doc_id === doc && c.clause_type === Q1_CLAUSE);
  const moved = q1.expected.map(q1Change).filter((c): c is Change => !!c && !missed.has(c.doc_id) && c.before.triage !== c.after.triage);

  // Every line under the tag comes from the replay of this build alone. Which contracts the other
  // check still catches is shown by the next replay (build 2) - until then only the note says it.
  let line;
  if (i === null) line = <>All checks on.</>;
  else if (!now) line = null;
  else if (missed.size) {
    const before = [...new Set([...missed].map((d) => q1Change(d)?.before.triage ?? null))];
    line = <><b className="p-bad">{[...missed].join(" and ")} slip through</b> – before: {before.length === 1 ? who(before[0]) : "a person"} looked. Now: nobody.</>;
  } else if (moved.length) {
    line = <>{moved.map((c) => <span key={c.doc_id}><b>{c.doc_id}</b>: {who(c.before.triage)} → <b className="p-bad">{who(c.after.triage)}</b></span>)}</>;
  } else line = <>Q1 does not change{i === 0 ? " – the checks overlap" : ""}.</>;

  const tag = i === null ? <span className="p-live p-hide" aria-hidden>replayed on the running API · 0.0 s</span>   // holds its place
    : !view ? <span className="p-live wait">replaying on the running API …</span>
      : view.source === "live" ? <span className="p-live">replayed on the running API · {((view.ms ?? 0) / 1000).toFixed(1)} s</span>
        : view.source === "offline" ? <span className="p-live off">API offline · stored replay</span>
          : <span className="p-live wait">stored replay</span>;

  return (
    <div className="p-wi" ref={root}>
      <div className="p-switches">
        <div className="p-kicker">The checks on a found clause</div>
        {SWITCHES.map((s) => (
          <div key={s.id} className={`p-switch${off.has(s.id) ? " off" : ""}`}>
            <span className="p-toggle" aria-hidden><i /></span>
            <span>{s.name}{s.sub && <small>{s.sub}</small>}</span>
          </div>
        ))}
        <div className="p-how">replay · no model call · $0</div>
        {tag}
      </div>
      <div className={`p-q1${waiting ? " wait" : ""}`}>
        <div className="p-kicker">Q1 · which contracts have {SHORT.Q1}?</div>
        <div className="p-tiles">
          {q1.expected.map((d) => {
            const gone = missed.has(d);
            const mv = moved.find((c) => c.doc_id === d);
            return (
              <div key={d} className={`p-tile${gone ? " gone" : ""}${mv ? " moved" : ""}`}>
                {d}
                <small>{gone ? "missed" : mv ? `→ ${who(mv.after.triage)}` : "found"}</small>
              </div>
            );
          })}
        </div>
        <div className={`p-count${missed.size ? " p-bad" : ""}`}>{found} of {n}<span> found</span></div>
        <div className="p-line">{line}</div>
        <div className={`p-foot p-wi-foot${off.has("injection_guard") ? "" : " p-hide"}`} aria-hidden={off.has("injection_guard") ? undefined : true}>
          The model still read the contract as untrusted data – so this replay cannot show an injection succeeding.
        </div>
      </div>
    </div>
  );
}

// ================================================================ cost: once, then free; the small model
const COST_ALL = stats.cost.cost_usd;                       // the production register: reading, checking and the search index
const DOCUMENTS = stats.config.documents;
const MINI = stats.config.extraction[0].model;              // production
const BIG = MODELS.find((m) => m !== MINI) ?? MINI;
const ROWS = [MINI, BIG].map((name) => {
  const runs = runsOf(name);
  return {
    name, runs,
    cost: runs.map((r) => r.cost),
    seconds: runs.flatMap((r) => (r.seconds === null ? [] : [r.seconds])),
    alone: runs.map((r) => Math.round(r.aloneQ1 * Q1.expected.length)),
    complete: runs.every((r) => r.complete),
  };
});
const [MINI_ROW, BIG_ROW] = ROWS;
const RATIO = Math.round(mean(BIG_ROW.cost) / mean(MINI_ROW.cost));
const TIME_RATIO = Math.round(mean(BIG_ROW.seconds) / mean(MINI_ROW.seconds));
const MAX_COST = Math.max(...RUNS.map((r) => r.cost));
const TIMED = RUNS.filter((r) => r.seconds !== null).length;
const Q1_N = Q1.expected.length;

function Cost() {
  return (
    <div className="p-cost">
      <div className="p-two">
        <div className="p-num">
          <span className="p-big2">{usd(COST_ALL)}</span>read all {DOCUMENTS} contracts once
          <small>production register, with the search index · every model call logged</small>
        </div>
        <div className="p-num">
          <span className="p-big2">$0</span>per question
          <small>a lookup in the register, no model call</small>
        </div>
      </div>
      <Build at={1} className="p-models">
        <div className="p-mrow p-mhead"><span /><span>cost per run</span><span>time</span><span>model alone, Q1</span><span>with our checks</span></div>
        {ROWS.map((m) => (
          <div key={m.name} className={`p-mrow${m.name === BIG ? " p-alt" : ""}`}>
            <span className="p-mname">{m.name}</span>
            <span className="p-bar"><span className="p-bar-track"><i style={{ width: `${(mean(m.cost) / MAX_COST) * 100}%` }} /></span><b>${range(m.cost, (x) => x.toFixed(2))}</b></span>
            <span>{range(m.seconds)} s</span>
            <span>{range(m.alone)} of {Q1_N}</span>
            <span className={m.complete ? "p-ok" : "p-bad"}>
              {m.complete ? `${QS.length} of ${QS.length} complete, all ${m.runs.length} runs` : "not complete in every run"}
            </span>
          </div>
        ))}
        <div className="p-ratio">{RATIO}× the cost · {TIME_RATIO}× the time{MINI_ROW.complete && BIG_ROW.complete ? " · the same contracts found" : ""}</div>
        <span className="p-foot">cost per run: reading and checking, list price × tokens, not an invoice · time measured in {TIMED} of {RUNS.length} runs</span>
      </Build>
      <Build at={2} className="p-verdict">
        Production stays on <b>{MINI}</b>. The test questions decide the next model.
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- guards (development only)
if (import.meta.env.DEV) {
  const gold = goldQueries.map((g) => g.id).join(",");
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const bothOff = STORED.find((r) => sameSet(r.off, ["checker", "clause_vocabulary"]));
  const miniAlone = runsOf(MINI).map((r) => r.aloneQ1);
  const problems = [
    QS.map((q) => q.id).join(",") !== gold && `stats has questions ${QS.map((q) => q.id)}, gold_queries.json has ${gold}`,
    QS.some((q) => !sameSet(q.expected, goldQueries.find((g) => g.id === q.id)?.expected ?? [])) && "expected answers differ from gold_queries.json",
    POOLED.found !== QS.reduce((n, q) => n + q.found.filter((d) => q.expected.includes(d)).length, 0) && "pooled 'found' is not the sum over the questions",
    POOLED.expected !== QS.reduce((n, q) => n + q.expected.length, 0) && "pooled 'expected' is not the sum over the questions",
    laptop.cost.cost_usd !== stats.cost.cost_usd && "stats.json and laptop.json are not the same register - the production run would be counted wrong",
    costLine(firstRun) === "" || costLine(firstRun) !== costLine(firstRunAblation)
      ? "the ablation report is not the register of 2026-10-29_extract-v2.txt - its 'model alone' number does not belong to that run" : false,
    RUNS.some((r) => !Number.isFinite(r.cost) || !Number.isFinite(r.aloneQ1) || r.model === "?") && "a stored run could not be read",
    RUNS.some((r) => r.reads !== DOCUMENTS) && `a counted run did not read all ${DOCUMENTS} documents once`,
    RUNS.some((r) => r.version !== stats.config.extraction[0].prompt_version) && "a counted run used another prompt version",
    MODELS.length !== 2 && `expected two models in the stored runs, found ${MODELS.join(", ")}`,
    !bothOff && "the stored what-if has no replay with the checker and the vocabulary check off",
    bothOff && !(Math.min(...miniAlone) <= q1Of(bothOff).recall[1] && q1Of(bothOff).recall[1] <= Math.max(...miniAlone))
      && "the small model's 'model alone' range on the cost card does not include the what-if replay with both checks off",
    SWITCHES.some((s) => !stored.layers.some((l) => l.id === s.id)) && "a switch on the what-if card is not a layer of eval/what_if.py",
    STORED.some((r) => q1Of(r).missed.some((d) => !r.changes.some((c) => c.doc_id === d && c.clause_type === Q1_CLAUSE)))
      && `Q1 is not about ${Q1_CLAUSE} in the stored replay`,
    !sameSet(SCENARIOS[2] ?? [], ["injection_guard"]) && "the notes of 'what-if' say build 3 turns off only the pattern check",
    !(sameSet(SCENARIOS[0] ?? [], ["checker"]) && sameSet(SCENARIOS[1] ?? [], ["checker", "clause_vocabulary"]))
      && "the notes of 'what-if' say build 1 turns off the second model call and build 2 the vocabulary check too",
    (q1Of(STORED[0]).missed.length > 0 || q1Of(STORED[1]).missed.length === 0)
      && "build 1 and note 1 of 'what-if' say the checks overlap: Q1 unchanged with the checker off, contracts lost with the vocabulary check off too",
    RUNS_COMPLETE !== RUNS.length && "the notes of 'results' say every stored run was complete",
    !(MINI_ROW.complete && BIG_ROW.complete) && "the notes of 'cost' say both models find every contract",
    STORED.some((r) => r.questions.some((q) => q.recall[0] !== 1)) && "the stored replay starts from a register that is not complete",
  ].filter(Boolean);
  for (const p of problems) console.error(`act 4 proof cards: ${p}`);
}

// ---------------------------------------------------------------- the cards
const S1 = q1Of(STORED[0]), S2 = q1Of(STORED[1]);
const SLIPPED = S2.missed.join(" and ");
const M14 = STORED[2].changes.find((c) => c.clause_type === Q1_CLAUSE);

export const RESULTS: Slide = {
  id: "results", act: 4, kind: "content", title: `${COMPLETE} of ${QS.length} questions complete – and how sure we can be.`, steps: 2, seconds: 30, Body: Results,
  notes: [
    `Did we find them? Every expected contract, no false alarm. In all ${RUNS.length} stored runs.`,
    `How sure are we? With only ${Q1_N} contracts, we might really find just ${Math.round(Q1.recall_lower_95 * 100)} percent. ${WEAKEST.expected.length} of ${WEAKEST.expected.length} says almost nothing.`,
    `All ${POOLED.expected} answers together: at least ${Math.round(POOLED.recall_lower_95 * 100)} percent. But only ${DISTINCT} contracts, and we tuned on them. Next: a sealed test set.`,
  ],
  words: [{ word: "expected", say: "ik-SPEK-tid" }, { word: "tuned", say: "TYOOND" }, { word: "sealed", say: "SEELD" }],
};

export const WHAT_IF: Slide = {
  id: "what-if", act: 4, kind: "content", title: "Switch a safeguard off – live.", steps: SCENARIOS.length, seconds: 45, Body: WhatIf,
  notes: [
    "Does every check earn its place? Let's switch them off. The stored model answers run again, on a copy. No model call, no cost.",
    `The second model call, off. Q1 still finds all ${Math.round(S1.recall[1] * S1.expected.length)}. ${SLIPPED} also fail the check on the clause's words. The checks overlap.`,
    `Now that check off too. ${SLIPPED} slip through, ${Math.round(S2.recall[1] * S2.expected.length)} of ${S2.expected.length}. And no lawyer would look at them.`,
    `Both checks back on. Now only the pattern check off: ${M14?.doc_id ?? "M14"} no longer goes to ${who(M14?.before.triage ?? null)}.`,
  ],
  words: [{ word: "overlap", say: "oh-ver-LAP" }],
};

export const COST: Slide = {
  id: "cost", act: 4, kind: "content", title: "A few cents to read everything – and the small model was enough on our tests.", steps: 2, seconds: 25, Body: Cost,
  notes: [
    `Reading all ${DOCUMENTS} contracts once cost ${Math.round(COST_ALL * 100)} cents. Each question is a lookup: no model call, zero.`,
    `A bigger model? ${BIG.toUpperCase()} costs ${RATIO} times more. Alone, it misses less. With our checks, both find every contract.`,
    "The small model stays. The test questions decide the next one.",
  ],
  words: [{ word: "GPT-4.1", say: "G-P-T four point one" }, { word: "lookup", say: "LOOK-up" }],
};
