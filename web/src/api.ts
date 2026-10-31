// Typed client for the Legal Workbench API (FastAPI, see api/). The dev server forwards /api.
// Every request carries the simulated reviewer (decision 54); in production the user would
// come from the Entra ID sign-in instead.

export type Status = "PRESENT" | "ABSENT" | "UNCLEAR";
export type Triage = "CONFIRM" | "REVIEW" | "FOUR_EYES";
export type ReviewStateName = "FOUND" | "IN_REVIEW" | "CONFIRMED" | "REJECTED" | "CORRECTED" | "DISPUTED" | "ESCALATED";
export type Decision = "CONFIRMED" | "REJECTED" | "CORRECTED";

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

export interface NameHit {
  name: string;
  page: number;
  snippet: string;
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
  governing_law?: string | null;
  duplicate_of?: string | null;
  flags: string[];
  triage: Triage;
  sample: boolean;
  review: ReviewState;
}

export interface Coverage {
  scope: string;
  in_scope: number;
  checked: number;
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
  rows: RunRow[];
  counts: Record<string, number>;
  info: { resolved_by_amendment?: { doc_id: string; resolved_by: string }[] };
  coverage: Coverage;
  triage: Partial<Record<Triage, number>>;
  review_states: Record<ReviewStateName, number>;
  cost: { model_calls: number; usd: number; note: string; register_total_usd: number };
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
  metadata: {
    title: string | null;
    doc_type: string;
    counterparty_name: string | null;
    own_entity_name: string | null;
    current_own_entity_name: string | null;
    effective_date: string | null;
    governing_law: string | null;
  } | null;
  pages: PageInfo[];
  legacy_names: { name: string; page: number; snippet: string; resolved_by: string | null }[];
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
  is_amendment: boolean;
  cells: Record<string, MatrixCell>;
  gaps: string[];
  former_names: { open: number; resolved: number };
}

export interface ClauseSpec {
  label: string;
  definition: string;
  required_for: string[];
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
  catalogue: () => request<{ clauses: Record<string, { label: string; definition: string }> }>("/catalogue"),
  createRun: (plan: Plan, question: string | null) => post<Run>("/runs", { plan, question }),
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
  locate: (id: string, page: number, q: string) =>
    request<{ page: number; boxes: number[][] }>(`/documents/${id}/pages/${page}/locate?q=${encodeURIComponent(q)}`),
  text: (id: string) => request<DocText>(`/documents/${id}/text`),
  pageImageUrl: (id: string, page: number) => `/api/documents/${id}/pages/${page}/image`,
  findingReview: (docId: string, clause: string) =>
    request<FindingReviewState>(`/findings/${docId}/${clause}/review`),
  reviewFinding: (docId: string, clause: string,
                  body: { decision: Decision | "ESCALATED"; reason?: string; corrected_status?: string }) =>
    post<FindingReviewState>(`/findings/${docId}/${clause}/reviews`, body),
  reviewStates: () => request<Record<string, Record<string, ReviewStateName>>>("/findings/review-states"),
  whatIfLayers: () => request<{ layers: WhatIfLayer[]; model_alone: string[] }>("/what-if/layers"),
  whatIf: (off: string[]) => request<WhatIfResult>(`/what-if?off=${encodeURIComponent(off.join(","))}`),
  whatIfEveryLayer: () => request<WhatIfRow[]>("/what-if/every-layer"),
};
