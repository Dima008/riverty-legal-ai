// Chapter 1 - The task, read closely. Riverty's own text, unchanged, with the sentences every
// requirement was derived from; then what one portfolio question costs today. The text is
// imported from docs/context/case-study.md, so there is one source.
import { Slider } from "@fluentui/react-components";
import { useState } from "react";
import caseStudy from "../../../../docs/context/case-study.md?raw";
import { Figure, Step, type FigureMeta } from "../Figure";
import type { ChapterProps } from "./index";
import "./task.css";

type Kind = "ask" | "constraint" | "hint";

interface Note {
  phrase: string;          // verbatim from the task text
  kind: Kind;
  requirement: string;     // what I derived from it
  built: string;           // what the prototype does about it
  refs: string;            // decisions and failure cases
}

const KIND_LABEL: Record<Kind, string> = { ask: "explicit ask", constraint: "constraint", hint: "hint between the lines" };

export const NOTES: Note[] = [
  { phrase: "they often fail due to the sheer size and complexity of the environments they have to operate in", kind: "hint",
    requirement: "Shrink and structure the environment before any model or agent works on it.",
    built: "Every contract is read once into a register; questions run on the register, not on 1,100 PDFs.",
    refs: "decisions 4, 37" },
  { phrase: "ensuring they comply with our corporate guidelines", kind: "ask",
    requirement: "Legal's guidelines become a versioned playbook – data that Legal owns, not code.",
    built: "pipeline/catalogue.py: clause definitions, where they are required, their vocabulary; a change is a new prompt version.",
    refs: "decisions 6, 40" },
  { phrase: "Some of them are scans of really old, handwritten contracts that exist only as JPEG files", kind: "constraint",
    requirement: "OCR with quality signals; refuse to run with the wrong language data; poor scans go to a person.",
    built: "Tesseract deu+eng with confidence per page; LOW_QUALITY caps the confidence; target: Content Understanding.",
    refs: "decisions 10, 44 · F2, F9" },
  { phrase: "You may solely use it to store an additional copy of a contract in a legally compliant manner", kind: "constraint",
    requirement: "The storage is write-only and never a data source; a copy only after approval, exactly once per file.",
    built: "Tool gate on the server (409 before approval), idempotent by SHA-256, every attempt audited.",
    refs: "decisions 2, 57, 71" },
  { phrase: "we evaluate best-of-breed solutions and what they offer", kind: "constraint",
    requirement: "An Azure target with the alternatives named, and local stand-ins behind the same interfaces.",
    built: "Architecture map: target vs prototype; buy the building blocks, build where Riverty's rules matter.",
    refs: "decisions 7, 11, 12, 25" },
  { phrase: "contracts that do not contain a certain text passage", kind: "ask",
    requirement: "Completeness: every contract is checked. Top-k retrieval can never prove that something is missing.",
    built: "Register queries over all contracts in scope, with coverage: checked, excluded and why.",
    refs: "decisions 5, 37 · F10" },
  { phrase: "contracts in which a company name needs to be updated", kind: "ask",
    requirement: "Every occurrence of a former name with its page – read together with amendments that already renamed it.",
    built: "Exact name hits from the text, resolved by amendments in the same contract family (M05 → M05-A).",
    refs: "UC3 · decisions 15, 51" },
  { phrase: "as long as we understand what is happening", kind: "hint",
    requirement: "Evidence for every finding; AI use shown openly, in the product and in my own work.",
    built: "Verified quote with the page highlighted, the checks it passed, 'model said' next to 'register says'.",
    refs: "decisions 6, 32, 39" },
  { phrase: "over 100 vendors on the inbound side and over 1,000 merchants on the outbound side", kind: "hint",
    requirement: "Two document families: data processing agreements (inbound) and merchant agreements (outbound).",
    built: "The test set is modelled on this: 20 merchant agreements, 6 data processing agreements, 20 public CUAD contracts.",
    refs: "decision 20" },
];

export const FIGURES: FigureMeta[] = [
  { id: "task-annotated", title: "The task, annotated",
    shows: "Riverty's task text, unchanged, with the sentences every requirement was derived from. Each opens its requirement, what was built and the decision behind it.",
    why: "It shows that the analysis started from Riverty's words, not from a favourite technology (decision 1).",
    looks: "An annotated document rather than a list of bullet points: Riverty's words stay primary and every requirement points to its source sentence – the same rule the product applies to findings.",
    refs: "decisions 1, 2, 4, 5, 6, 10, 20, 32, 37" },
  { id: "question-cost", title: "What one portfolio question costs today",
    shows: "Contracts × minutes per contract = hours per question, with both inputs as sliders.",
    why: "The lever is time saved (decision 14); the scale should be felt before the solution is shown.",
    looks: "Two sliders and one big number instead of a fixed figure, because both inputs are assumptions to be measured with Legal in the pilot – a precise-looking number would be dishonest.",
    refs: "decisions 3, 14" },
];

/** Blocks of the task from "Problem description" on: headings, paragraphs, bullet lists. */
function blocks(markdown: string): { type: "h" | "p" | "ul"; text: string[] }[] {
  const body = markdown.slice(markdown.indexOf("## Problem description"));
  return body.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
    if (b.startsWith("## ")) return { type: "h" as const, text: [b.slice(3)] };
    const clean = b.replace(/\*\*/g, "");
    if (clean.startsWith("- ")) return { type: "ul" as const, text: clean.split(/\r?\n- /).map((x) => x.replace(/^- /, "").replace(/\s*\r?\n\s*/g, " ")) };
    return { type: "p" as const, text: [clean.replace(/\s*\r?\n\s*/g, " ")] };
  });
}

/** A paragraph with the annotated phrases as buttons. */
function Marked({ text, active, onPick }: { text: string; active: number; onPick: (i: number) => void }) {
  const parts: (string | number)[] = [text];
  NOTES.forEach((n, i) => {
    for (let k = 0; k < parts.length; k++) {
      const part = parts[k];
      if (typeof part !== "string" || !part.includes(n.phrase)) continue;
      const [before, after] = [part.slice(0, part.indexOf(n.phrase)), part.slice(part.indexOf(n.phrase) + n.phrase.length)];
      parts.splice(k, 1, before, i, after);
      break;
    }
  });
  return (
    <>
      {parts.map((p, k) =>
        typeof p === "string" ? p : (
          <button key={k} type="button" className={`mark k-${NOTES[p].kind}${p === active ? " on" : ""}`} onClick={() => onPick(p)}>
            {NOTES[p].phrase}
          </button>
        ),
      )}
    </>
  );
}

export function Task({ step }: ChapterProps) {
  const [active, setActive] = useState(0);
  const [contracts, setContracts] = useState(1100);
  const [minutes, setMinutes] = useState(5);
  const note = NOTES[active];

  return (
    <div className="ch-task">
      <Step at={0} step={step}>
        <Figure meta={FIGURES[0]}>
          <div className="task-grid">
            <div className="task-paper" aria-label="Riverty's task, verbatim">
              {blocks(caseStudy).map((b, i) =>
                b.type === "h" ? <h4 key={i}>{b.text[0]}</h4>
                : b.type === "ul" ? <ul key={i}>{b.text.map((t) => <li key={t}><Marked text={t} active={active} onPick={setActive} /></li>)}</ul>
                : <p key={i}><Marked text={b.text[0]} active={active} onPick={setActive} /></p>,
              )}
            </div>
            <aside className="task-note" aria-live="polite">
              <div className={`note-kind k-${note.kind}`}>{KIND_LABEL[note.kind]} · {active + 1} of {NOTES.length}</div>
              <blockquote>“{note.phrase}”</blockquote>
              <dl>
                <dt>Requirement</dt><dd>{note.requirement}</dd>
                <dt>What I built</dt><dd>{note.built}</dd>
                <dt>Behind it</dt><dd>{note.refs}</dd>
              </dl>
              <div className="note-nav">
                {NOTES.map((n, i) => (
                  <button key={n.phrase} type="button" className={`note-dot k-${n.kind}${i === active ? " on" : ""}`}
                          aria-label={`Note ${i + 1}`} onClick={() => setActive(i)} />
                ))}
              </div>
            </aside>
          </div>
        </Figure>
      </Step>

      <Step at={1} step={step}>
        <Figure meta={FIGURES[1]}>
          <div className="cost-calc">
            <label>
              <span>Contracts in scope: <b>{contracts.toLocaleString("en")}</b></span>
              <Slider min={100} max={3000} step={50} value={contracts} onChange={(_, d) => setContracts(d.value)} />
            </label>
            <label>
              <span>Minutes per contract to open, search and note: <b>{minutes}</b></span>
              <Slider min={1} max={15} value={minutes} onChange={(_, d) => setMinutes(d.value)} />
            </label>
            <div className="cost-result">
              <span className="cost-hours">≈ {Math.round((contracts * minutes) / 60)} h</span>
              <span>per portfolio question, by hand – for every new question again</span>
            </div>
            <p className="note">
              Assumption, not a measurement: 1,100 contracts from Riverty's addendum (100+ vendors, 1,000+ merchants); the
              minutes per contract are measured with Legal in the first phase of the pilot.
            </p>
          </div>
        </Figure>
        <p className="anchor-line">Finding what is there is search. Proving what is missing needs every contract.</p>
      </Step>
    </div>
  );
}
