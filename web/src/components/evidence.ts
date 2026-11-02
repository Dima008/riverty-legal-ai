// Loading the evidence for one contract of an answer: the document, the finding, the boxes on the page and
// the document alerts. Shared by the Workbench and the contract file, so both draw the same passage the
// same way. Three looks on the page (decision 95, spec 2.4): "ev" = checked evidence (yellow fill),
// "look" = look here, not evidence (a dashed orange outline: a passage the checks rejected, a hint, a law
// quote that failed its check), "suspect" = text addressed to AI systems (red, never evidence).
// Every optional call degrades: if a marking cannot be loaded, the page, the card and the decision still
// show, and the page says so (F40).
import { api, type DocText, type DocumentInfo, type Finding, type Highlight, type Run, type RunRow, type UnreportedRow } from "../api";
import { documentAlerts, suspectHighlight, type Alert } from "./SafetyBar";

export type Look = "ev" | "look" | "suspect";

/** Where the passage is in the text: a plain-text contract (no page image) marks it there. */
export interface Span {
  start: number | null;
  end: number | null;
}

export interface Loaded {
  doc: DocumentInfo;
  finding: Finding | null;
  boxes: Record<number, number[][]>;
  span: Span;
  hint: string | null;          // what is marked, English (PageView translates it)
  look: Look;
  text: DocText | null;
  firstPage: number;
  alerts: Alert[];
  markFailed: boolean;          // a marking could not be loaded: the page is shown without it
}

const NONE: Highlight = { kind: "none", char_start: null, char_end: null, coverage: 0, pages: [] };

/** Boxes for one clause finding: its quote, or the passage that hints at a missing clause. A quote is
 *  evidence only when the register says Found (it passed every check); a quote the checks rejected and a
 *  hint are "look here" (spec 2.4). `suspect`: the passage lies in text addressed to AI systems (M14). */
export async function findingBoxes(docId: string, finding: Finding | null) {
  const boxes: Record<number, number[][]> = {};
  if (!finding || !(finding.quote || finding.flags.some((f) => f.startsWith("signal_despite_absent")))) {
    return { boxes, page: finding?.page ?? 1, hint: null as string | null, suspect: false, look: "ev" as Look, failed: false };
  }
  let failed = false;
  const [h, suspect] = await Promise.all([
    api.highlight(docId, finding.clause_type).catch(() => {
      failed = true;
      return NONE;
    }),
    suspectHighlight(docId, finding.flags).catch(() => false),
  ]);
  h.pages.forEach((p) => (boxes[p.page] = p.boxes));
  const evidence = h.kind === "quote" && finding.status === "PRESENT";
  const look: Look = suspect ? "suspect" : evidence ? "ev" : "look";
  const hint = suspect ? "text addressed to AI systems – not evidence"
    : evidence ? "the passage – checked"
    : h.kind === "quote" ? "proposed by the model – rejected by the checks"
    : h.kind === "signal" ? "a hint – not the clause" : null;
  return { boxes, page: h.pages[0]?.page ?? finding.page ?? 1, hint, suspect, look, failed };
}

type Row = Pick<RunRow | UnreportedRow, "doc_id" | "hits" | "flags">;

/** Everything the evidence of one contract shows. A missing-clause question marks the finding of its
 *  clause; a governing-law question the passage that chooses the law (decision 94); a former-name question
 *  the names. `subjectless`: an excluded contract - its page only, nothing marked. Only the plan and three
 *  fields of the row are read, so one finding opened from the register loads the same way:
 *  load({ plan: { check: "missing_clause", params: { clause_type } } }, { doc_id, flags: [] }). */
export async function load(run: Pick<Run, "plan">, row: Row, subjectless = false): Promise<Loaded> {
  const doc = await api.document(row.doc_id);
  let boxes: Record<number, number[][]> = {};
  let finding: Finding | null = null;
  let span: Span = { start: null, end: null };
  let firstPage = 1;
  let hint: string | null = null;
  let look: Look = "ev";
  let markFailed = false;
  if (subjectless) {
    // nothing to mark: the contract was not evaluated
  } else if (run.plan.check === "missing_clause") {
    const findings = await api.findings(row.doc_id).catch(() => {
      markFailed = true;
      return [] as Finding[];
    });
    finding = findings.find((f) => f.clause_type === run.plan.params.clause_type) ?? null;
    const b = await findingBoxes(row.doc_id, finding);
    ({ boxes, page: firstPage, hint, look } = b);
    markFailed ||= b.failed;
    span = { start: finding?.char_start ?? null, end: finding?.char_end ?? null };
  } else if (run.plan.check === "governing_law_not") {
    // the register's passage for the law: evidence only when its check confirmed it (decision 94); a quote
    // from text addressed to AI systems is red and never evidence (F23)
    const h = await api.lawHighlight(row.doc_id).catch(() => {
      markFailed = true;
      return NONE;
    });
    const failed = doc.metadata?.law_flags ?? [];
    h.pages.forEach((p) => (boxes[p.page] = p.boxes));
    firstPage = h.pages[0]?.page ?? doc.metadata?.law_page ?? 1;
    look = failed.includes("law_quote_in_suspected_injection") ? "suspect" : failed.length ? "look" : "ev";
    hint = h.kind !== "quote" ? null
      : look === "suspect" ? "text addressed to AI systems – not evidence"
      : look === "look" ? "proposed by the model – not confirmed by the checks" : "the choice of law – checked";
    span = { start: h.char_start, end: h.char_end };
  } else if (row.hits?.length) {
    // every hit of a former name; a name an amendment replaced is marked the same way and labelled so
    for (const hit of row.hits) {
      const r = await api.locate(row.doc_id, hit.page, hit.name).catch(() => {
        markFailed = true;
        return { page: hit.page, boxes: [] as number[][] };
      });
      boxes[hit.page] = [...(boxes[hit.page] ?? []), ...r.boxes];
    }
    firstPage = row.hits[0].page;
    hint = row.hits.some((h) => h.resolved_by) ? "former name – replaced by an amendment" : "the former company name";
  }
  const text = doc.format === "txt" ? await api.text(row.doc_id).catch(() => null) : null;
  const alerts = await documentAlerts(doc, row.flags, text).catch(() => [] as Alert[]);
  return { doc, finding, boxes, span, hint, look, text, firstPage, alerts, markFailed };
}
