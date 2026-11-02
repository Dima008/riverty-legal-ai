// Typed client for the Legal Workbench API (FastAPI, see api/). The dev server forwards /api.
// Every request carries the simulated reviewer (decision 54); in production the user would
// come from the Entra ID sign-in instead.

export type Status = "PRESENT" | "ABSENT" | "UNCLEAR";
export type Triage = "CONFIRM" | "REVIEW" | "FOUR_EYES";
// Where a document stands (pipeline/queries.py stages): "reading" until its findings and the family /
// former-name step are stored, "failed" when the last attempt to read it failed
export type Stage = "reading" | "ready" | "failed";
export type ReviewStateName = "FOUND" | "IN_REVIEW" | "CONFIRMED" | "REJECTED" | "CORRECTED" | "DISPUTED" | "ESCALATED";
export type Decision = "CONFIRMED" | "REJECTED" | "CORRECTED";
// The traffic light of one contract in an answer (decision 95, pipeline/portfolio.py light): red = the issue
// is in the text, orange = a person looks, green = positive, with evidence. light_why says why: "poor_scan"
// (a poor scan proves nothing), "not_sure" (a Found that needs Review or Four eyes), "legal" (Legal doubts a
// Found, F34), "legal_confirmed" (Legal confirmed a doubtful Found), "status" (the status itself)
export type Light = "red" | "orange" | "green";
export type LightWhy = "status" | "poor_scan" | "not_sure" | "legal" | "legal_confirmed";

export interface Plan {
  check: string;
  params: Record<string, string>;
  scope?: Scope;
}

/** Contracts Legal chose in the register (decision 75); the filters only record how. */
export interface Scope {
  doc_ids: string[];
  filters: Record<string, string>;
}

export interface Example {
  id: string;
  question: string;
  question_de: string;
  use_case: string;
  plan: Plan;
}

export interface CheckSpec {
  label: string;
  params: Record<string, string[] | string>;
  required: string[];
  names?: string[];                // legacy_names: the former names the exact search looks for
}

export interface Review {
  reviewer: string;
  reviewer_name: string;
  decision: Decision | "ESCALATED";
  corrected_status: string | null;
  reason: string | null;
  ts: string;
  source?: string;          // "register" or the run the review was made in (decision 73)
}

export interface ReviewState {
  state: ReviewStateName;
  required: number;
  done: number;
  escalated?: boolean;
  reviews: Review[];
}

// Review of a finding in the register (api/findings.py)
export interface FindingReviewState extends ReviewState {
  triage: Triage;
  status: Status;
  earlier_reviews: number;  // reviews of an earlier version that no longer apply
}

// The legacy-name state of a document; not_ruled_out: a poor scan without an exact match (F19)
export interface FormerNames {
  open: number;
  resolved: number;
  not_ruled_out: boolean;
  reason: string | null;
}

export interface NameHit {
  name: string;
  page: number;
  snippet: string;
  resolved_by?: string | null;     // NAME_RESOLVED: the amendment that replaced the name
}

export interface RunRow {
  doc_id: string;
  title: string | null;
  counterparty_name: string | null;
  doc_type: string | null;
  status: string;
  model_status?: string | null;
  confidence: number | null;
  quote?: string | null;
  page?: number | null;
  section?: string | null;
  rationale?: string | null;
  hits?: NameHit[];
  reason?: string | null;          // NAME_NOT_RULED_OUT, LAW_NOT_CONFIRMED: why a person has to read the page (F19, F36)
  ocr_mean_conf?: number | null;
  governing_law?: string | null;
  // the law's evidence (decision 94): the passage that chooses the law, its page and place in the text;
  // law_flags: the failed checks, [] = confirmed, null = not checked (read before extract-v3); missing in older runs
  law_quote?: string | null;
  law_page?: number | null;
  law_char_start?: number | null;
  law_char_end?: number | null;
  law_flags?: string[] | null;
  duplicate_of?: string | null;
  flags: string[];
  triage: Triage;
  sample: boolean;
  review: ReviewState;
  // the document behind the row, for every check (a poor scan also in Q2, Q5 and Q8); missing in older runs
  doc_status?: string | null;
  ingested_at?: string | null;
  page_count?: number | null;
  // the traffic light (decision 95); missing in older runs (then lightOf(status))
  light?: Light;
  light_why?: LightWhy;
  char_start?: number | null;      // where the passage is in the text (missing clause)
  char_end?: number | null;
  text_sha256?: string | null;     // the finding version (decision 73)
  prompt_version?: string | null;
  match?: "same_text" | "near_identical";   // DUPLICATE: how the copy was found
  copies?: string[];               // ORIGINAL: its copies
}

/** A contract the answer evaluated but does not report (decision 95): mostly green, with its evidence. It
 *  needs no decision; a clause row carries Legal's decision on its finding (legal, D6). */
export interface UnreportedRow extends Omit<RunRow, "review" | "triage" | "sample" | "light" | "light_why"> {
  triage: Triage | null;           // the finding's own triage (clauses); null for names, law, copies
  sample: false;
  light: Light;
  light_why: LightWhy;
  legal?: ReviewState;             // missing-clause rows: Legal's decision on this finding version
}

export interface Coverage {
  scope: string;
  in_scope: number;
  checked: number;
  checked_ids?: string[];          // which contracts the answer covered (snapshot); missing in older runs
  excluded: { doc_id: string; reason: string }[];
  reported: number;
  selection: { chosen: number; of: number; filters: Record<string, string> } | null;
}

export interface Run {
  run_id: string;
  created_at: string;
  created_by: string;
  question: string | null;
  plan: Plan;
  prompt_version: string;
  rows: RunRow[];                   // reported: exactly the evaluation's answer (red and orange)
  unreported?: UnreportedRow[];     // every other evaluated contract (decision 95); missing in older runs
  lights?: Record<Light, number>;
  intent?: "missing" | "find" | null;   // the analysis box: "find" = "Find a clause"
  counts: Record<string, number>;
  info: { resolved_by_amendment?: { doc_id: string; resolved_by: string }[]; searched_names?: string[] };
  coverage: Coverage;
  triage: Partial<Record<Triage, number>>;
  review_states: Record<ReviewStateName, number>;
  cost: { model_calls: number; usd: number; note: string; register_total_usd: number };
  register_version?: number;       // the register's change cursor when the question was asked; missing in older runs
}

/** Which contracts a plan would cover (POST /runs/preview): no rows and no counts of findings - never the answer. */
export interface Preview {
  plan: Plan;
  register_version: number;
  coverage: Omit<Coverage, "reported">;
}

export interface Layer {
  layer: string;
  passed?: boolean | null;
  result?: string;
  detail?: string | null;
}

export interface Finding {
  clause_type: string;
  label: string;
  required: boolean;
  status: Status;
  model_status: Status;
  changed_by_checks: boolean;
  confidence: number;
  rationale: string | null;
  quote: string | null;
  quote_verified: boolean;
  quote_score?: number | null;     // how closely the quote matches the text, 0-100
  page: number | null;
  char_start: number | null;
  char_end: number | null;
  section: string | null;
  flags: string[];
  layers: Layer[];
  prompt_version: string;
}

export interface PageInfo {
  page_no: number;
  source: string;
  ocr_conf: number | null;
  width: number;
  height: number;
}

export interface DocumentInfo {
  doc_id: string;
  source_files: string[];
  format: string;
  status: string;
  page_count: number;
  ocr_mean_conf: number | null;
  flags: string[];
  family: string[];
  family_id: string;
  duplicate_of: string | null;
  copies: string[];            // documents that are copies of this one
  stage?: Stage;
  ingested_at?: string | null;     // when the file arrived (first ingest, F14)
  extracted_at?: string | null;    // when the model read it; null while it is being read
  metadata: {
    title: string | null;
    doc_type: string;
    counterparty_name: string | null;
    own_entity_name: string | null;
    current_own_entity_name: string | null;
    effective_date: string | null;
    governing_law: string | null;
    // the law's evidence (decision 94); null = not checked (read before extract-v3)
    governing_law_quote?: string | null;
    law_page?: number | null;
    law_char_start?: number | null;
    law_char_end?: number | null;
    law_flags?: string[] | null;
    law_quote_verified?: boolean | null;
    law_reason?: string | null;      // why a person checks the law (poor scan, failed check), F36
  } | null;
  pages: PageInfo[];
  legacy_names: { name: string; page: number; snippet: string; resolved_by: string | null }[];
  former_names: FormerNames;
}

export interface Highlight {
  kind: "quote" | "signal" | "none";   // signal: the passage that hints at a clause reported missing
  char_start: number | null;
  char_end: number | null;
  coverage: number;
  pages: { page: number; boxes: number[][] }[];
}

export interface DocText {
  text: string;
  page_offsets: number[];
}

export interface MatrixCell {
  status: Status;
  model_status: Status;
  confidence: number;
  required: boolean;
}

export interface MatrixRow {
  doc_id: string;
  format: string;
  ingest_status: string;
  ocr_mean_conf: number | null;
  family_id: string;
  duplicate_of: string | null;
  flags: string[];
  doc_type: string | null;
  title: string | null;
  counterparty_name: string | null;
  effective_date: string | null;
  governing_law: string | null;
  law_quote_verified?: boolean | null;   // null: not checked yet (read before extract-v3)
  law_reason?: string | null;            // why a person checks the law (F36)
  is_amendment: boolean;
  cells: Record<string, MatrixCell>;
  gaps: string[];
  former_names: FormerNames;
  stage?: Stage;
  ingested_at?: string | null;
}

export interface ClauseSpec {
  label: string;
  definition: string;
  required_for: string[];
  absence_words?: string[];        // /catalogue: the absence check's typical wordings, in words
}

export interface Matrix {
  clauses: Record<string, ClauseSpec>;
  rows: MatrixRow[];
}

// What if a safeguard were missing (eval/what_if.py): replay on a copy of the register.
export interface WhatIfLayer {
  id: string;
  group: string;
  label: string;
  guards: string;
  failures: string[];
}

export interface WhatIfQuestion {
  id: string;
  question: string;
  expected: string[];
  recall: [number, number];      // [all safeguards, switched off]
  precision: [number, number];
  missed: string[];
  wrongly_reported: string[];
}

export interface WhatIfSide {
  status: string;
  confidence: number | null;
  reported: boolean;
  triage: Triage | null;
}

export interface WhatIfChange {
  doc_id: string;
  clause_type: string;
  before: WhatIfSide;
  after: WhatIfSide;
  no_longer_raised: string[];
}

export interface WhatIfSummary {
  questions_changed: number;
  contracts_missed: string[];
  findings_changed: number;
  second_look_lost: number;
}

export interface WhatIfResult {
  off: string[];
  questions: WhatIfQuestion[];
  changes: WhatIfChange[];
  summary: WhatIfSummary;
}

export interface WhatIfRow extends WhatIfSummary {
  layer: string;
  off: string[];
  recall_before: Record<string, number>;
  recall: Record<string, number>;
}

export interface ArchiveResult {
  doc_id: string;
  approved_by: string[];
  files: { file: string; sha256: string; status: string; receipt_id: string }[];
}

/** The register at a glance (GET /summary); only the fields the tool shows. */
export interface RegisterSummary {
  documents: number;
  cost: { cost_usd: number; calls: number };
}

/** One run in the list of runs (GET /runs): enough to name it in the audit log. */
export interface RunListItem {
  run_id: string;
  created_at: string;
  created_by: string;
  question: string | null;
  plan: Plan;
  coverage: Coverage;
  register_version?: number;
}

/** A pipeline event of the register (GET /changes): a contract arrived, was read, failed or was removed.
 *  `details` is a whitelist - never a file path. */
export interface RegisterEvent {
  id: number;                      // audit_log id of the register
  ts: string;
  action: "ingested" | "ingest_failed" | "extracted" | "extraction_failed" | "forgotten";
  doc_id: string;
  details: {
    format?: string;
    pages?: number;
    status?: string;
    ocr_mean_conf?: number | null;
    model?: string;
    prompt_version?: string;
    error?: string;
  };
}

/** Did the register change (GET /changes?after=)? version = MAX(audit_log.id), the same idea as a Graph delta
 *  link; reset: the cursor is ahead of the register (it was rebuilt), so reload everything. */
export interface Changes {
  version: number;
  now: string;                     // the server's clock: "New" is measured with it
  documents: number;
  reset: boolean;
  more: boolean;                   // the events were capped at the newest 200
  events: RegisterEvent[];         // empty without `after` - the cheap poll
}

export interface AuditEvent {
  ts: string;
  actor: string;
  actor_name: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let currentUser = "reviewer_a";
export const setCurrentUser = (user: string) => {
  currentUser = user;
};

function errorMessage(body: unknown): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const d = detail as { message: string; refused?: Record<string, string> };
    const refused = d.refused ? ": " + Object.entries(d.refused).map(([k, v]) => `${k} (${v})`).join(", ") : "";
    return d.message + refused;
  }
  return "request failed";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", "X-User": currentUser, ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, errorMessage(await res.json().catch(() => null)));
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => request<{ service: string; register: boolean; prompt_version: string }>("/health"),
  users: () => request<Record<string, string>>("/users"),
  examples: () => request<Example[]>("/examples"),
  checks: () => request<Record<string, CheckSpec>>("/checks"),
  catalogue: () => request<{ clauses: Record<string, ClauseSpec> }>("/catalogue"),
  createRun: (plan: Plan, question: string | null, intent: "missing" | "find" | null = null) =>
    post<Run>("/runs", { plan, question, intent }),
  previewRun: (plan: Plan) => post<Preview>("/runs/preview", { plan }),
  changes: (after?: number) => request<Changes>(after == null ? "/changes" : `/changes?after=${after}`),
  run: (id: string) => request<Run>(`/runs/${id}`),
  runs: () => request<RunListItem[]>("/runs"),
  summary: () => request<RegisterSummary>("/summary"),
  review: (runId: string, body: { doc_id: string; decision: Decision; reason?: string; corrected_status?: string }) =>
    post<RunRow>(`/runs/${runId}/reviews`, body),
  confirmBatch: (runId: string, docIds: string[]) => post<{ confirmed: string[] }>(`/runs/${runId}/reviews/batch`, { doc_ids: docIds }),
  archive: (runId: string, docId: string) => post<ArchiveResult>("/archive", { run_id: runId, doc_id: docId }),
  audit: () => request<AuditEvent[]>("/audit"),
  matrix: () => request<Matrix>("/matrix"),
  document: (id: string) => request<DocumentInfo>(`/documents/${id}`),
  findings: (id: string) => request<Finding[]>(`/documents/${id}/findings`),
  highlight: (id: string, clause: string) => request<Highlight>(`/documents/${id}/findings/${clause}/highlight`),
  lawHighlight: (id: string) => request<Highlight>(`/documents/${id}/law/highlight`),
  locate: (id: string, page: number, q: string) =>
    request<{ page: number; boxes: number[][] }>(`/documents/${id}/pages/${page}/locate?q=${encodeURIComponent(q)}`),
  text: (id: string) => request<DocText>(`/documents/${id}/text`),
  pageImageUrl: (id: string, page: number) => `/api/documents/${id}/pages/${page}/image`,
  findingReview: (docId: string, clause: string) =>
    request<FindingReviewState>(`/findings/${docId}/${clause}/review`),
  reviewFinding: (docId: string, clause: string,
                  body: { decision: Decision | "ESCALATED"; reason?: string; corrected_status?: string }) =>
    post<FindingReviewState>(`/findings/${docId}/${clause}/reviews`, body),
  // "Not sure? Ask for a second person": the finding then needs four eyes (decision 73); a reason is required
  escalate: (docId: string, clause: string, reason: string) =>
    post<FindingReviewState>(`/findings/${docId}/${clause}/reviews`, { decision: "ESCALATED", reason }),
  reviewStates: () => request<Record<string, Record<string, ReviewStateName>>>("/findings/review-states"),
  whatIfLayers: () => request<{ layers: WhatIfLayer[]; model_alone: string[] }>("/what-if/layers"),
  whatIf: (off: string[]) => request<WhatIfResult>(`/what-if?off=${encodeURIComponent(off.join(","))}`),
  whatIfEveryLayer: () => request<WhatIfRow[]>("/what-if/every-layer"),
};
