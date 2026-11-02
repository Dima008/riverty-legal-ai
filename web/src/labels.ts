// Lawyers' language instead of technical terms (design principle from the frontend plan).
// The values are English; the tool translates them where they are shown: t(STATUS_WORD[s]).
import type { Plan, ReviewState, ReviewStateName, Triage } from "./api";
import type { T } from "./i18n";

// The old story chapters (story/, kept as material for the talk) still use these two; the tool uses
// the vocabulary of decision 91 below (STATUS_WORD, nextStep)
export const STATUS_SHORT: Record<string, string> = {
  PRESENT: "Found",
  ABSENT: "Not found",
  UNCLEAR: "Unclear",
  LEGACY_NAME: "Former name",
  NAME_NOT_RULED_OUT: "Cannot rule out",
  OTHER_LAW: "Other law",
  LAW_UNKNOWN: "No law found",
  LAW_NOT_CONFIRMED: "Law not confirmed",
  DUPLICATE: "Duplicate",
};

export const TRIAGE_LABEL: Record<string, string> = {
  CONFIRM: "Routine",
  REVIEW: "Review",
  FOUR_EYES: "Four eyes",
};

// The state a decision left a finding in, for the audit log
export const REVIEW_LABEL: Record<string, string> = {
  FOUND: "Open",
  IN_REVIEW: "1 of 2 approvals",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CORRECTED: "Corrected",
  DISPUTED: "Reviewers disagree",
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

// Sentences the server builds from fixed templates (pipeline/portfolio.py _exclusion,
// pipeline/queries.py poor_scan_reason): they are interface text, not evidence, so the tool
// matches the template and shows it in the chosen language. Anything that matches no template is
// shown as it came (free text stays as it is).
type Template = [RegExp, string, (m: RegExpMatchArray, t: T) => Record<string, string>];
const fromTemplate = (text: string, templates: Template[], t: T) => {
  for (const [pattern, key, params] of templates) {
    const m = text.match(pattern);
    if (m) return t(key, params(m, t));
  }
  return text;
};
const EXCLUSION: Template[] = [
  [/^duplicate of (\S+) - the original is checked$/, "copy of {id} – the original is evaluated", (m) => ({ id: m[1] })],
  [/^amendment of (\S+) - read together with its base agreement$/, "amendment of {id} – read together with its base agreement", (m) => ({ id: m[1] })],
  [/^amendment, base agreement not in register$/, "amendment, base agreement not in register", () => ({})],
  [/^document type unknown - check manually$/, "document type unknown – check manually", () => ({})],
  // D18: true at the time of the answer - the contract was still being read (or failed)
  [/^not extracted \(status \w+\)$/, "not read yet – listed, not checked", () => ({})],
  [/^selected, but an? (.+?) - the question is about (.+?)s$/, "selected, but another type ({type}) – the question is about {types}",
   (m, t) => {
     const key = (s: string) => s.replace(/ /g, "_");
     return { type: t(DOC_TYPE_SINGULAR[key(m[1])] ?? m[1]), types: t(DOC_TYPE_LABEL[key(m[2])] ?? `${m[2]}s`) };
   }],
];
export const exclusionReason = (reason: string, t: T) => fromTemplate(reason, EXCLUSION, t);

// A poor scan without an exact match of a former name (F19, decision 89): not "no former name"
const NAME_REASON: Template[] = [
  [/^cannot be ruled out - poor scan \(OCR confidence (\d+) %, threshold (\d+) %\) - a person checks$/,
   "cannot be ruled out – poor scan (OCR confidence {conf} %, threshold {threshold} %) – a person checks",
   (m) => ({ conf: m[1], threshold: m[2] })],
  [/^cannot be ruled out - poor scan - a person checks$/, "cannot be ruled out – poor scan – a person checks", () => ({})],
];
export const nameReason = (reason: string, t: T) => fromTemplate(reason, NAME_REASON, t);

// A governing law the register cannot confirm (F36, decision 94): pipeline/queries.py law_reason
const LAW_REASON: Template[] = [
  [/^cannot be confirmed - poor scan \(OCR confidence (\d+) %, threshold (\d+) %\) - a person checks$/,
   "cannot be confirmed – poor scan (OCR confidence {conf} %, threshold {threshold} %) – a person checks",
   (m) => ({ conf: m[1], threshold: m[2] })],
  [/^cannot be confirmed - poor scan - a person checks$/, "cannot be confirmed – poor scan – a person checks", () => ({})],
  [/^not confirmed - no quote for the law - a person checks$/, "not confirmed – no quote for the law – a person checks", () => ({})],
  [/^not confirmed - the quote is not in the contract - a person checks$/,
   "not confirmed – the quote is not in the contract – a person checks", () => ({})],
  [/^not confirmed - the quote comes from text addressed to AI systems - a person checks$/,
   "not confirmed – the quote comes from text addressed to AI systems – a person checks", () => ({})],
  [/^not confirmed - the quote does not choose a law - a person checks$/,
   "not confirmed – the quote does not choose a law – a person checks", () => ({})],
  [/^not confirmed - the quote does not name the law's country or state - a person checks$/,
   "not confirmed – the quote does not name the law's country or state – a person checks", () => ({})],
  [/^not confirmed - no check words for this law code yet - a person checks$/,
   "not confirmed – no check words for this law code yet – a person checks", () => ({})],
];
export const lawReason = (reason: string, t: T) => fromTemplate(reason, LAW_REASON, t);

// How a selection was made (decision 75), e.g. "law: DE · dated from: 2020"; law "none" = no governing law found
const SCOPE_FILTER: Record<string, string> = {
  type: "type", only: "only", law: "law", from: "dated from", to: "dated to", clause: "clause",
  clause_status: "clause status", review: "review state", search: "search", picked: "picked", kept_in: "kept in",
};
const scopeValue = (k: string, v: string, t: T) =>
  k === "type" ? t(DOC_TYPE_LABEL[v] ?? v) : k === "law" && v === "none" ? t("not found") : t(v);
export const scopeText = (filters: Record<string, string>, t: T = (text) => text) =>
  Object.entries(filters)
    .map(([k, v]) => `${t(SCOPE_FILTER[k] ?? k)}: ${scopeValue(k, v, t)}`)
    .join(" · ");

// ---- The redesign's vocabulary (spec section 3, decision 91). One word per meaning, one meaning per
// word: "check" means the guardrails only (German "Kontrollen"), "four eyes" means people only.

/** What the text says (3.1). OTHER_LAW names the law: statusWord("OTHER_LAW", t, "NL") = "Other law (NL)". */
export const STATUS_WORD: Record<string, string> = {
  PRESENT: "Found",
  ABSENT: "Not found",
  UNCLEAR: "Unclear",
  LEGACY_NAME: "Former name",
  NAME_NOT_RULED_OUT: "Cannot rule out",
  OTHER_LAW: "Other law ({law})",
  LAW_UNKNOWN: "No law found",
  LAW_NOT_CONFIRMED: "Law not confirmed ({law})",
  DUPLICATE: "Copy",
  // the positive side of each analysis (decision 95): what the answer shows in green
  NO_FORMER_NAME: "No former name",
  NAME_RESOLVED: "Resolved by an amendment",
  SAME_LAW: "{law} law",
  SAME_LAW_NOT_CHECKED: "{law} law – not checked yet",
  UNIQUE: "Unique",
  ORIGINAL: "Original",
};
export const statusWord = (status: string, t: T, law?: string | null) =>
  t(STATUS_WORD[status] ?? status, { law: law ?? "?" });

// the guardrail layers (the finding's check timeline): a second model call is a check, not "four eyes"
export const CHECK_LABEL: Record<string, string> = {
  model: "What the model said",
  quote_found_in_source: "Quote found in the contract",
  quote_not_from_suspected_injection: "Quote not from a suspicious passage",
  quote_has_clause_vocabulary: "Quote uses the clause's vocabulary",
  checker_four_eyes: "A second model call agrees",
  no_absence_signal: "No hint that the clause exists after all",
  document_signals: "Document quality and safety",
  register: "What the register says",
};

/** Still open: a person has to act. Monitoring counts the same four as open (D20). */
export const OPEN_STATES: ReviewStateName[] = ["FOUND", "IN_REVIEW", "ESCALATED", "DISPUTED"];

const DECIDED: Partial<Record<ReviewStateName, string>> = {
  CONFIRMED: "Confirmed ✓",
  REJECTED: "Rejected",
  DISPUTED: "Reviewers disagree",
};

/** The next step for a finding (3.2): the triage level and the decision state in one word - it replaces
 *  the triage badge and the review badge. The words are the talk's: Confirm / Review / Four eyes. */
export function nextStep(review: ReviewState, triage: Triage, sample: boolean, t: T): string {
  const s = review.state;
  if (s === "FOUND" && triage === "CONFIRM") return t(sample ? "Spot check" : "Confirm");
  if (s === "FOUND" && triage === "REVIEW") return t("Review");
  if (s === "FOUND" || s === "ESCALATED" || s === "IN_REVIEW") return t("Four eyes · {done} of 2", { done: review.done });
  if (s === "CORRECTED") {
    const to = review.reviews.find((r) => r.decision === "CORRECTED")?.corrected_status;
    return to ? t("Corrected → {status}", { status: statusWord(to, t) }) : t("Corrected");
  }
  return t(DECIDED[s] ?? s);
}

/** Why a person looks (3.3), in this order: a table row shows the first reason that applies, step 3 shows
 *  all of them as sentences. `flags` raise a reason by themselves; the others come from the review
 *  (escalated), the document (poor scan), the model's answer (overruled), the confidence, the check
 *  (no law, a law not confirmed by its passage) or the spot-check sample. `red`: two people approve, so
 *  the callout is red, else amber. */
export interface WhyRule {
  id: "injection" | "contradiction" | "escalated" | "poor_scan" | "law_not_confirmed" | "overruled" | "hint" | "base_missing"
    | "unsure" | "no_law" | "sample";
  flags?: string[];
  short: string;
  callout?: string;
  red?: boolean;
}
export const WHY: WhyRule[] = [
  { id: "injection", red: true,
    flags: ["prompt_injection_suspected", "document_contains_suspected_injection", "quote_in_suspected_injection"],
    short: "Text addressed to AI systems (page {page})",
    callout: "Text addressed to AI systems on page {page}. It is never used as evidence, so two people approve." },
  { id: "contradiction", red: true, flags: ["amendment_contradiction"],
    short: "The amendment contradicts the contract",
    callout: "{amendment} says something different from the register – two people approve." },
  { id: "escalated", short: "Escalated by {user}", callout: "{user} asked for a second person: “{reason}”" },
  { id: "poor_scan", flags: ["low_ocr_quality"], short: "Poor scan (OCR {conf} %)",
    callout: "Poor scan: page {page} was read by text recognition with only {conf} % confidence. Compare with the page." },
  // the law's quote failed its check (decision 94); the callout is the row's reason (lawReason)
  { id: "law_not_confirmed", short: "Law not confirmed by its quote" },
  { id: "overruled", short: "proposed passage rejected" },   // the callout: overruled()
  { id: "hint", flags: ["signal_despite_absent"], short: "The text hints at the clause",
    callout: "The model found nothing, but the text mentions …{snippet}… – read the highlighted passage." },
  { id: "base_missing", flags: ["amendment_base_not_in_register"], short: "Base agreement not in the register" },
  { id: "unsure", short: "The register is not sure ({c})",
    callout: "The register is not sure (confidence {c}; a person looks below 0.80)." },
  { id: "no_law", short: "No governing law found" },
  { id: "sample", short: "Picked at random for a spot check", callout: "Picked at random: look at the page before you confirm." },
];

// what overruled the model, by the flag of the failed check
const OVERRULED_BY: Record<string, string> = {
  quote_not_verified: "the quote is not in the contract",
  quote_lacks_clause_terms: "the quote does not fit the clause",
  quote_in_suspected_injection: "the quote comes from text addressed to AI systems",
  checker_rejected: "a second model call disagreed",
  checker_missing: "the second model call is missing",
  signal_despite_absent: "the text hints at the clause",
};

/** "The checks rejected the model's passage. The model said Found, but the quote does not fit the clause, and
 *  a second model call disagreed." - the callout when the register's status differs from the model's. */
export function overruled(modelStatus: string, flags: string[], t: T): string {
  const why = [...new Set(flags.map((f) => OVERRULED_BY[f.split(":")[0]]).filter(Boolean))].map((w) => t(w));
  const model = statusWord(modelStatus, t);
  if (why.length === 0) return t("The checks rejected the model's answer. The model said {model}.", { model });
  const reasons = why.length > 1 ? why.slice(0, -1).join(", ") + t(", and ") + why[why.length - 1] : why[0];
  return t("The checks rejected the model's passage. The model said {model}, but {reasons}.", { model, reasons });
}

/** Where a contract stands (3.4, the API's stage); "ready" needs no word. */
export const STAGE_WORD: Record<string, string> = {
  reading: "the model is reading it …",
  failed: "could not be read – a person reads it",
};

/** Legal's decision in a register cell (D19): three kinds instead of six, drawn as a person (Register.tsx);
 *  the exact state is in the tooltip. */
export const REVIEW_MARK: Partial<Record<ReviewStateName, { label: string; kind: string }>> = {
  CONFIRMED: { label: "confirmed by Legal", kind: "confirmed" },
  REJECTED: { label: "Legal disagrees", kind: "disagrees" },
  CORRECTED: { label: "Legal disagrees", kind: "disagrees" },
  IN_REVIEW: { label: "in review", kind: "in-review" },
  ESCALATED: { label: "in review", kind: "in-review" },
  DISPUTED: { label: "in review", kind: "in-review" },
};

// The kind of question: the topic a question is grouped under in step 1 (decision 93)
export const QUESTION_CATEGORY: Record<string, string> = {
  missing_clause: "Clause not found",
  legacy_names: "Former company name",
  governing_law_not: "Governing law",
  duplicates: "Copies",
};

// "every merchant agreement" and "7 of 21 merchant agreements": whole phrases per type, because German
// declines them ("jeder Händlervertrag", "7 von 21 Händlerverträgen"); "" = every type
export const EVERY_TYPE: Record<string, string> = {
  "": "every document",
  merchant_agreement: "every merchant agreement",
  data_processing_agreement: "every data processing agreement",
  other_commercial_agreement: "every other commercial agreement",
  amendment: "every amendment",
};
export const OF_TYPE: Record<string, string> = {
  "": "{n} of {of} documents",
  merchant_agreement: "{n} of {of} merchant agreements",
  data_processing_agreement: "{n} of {of} data processing agreements",
  other_commercial_agreement: "{n} of {of} other commercial agreements",
  amendment: "{n} of {of} amendments",
};

/** The question a plan asks, in words, when it is not one of the example questions (Q1-Q8):
 *  "Limitation of liability – not found or unclear"; intent "find": "Limitation of liability – where is it?" */
export function planQuestion(plan: Plan, clauses: Record<string, { label: string }>, t: T, intent?: string | null): string {
  const p = plan.params;
  if (plan.check === "missing_clause" && p.clause_type) {
    const clause = t(clauses[p.clause_type]?.label ?? p.clause_type);
    return intent === "find" ? t("{clause} – where is it, with the passage?", { clause }) : t("{clause} – not found or unclear", { clause });
  }
  if (plan.check === "governing_law_not" && p.law) return t("Not governed by {law} law", { law: p.law });
  if (plan.check === "duplicates") return t("Copies (duplicates)");
  return t(QUESTION_CATEGORY[plan.check] ?? plan.check);
}

/** A refusal of the server in lawyers' words (D17): raw text such as "tool gate: ..." never reaches the
 *  screen. `review`: the row's state, for "needs 2 approvals (1 so far)". Any other message stays as it came. */
export function serverMessage(status: number, message: string, review: Pick<ReviewState, "required" | "done"> | null, t: T): string {
  if (status === 409 && message.startsWith("tool gate:")) {
    if (/ is (REJECTED|DISPUTED)$/.test(message)) {
      return t("Refused by the server: the finding was not approved, so there is no archive copy. The attempt is in the audit log.");
    }
    const k = review?.required ?? 1;
    const text = k === 1
      ? "Refused by the server: the archive copy needs 1 approval ({done} so far). The attempt is in the audit log."
      : "Refused by the server: the archive copy needs {k} approvals ({done} so far). The attempt is in the audit log.";
    return t(text, { k, done: review?.done ?? 0 });
  }
  if (status === 409 && message.startsWith("four-eyes principle")) {
    return t("You already decided. The second decision must come from another person.");
  }
  if (status === 409 && message.startsWith("already escalated")) return t("Already escalated – two people decide now.");
  const decided = message.match(/ is already (\w+)/);
  if (status === 409 && decided) {
    const state = decided[1] === "CORRECTED" ? "Corrected" : DECIDED[decided[1] as ReviewStateName] ?? decided[1];
    return t("Already decided ({state}) – reload to see it.", { state: t(state) });
  }
  return message;
}

// ---- Decision 95: the Workbench as a traffic light. Step 1 chooses the analysis in five boxes; each box says
// what it asks, how it proves it, and which three words its answer uses (red ✕ / orange ? / green ✓).
export type AnalysisId = "missing" | "find" | "names" | "law" | "copies";
export interface Analysis {
  id: AnalysisId;
  check: string;                    // the check type it runs (pipeline/portfolio.py CHECKS)
  title: string;
  question: string;
  proof: string;                    // how the register knows, in one line
  pilot?: boolean;                  // one of the case study's two pilot questions
  legend: [string, string][];       // the three words of its answer with their meaning, red · orange · green (find: green first)
}
export const ANALYSES: Analysis[] = [
  { id: "missing", check: "missing_clause", title: "Missing clause", pilot: true,
    question: "Which contracts lack a clause of the playbook?", proof: "proves absence – every contract read",
    legend: [["Not found", "the clause is missing – the whole contract was read"],
             ["Unclear", "the register cannot settle it – a person looks"],
             ["Found", "positive – with the checked passage and its page"]] },
  { id: "find", check: "missing_clause", title: "Find a clause",
    question: "Where do contracts contain a clause – with the passage?", proof: "the same check, read from the found side",
    legend: [["Found", "the clause is there – with the checked passage and its page"],
             ["Unclear", "the register cannot settle it – a person looks"],
             ["Not found", "the clause is missing – the whole contract was read"]] },
  { id: "names", check: "legacy_names", title: "Former company name", pilot: true,
    question: "Which contracts still name a former company?", proof: "exact search for the former names",
    legend: [["Former name", "a former company name is in the text"],
             ["Cannot rule out", "a poor scan – the search cannot prove that no name is there"],
             ["No former name", "none of the names in the whole text"]] },
  { id: "law", check: "governing_law_not", title: "Governing law",
    question: "Which contracts are not under the expected law?", proof: "the law read in every contract",
    legend: [["Other law", "the contract chooses another law"],
             ["Not confirmed", "no law found, or no checked passage yet – a person looks"],
             ["Expected law", "the expected law, with the checked passage"]] },
  { id: "copies", check: "duplicates", title: "Copies",
    question: "Which documents are copies of another?", proof: "same text, every document compared",
    legend: [["Copy", "the same text as another document – counted once"],
             ["Cannot rule out", "a poor scan – a misread text cannot prove that no copy exists"],
             ["Original or unique", "no other document has this text"]] },
];

/** "20 merchant agreements in scope – every one of the type": whole phrases per type (German declines). */
export const IN_SCOPE_EVERY: Record<string, string> = {
  "": "{n} documents in scope – every document",
  merchant_agreement: "{n} merchant agreements in scope – every one of the type",
  data_processing_agreement: "{n} data processing agreements in scope – every one of the type",
  other_commercial_agreement: "{n} other commercial agreements in scope – every one of the type",
  amendment: "{n} amendments in scope – every one of the type",
};
