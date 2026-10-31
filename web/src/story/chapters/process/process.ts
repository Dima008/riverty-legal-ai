// The lawyers' process today (chapter 2) and tomorrow (chapter 4) as data for story/Flow.tsx.
// Both use the SAME lanes and the SAME grid: the question starts at column 0 of the lawyer lane
// and the answer ends at column 4 of the same lane in both. So when the figure switches from
// today to tomorrow, only what really changes moves - the eye does not have to re-learn it.
//
// The layout is chosen so that no arrow crosses a box:
// - today, the loop per contract runs open (SharePoint) -> Ctrl+F -> read (lawyer) -> note
//   (notes) -> back to open; the way back is a short vertical arrow;
// - tomorrow, "Contract files" sits where "Open next contract" sat, and "Review" sits where
//   "Read and judge" sat: the judgement stays at the same place, with the same person.
import type { FlowEdge, FlowNode } from "../../Flow";

/** One row per lane, top to bottom. "Register & tool" is empty today - that is the point. */
export const LANES = ["Lawyer", "Register & tool", "Notes & records", "SharePoint"];

// row numbers of the lanes, so the node lists below read like the figure
const LAWYER = 0;
const REGISTER = 1;
const RECORDS = 2;
const SHAREPOINT = 3;

export interface Process {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** Today: per question, every contract is opened, searched, read and noted by hand. */
export const AS_IS: Process = {
  nodes: [
    { id: "question", label: "A question arrives", sub: "e.g. which lack a cap?", col: 0, row: LAWYER, kind: "person" },
    { id: "open", label: "Open next contract", sub: "PDF, scan or JPEG", col: 1, row: SHAREPOINT, kind: "external" },
    { id: "find", label: "Ctrl+F the words", sub: "misses paraphrases", col: 2, row: SHAREPOINT, kind: "external" },
    { id: "read", label: "Read and judge", sub: "is it there or not?", col: 2, row: LAWYER, kind: "person", highlight: true },
    { id: "note", label: "Note the result", sub: "Excel or e-mail", col: 1, row: RECORDS, kind: "data" },
    { id: "none", label: "No register", sub: "starts from zero", col: 3, row: REGISTER, kind: "data", muted: true },
    { id: "answer", label: "Answer by hand", sub: "again for every question", col: 4, row: LAWYER, kind: "person" },
  ],
  edges: [
    { from: "question", to: "open" },
    // the loop per contract: dashed, and animated by the chapter's CSS
    { from: "open", to: "find", dashed: true },
    { from: "find", to: "read", dashed: true },
    { from: "read", to: "note", dashed: true },
    { from: "note", to: "open", dashed: true },
    { from: "read", to: "answer", label: "after the last contract" },
  ],
};

/** Tomorrow: the lawyer confirms a plan, the register answers for every contract, people judge. */
export const TO_BE: Process = {
  nodes: [
    { id: "question", label: "A question arrives", sub: "e.g. which lack a cap?", col: 0, row: LAWYER, kind: "person" },
    { id: "plan", label: "Confirm the plan", sub: "check · clause · scope", col: 1, row: LAWYER, kind: "person", highlight: true },
    { id: "check", label: "Check every contract", sub: "coverage, none dropped", col: 1, row: REGISTER, kind: "code" },
    { id: "files", label: "Contract files", sub: "read once, compiled", col: 1, row: SHAREPOINT, kind: "external" },
    { id: "triage", label: "Triage", sub: "routine · review · 4 eyes", col: 2, row: REGISTER, kind: "code" },
    { id: "review", label: "Review what needs it", sub: "four eyes if critical", col: 2, row: LAWYER, kind: "person", highlight: true },
    { id: "approve", label: "Approve", sub: "with a reason", col: 3, row: LAWYER, kind: "gate", highlight: true },
    { id: "archive", label: "Archive copy", sub: "once per file (SHA-256)", col: 3, row: RECORDS, kind: "external" },
    { id: "audit", label: "Audit log", sub: "who, when, why", col: 4, row: RECORDS, kind: "data" },
    { id: "answer", label: "Answer with evidence", sub: "quote and page per row", col: 4, row: LAWYER, kind: "person" },
  ],
  edges: [
    { from: "question", to: "plan" },
    { from: "plan", to: "check" },
    { from: "files", to: "check" },
    { from: "check", to: "triage" },
    { from: "triage", to: "review" },
    { from: "review", to: "approve" },
    { from: "approve", to: "answer" },
    { from: "approve", to: "archive" },
    { from: "archive", to: "audit" },
  ],
};
