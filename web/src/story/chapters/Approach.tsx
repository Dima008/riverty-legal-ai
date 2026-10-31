// Chapter 3 - How I worked. Three steps: the method (a Double Diamond filled with this project's
// real artefacts), the paper trail counted from the repository with every decision one click
// away, and how AI was used - drawn like the product's guardrail sandwich, because it is the same
// pattern: the prompt asks, the checks enforce. No API call: everything here is read from the
// repository when the site is built (approach/paper-trail.ts, approach/phases.ts).
import { Fragment, useState } from "react";
import gate from "../../../../eval/results/2026-10-30_extract-v2_laptop.json";
import { navigate } from "../../routing";
import { CHAPTERS } from "../chapters";
import { Figure, Step, type FigureMeta } from "../Figure";
import { Flow, type FlowEdge, type FlowNode } from "../Flow";
import { DECISIONS_EN } from "./approach/decisions-en";
import {
  AREA_EN, DECISIONS, DEV_STEPS, FAILURES, HOOK_RULES, isMainPoint, isProposal, PROMINENCE_EN, statusEn, TEST_FUNCTIONS,
} from "./approach/paper-trail";
import { PHASES } from "./approach/phases";
import type { ChapterProps } from "./index";
import "./approach.css";

export const FIGURES: FigureMeta[] = [
  { id: "approach-diamond", title: "Double Diamond, filled with this project's artefacts",
    shows: "The four phases – Discover, Define, Develop, Deliver – each with the artefacts this project actually produced, where they live, the decisions linked to them and the chapters of this talk that show them.",
    why: "Riverty assesses the approach. Filled with real artefacts the diamond is evidence, not decoration – and it shows that the problem was analysed before anything was built (decisions 1, 19).",
    looks: "The familiar diverge/converge shape costs no reading effort; the phase colours are the ones of the chapter rail. Decisions are counted only where they are linked to an artefact: the decision log has no phase field, so a count per phase would be invented.",
    refs: "decisions 1, 19" },
  { id: "approach-paper-trail", title: "The paper trail, counted from the repository",
    shows: "How many decisions, failure cases, development steps and test functions exist – counted from docs/context/decisions.md, docs/failure-cases.md, docs/dev-log.md and tests/ when the site is built – and the latest metric before → after.",
    why: "'Every decision documented' is a claim; a count read from the files is evidence. It also shows the uncomfortable column of the failure catalogue: the cases nobody caught at first.",
    looks: "Four counters, each with the rule behind it in small type, because a number alone says nothing about quality. Nothing is typed by hand, so the slide cannot drift from the repository.",
    refs: "decisions 46, 47, 59" },
  { id: "approach-decisions", title: "Every decision, one click away",
    shows: "All decisions as dots, ordered by number. Filled dots are main points of the talk, dashed ones are still proposals. A click shows area, status, reason and the rejected alternative – the German original, with an English title for the main points.",
    why: "It makes 'every decision with the alternative I rejected' checkable in the room, also for questions about decisions the talk does not cover.",
    looks: "Ordered by number rather than on a time axis, because the decision log has no dates and invented dates would contradict 'traceable'. The German text stays the original; translations exist only for the main points, so nothing is paraphrased silently.",
    refs: "decisions 32, 46, 47, 59" },
  { id: "approach-ai-loop", title: "How I used AI",
    shows: "My working loop: I set the goal and the rules, Claude drafts analysis, code and docs, enforced checks run on every commit, I review and can explain the result, and the decision is logged with its reason and the rejected alternative.",
    why: "Riverty welcomes AI 'as long as we understand what is happening'. The loop shows who did what – and that the rules for the AI are enforced by code, not only asked for in a prompt (decisions 32, 45, 47, 59).",
    looks: "The same boxes and colours as the product's flows, because it is the same pattern as the guardrail sandwich: a model proposes, deterministic checks enforce, a person decides (decision 9).",
    refs: "decisions 9, 32, 45, 47, 59" },
];

// ---------------------------------------------------------------- step 1: Double Diamond

/** The two diamonds as four triangles; text sits near each triangle's wide side. */
const TRIANGLES = [
  { points: "12,80 246,10 246,150", x: 168, mode: "diverge" },
  { points: "246,10 480,80 246,150", x: 324, mode: "converge" },
  { points: "480,80 714,10 714,150", x: 636, mode: "diverge" },
  { points: "714,10 948,80 714,150", x: 792, mode: "converge" },
];

function DoubleDiamond() {
  return (
    <div className="ap-dd-scroll">
      <svg className="ap-dd" viewBox="0 0 960 162" role="img"
           aria-label="Double Diamond: Discover and Define form the first diamond, from Riverty's task to the problem defined; Develop and Deliver form the second, from the problem to the Legal Workbench.">
        {PHASES.map((p, i) => (
          <g key={p.phase} className={`ap-dd-${p.phase.toLowerCase()}`}>
            <polygon points={TRIANGLES[i].points} />
            <text x={TRIANGLES[i].x} y={56} textAnchor="middle" className="ap-dd-mode">{TRIANGLES[i].mode}</text>
            <text x={TRIANGLES[i].x} y={80} textAnchor="middle" className="ap-dd-name">{p.phase}</text>
            <text x={TRIANGLES[i].x} y={99} textAnchor="middle" className="ap-dd-gist">{p.gist}</text>
          </g>
        ))}
        {[12, 480, 948].map((x) => <circle key={x} cx={x} cy={80} r={4.5} className="ap-dd-dot" />)}
        <text x={12} y={46} className="ap-dd-point">Riverty's task</text>
        <text x={480} y={120} textAnchor="middle" className="ap-dd-point">the problem, defined</text>
        <text x={948} y={46} textAnchor="end" className="ap-dd-point">Legal Workbench</text>
      </svg>
    </div>
  );
}

/** Decision numbers as small buttons; a click opens the decision in the explorer. */
function Refs({ ids, onOpen }: { ids: number[]; onOpen: (n: number) => void }) {
  return (
    <>
      {ids.map((n) => {
        const d = DECISIONS.find((x) => x.n === n);
        return (
          <button key={n} type="button" className="ap-ref" onClick={() => onOpen(n)}
                  title={d ? `Decision ${n}: ${DECISIONS_EN[n] ?? d.title}` : `Decision ${n}`}
                  aria-label={`Open decision ${n}`}>
            #{n}
          </button>
        );
      })}
    </>
  );
}

function PhaseCards({ onOpen }: { onOpen: (n: number) => void }) {
  const linkedTotal = new Set(PHASES.flatMap((p) => p.artefacts.flatMap((a) => a.decisions))).size;
  return (
    <>
      <div className="ap-phases">
        {PHASES.map((p) => {
          const linked = new Set(p.artefacts.flatMap((a) => a.decisions)).size;
          const shownIn = CHAPTERS.map((c, i) => ({ ...c, num: i + 1 })).filter((c) => c.phase === p.phase);
          return (
            <section key={p.phase} className={`ap-phase ap-ph-${p.phase.toLowerCase()}`} aria-label={p.phase}>
              <h3>{p.phase}</h3>
              <p className="ap-phase-q">{p.question}</p>
              <ul className="ap-arts">
                {p.artefacts.map((a) => (
                  <li key={a.title}>
                    <b>{a.title}</b>
                    <span>{a.detail}</span>
                    {a.list && (
                      <details>
                        <summary>{a.list.items.length} {a.list.label}</summary>
                        <ul>{a.list.items.map((item) => <li key={item}>{item}</li>)}</ul>
                      </details>
                    )}
                    <span className="ap-src">
                      <code>{a.source}</code>
                      <Refs ids={a.decisions} onOpen={onOpen} />
                    </span>
                  </li>
                ))}
              </ul>
              <footer className="ap-phase-foot">
                {linked} linked decisions · in this talk:{" "}
                {shownIn.map((c) => (
                  <a key={c.id} href={`#/story/${c.id}`} title={c.title} aria-label={`Chapter ${c.num}: ${c.title}`}>{c.num}</a>
                ))}
              </footer>
            </section>
          );
        })}
      </div>
      <p className="note">
        {linkedTotal} of {DECISIONS.length} decisions are linked to an artefact above; all {DECISIONS.length} are in the paper trail.
      </p>
    </>
  );
}

// ---------------------------------------------------------------- step 2: the paper trail

function Counts() {
  const main = DECISIONS.filter(isMainPoint).length;
  const proposals = DECISIONS.filter(isProposal).length;
  const complete = DECISIONS.filter((d) => d.reason && d.rejected).length;
  const nobody = FAILURES.filter((f) => f.caughtBy.startsWith("nobody at first")).length;
  const withMetric = DEV_STEPS.filter((s) => s.metric).length;
  const days = DEV_STEPS.map((s) => s.date).sort();
  const latest = DEV_STEPS[0];
  const tiles = [
    { value: DECISIONS.length, label: "decisions", source: "docs/context/decisions.md",
      sub: `${complete === DECISIONS.length ? "every one" : `${complete} of ${DECISIONS.length}`} with reason and rejected alternative · ${main} main points · ${proposals} still ${proposals === 1 ? "a proposal" : "proposals"}` },
    { value: FAILURES.length, label: "failure cases", source: "docs/failure-cases.md",
      sub: `${FAILURES[0]?.id}–${FAILURES.at(-1)?.id}, verbatim evidence recorded before the fix · ${nobody} caught by nobody at first` },
    { value: DEV_STEPS.length, label: "development steps", source: "docs/dev-log.md",
      sub: `${withMetric} of ${DEV_STEPS.length} with a metric before → after · ${days[0]} to ${days.at(-1)}` },
    { value: TEST_FUNCTIONS, label: "test functions", source: "tests/",
      sub: "pytest against the built register – invariants, not one model answer" },
  ];
  return (
    <>
      <ul className="ap-counts">
        {tiles.map((t) => (
          <li key={t.label} className="ap-count">
            <span className="ap-count-value">{t.value}</span>
            <span className="ap-count-label">{t.label}</span>
            <span className="ap-count-sub">{t.sub}</span>
            <code>{t.source}</code>
          </li>
        ))}
      </ul>
      {latest && (
        <blockquote className="ap-latest">
          <span className="ap-latest-head">Latest development step · {latest.date}</span>
          <b>{latest.title}</b>
          <span><i>Metric before → after:</i> {latest.metric}</span>
        </blockquote>
      )}
    </>
  );
}

/** The selected decision: English title for main points, the German original always. */
function DecisionCard({ n }: { n: number }) {
  const d = DECISIONS.find((x) => x.n === n);
  if (!d) return <div className="ap-card">Decision {n} is not in docs/context/decisions.md.</div>;
  const english = DECISIONS_EN[d.n];
  return (
    <article className="ap-card" aria-live="polite">
      <div className="ap-card-meta">
        Decision {d.n} · {AREA_EN[d.area] ?? d.area} · {statusEn(d.status)} · {PROMINENCE_EN[d.prominence] ?? d.prominence}
      </div>
      {english ? <h4 className="ap-card-title">{english}</h4>
        : <p className="ap-card-none">{isMainPoint(d) ? "No English title yet." : "English titles exist for the main points only."}</p>}
      <div className="ap-de">
        <span className="ap-de-label">German original</span>
        <p className="ap-de-title" lang="de">{d.title}</p>
        <dl>
          <dt>Reason</dt><dd lang="de">{d.reason}</dd>
          <dt>Rejected alternative</dt><dd lang="de">{d.rejected}</dd>
          {d.extra.map((line) => <Fragment key={line}><dt>Also noted</dt><dd lang="de">{line}</dd></Fragment>)}
        </dl>
      </div>
    </article>
  );
}

function DecisionExplorer({ picked, onPick }: { picked: number; onPick: (n: number) => void }) {
  const [area, setArea] = useState<string | null>(null);
  const count = (a: string) => DECISIONS.filter((d) => d.area === a).length;
  const areas = [...new Set(DECISIONS.map((d) => d.area))].sort((a, b) => count(b) - count(a));
  return (
    <div className="ap-explorer" id="ap-decisions">
      <div>
        <div className="ap-filter" role="group" aria-label="Show one area">
          <button type="button" aria-pressed={area === null} onClick={() => setArea(null)}>All {DECISIONS.length}</button>
          {areas.map((a) => (
            <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(area === a ? null : a)}>
              {AREA_EN[a] ?? a} {count(a)}
            </button>
          ))}
        </div>
        <ol className="ap-dots" aria-label="Decisions, ordered by number">
          {DECISIONS.map((d) => {
            const cls = ["ap-dot", isMainPoint(d) && "main", isProposal(d) && "proposal", area && d.area !== area && "dim", d.n === picked && "on"]
              .filter(Boolean).join(" ");
            return (
              <li key={d.n}>
                <button type="button" className={cls} aria-pressed={d.n === picked} onClick={() => onPick(d.n)}
                        aria-label={`Decision ${d.n}: ${AREA_EN[d.area] ?? d.area}, ${PROMINENCE_EN[d.prominence] ?? d.prominence}, ${statusEn(d.status)}`}>
                  {d.n}
                </button>
              </li>
            );
          })}
        </ol>
        <ul className="ap-dot-legend">
          <li><span className="ap-swatch main" aria-hidden /> main point of the talk</li>
          <li><span className="ap-swatch" aria-hidden /> mentioned briefly or on request</li>
          <li><span className="ap-swatch proposal" aria-hidden /> still a proposal</li>
        </ul>
      </div>
      <DecisionCard n={picked} />
    </div>
  );
}

// ---------------------------------------------------------------- step 3: how I used AI

// Laid out as a rectangle so every arrow leaves and enters a box on its own side.
const LOOP_NODES: FlowNode[] = [
  { id: "goal", label: "Dima sets the goal", sub: "priorities and rules", col: 0, row: 0, kind: "person" },
  { id: "draft", label: "Claude drafts", sub: "analysis, code, docs", col: 2, row: 0, kind: "model" },
  { id: "checks", label: "Enforced checks", sub: "hook, tests, evaluation", col: 4, row: 0, kind: "gate" },
  { id: "review", label: "Dima reviews", sub: "and can explain it", col: 4, row: 1, kind: "person" },
  { id: "log", label: "Decision logged", sub: "reason, rejected option", col: 0, row: 1, kind: "data" },
];
const LOOP_EDGES: FlowEdge[] = [
  { from: "goal", to: "draft", label: "the prompt asks (CLAUDE.md)" },
  { from: "draft", to: "checks", label: "the checks enforce" },
  { from: "checks", to: "review" },
  { from: "review", to: "log", label: "accepted" },
  { from: "log", to: "goal" },
];

// the project skills in .claude/skills/
const SKILLS = ["record-failure", "log-decision", "run-eval", "dev-log", "session-summary"];

function AiLoop({ onOpen }: { onOpen: (n: number) => void }) {
  const questions = gate.questions.map((q) => q.id);
  const recall = Math.min(...gate.questions.map((q) => q.recall));
  return (
    <>
      <div className="ap-loop-scroll">
        <Flow nodes={LOOP_NODES} edges={LOOP_EDGES}
              ariaLabel="How I used AI, as a loop: Dima sets the goal and the rules, Claude drafts analysis, code and docs, enforced checks run on every commit, Dima reviews and can explain the result, the decision is logged, and the next goal starts." />
      </div>
      <p className="ap-ai-who">
        Claude was my sparring partner and accelerator for analysis, research, drafts and code. Priorities, decisions and
        reviews are mine, and the AI's share stays visible in the git history as a co-author.
      </p>
      <ul className="ap-enforce" aria-label="What enforces the rules">
        <li>
          <b>Pre-commit hook</b><code>.githooks/pre-commit</code>
          {HOOK_RULES.map((rule) => <q key={rule}>{rule}</q>)}
          <span>A broken rule stops the commit – for people and AI alike.</span>
        </li>
        <li>
          <b>Tests</b><code>tests/</code>
          <span>{TEST_FUNCTIONS} test functions against the built register. They check invariants, not one model answer (F7).</span>
        </li>
        <li>
          <b>Evaluation gate</b><code>eval/check_register.py</code>
          <span>
            Recall {recall.toFixed(2)} on {questions[0]}–{questions.at(-1)} in the stored run of {gate.generated_at.slice(0, 10)}.
            Below 1.0 is recorded as a failure case.
          </span>
        </li>
        <li>
          <b>Project skills</b><code>.claude/skills/</code>
          <span>{SKILLS.join(", ")}: the same routine in every session – a failure recorded with verbatim evidence before the fix, a decision with its rejected alternative.</span>
        </li>
      </ul>
      <p className="ap-refs-line">Behind it: <Refs ids={[32, 45, 47, 59]} onOpen={onOpen} /></p>
    </>
  );
}

// ---------------------------------------------------------------- the chapter

export function Approach({ step }: ChapterProps) {
  const [picked, setPicked] = useState(46);   // start on decision 46: real failures are shown, not hidden

  // A decision number anywhere in the chapter opens it in the explorer (step 2) and scrolls there.
  const open = (n: number) => {
    setPicked(n);
    if (step < 1) navigate("/story/approach/1");
    requestAnimationFrame(() => document.getElementById("ap-decisions")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  return (
    <div className="ch-approach">
      <Step at={0} step={step}>
        <Figure meta={FIGURES[0]}>
          <DoubleDiamond />
          <PhaseCards onOpen={open} />
        </Figure>
      </Step>

      <Step at={1} step={step}>
        <Figure meta={FIGURES[1]}>
          <Counts />
        </Figure>
        <div className="ap-gap" />
        <Figure meta={FIGURES[2]}>
          <DecisionExplorer picked={picked} onPick={setPicked} />
        </Figure>
      </Step>

      <Step at={2} step={step}>
        <Figure meta={FIGURES[3]}>
          <AiLoop onOpen={open} />
        </Figure>
        <p className="anchor-line">The prompt asks, the checks enforce – applied to my own process.</p>
      </Step>
    </div>
  );
}
