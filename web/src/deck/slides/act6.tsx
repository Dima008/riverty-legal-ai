// Part 6 - the basic implementation, live (decision 90: the finale, after every outline bullet): a
// contract is added while the audience watches (the watcher reads data/inbox, the stand-in for
// SharePoint) and its problems appear; then the Legal Workbench itself; then the close.
import { useEffect, useRef, useState } from "react";
import makeHandwrittenPy from "../../../../tools/make_handwritten.py?raw";
import runPy from "../../../../pipeline/run.py?raw";
import queriesPy from "../../../../pipeline/queries.py?raw";
import { Build } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

const POLL_MS = 3000;
const WATCH_S = Number(/"--interval", type=int, default=(\d+)/.exec(runPy)?.[1]);    // the inbox watcher
const H01_YEAR = /"Datum: \d\d\.\d\d\.(\d{4})"/.exec(makeHandwrittenPy)?.[1];          // the date written on H01
const HANDWRITTEN = deck.ocr.handwritten;

// status = the document's own state after OCR (LOW_QUALITY = below the OCR threshold); doc_type
// stays null until the model call is stored - the findings are written in the same transaction
interface Doc { doc_id: string; doc_type: string | null; status: string; flags: string[] }
interface Finding { label: string; status: string; required: boolean }
interface FormerNames { open: number; resolved: number; not_ruled_out: boolean; reason: string | null }

/** Polls the register while the card is on screen: the first answer is the baseline, every
 *  document after that is "new". `tick` counts the answers, so the card can ask for details again.
 *  Needs `python -m pipeline.run --watch` running during the talk. */
function useNewDocuments() {
  const root = useRef<HTMLDivElement>(null);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [baseline, setBaseline] = useState<Set<string> | null>(null);
  const [offline, setOffline] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer = 0;
    let visible = false;
    const poll = () => {
      if (visible) {
        fetch("/api/documents").then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d: Doc[]) => {
          setOffline(false);
          setDocs(d);
          setBaseline((b) => b ?? new Set(d.map((x) => x.doc_id)));
          setTick((n) => n + 1);
        }).catch(() => setOffline(true));
      }
      timer = window.setTimeout(poll, POLL_MS);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (root.current) io.observe(root.current);
    poll();
    return () => { window.clearTimeout(timer); io.disconnect(); };
  }, []);
  const added = docs && baseline ? docs.filter((d) => !baseline.has(d.doc_id)) : [];
  return { root, count: docs?.length ?? null, added, offline, tick };
}

const short = (label: string) => label.replace(/\s*\(.*\)$/, "");   // "Data processing agreement (Art. 28 GDPR)"
// the order of the register card's columns (act 3), so the note can read the screen as it stands
const ORDER: string[] = deck.register.clauses;
const byRegister = (a: string, b: string) =>
  (ORDER.indexOf(a) + 1 || ORDER.length + 1) - (ORDER.indexOf(b) + 1 || ORDER.length + 1);

function LiveAdd() {
  const { root, count, added, offline, tick } = useNewDocuments();
  const newest = added[added.length - 1];
  const id = newest?.doc_id;
  const type = newest?.doc_type;
  const [findings, setFindings] = useState<Finding[]>([]);
  const [names, setNames] = useState<FormerNames | null>(null);
  // F20: the document row is written after OCR, its type and findings about 5 s later (after the
  // model call), the former-name check a moment after that (families step). So: nothing until the
  // type is there, then ask again with every poll - asking once per id saw an empty list for good.
  useEffect(() => { setFindings([]); setNames(null); }, [id]);
  useEffect(() => {
    if (!id || !type) return;
    let current = true;
    const get = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
    Promise.all([get(`/api/documents/${id}/findings`), get(`/api/documents/${id}`)])
      .then(([f, d]: [Finding[], { former_names?: FormerNames }]) => {
        if (current) { setFindings(f); setNames(d.former_names ?? null); }
      })
      .catch(() => {});    // the next poll asks again
    return () => { current = false; };
  }, [id, type, tick]);
  // recall first: not found and unclear are both shown - under their own words
  const required = findings.filter((f) => f.required);
  const notFound = required.filter((f) => f.status === "ABSENT").map((f) => short(f.label)).sort(byRegister);
  const unclear = required.filter((f) => f.status === "UNCLEAR").map((f) => short(f.label)).sort(byRegister);
  return (
    <div className="x-live" ref={root}>
      <div className="x-proc">
        <div className="x-proc-steps"><span className="x-box person">drop a contract into the folder</span></div>
        <div className="x-proc-steps"><span className="x-arrow">→</span><span className="x-box code">the watcher reads it, every {WATCH_S} s</span></div>
        <div className="x-proc-steps"><span className="x-arrow">→</span><span className="x-box store">in the register, with its findings</span></div>
        <span className="x-step-proof">The folder stands in for SharePoint.</span>
      </div>
      <div className="x-live-count">
        <div className={`n${added.length ? " bump" : ""}`}>{count ?? "–"}</div>
        <p>{offline ? <span className="x-off">register not reachable – start the API</span> : "documents in the register, live"}</p>
        <Build at={1} className="x-fact x-live-fact">
          {newest ? (
            <>
              <span className="x-fact-line"><b>{newest.doc_id}</b> is new · {type ? type.replace(/_/g, " ") : "the model is reading it …"}</span>
              {newest.status === "LOW_QUALITY" && <span className="x-fact-line bad">poor scan → a person</span>}
              {notFound.length > 0 && <span className="x-fact-line">not found: {notFound.join(", ")}</span>}
              {unclear.length > 0 && <span className="x-fact-line">unclear → a person: {unclear.join(", ")}</span>}
              {names?.not_ruled_out && <span className="x-fact-line bad">former name: cannot be ruled out – a person checks</span>}
              {newest.flags.some((f) => f.includes("injection")) && <span className="x-fact-line bad">hidden instruction → four eyes</span>}
            </>
          ) : "waiting for a new contract …"}
        </Build>
      </div>
    </div>
  );
}

if (import.meta.env.DEV) {
  const problems = [
    !(WATCH_S > 0) && "card 'live-add': the watcher's interval is no longer in pipeline/run.py",
    !H01_YEAR && "card 'live-add': the note says when H01 was written - tools/make_handwritten.py no longer has the date",
    !makeHandwrittenPy.includes("Arvato Financial Solutions") && "card 'live-add': the note speaks of H01's former name - the page no longer has one",
    !/phone photo/.test(makeHandwrittenPy.split("\n")[0] ?? "") && "card 'live-add': the note says H01 is made to look like a phone photo - tools/make_handwritten.py says otherwise",
    HANDWRITTEN.status !== "LOW_QUALITY" && `card 'live-add': the note calls ${HANDWRITTEN.doc_id} hard to read - its OCR is no longer below the threshold`,
    // the F19 rule the note relies on: no exact match on a poor scan proves nothing (decision 89)
    !queriesPy.includes('return doc_status == "LOW_QUALITY" and name_hits == 0') &&
      "card 'live-add': the note says an old name cannot be ruled out on a poor scan - pipeline/queries.py changed that rule",
  ].filter(Boolean);
  for (const p of problems) console.error(`part 6: ${p}`);
}

// The boxes are the click script: box N is step N of the note (guarded below).
const DEMO = ["Ask", "Confirm the plan", "Answer + coverage", "Evidence on the page", "Four eyes", "Archive copy"];
const PERSON = new Set(["Ask", "Confirm the plan", "Four eyes"]);
const NUMBER = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];

// The click script of the card 'live' (decision 88): Q1, rehearsed, and the handwritten contract of
// 'live-add' joins its answer. Ids from the register snapshot in deck-data.json; no scope numbers -
// while the handwritten page is in the register they change (docs/demo.md). M08 is the passage
// of the card 'checks', M14 the hidden instruction named on 'rag-fails' and 'human' (the deep dive
// 'injection' since decision 96; guarded below).
const Q1_ROWS = deck.register.rows.filter((r) => !r.copy_of);
const Q1_NOT_FOUND = Q1_ROWS.filter((r) => r.cells[0] === "ABSENT").map((r) => r.id);
const Q1_UNCLEAR = Q1_ROWS.filter((r) => r.cells[0] === "UNCLEAR").map((r) => r.id);
const COPY = deck.register.rows.find((r) => r.copy_of);
const EVIDENCE = "M08";
const FOUR_EYES = "M14";
const list = (ids: string[]) => ids.join(", ");

if (import.meta.env.DEV) {
  const problems = [
    !Q1_UNCLEAR.includes(EVIDENCE) && `card 'live': the script opens ${EVIDENCE} as an unclear finding - the register says otherwise`,
    !(EVIDENCE === "M08" && deck.m08.model_status === "PRESENT" && deck.m08.status === "UNCLEAR")
      && `card 'live': the note says the checks overruled the model on ${EVIDENCE} - the register says otherwise`,
    !(Q1_NOT_FOUND.includes(FOUR_EYES) && deck.m14.finding.status === "ABSENT") && `card 'live': the script reviews ${FOUR_EYES} as not found`,
    !deck.triage.four_eyes.some((s) => s.includes("injection")) && `card 'live': the script says ${FOUR_EYES} needs four eyes`,
    !COPY && "card 'live': the script says a copy is excluded - the register has none",
    HANDWRITTEN.status !== "LOW_QUALITY" && `card 'live': the script says ${HANDWRITTEN.doc_id} is a poor scan`,
  ].filter(Boolean);
  for (const p of problems) console.error(`part 6: ${p}`);
}

function Live() {
  return (
    <div>
      <div className="x-demo">
        {DEMO.map((d, i) => (
          <span key={d} style={{ display: "contents" }}>
            {i > 0 && <span className="x-arrow">→</span>}
            <span className={`x-box ${PERSON.has(d) ? "person" : "code"}`}>{d}</span>
          </span>
        ))}
      </div>
      <a className="x-cta" href="#/tool/workbench" data-no-advance>Open the Legal Workbench →</a>
    </div>
  );
}

function Close() {
  return (
    <div className="x-close">
      <ol className="needs">
        <li><span className="b on"><span className="n">1</span><span>Every contract is read – <em>provably</em>.</span></span></li>
        <li><span className="b on"><span className="n">2</span><span>Every finding shows the <em>passage</em> as evidence.</span></span></li>
        <li><span className="b on"><span className="n">3</span><span>A <em>lawyer</em> decides.</span></span></li>
      </ol>
      <div className="x-asks">
        Two questions for you: <b>Is a missed contract worse for Legal than a false alarm?</b> · <b>Who would pilot it?</b>
      </div>
    </div>
  );
}

export const ACT6: Slide[] = [
  {
    id: "part-6", act: 6, kind: "opener", title: "The basic implementation, live", steps: 0, seconds: 11,
    quote: [
      "Basic implementation demonstrating the foundation of the concept",
      "Anything else you feel is relevant to understanding your approach to solving the challenge",
    ],
    notes: ["Your second list: pipeline, front-end, the whole workflow. Then anything else: what I learned. Let me show you."],
    words: [{ word: "implementation", say: "im-pluh-men-TAY-shun" }],
  },
  {
    id: "live-add", act: 6, kind: "content", title: "A handwritten contract arrives – watch what is found.", steps: 1, seconds: 54, Body: LiveAdd,
    notes: [
      // b0 fills the wait: from the drop, 48 shows after 8-12 s and the findings after 14-15 s
      // (measured in Edge on a register copy, docs/demo.md) - the words after 'I copy it' take 13-15 s
      // H01 is rendered from handwriting fonts, with photo effects (tools/make_handwritten.py) - nobody
      // photographed it, so the note says it is made to look like a phone photo
      `Now live. You have handwritten contracts, only as JPEG. I made one: ${HANDWRITTEN.doc_id}, dated ${H01_YEAR}, made to look like a phone photo. ` +
        `I copy it into the folder, our stand-in for SharePoint. Watch the number. ` +
        `The watcher looks every ${WATCH_S} seconds. Then OCR reads the image, one model call, the checks: like M18.`,
      // F19 (decision 89): the former name is not found on this scan - the register says it cannot rule it out.
      // The poor scan itself is named, not "sent to a person": its findings go to one (panel design, 'Nicht sagen')
      `${deck.register.documents + 1} documents. Handwriting, hard to read: a poor scan. ` +
        "Not found: limitation of liability, data processing agreement. Consumer terms: unclear, a person looks. " +
        "Former name: cannot be ruled out on this scan, a person reads it.",
    ],
    words: [{ word: "handwritten", say: "HAND-rit-n" }, { word: "JPEG", say: "JAY-peg" }, { word: "watcher", say: "WOTCH-er" }, { word: "ruled out", say: "ROOLD out" }],
  },
  {
    id: "live", act: 6, kind: "content", title: "The Legal Workbench, live.", steps: 0, seconds: 115, Body: Live,
    notes: [
      // a click script: what to click, and what to say while it loads
      // what the Workbench shows for Q1 with H01 in the register (docs/demo.md): the tool opens on Ask with "1 new" in the
      // header and H01 in "New in the register"; the plan card names the check and "every merchant agreement"; Confirm the plan;
      // the answer has a tile per merchant agreement and the table "To look at", H01 first ('Not found · Poor scan · Review');
      // a tile or row opens step 3 (Decide) with the decision on the same screen
      // the task: "A basic front-end demonstrating how the solution can be used" + "Frontend written in React and TypeScript"
      "Now the tool for Legal, live. It is React and TypeScript, like these slides. It has seen the new contract too: " + `${HANDWRITTEN.doc_id}, new, a poor scan. ` +
        "One: I ask Q1. Which merchant agreements lack a limitation of liability? " +
        "Two: the plan. This check, on every merchant agreement. In the tool, nothing runs before I confirm it. " +
        `Three: the answer, with coverage. A tile for every merchant agreement, ${HANDWRITTEN.doc_id} too. ` +
        `${COPY?.id} is excluded as a copy, with the reason. Not found: ${list(Q1_NOT_FOUND)}. Unclear: ${list(Q1_UNCLEAR)}. ` +
        `And ${HANDWRITTEN.doc_id}, the handwritten one: not found. But it is a poor scan, so a person checks the page. ` +
        `Four: ${EVIDENCE}. The passage is highlighted on the page. The checks overruled the model. ` +
        `Five: ${FOUR_EYES} needs four eyes. Reviewer A approves. I switch to B, who approves too. ` +
        "Six: only now the archive copy, and only once. Then back to the talk.",
    ],
    words: [{ word: "Workbench", say: "WURK-bench" }, { word: "coverage", say: "KUV-er-ij" }, { word: "highlighted", say: "HY-ly-tid" },
      { word: "overruled", say: "oh-ver-ROOLD" }, { word: "archive", say: "AR-kyv" }],
  },
  {
    id: "close", act: 6, kind: "statement", title: "100 % traceable instead of 100 % accurate.", steps: 0, seconds: 36, Body: Close,
    notes: [
      // the task: "while learning and improving ourselves", "start a meaningful conversation"; the honest gap
      // list of CLAUDE.md (no Azure deployment, the planner has no model, handwriting needs a multimodal reader)
      "What I learned: no model is always right. So every contract is read, every answer traced to a page, and a lawyer decides. " +
        "Not built yet: the Azure platform, the SharePoint connector. Also a model that plans, and one that reads handwriting well. " +
        "Two questions. I assumed a missed contract hurts more than a false alarm. Right for Legal? And who would pilot it? Thank you.",
    ],
    words: [{ word: "traceable", say: "TRAY-suh-bul" }, { word: "accurate", say: "AK-yur-it" }, { word: "connector", say: "kuh-NEK-ter" }, { word: "assumed", say: "uh-SOOMD" }],
  },
];

// The boxes of the card 'live' are its click script: box N is step N of the note ("One:" ... "Six:"),
// no step without a box and no box without a step (development only).
if (import.meta.env.DEV) {
  const script = ACT6.find((s) => s.id === "live")?.notes.join(" ") ?? "";
  if (!DEMO.every((_, i) => script.includes(`${NUMBER[i]}:`)) || script.includes(`${NUMBER[DEMO.length]}:`)) {
    console.error(`part 6: card 'live' - the script's numbered steps are not the ${DEMO.length} boxes on the card`);
  }
}
