// Every figure of the talk says what it shows, why it exists and why it looks the way it does
// (Dima's rule: diagrams are created AND justified). The justification sits under the figure,
// one click away, so it is there in the Q&A without crowding the slide.
import { ChevronDown16Regular, ChevronUp16Regular } from "@fluentui/react-icons";
import { useState, type ReactNode } from "react";

export interface FigureMeta {
  id: string;            // stable id, used by the diagram index
  title: string;
  shows: string;         // what the figure shows
  why: string;           // why it exists - the question it answers for Riverty
  looks: string;         // why it looks this way
  refs?: string;         // decisions and failure cases behind it, e.g. "decisions 4, 37 · F10"
}

export function Figure({ meta, children }: { meta: FigureMeta; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <figure className="fig" aria-labelledby={`fig-${meta.id}`}>
      <figcaption className="fig-title" id={`fig-${meta.id}`}>{meta.title}</figcaption>
      <div className="fig-body">{children}</div>
      <button type="button" className="fig-why-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <ChevronUp16Regular /> : <ChevronDown16Regular />} Why this figure
      </button>
      {open && (
        <dl className="fig-why">
          <dt>Shows</dt><dd>{meta.shows}</dd>
          <dt>Why it exists</dt><dd>{meta.why}</dd>
          <dt>Why it looks like this</dt><dd>{meta.looks}</dd>
          {meta.refs && <><dt>Behind it</dt><dd>{meta.refs}</dd></>}
        </dl>
      )}
    </figure>
  );
}

/** Content of a step: hidden (but keeping its place) until the step is reached with →. */
export function Step({ at, step, children }: { at: number; step: number; children: ReactNode }) {
  return <div className={step >= at ? "reveal on" : "reveal"} aria-hidden={step < at}>{children}</div>;
}
