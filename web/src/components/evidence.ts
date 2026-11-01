// Loading the evidence for one finding: the document, the finding, the highlight boxes on the page
// and the document alerts. Shared by the Workbench and the contract file, so both draw the same
// passage the same way.
import { api, type DocText, type DocumentInfo, type Finding, type Run, type RunRow } from "../api";
import { documentAlerts, suspectHighlight, type Alert } from "./SafetyBar";

export interface Loaded {
  doc: DocumentInfo;
  finding: Finding | null;
  boxes: Record<number, number[][]>;
  hint: string | null;
  suspect: boolean;
  text: DocText | null;
  firstPage: number;
  alerts: Alert[];
}

/** Highlight boxes for one finding: its quote, or the passage that hints at a missing clause.
 *  The hint stays English here; PageView translates it when it shows it. `suspect`: the passage
 *  lies in text addressed to AI systems (M14) - it is drawn in red and never called evidence. */
export async function findingBoxes(docId: string, finding: Finding | null) {
  const boxes: Record<number, number[][]> = {};
  if (!finding || !(finding.quote || finding.flags.some((f) => f.startsWith("signal_despite_absent")))) {
    return { boxes, page: finding?.page ?? 1, hint: null as string | null, suspect: false };
  }
  const [h, suspect] = await Promise.all([api.highlight(docId, finding.clause_type), suspectHighlight(docId, finding.flags)]);
  h.pages.forEach((p) => (boxes[p.page] = p.boxes));
  const hint = suspect ? "text addressed to AI systems – not evidence"
    : h.kind === "quote" ? "the model's quote" : h.kind === "signal" ? "the passage that hints at the clause" : null;
  return { boxes, page: h.pages[0]?.page ?? finding.page ?? 1, hint, suspect };
}

/** Everything the evidence of one row shows. A missing-clause question highlights the finding of its
 *  clause; a former-name question highlights the names. Only the plan and three fields of the row are
 *  read, so one finding opened from the register can be loaded the same way:
 *  load({ plan: { check: "missing_clause", params: { clause_type } } }, { doc_id, flags: [] }). */
export async function load(run: Pick<Run, "plan">, row: Pick<RunRow, "doc_id" | "hits" | "flags">): Promise<Loaded> {
  const doc = await api.document(row.doc_id);
  let boxes: Record<number, number[][]> = {};
  let finding: Finding | null = null;
  let firstPage = 1;
  let hint: string | null = null;
  let suspect = false;
  if (run.plan.check === "missing_clause") {
    finding = (await api.findings(row.doc_id)).find((f) => f.clause_type === run.plan.params.clause_type) ?? null;
    ({ boxes, page: firstPage, hint, suspect } = await findingBoxes(row.doc_id, finding));
  } else if (row.hits?.length) {
    for (const hit of row.hits) {
      const r = await api.locate(row.doc_id, hit.page, hit.name);
      boxes[hit.page] = [...(boxes[hit.page] ?? []), ...r.boxes];
    }
    firstPage = row.hits[0].page;
    hint = "the former company name";
  }
  const text = doc.format === "txt" ? await api.text(row.doc_id) : null;
  const alerts = await documentAlerts(doc, row.flags, text);
  return { doc, finding, boxes, hint, suspect, text, firstPage, alerts };
}
