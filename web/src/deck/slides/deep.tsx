// Deep dives (decision 78): cards after the close, outside the timed track. The presenter opens
// them from the overview (O) when a question comes. Numbers from deck-data.json and decisions 79/80.
import { useState } from "react";
import shieldsProbePy from "../../../../eval/prompt_shields_probe.py?raw";
import runPy from "../../../../pipeline/run.py?raw";
import { Build, useStep } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

// ---------------------------------------------------------------- each problem picked its technique
// Moved here from act 3 (decision 88): as a preview it put about nine terms on screen before the
// main track explained them. Every row's rejected alternative is also said on the main track
// (keywords: 'hard'; top-k and a free agent: act 2; the model's own confidence: 'checks'; automatic
// copies: 'human'). Amendments: renames are resolved today (Q2), clause changes are a known gap.
const CHOICES = [
  { problem: "Prove what is missing", tech: "Read every contract into a register", sub: "one table: every contract against Legal's playbook", not: "top-k search · a free agent" },
  { problem: "Scans and photos", tech: "OCR, page by page, with a confidence", sub: "Tesseract now · Content Understanding on Azure", not: "" },
  { problem: "Amendments", tech: "Read with their contract", sub: "names today, clause changes planned", not: "each file alone" },
  { problem: "Same clause, other words", tech: "A model reads against the playbook", sub: "the same definitions for every contract", not: "keywords" },
  { problem: "A model can be wrong", tech: "A quote we find + a second model call", sub: "", not: "the model's own confidence" },
  { problem: "Hidden instructions", tech: "A pattern check", sub: "next: Microsoft Prompt Shields", not: "" },
  { problem: "Lawyers decide", tech: "Triage · four eyes · approval gate", sub: "sorted by how sure we are; risky = two people", not: "automatic archive copies" },
];

function Choices() {
  return (
    <div className="x-choices">
      <div className="x-choice-head"><span>Problem</span><span /><span>Technique</span><span>Rejected</span></div>
      {CHOICES.map((c, i) => (
        <Build key={c.problem} at={i} className="x-choice">
          <span className="x-choice-problem">{c.problem}</span>
          <span className="x-arrow" aria-hidden>→</span>
          <span className="x-choice-tech">{c.tech}{c.sub && <small>{c.sub}</small>}</span>
          <span className="x-choice-not">{c.not ? <s>{c.not}</s> : "–"}</span>
        </Build>
      ))}
    </div>
  );
}

// The similarities the notes say: M10's clause without a cap, M19's real cap in German.
const DECOY = deck.embedding.decoy;
const SIM = (id: string) => DECOY.sims.find((s) => s.id === id)?.sim ?? NaN;
const DECOY_NO_CAP = SIM("M10:008"), DECOY_CAP = SIM("M19:008");

function Decoy() {
  const d = DECOY;
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
        The clause <b>without</b> a cap sits closer than the real German cap. Embeddings say what a passage is <b>about</b> – not
        whether it <b>is</b> a cap. The values only compare; my merchant agreements share one template, so all score high.
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

// The cost of one Prompt Shields pass over the register: Microsoft bills text records of up to 1,000
// characters; the price per 1,000 records is the one eval/prompt_shields_probe.py was measured with
// (decision 80), the characters are the probe's count of the register's passages (deck-data.json).
const SHIELDS_PRICE = Number(/\$([\d.]+) per 1,000 records/.exec(shieldsProbePy)?.[1]);
const SHIELDS_RECORDS = deck.prompt_shields.characters / 1000;
const SHIELDS_PASS_USD = (SHIELDS_RECORDS * SHIELDS_PRICE) / 1000;

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
        {SHIELDS_PASS_USD > 0 && <div className="x-fact">A full pass over the register: about <b>${SHIELDS_PASS_USD.toFixed(2)}</b>.</div>}
      </Build>
    </div>
  );
}

// In the words of the main track (decision 88): no "changeType", "token", "endpoint" or "least
// privilege". The Microsoft numbers are the verified ones of decision 79; the watcher's interval is
// read from pipeline/run.py, like on the card 'follow-m18'.
const WATCH_S = Number(/"--interval", type=int, default=(\d+)/.exec(runPy)?.[1]);

function GraphDetails() {
  return (
    <div className="x-sp-net" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="x-fact">A subscription on the library's root folder covers every file in it – only <b>“something changed”</b>, no file name.</div>
      <div className="x-fact">The <b>delta query</b> returns new, changed and deleted files – and a bookmark for next time.</div>
      <div className="x-fact">Lifetime at most <b>42,300 minutes</b> (under 30 days): renew it in time.</div>
      <div className="x-fact">Our address must answer Microsoft's test within <b>10 s</b>; a message counts only with an answer within <b>3 s</b>, then retries for up to 4 hours.</div>
      <Build at={1} className="x-fact">Read rights on the one library only (<b>Sites.Selected</b>) – not on all of SharePoint.</Build>
      <Build at={1} className="x-fact">Prototype: the folder data/inbox, checked every {WATCH_S} s – same interface, same pipeline.</Build>
    </div>
  );
}

// ---------------------------------------------------------------- OCR: a scan, word by word (M18)
// deck.ocr: M18 read again with the pipeline's settings, guarded against the stored pages, because
// the register keeps each word's box but not its confidence (tools/deck_data.py). Misreads are
// counted by aligning the OCR words with the source text. H01 (the handwritten page of the live
// demo, decision 82) comes from its measurement in eval/results: the demo reset removes it again.
const OCR = deck.ocr;
const OCR_P1 = OCR.pages[0];
const OCR_SURE = [...OCR.misread].sort((a, b) => b.conf - a.conf)[0];   // the most confident misread
const OCR_RING = new Set(OCR.misread.filter((m) => m.page === 1).map((m) => m.i));
const HW = OCR.handwritten;
const HW_PERSON = HW.status === "LOW_QUALITY";                          // below the threshold -> a person

function Ocr() {
  const step = useStep();
  const [image, setImage] = useState(true);
  return (
    <div className="x-ocr">
      <figure className="x-scan-wrap">
        <div className="x-scan" style={{ aspectRatio: `${OCR_P1.size[0]} / ${OCR_P1.size[1]}` }} role="img"
             aria-label={`${OCR.doc}, page 1: ${OCR_P1.words} word boxes found by OCR`}>
          {image && <img src={`/api/documents/${OCR.doc}/pages/1/image`} alt="" onError={() => setImage(false)} />}
          {OCR_P1.boxes.map(([l, t, w, h, c], i) => (
            <span key={i} style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
                  className={`x-wbox${step >= 1 ? (c < OCR.threshold ? " low" : " ok") : ""}${step >= 2 && OCR_RING.has(i) ? " ring" : ""}`} />
          ))}
        </div>
        <figcaption>{OCR.doc} · page 1 of {OCR.pages.length} · a scan: only an image, no text</figcaption>
      </figure>
      <div className="x-side">
        <div className="x-fact">
          <span className="big2">{OCR_P1.words} words</span>
          on page 1 – each with its box
        </div>
        <Build at={1} className="x-fact">
          <span className="x-sw low" /> below {OCR.threshold} % sure: <b>{OCR.low.length} words</b> in {OCR.doc}
          <br />average <b>{OCR.mean_conf.toFixed(0)} %</b> · below {OCR.threshold} % → a person checks
        </Build>
        <Build at={1} className="x-hand">
          <div><span className="x-tag built">measured</span> <b>{HW.doc_id}</b> (handwritten): <b>{HW.mean_conf.toFixed(0)} %</b>{HW_PERSON ? " → a person" : ""}</div>
          <div><span className="x-tag planned">planned</span> a model that reads images</div>
        </Build>
        <Build at={2} className="x-fact x-misread">
          OCR read <b className="x-said">“{OCR_SURE.word}”</b> – <span className="bad">{OCR_SURE.conf} % sure</span>
          <br />The page says <b>“{OCR_SURE.truth}”</b> · {OCR.misread.length} words with wrong letters in {OCR.doc}
        </Build>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- one model call, a fixed form
// deck.form: the strict JSON schema of pipeline/extract.py and M18's real answer (metadata.raw_json).
// Added after the call (clauses table): page and confidence by our code, the checker's verdict by a
// second model call - never by the extraction call itself. The model cites a section by its marker
// (S4); the card shows the section title the register stores for it.
const FORM = deck.form;
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")} …` : s);
const FORM_FOUND = FORM.clauses.find((c) => c.status === "PRESENT" && c.quote && c.section)!;
const FORM_CAP = FORM.clauses.find((c) => c.key === "liability_limitation")!;
const FORM_SECTION_NO = FORM_FOUND.section!.split(" ")[0].replace(/\.$/, "");   // "3. Checkout-…" -> "3"
const FORM_FOUND_LABEL = FORM_FOUND.label.replace(/ \(.*\)$/, "");                // "Consumer terms in checkout"
// the statuses in the main track's words, not the schema's enum
const SAID: Record<string, string> = { PRESENT: "found", ABSENT: "not found", UNCLEAR: "unclear" };
const said = (status: string) => SAID[status] ?? status;

function FixedForm() {
  const step = useStep();
  const f = FORM.facts;
  const facts: [string, string[]][] = [
    ["type", [f.doc_type.replace(/_/g, " ")]], ["parties", f.parties], ["date", [f.effective_date]],
    ["law", [f.governing_law]], ["amendment", [f.is_amendment ? "yes" : "no"]],
  ];
  const added = step >= 2 ? " on" : "";
  const hide = step >= 1 ? "" : "x-form-hide";       // the answer is laid out from the start, so nothing jumps
  // the card shows the quote of the found clause and the reason of the liability cap; the other
  // reasons are in the form too, the note does not need them
  const text = (c: (typeof FORM.clauses)[number]) =>
    c.key === FORM_FOUND.key ? <q>“{cut(c.quote!, 64)}”</q> : c.key === FORM_CAP.key ? <i>{cut(c.rationale, 62)}</i> : <span className="x-form-dim">a reason</span>;
  return (
    <div className="x-form">
      <div className="x-form-top">
        <div className="x-form-facts">
          {facts.map(([k, v]) => <div key={k}><span>{k}</span>{v.map((line, i) => <b key={i} className={hide}>{line}</b>)}</div>)}
        </div>
        {FORM.strict && <span className="x-tag built">a fixed form (JSON schema)</span>}
      </div>
      <div className="x-form-row head">
        <span>Clause</span>
        <span>Status<small>{FORM.statuses.map(said).join(" · ")}</small></span>
        <span>Section</span>
        <span>Quote – or the reason</span>
        <span className={`x-form-code${added}`}>Added after the call<small>page, confidence (our code)</small><small>checker (a 2nd model call)</small></span>
      </div>
      {FORM.clauses.map((c) => (
        <div key={c.key} className="x-form-row">
          <span className="x-form-clause">{c.label.replace(/ \(.*\)$/, "")}</span>
          <span className={`x-form-slot${step >= 1 ? ` x-form-${c.status}` : ""}`}><span className={hide}>{said(c.status)}</span></span>
          <span className="x-form-slot"><span className={`x-form-sec ${hide}`}>{c.section ?? "–"}</span></span>
          <span className="x-form-slot text"><span className={hide}>{text(c)}</span></span>
          <span className={`x-form-code${added}`}>
            <span>{c.page ? `page ${c.page}` : "no page"} · {c.confidence.toFixed(2)}</span>
            {c.checker === "checker_agreed" && <span>checker ✓</span>}
          </span>
        </div>
      ))}
      <div className="x-form-foot">
        <Build at={2} className="inline"><b>{FORM.extract_calls} model calls</b> to read {FORM.documents} contracts – one each</Build>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- agent building blocks, no free agent
// deck.patterns: the fixed check list (pipeline/portfolio.py), the checker's numbers from the
// clauses table and llm_calls, Q1's triage (run without storing anything).
const PAT = deck.patterns;
const TRIAGE = PAT.q1.triage as Record<string, number>;
// every Q1 row needs a person (api/review.py): REVIEW one lawyer, FOUR_EYES two, the CONFIRM rows one
// click for all of them (batch), with a random spot-check sample (pipeline/portfolio.py)
const TO_LAWYER = (TRIAGE.REVIEW ?? 0) + (TRIAGE.FOUR_EYES ?? 0);

// name + one line each; what each building block does, the speaker says (notes). "Building blocks",
// not "patterns": the main track's "pattern check" is the injection check (decision 88).
const PATTERNS = [
  { at: 0, name: "Plan first", data: <><b>{PAT.checks.length} fixed check types</b> – a plan can only pick one</> },
  { at: 0, name: "Maker and checker",
    data: <><b>{PAT.found_by_model} checked → {PAT.checker_rejected.length} overruled</b> · {PAT.checker_calls} calls · ${PAT.checker_cost.toFixed(3)}</> },
  { at: 1, name: "Tool behind a gate",
    data: <>the only outside action: a copy into the contract storage<br /><b>refused before approval</b> · once per file</> },
  { at: 1, name: "A person decides",
    data: <>triage decides how closely a lawyer looks<br /><b className="nw">{PAT.q1.id}: {TRIAGE.CONFIRM ?? 0} confirm · {TRIAGE.REVIEW ?? 0} review · {TRIAGE.FOUR_EYES ?? 0}{" "}four{" "}eyes</b></> },
];

function AgentPatterns() {
  return (
    <div className="x-pats">
      <div className="x-key">Code fixes the order. The AI fills forms – it never picks the next step.</div>
      <div className="x-pat-grid">
        {PATTERNS.map((p, i) => (
          <Build key={p.name} at={p.at} className="x-pat">
            <span className="x-pat-n">{i + 1}</span>
            <span className="x-pat-name">{p.name}</span>
            <span className="x-tag built">built</span>
            <span className="x-pat-data">{p.data}</span>
          </Build>
        ))}
      </div>
      <Build at={2} className="x-wide">
        <span className="x-tag planned">planned</span>{" "}
        a planner that uses a model · <b>Microsoft Agent Framework</b> · the tools via <b>MCP</b> – a standard plug that gives a model its tools
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- hybrid search, merged by rank
// deck.hybrid: one real query through pipeline/search.py (explain=True): the keyword list (BM25),
// the meaning list (cosine similarity) and both merged with Reciprocal Rank Fusion. Rows show the
// contract and the value; a section title only where it carries the point (found only by meaning).
const HY = deck.hybrid;
const HY_KW = new Set(HY.keywords.map((x) => x.id));
const HY_EXTRA = HY.meaning.filter((x) => !HY_KW.has(x.id));          // found only by meaning
const HY_IN_ALL = HY.terms.filter((t) => HY.keywords.every((x) => x.words.includes(t)));     // "damages"
const HY_IN_NONE = HY.terms.filter((t) => HY.keywords.every((x) => !x.words.includes(t)));   // "cap"
const HY_SCOPE = `${HY.filter.doc_type.replace(/_/g, " ")}s`;                                // "merchant agreements"
const ROW = 2.2, GAP = 0.25, LINK = 4;                                   // cqw: row height, row gap, link column
const rowY = (i: number) => i * (ROW + GAP) + ROW / 2;
const HY_ROWS = Math.max(HY.keywords.length, HY.meaning.length, HY.merged.length);
const HY_H = HY_ROWS * ROW + (HY_ROWS - 1) * GAP;

/** Lines between the same passage in two neighbouring lists (in cqw, like the rows). */
function Links({ from, to, col, on }: { from: { id: string }[]; to: { id: string }[]; col: number; on: boolean }) {
  return (
    <svg className={`x-hs-links${on ? " on" : ""}`} viewBox={`0 0 ${LINK} ${HY_H}`} preserveAspectRatio="none" aria-hidden
         style={{ gridColumn: col, gridRow: `2 / span ${HY_ROWS}`, height: `${HY_H}cqw` }}>
      {from.map((a, i) => {
        const j = to.findIndex((b) => b.id === a.id);
        return j < 0 ? null : <line key={a.id} x1={0} y1={rowY(i)} x2={LINK} y2={rowY(j)} className={HY_KW.has(a.id) ? "both" : ""} />;
      })}
    </svg>
  );
}

function HybridSearch() {
  const step = useStep();
  const cell = (x: { id: string; doc: string; title: string }, value: string, col: number, row: number, off = false) => (
    <div key={`${col}-${x.id}`} className={`x-hs-item${HY_KW.has(x.id) ? " both" : ""}${off ? " off" : ""}`}
         style={{ gridColumn: col, gridRow: row + 2 }}>
      <b>{x.doc}</b><span>{HY_KW.has(x.id) ? "" : x.title.replace(/^\d+\.\s*/, "")}</span><span className="v">{value}</span>
    </div>
  );
  const nought = (n: number, digits: number) => n.toFixed(digits).replace(/^0/, "");
  return (
    <div className="x-hs">
      <div className="x-hs-q">
        <span>I ask: <b>“{HY.query}”</b> · the top {HY.k} of {HY.passages} passages in {HY.contracts} {HY_SCOPE}</span>
        <span className="x-hs-key"><i className="both" />in both lists<i />only by meaning</span>
      </div>
      <div className="x-hs-grid" style={{ gridTemplateRows: `auto repeat(${HY_ROWS}, ${ROW}cqw)`, rowGap: `${GAP}cqw` }}>
        <div className="x-hs-head" style={{ gridColumn: 1 }}>Keywords<small>{HY.keywords.length} passages with “{HY_IN_ALL[0]}” – none with “{HY_IN_NONE[0]}”</small></div>
        <div className="x-hs-head" style={{ gridColumn: 3 }}>Meaning<small>embeddings · similarity</small></div>
        <div className={`x-hs-head merged${step < 1 ? " off" : ""}`} style={{ gridColumn: 5 }}>Merged by rank<small>1 / ({HY.rrf_k} + rank) per list, added</small></div>
        {HY.keywords.map((x, i) => cell(x, `#${i + 1}`, 1, i))}
        {HY.meaning.map((x, i) => cell(x, nought(x.sim, 3), 3, i))}
        {HY.merged.map((x, i) => cell(x, nought(x.score, 4), 5, i, step < 1))}
        <Links from={HY.keywords} to={HY.meaning} col={2} on={step >= 1} />
        <Links from={HY.meaning} to={HY.merged} col={4} on={step >= 1} />
      </div>
      <Build at={2} className="x-wide">
        <span className="x-tag planned">planned</span>{" "}
        a reranker – a second model that re-sorts the best hits · a test set · <b>Azure AI Search</b> – never for “which contracts lack …”
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- guards (development only)
if (import.meta.env.DEV) {
  const problems = [
    !(SHIELDS_PASS_USD > 0) && "card 'ms-checks': the Prompt Shields price per 1,000 records is no longer in eval/prompt_shields_probe.py",
    FORM.most_calls_per_document !== 1 && `a document needed ${FORM.most_calls_per_document} extraction calls - "one model call per contract" is wrong`,
    FORM.extract_calls !== FORM.documents && `${FORM.extract_calls} model calls to read ${FORM.documents} documents - card 'fixed-form' says one each`,
    PAT.checker_calls !== PAT.checked_contracts
      && `${PAT.checker_calls} checker calls for ${PAT.checked_contracts} contracts with a found clause - note 0 of 'agent-patterns' says one per contract`,
    !(DECOY_NO_CAP > DECOY_CAP) && "card 'decoy': the clause without a cap no longer scores higher than M19's real cap",
    !(WATCH_S > 0) && "card 'graph-details': the watcher's interval is no longer in pipeline/run.py",
    !FORM.strict && "the extraction call is no longer strict",
    !OCR_SURE && "OCR misread nothing on M18 - card 'ocr' build 2 has no example",
    HY_EXTRA.length === 0 && "hybrid search: meaning found nothing the keywords missed",
    (HY_IN_ALL.length !== 1 || HY_IN_NONE.length !== 1) && "hybrid search: the keyword hits no longer share one query word and miss the other - fix the 'Keywords' line and note 0",
    FORM.longest_chars > FORM.single_pass_chars && `a contract has ${FORM.longest_chars} characters - it is read in parts, "none here" in note 2 of 'fixed-form' is wrong`,
    !HW_PERSON && `${HW.doc_id} is no longer below the OCR threshold - card 'ocr' says "a person"`,
  ].filter(Boolean);
  for (const p of problems) console.error(`deep dives: ${p}`);
}

export const DEEP: Slide[] = [
  {
    id: "deep-dives", act: 7, kind: "opener", title: "Deep dives – for your questions", steps: 0, seconds: 6, deep: true,
    notes: ["If you want to see a technique closer, I pick a card."],
  },
  {
    id: "choices", act: 7, kind: "content", title: "Each problem picked its technique.", steps: 6, seconds: 45, deep: true, Body: Choices,
    notes: [
      "Each problem picked its technique. Prove what is missing: read every contract into the register.",
      "Scans: OCR reads each page, with a confidence.",
      "Amendments: read with their contract. Old names work today; clause changes are planned.",
      "Other words: the model reads against the playbook. Keywords miss M02.",
      "Models can be wrong: a quote we find, and a second model call.",
      "Hidden instructions: a pattern check, next Microsoft Prompt Shields.",
      "Lawyers decide: triage. Unclear goes to one lawyer, risky to two – four eyes.",
    ],
    words: [{ word: "technique", say: "tek-NEEK" }, { word: "playbook", say: "PLAY-book" }, { word: "triage", say: "TREE-ahzh" }],
  },
  {
    id: "decoy", act: 7, kind: "content", title: "Embeddings know the topic – not whether the clause is there.", steps: 1, seconds: 40, deep: true, Body: Decoy,
    notes: [
      `These are real similarities to M01's liability section. M10's indemnification clause has no cap, but it scores ${DECOY_NO_CAP.toFixed(3)}.`,
      `M19's real cap, in German, scores only ${DECOY_CAP.toFixed(3)}. Embeddings say what a text is about. Whether it is a cap, the model and the checks decide.`,
    ],
    words: [{ word: "indemnification", say: "in-dem-nih-fih-KAY-shun" }, { word: "similarity", say: "sim-ih-LAR-ih-tee" }],
  },
  {
    id: "chunking", act: 7, kind: "content", title: "Chunking: cut at the headings, not at a fixed length.", steps: 2, seconds: 40, deep: true, Body: Chunking,
    notes: [
      `A common way is to cut every ${deck.m09.fixed_size.toLocaleString("en")} characters. Cutting a contract into passages is called chunking.`,
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
      "The details from Microsoft's documentation. The subscription only wakes us up. The delta query tells us what changed. The subscription must be renewed within 30 days.",
      "And we ask only for read rights on the one library.",
    ],
    words: [{ word: "subscription", say: "sub-SKRIP-shun" }, { word: "Sites.Selected", say: "sites dot seh-LEK-tid" }],
  },
  {
    id: "ocr", act: 7, kind: "content", title: "OCR reads a scan word by word – its confidence is a hint, not proof.", steps: 2, seconds: 45, deep: true, Body: Ocr,
    notes: [
      `Page one of ${OCR.doc}, a scan. OCR found ${OCR_P1.words} words. Each box is one word with its position. So we can highlight evidence on a scan.`,
      `Each word gets a confidence. Red is below ${OCR.threshold} percent: ${OCR.low.length} words in ${OCR.doc}. Below ${OCR.threshold} on average, a person checks the scan. ` +
        `Like ${HW.doc_id}, the handwritten contract you saw live: ${HW.mean_conf.toFixed(0)} percent. A model that reads images is planned.`,
      `But confidence is a hint, not proof. OCR lost the umlaut in ${OCR_SURE.truth}, ${OCR_SURE.conf} percent sure. ${OCR.misread.length} words have wrong letters.`,
    ],
    words: [{ word: "OCR", say: "oh-see-AR" }, { word: "confidence", say: "KON-fih-dence" }, { word: "umlaut", say: "OOM-lowt" },
            { word: OCR_SURE.truth ?? "Händlers", say: "HEND-lers" }],
  },
  {
    id: "fixed-form", act: 7, kind: "content", title: "One model call per contract fills a fixed form.", steps: 2, seconds: 40, deep: true, Body: FixedForm,
    notes: [
      "The model fills a fixed form, a JSON schema: per clause found, not found or unclear, a section, a quote, a reason – nothing else.",
      `This is ${FORM.doc}'s real answer. Liability cap: ${FORM_CAP.status === "ABSENT" ? "not found" : FORM_CAP.status === "PRESENT" ? "found" : "unclear"}, with a reason. ` +
        `${FORM_FOUND_LABEL}: found, with a quote from section ${FORM_SECTION_NO}.`,
      `Then our code adds page and confidence; a second model call checks each found clause. ${FORM.documents} contracts, ${FORM.extract_calls} calls to read them. ` +
        `Over ${FORM.single_pass_chars.toLocaleString("en")} characters, a contract is read in parts – none here.`,
    ],
    words: [{ word: "schema", say: "SKEE-muh" }, { word: "JSON", say: "JAY-sun" }, { word: "characters", say: "KAR-ik-terz" }],
  },
  {
    id: "agent-patterns", act: 7, kind: "content", title: "Agent building blocks, each with one job – but no free agent.", steps: 2, seconds: 50, deep: true, Body: AgentPatterns,
    notes: [
      "Code fixes the order. One: plan first – the lawyer confirms it. Two: maker and checker: a second call checks every “found” – " +
        `${PAT.checker_calls} calls, one per contract, each for all its found clauses. It overruled ${PAT.checker_rejected.length} of ${PAT.found_by_model}.`,
      "Three: a tool behind a gate – the archive copy needs approval and runs once. Four: a person decides. " +
        `In ${PAT.q1.id} a lawyer opens ${TO_LAWYER} of ${PAT.q1.reported} – ${TRIAGE.FOUR_EYES === 1 ? "one" : TRIAGE.FOUR_EYES} with four eyes; ` +
        `${TRIAGE.CONFIRM} sure ones: one click, with a spot check.`,
      "Honestly: the planner has no model yet. Agent Framework and MCP – a standard plug that gives a model its tools: planned, not built.",
    ],
    words: [{ word: "overruled", say: "oh-ver-ROOLD" }, { word: "MCP", say: "em-see-PEE" }, { word: "plug", say: "PLUG" }],
  },
  {
    id: "hybrid-search", act: 7, kind: "content", title: "Open questions: keywords and meaning, merged.", steps: 2, seconds: 40, deep: true, Body: HybridSearch,
    notes: [
      `For open questions we search. I ask: ${HY.query}. Keywords find ${HY.keywords.length} passages with the word ${HY_IN_ALL[0]} – none says ${HY_IN_NONE[0]}. ` +
        `Embeddings find the meaning: also ${HY_EXTRA[0]?.doc}'s German cap, and caps called liability.`,
      "We merge both lists by rank, not by score: what both found comes first. That is hybrid search – built.",
      "Still open: a reranker – a second model that re-sorts the best hits – and a test set. On Azure: AI Search. Never for which contracts lack a clause.",
    ],
    words: [{ word: "hybrid", say: "HY-brid" }, { word: "reranker", say: "ree-RANK-er" }, { word: "damages", say: "DAM-ih-jiz" }],
  },
];
