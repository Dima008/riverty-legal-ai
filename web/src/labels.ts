// Lawyers' language instead of technical terms (design principle from the frontend plan).
// The values are English; the tool translates them where they are shown: t(STATUS_LABEL[s]).
import type { T } from "./i18n";

export const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Clause found",
  ABSENT: "Clause not found",
  UNCLEAR: "Unclear – needs a look",
  LEGACY_NAME: "Former company name",
  OTHER_LAW: "Other governing law",
  LAW_UNKNOWN: "Governing law not found",
  DUPLICATE: "Duplicate",
};

// Short form for the results table
export const STATUS_SHORT: Record<string, string> = {
  PRESENT: "Found",
  ABSENT: "Not found",
  UNCLEAR: "Unclear",
  LEGACY_NAME: "Former name",
  OTHER_LAW: "Other law",
  LAW_UNKNOWN: "No law found",
  DUPLICATE: "Duplicate",
};

export const TRIAGE_LABEL: Record<string, string> = {
  CONFIRM: "Routine",
  REVIEW: "Review",
  FOUR_EYES: "Four eyes",
};

export const REVIEW_LABEL: Record<string, string> = {
  FOUND: "Open",
  IN_REVIEW: "1 of 2 approvals",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CORRECTED: "Corrected",
  DISPUTED: "Disputed – escalate",
  ESCALATED: "Escalated – four eyes",
};

export const DOC_TYPE_LABEL: Record<string, string> = {
  merchant_agreement: "merchant agreements",
  data_processing_agreement: "data processing agreements",
  amendment: "amendments",
  other_commercial_agreement: "other commercial agreements",
  unknown: "documents of unknown type",
  "all documents": "all documents",
};

export const DOC_TYPE_SINGULAR: Record<string, string> = {
  merchant_agreement: "Merchant agreement",
  data_processing_agreement: "Data processing agreement",
  amendment: "Amendment",
  other_commercial_agreement: "Other commercial agreement",
  unknown: "Unknown type",
};

// Short column labels for the register matrix; the full label and the definition stay in the tooltip
export const CLAUSE_SHORT: Record<string, string> = {
  liability_limitation: "Liability cap",
  consumer_terms_checkout: "Consumer terms",
  dpa_reference: "DPA Art. 28",
  subprocessor_clause: "Sub-processors",
  audit_clause: "Audit rights",
};

// The kind of question, in lawyers' words (by the check it runs, not by the internal use case)
export const CHECK_CATEGORY: Record<string, string> = {
  missing_clause: "Missing clause",
  legacy_names: "Former company name",
  governing_law_not: "Governing law",
  duplicates: "Duplicates",
};

// Confidence as a word; 0.8 is REVIEW_BELOW in pipeline/portfolio.py (below it a person reviews)
export const confidenceWord = (c: number) => (c >= 0.8 ? "high" : c >= 0.5 ? "medium" : "low");

export const LAYER_LABEL: Record<string, string> = {
  model: "What the model said",
  quote_found_in_source: "Quote found in the contract",
  quote_not_from_suspected_injection: "Quote not from a suspicious passage",
  quote_has_clause_vocabulary: "Quote uses the clause's vocabulary",
  checker_four_eyes: "Second model call agrees (four eyes)",
  no_absence_signal: "No hint that the clause exists after all",
  document_signals: "Document quality and safety",
  register: "What the register says",
};

// one name for the injection signal everywhere: the warning bar's title is "Text addressed to AI systems"
export const FLAG_LABEL: Record<string, string> = {
  prompt_injection_suspected: "Contains text addressed to AI systems",
  document_contains_suspected_injection: "Contains text addressed to AI systems",
  quote_in_suspected_injection: "Quote from a suspicious passage",
  amendment_contradiction: "Contradicting metadata",
  amendment_base_not_in_register: "Base agreement not in register",
  quote_not_verified: "Quote not found in the contract",
  quote_lacks_clause_terms: "Quote does not fit the clause",
  checker_rejected: "Second check disagreed",
  checker_missing: "Second check missing",
  signal_despite_absent: "Hint that the clause may exist",
  ocr_text: "Read by OCR",
  low_ocr_quality: "Poor scan quality",
};

// Positive signals are shown in the check list, not as warnings
const NOT_A_WARNING = new Set(["checker_agreed"]);

export const flagLabel = (flag: string) => FLAG_LABEL[flag.split(":")[0]] ?? flag.split(":")[0].replace(/_/g, " ");
// t translates the labels; the tool passes it in, without it they stay English
export const warningLabels = (flags: string[], t: T = (text) => text) =>
  [...new Set(flags.filter((f) => !NOT_A_WARNING.has(f.split(":")[0])).map((f) => t(flagLabel(f))))];

// Sentences the server builds from fixed templates (pipeline/portfolio.py _exclusion): they are
// interface text, not evidence, so the tool matches the template and shows it in the chosen
// language. Anything that matches no template is shown as it came (free text stays as it is).
const EXCLUSION: [RegExp, string, (m: RegExpMatchArray, t: T) => Record<string, string>][] = [
  [/^duplicate of (\S+) - the original is checked$/, "duplicate of {id} – the original is checked", (m) => ({ id: m[1] })],
  [/^amendment of (\S+) - read together with its base agreement$/, "amendment of {id} – read together with its base agreement", (m) => ({ id: m[1] })],
  [/^amendment, base agreement not in register$/, "amendment, base agreement not in register", () => ({})],
  [/^document type unknown - check manually$/, "document type unknown – check manually", () => ({})],
  [/^not extracted \(status (\w+)\)$/, "not extracted (status {status})", (m) => ({ status: m[1] })],
  [/^selected, but an? (.+?) - the question is about (.+?)s$/, "selected, but another type ({type}) – the question is about {types}",
   (m, t) => {
     const key = (s: string) => s.replace(/ /g, "_");
     return { type: t(DOC_TYPE_SINGULAR[key(m[1])] ?? m[1]), types: t(DOC_TYPE_LABEL[key(m[2])] ?? `${m[2]}s`) };
   }],
];
export function exclusionReason(reason: string, t: T): string {
  for (const [pattern, key, params] of EXCLUSION) {
    const m = reason.match(pattern);
    if (m) return t(key, params(m, t));
  }
  return reason;
}

// How a selection was made in the register (decision 75), e.g. "law: DE · dated from: 2020-01-01"
const SCOPE_FILTER: Record<string, string> = {
  type: "type", only: "only", law: "law", from: "dated from", to: "dated to", clause: "clause",
  clause_status: "clause status", review: "review state", search: "search", picked: "picked",
};
export const scopeText = (filters: Record<string, string>, t: T = (text) => text) =>
  Object.entries(filters)
    .map(([k, v]) => `${t(SCOPE_FILTER[k] ?? k)}: ${k === "type" ? t(DOC_TYPE_LABEL[v] ?? v) : t(v)}`)
    .join(" · ");
