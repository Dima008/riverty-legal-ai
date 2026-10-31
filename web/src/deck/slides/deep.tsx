// Deep dives (decision 78): cards after the close, outside the timed track. The presenter opens
// them from the overview (O) when a question comes. Numbers from deck-data.json and decisions 79/80.
import { Build } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

function Decoy() {
  const d = deck.embedding.decoy;
  const label: Record<string, string> = {
    "M02:008": "M02 · reworded cap", "M10:008": "M10 · indemnification – no cap", "M01:005": "M01 · fees",
    "M01:010": "M01 · termination", "M19:008": "M19 · real cap, in German",
  };
  return (
    <div>
      <p className="s-support" style={{ marginBottom: "2cqw" }}>Similarity to M01's section “{d.anchor_title}”:</p>
      <div className="x-table">
        {d.sims.map((s) => (
          <span key={s.id} style={{ display: "contents" }}>
            <span>{label[s.id] ?? s.id}</span>
            <span className={`v${s.id === "M10:008" ? " hi" : s.id === "M19:008" ? " ok" : ""}`}>{s.sim.toFixed(3)}</span>
          </span>
        ))}
      </div>
      <Build at={1} className="x-wide" >
        The clause <b>without</b> a cap sits closer than the real German cap. Vectors say what a passage is <b>about</b> – not
        whether it <b>is</b> a cap. The values only compare; the same template lifts them all.
      </Build>
    </div>
  );
}

function Chunking() {
  const m = deck.m09;
  const pct = (n: number) => `${(n / m.length) * 100}%`;
  return (
    <div>
      <div className="x-bar-name">Fixed size: every {m.fixed_size.toLocaleString("en")} characters</div>
      <div className="x-bar">
        {m.fixed.map((f, i) => (
          <div key={i} className="x-bar-seg" style={{ left: pct(f.start), width: pct(f.end - f.start), background: i % 2 ? "rgba(92,200,255,.18)" : "rgba(92,200,255,.32)" }}>part {i + 1}</div>
        ))}
        <div className="x-bar-mark" style={{ left: pct(m.page_break) }}><span>page break</span></div>
        <div className="x-bar-seg" style={{ left: pct(m.liability.start), width: pct(m.liability.end - m.liability.start), border: "0.2cqw solid var(--red)", background: "transparent" }} />
      </div>
      <Build at={1}>
        <div className="x-bar-name">At the headings: {m.sections.length} sections</div>
        <div className="x-bar">
          {m.sections.map((s, i) => (
            <div key={s.title} className="x-bar-seg" title={s.title}
                 style={{ left: pct(s.start), width: pct(s.end - s.start), background: s.title === m.liability.title ? "rgba(68,226,176,.45)" : i % 2 ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.12)" }}>
              {s.title === m.liability.title ? s.title : ""}
            </div>
          ))}
        </div>
      </Build>
      <Build at={2} className="x-wide">
        M09's “{m.liability.title}” runs across the page break. A cut every {m.fixed_size.toLocaleString("en")} characters splits it
        into two parts, and neither part holds the whole clause. Cutting at the headings keeps it whole.
      </Build>
    </div>
  );
}

const LAYERS = [
  { layer: "Read scans", who: "Content Understanding", ms: true },
  { layer: "Hidden instructions – second opinion", who: "Prompt Shields", ms: true },
  { layer: "Who may review and approve", who: "Entra ID roles", ms: true },
  { layer: "The quote is in the contract", who: "our code", ms: false },
  { layer: "The quote uses the clause's words", who: "our code (the playbook)", ms: false },
  { layer: "A second model call checks the first", who: "our code + Azure OpenAI", ms: false },
  { layer: "Triage and four eyes", who: "our code", ms: false },
];

function MsChecks() {
  const ps = deck.prompt_shields;
  return (
    <div className="x-two">
      <div className="x-az-list">
        {LAYERS.map((l) => (
          <div key={l.layer} className="x-az-row" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
            <span className="proto">{l.layer}</span><span className={l.ms ? "target" : "role"}>{l.who}</span>
          </div>
        ))}
      </div>
      <Build at={1} className="x-side">
        <div className="x-fact">Prompt Shields says only <b>yes or no</b> per document, without the position. So our pattern check stays for the highlight.</div>
        <div className="x-fact">Measured: {ps.flagged.length - 1} false alarm in {ps.chunks} passages ({ps.flagged.filter((f) => !f.startsWith("M14")).join(", ")}, data protection rules written as orders). A hit means <b>four eyes</b>, never a block.</div>
        <div className="x-fact">A full pass over the register: about <b>$0.33</b>.</div>
      </Build>
    </div>
  );
}

function GraphDetails() {
  return (
    <div className="x-sp-net" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="x-fact">A subscription on the library's root folder covers every file in it – changeType <b>updated</b> only, no file name.</div>
      <div className="x-fact">The <b>delta query</b> returns new, changed and deleted files and a token for next time.</div>
      <div className="x-fact">Lifetime at most <b>42,300 minutes</b> (under 30 days): renew it in time.</div>
      <div className="x-fact">The endpoint must answer the validation within <b>10 s</b>; a message counts only with an answer within <b>3 s</b>, then retries for up to 4 hours.</div>
      <Build at={1} className="x-fact">Least privilege: <b>Sites.Selected</b> – read rights on the one library, not on all of SharePoint.</Build>
      <Build at={1} className="x-fact">Prototype: the folder data/inbox, checked every 5 s – same interface, same pipeline.</Build>
    </div>
  );
}

export const DEEP: Slide[] = [
  {
    id: "deep-dives", act: 7, kind: "opener", title: "Deep dives – for your questions", steps: 0, seconds: 6, deep: true,
    notes: ["If you want to see a technique closer, I pick a card."],
  },
  {
    id: "decoy", act: 7, kind: "content", title: "Embeddings know the topic – not whether the clause is there.", steps: 1, seconds: 40, deep: true, Body: Decoy,
    notes: [
      "These are real similarities to M01's liability section. M10's indemnification clause has no cap, but it scores 0.805.",
      "M19's real cap, in German, scores only 0.746. Vectors say what a text is about. Whether it is a cap, the model and the checks decide.",
    ],
    words: [{ word: "indemnification", say: "in-dem-nih-fih-KAY-shun" }, { word: "similarity", say: "sim-ih-LAR-ih-tee" }],
  },
  {
    id: "chunking", act: 7, kind: "content", title: "Chunking: cut at the headings, not at a fixed length.", steps: 2, seconds: 40, deep: true, Body: Chunking,
    notes: [
      "A common way is to cut every 2,000 characters.",
      "We cut at the headings instead. Each clause stays one piece.",
      "In M09 the liability clause runs over the page break. A fixed cut splits it. Our sections keep it whole.",
    ],
    words: [{ word: "chunking", say: "CHUNK-ing" }, { word: "characters", say: "KAR-ik-terz" }],
  },
  {
    id: "ms-checks", act: 7, kind: "content", title: "Microsoft at the edges, our own checks in the middle.", steps: 1, seconds: 40, deep: true, Body: MsChecks,
    notes: [
      "Microsoft services do what they do best: reading scans, a second opinion on hidden instructions, and identity.",
      "Prompt Shields only says yes or no, without the position. So our own check stays. A hit means four eyes, never a block.",
    ],
    words: [{ word: "identity", say: "eye-DEN-tih-tee" }, { word: "Shields", say: "SHEELDZ" }],
  },
  {
    id: "graph-details", act: 7, kind: "content", title: "SharePoint in detail: subscription, delta query, safety net.", steps: 1, seconds: 40, deep: true, Body: GraphDetails,
    notes: [
      "The details from Microsoft's documentation. The subscription only wakes us up. The delta query tells us what changed. It must be renewed within 30 days.",
      "And we ask only for read rights on the one library.",
    ],
    words: [{ word: "subscription", say: "sub-SKRIP-shun" }, { word: "privilege", say: "PRIV-ih-lij" }],
  },
];
