// Which contracts a filter keeps - one rule per filter, shared by the contract register (looking
// things up) and the Workbench (which contracts a question runs on), so the two cannot drift apart.
// A filter never drops a contract silently. The register shows what matches and names the
// contracts a filter cannot judge (no law, no date); a question keeps them in scope and names
// them too (D9, recall first): a contract without a governing law could be a German-law contract.
import type { MatrixRow, Plan, ReviewStateName } from "./api";
import type { T } from "./i18n";
import { scopeText } from "./labels";

// ---- one row against one filter

/** The country of the governing law: laws are ISO codes with the state for federal countries (US-NY), compared by country (F16). */
export const country = (r: MatrixRow) => r.governing_law?.split("-")[0] ?? null;

// Compare years, not dates: the filters offer years, and a date with an unknown month
// ("2004-00-00", C02) would fall before "2004-01-01" and drop out silently.
export const year = (r: MatrixRow) => r.effective_date?.slice(0, 4) ?? null;

/** law: "" any, "none" = no governing law found, else a country code. */
export const lawOk = (r: MatrixRow, law: string) => !law || (law === "none" ? r.governing_law == null : country(r) === law);

/** from / to: years, e.g. "2020"; a contract without a date does not match a date filter. */
export function dateOk(r: MatrixRow, from: string, to: string): boolean {
  const y = year(r);
  return (!from && !to) || (y != null && (!from || y >= from) && (!to || y <= to));
}

/** "Search ID or party": terms separated by commas; a term matches a part of the ID or of the party name, in any case. */
export function searchMatch(r: MatrixRow, search: string): boolean {
  const terms = search.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return terms.length === 0 ||
    terms.some((q) => r.doc_id.toLowerCase().includes(q) || (r.counterparty_name ?? "").toLowerCase().includes(q));
}

// a clause and what it says; the labels are English keys, translated where they are shown
export const CLAUSE_STATUS = [
  { key: "GAP", label: "not found or unclear" },
  { key: "ABSENT", label: "not found" },
  { key: "UNCLEAR", label: "unclear" },
  { key: "PRESENT", label: "clause found" },
];
export function clauseOk(r: MatrixRow, clause: string, clauseStatus: string): boolean {
  if (!clause) return true;
  const c = r.cells[clause];
  return clauseStatus === "GAP" ? !c || c.status !== "PRESENT" : c?.status === clauseStatus;  // no finding = a gap
}

// a poor scan without an exact match may still name a former company (F19): never filtered out
const nameToCheck = (r: MatrixRow) => r.former_names.open > 0 || r.former_names.not_ruled_out;

/** A contract to check for a former name - the same rule as question Q2 (D14): it names a former company,
 *  or a poor scan cannot rule one out. Copies and amendments count through their original. */
export const formerNameToCheck = (r: MatrixRow) => nameToCheck(r) && !r.duplicate_of && !r.is_amendment;

// "Only ...": the switch turns on "any" (gaps or former names); a link can ask for the narrower
// two (#/tool/register?type=all&only=gaps)
export type Only = "" | "any" | "gaps" | "names";
export const ONLY_LABEL: Record<Only, string> = {
  "": "Only with gaps or former names",
  any: "Only with gaps or former names",
  gaps: "Only with a required clause not found or unclear",
  names: "Only still naming a former company",
};
export const onlyMatches = (r: MatrixRow, only: Only) =>
  only === "gaps" ? r.gaps.length > 0
  : only === "names" ? nameToCheck(r)
  : only === "any" ? r.gaps.length > 0 || nameToCheck(r) : true;

// Legal's decision on the gaps of a contract (decision 73)
export type ReviewFilter = "" | "open" | "reviewed" | "flagged";
export const REVIEW_FILTER: { key: ReviewFilter; label: string }[] = [
  { key: "", label: "any" },
  { key: "open", label: "Gaps not yet reviewed" },
  { key: "reviewed", label: "Gaps reviewed" },
  { key: "flagged", label: "Escalated or disputed" },
];
const FINAL: ReviewStateName[] = ["CONFIRMED", "CORRECTED", "REJECTED"];

export function reviewMatches(r: MatrixRow, states: Record<string, ReviewStateName> | undefined, f: ReviewFilter): boolean {
  if (!f) return true;
  if (f === "flagged") return Object.values(states ?? {}).some((s) => s === "ESCALATED" || s === "DISPUTED");
  const open = r.gaps.filter((k) => !states?.[k] || !FINAL.includes(states[k]));
  return f === "open" ? open.length > 0 : r.gaps.length > 0 && open.length === 0;
}

// ---- which contracts a question runs on (the plan card's "Narrow down", 4.1)

/** The filters of "Narrow down"; "" = not set. The type is separate: it comes from the question. */
export interface ScopeFilters {
  law: string;       // a country code, or "none" = no governing law found
  from: string;      // years, e.g. "2020"
  to: string;
  search: string;    // "Party or IDs", terms separated by commas
}
export const NO_FILTERS: ScopeFilters = { law: "", from: "", to: "", search: "" };
export const hasFilters = (f: ScopeFilters) => !!(f.law || f.from || f.to || f.search);

// Not read yet: no metadata, or the pipeline is still reading it (or failed to) - every filter keeps it.
const unread = (r: MatrixRow) => r.doc_type == null || (r.stage != null && r.stage !== "ready");

// matched and keptIn keep the order of the rows (the matrix comes sorted by id)
export interface Applied {
  ids: string[];                                // the scope: matched + kept in, sorted
  matched: string[];                            // match every filter
  keptIn: { doc_id: string; why: string }[];    // a filter cannot judge them; why is an English key ("no law found")
}

/** The contracts of a type (""= every type) that the filters keep. Recall first: a contract a filter
 *  cannot judge - not read yet, type unknown, no law, no date - stays in and is named. */
export function applyScope(rows: MatrixRow[], type: string, f: ScopeFilters): Applied {
  const matched: string[] = [];
  const keptIn: Applied["keptIn"] = [];
  for (const r of rows) {
    if (unread(r)) {
      keptIn.push({ doc_id: r.doc_id, why: r.stage === "failed" ? "could not be read" : "not read yet" });
      continue;
    }
    if (type && r.doc_type !== type && r.doc_type !== "unknown") continue;
    if (!searchMatch(r, f.search)) continue;     // a deliberate pick: what it does not name is left out
    const why: string[] = [];
    if (type && r.doc_type === "unknown") why.push("type not known");
    if (f.law && f.law !== "none" && r.governing_law == null) why.push("no law found");
    else if (!lawOk(r, f.law)) continue;
    if ((f.from || f.to) && year(r) == null) why.push("no date found");
    else if (!dateOk(r, f.from, f.to)) continue;
    if (why.length) keptIn.push({ doc_id: r.doc_id, why: why.join(", ") });
    else matched.push(r.doc_id);
  }
  return { ids: [...matched, ...keptIn.map((k) => k.doc_id)].sort(), matched, keptIn };
}

// The checks with a doc_type parameter (pipeline/portfolio.py CHECKS); "duplicates" has none.
const TYPED_CHECKS = ["missing_clause", "legacy_names", "governing_law_not"];

/** "C07, H01, M03 +3": a recorded value stays within the server's 100 characters (portfolio.MAX_FILTER_TEXT). */
function cut(ids: string[], max = 100): string {
  const shown: string[] = [];
  for (const id of ids) {
    if ([...shown, id].join(", ").length + ` +${ids.length}`.length > max) break;
    shown.push(id);
  }
  return shown.join(", ") + (shown.length < ids.length ? ` +${ids.length - shown.length}` : "");
}

/** The plan that is sent. Only the type: no scope - the server's own rule (the type plus unknown types),
 *  so the answer says "every merchant agreement". Any other filter: the ids the filters keep, and the
 *  filters as a record - shown in the answer and stored in the audit, never applied again (decision 75).
 *  An empty doc_ids means nothing matches: do not send it. */
export function planFor(plan: Plan, type: string, f: ScopeFilters, rows: MatrixRow[]): Plan {
  const typed = TYPED_CHECKS.includes(plan.check);
  const params = { ...plan.params };
  if (typed && type) params.doc_type = type;
  else delete params.doc_type;
  if (!hasFilters(f) && (typed || !type)) return { check: plan.check, params };
  const s = applyScope(rows, type, f);
  const filters: Record<string, string> = {};
  if (type) filters.type = type;
  if (f.law) filters.law = f.law;
  if (f.from) filters.from = f.from;
  if (f.to) filters.to = f.to;
  if (f.search) filters.search = f.search.slice(0, 100);
  if (s.keptIn.length) filters.kept_in = cut(s.keptIn.map((k) => k.doc_id));
  return { check: plan.check, params, scope: { doc_ids: s.ids, filters } };
}

/** The type and filters a run recorded, to apply them again (the freshness check, 5.4). null: the
 *  scope was picked another way (older register selections: by hand, by clause or review state). */
export function readRecorded(filters: Record<string, string>): [string, ScopeFilters] | null {
  const known = ["type", "law", "from", "to", "search", "kept_in"];
  if (Object.keys(filters).some((k) => !known.includes(k))) return null;
  const law = filters.law === "not found" ? "none" : filters.law ?? "";     // older register selections wrote "not found"
  return [filters.type ?? "", { law, from: filters.from ?? "", to: filters.to ?? "", search: filters.search ?? "" }];
}

/** "law: NL · dated from: 2020" - the filters that are set, in the chosen language. */
export const describe = (f: ScopeFilters, t: T) =>
  scopeText(Object.fromEntries(Object.entries(f).filter(([, v]) => v)), t);

// ---- the Workbench address (4.3): it prefills step 1, nothing runs

/** q: an example question (Q1-Q8); check + clause: a question built from them. type: "" every type
 *  ("all" in the address), null = not given, so the question's own type applies. */
export interface Prefill {
  q: string;
  check: string;
  clause: string;
  type: string | null;
  filters: ScopeFilters;
}

/** The parameters of a Workbench address; anything malformed is ignored (a broken link prefills less). */
export function readParams(params: URLSearchParams): Prefill {
  const get = (k: string) => (params.get(k) ?? "").trim();
  const key = (k: string) => (/^\w{1,40}$/.test(get(k)) ? get(k) : "");     // Q2, missing_clause, merchant_agreement
  const yearOf = (k: string) => (/^\d{4}$/.test(get(k)) ? get(k) : "");
  const law = get("law");
  return {
    q: key("q"),
    check: key("check"),
    clause: key("clause"),
    type: params.has("type") ? (get("type") === "all" ? "" : key("type")) : null,
    filters: {
      law: /^[A-Za-z]{2}$/.test(law) ? law.toUpperCase() : law === "none" ? "none" : "",
      from: yearOf("from"),
      to: yearOf("to"),
      search: get("search").slice(0, 100),
    },
  };
}

/** The other way round: "type=all&law=NL" with only the parameters that are set. */
export function toParams(p: { q?: string; check?: string; clause?: string; type?: string | null; filters?: Partial<ScopeFilters> }): string {
  const out = new URLSearchParams();
  if (p.q) out.set("q", p.q);
  if (p.check) out.set("check", p.check);
  if (p.clause) out.set("clause", p.clause);
  if (p.type != null) out.set("type", p.type || "all");
  for (const [k, v] of Object.entries(p.filters ?? {})) if (v) out.set(k, v);
  return out.toString();
}
