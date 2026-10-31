// Lawyers' language instead of technical terms (design principle from the frontend plan).

export const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Clause found",
  ABSENT: "Clause missing",
  UNCLEAR: "Unclear – needs a look",
  LEGACY_NAME: "Former company name",
  OTHER_LAW: "Other governing law",
  LAW_UNKNOWN: "Governing law not found",
  DUPLICATE: "Duplicate",
};

// Short form for the results table
export const STATUS_SHORT: Record<string, string> = {
  PRESENT: "Found",
  ABSENT: "Missing",
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

export const FLAG_LABEL: Record<string, string> = {
  prompt_injection_suspected: "Contains text addressed to software",
  document_contains_suspected_injection: "Contains text addressed to software",
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
export const warningLabels = (flags: string[]) =>
  [...new Set(flags.filter((f) => !NOT_A_WARNING.has(f.split(":")[0])).map(flagLabel))];
