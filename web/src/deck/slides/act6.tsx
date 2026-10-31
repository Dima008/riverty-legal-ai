// Act 6 - live: a contract is added while the audience watches (the watcher reads data/inbox, the
// stand-in for SharePoint) and its problems appear; then the Legal Workbench itself; then the close.
import { useEffect, useRef, useState } from "react";
import { Build } from "../Build";
import type { Slide } from "../types";
import "./acts.css";

const POLL_MS = 3000;

interface Doc { doc_id: string; doc_type: string | null; flags: string[] }
interface Finding { label: string; status: string; required: boolean }

/** Polls the register while the card is on screen: the first answer is the baseline, every
 *  document after that is "new". Needs `python -m pipeline.run --watch` running during the talk. */
function useNewDocuments() {
  const root = useRef<HTMLDivElement>(null);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [baseline, setBaseline] = useState<Set<string> | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let timer = 0;
    let visible = false;
    const poll = () => {
      if (visible) {
        fetch("/api/documents").then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d: Doc[]) => {
          setOffline(false);
          setDocs(d);
          setBaseline((b) => b ?? new Set(d.map((x) => x.doc_id)));
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
  return { root, count: docs?.length ?? null, added, offline };
}

function LiveAdd() {
  const { root, count, added, offline } = useNewDocuments();
  const newest = added[added.length - 1];
  const [findings, setFindings] = useState<Finding[]>([]);
  useEffect(() => {
    if (!newest) return;
    fetch(`/api/documents/${newest.doc_id}/findings`).then((r) => r.json()).then(setFindings).catch(() => setFindings([]));
  }, [newest?.doc_id]);       // eslint-disable-line react-hooks/exhaustive-deps
  const missing = findings.filter((f) => f.required && f.status !== "PRESENT");
  return (
    <div className="x-live" ref={root}>
      <div className="x-proc">
        <div className="x-proc-steps"><span className="x-box person">drop a contract into the folder</span></div>
        <div className="x-proc-steps"><span className="x-arrow">→</span><span className="x-box code">the watcher reads it, every 5 s</span></div>
        <div className="x-proc-steps"><span className="x-arrow">→</span><span className="x-box store">in the register, with its findings</span></div>
        <span className="x-step-proof">The folder stands in for SharePoint – act 5 showed the real way in.</span>
      </div>
      <div className="x-live-count">
        <div className={`n${added.length ? " bump" : ""}`}>{count ?? "–"}</div>
        <p>{offline ? <span className="x-off">register not reachable – start the API</span> : "documents in the register, live"}</p>
        <Build at={1} className="x-fact" >
          {newest ? (
            <>
              <b>{newest.doc_id}</b> is new · {newest.doc_type?.replace(/_/g, " ") ?? "type unknown – a person checks"}
              {missing.length > 0 && <><br />not found: {missing.map((m) => m.label).join(", ")}</>}
              {newest.flags.some((f) => f.includes("injection")) && <><br /><span className="bad">hidden instruction → four eyes</span></>}
              {newest.flags.some((f) => f.includes("low_ocr") || f.includes("LOW_QUALITY")) && <><br /><span className="bad">poor scan → a person</span></>}
            </>
          ) : "waiting for a new contract …"}
        </Build>
      </div>
    </div>
  );
}

const DEMO = ["Ask", "Confirm the plan", "Check every contract", "Coverage", "Evidence on the page", "Four eyes", "Archive copy"];

function Live() {
  return (
    <div>
      <div className="x-demo">
        {DEMO.map((d, i) => (
          <span key={d} style={{ display: "contents" }}>
            {i > 0 && <span className="x-arrow">→</span>}
            <span className={`x-box ${d === "Four eyes" || d === "Ask" || d === "Confirm the plan" ? "person" : "code"}`}>{d}</span>
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
        Two questions for you: <b>Which error hurts Legal more – a false alarm or a missed contract?</b> And <b>who would pilot it?</b>
      </div>
    </div>
  );
}

export const ACT6: Slide[] = [
  {
    id: "act-6", act: 6, kind: "opener", title: "Live, and what I learned", steps: 0, seconds: 4,
    notes: ["Let me show you."],
  },
  {
    id: "live-add", act: 6, kind: "content", title: "Add a contract – and watch the problems being found.", steps: 1, seconds: 40, Body: LiveAdd,
    notes: [
      "Now live. I drop a new contract into the folder. In production this would be SharePoint. Watch the number.",
      "The watcher has read it. Here is what it found: the missing clauses, an old company name, or a hidden instruction for two people.",
    ],
    words: [{ word: "watcher", say: "WOTCH-er" }, { word: "production", say: "pruh-DUK-shun" }],
  },
  {
    id: "live", act: 6, kind: "content", title: "The Legal Workbench, live.", steps: 0, seconds: 70, Body: Live,
    notes: [
      "And this is the tool for Legal. I ask a question, confirm the plan, and every contract is checked. I see the coverage, the evidence on the page, and the four-eyes review. The archive copy only works after approval.",
    ],
    words: [{ word: "coverage", say: "KUV-er-ij" }, { word: "archive", say: "AR-kyv" }],
  },
  {
    id: "close", act: 6, kind: "statement", title: "100 % traceable instead of 100 % accurate.", steps: 0, seconds: 15, Body: Close,
    notes: [
      "No model is always right. But every answer here can be traced to a page. And a lawyer decides. Thank you. Two questions for you.",
    ],
    words: [{ word: "traceable", say: "TRAY-suh-bul" }, { word: "accurate", say: "AK-yur-it" }],
  },
];
