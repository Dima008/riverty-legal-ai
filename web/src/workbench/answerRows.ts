// The answer as one list (decision 95): the reported rows, the unreported rows and the excluded contracts,
// each with its light. The lanes, the list "To decide" and the rail of step 4 are all drawn from it, so
// they always show the same contracts in the same colours. The light comes from the server
// (pipeline/portfolio.py light); an older answer without it falls back to lightOf(status).
import type { Run, RunRow, UnreportedRow } from "../api";
import { lightOf, type Lit } from "../components/Badges";
import type { T } from "../i18n";
import { exclusionReason, nextStep, OPEN_STATES, statusWord } from "../labels";

export type AnyRow = RunRow | UnreportedRow;
export type Lane = Lit | "older";

/** One contract of the answer. kind: reported (decided in step 4), unreported (mostly green, nothing to
 *  decide), excluded (named with the reason), older (an answer from before the traffic light). */
export interface Item {
  id: string;
  kind: "reported" | "unreported" | "excluded" | "older";
  lane: Lane;
  row: AnyRow | null;
  reason: string | null;            // excluded: the server's reason (a fixed template)
}

export const isReported = (r: AnyRow): r is RunRow => "review" in r;

const ORDER: Record<Lane, number> = { red: 0, orange: 1, green: 2, older: 3, excluded: 4 };

export function answerItems(run: Run): Item[] {
  const items: Item[] = [
    ...run.rows.map((r): Item => ({ id: r.doc_id, kind: "reported", lane: r.light ?? lightOf(r.status), row: r, reason: null })),
    ...(run.unreported ?? []).map((r): Item => ({ id: r.doc_id, kind: "unreported", lane: r.light, row: r, reason: null })),
    ...run.coverage.excluded.map((e): Item => ({ id: e.doc_id, kind: "excluded", lane: "excluded", row: null, reason: e.reason })),
  ];
  if (!run.unreported) {
    // an answer from before the traffic light stored only the ids of the contracts it did not report
    const known = new Set(items.map((i) => i.id));
    for (const id of run.coverage.checked_ids ?? []) {
      if (!known.has(id)) items.push({ id, kind: "older", lane: "older", row: null, reason: null });
    }
  }
  // red first, then orange, green, excluded; by ID inside each colour - a decision never moves a tile
  return items.sort((a, b) => ORDER[a.lane] - ORDER[b.lane] || a.id.localeCompare(b.id));
}

/** How many contracts are red, orange and green. The server counts them (run.lights); an answer from before
 *  the traffic light has no count, so it is counted here from its reported rows (its green ones are "older"). */
export const lightsOf = (run: Run, items: Item[]) =>
  run.lights ?? { red: items.filter((i) => i.lane === "red").length, orange: items.filter((i) => i.lane === "orange").length, green: 0 };

/** Red and orange go to a person; green and excluded need no decision. */
export const toDecide = (i: Item) => i.lane === "red" || i.lane === "orange";

/** Legal's decision on the row: the run's review for a reported row, the finding's for an unreported clause. */
export const legalOf = (i: Item) => (i.row ? (isReported(i.row) ? i.row.review : i.row.legal ?? null) : null);

/** Still open: a person can decide it and nobody has finished. A "not checked yet" law row can take no
 *  decision (nothing can be recorded), so it is never open. */
export function isOpen(i: Item): boolean {
  const legal = legalOf(i);
  if (i.kind === "reported") return !!legal && OPEN_STATES.includes(legal.state);
  return i.kind === "unreported" && i.lane === "orange" && !!legal && OPEN_STATES.includes(legal.state);
}

/** The list's chips: "To decide" (red + orange), one colour, or every contract in scope. */
export type Filter = "todo" | "red" | "orange" | "green" | "all";
export const passes = (i: Item, f: Filter) => f === "all" || (f === "todo" ? toDecide(i) : i.lane === f);

/** The word of one contract (spec 2.2): the shape follows the light, the word follows the analysis. */
export function itemWord(i: Item, t: T): string {
  if (i.kind === "excluded") return t("Excluded");
  if (i.kind === "older" || !i.row) return t("Evaluated – details not stored");
  const r = i.row;
  const why = r.light_why ?? "status";
  switch (r.status) {
    case "ABSENT":
      return why === "poor_scan" ? t("Not found – poor scan") : t("Not found");
    case "PRESENT":
      return why === "not_sure" ? t("Found – a person checks")
        : why === "legal" ? t("Found – Legal disagrees")
        : why === "poor_scan" ? t("Found – poor scan")
        : why === "legal_confirmed" ? t("Found – confirmed by Legal") : t("Found");
    case "LEGACY_NAME":
      return t("Former name: {name}", { name: r.hits?.[0]?.name ?? "?" });
    case "NAME_RESOLVED":
      return t("Resolved by {id}", { id: r.hits?.[0]?.resolved_by ?? "?" });
    case "SAME_LAW":
      return t("{law} law – passage checked", { law: r.governing_law ?? "?" });
    case "SAME_LAW_NOT_CHECKED":
      return t("{law} law – not checked yet", { law: r.governing_law ?? "?" });
    case "DUPLICATE":
      return t("Copy of {id}", { id: r.duplicate_of ?? "?" });
    case "ORIGINAL":
      return t("Original – copy: {ids}", { ids: (r.copies ?? []).join(", ") });
    case "UNIQUE":
      return why === "poor_scan" ? t("No copy found – poor scan") : t("Unique");
    default:          // UNCLEAR, NAME_NOT_RULED_OUT, NO_FORMER_NAME, OTHER_LAW, LAW_UNKNOWN, LAW_NOT_CONFIRMED, UNIQUE
      return statusWord(r.status, t, r.governing_law);
  }
}

// an answer from before the traffic light did not store the page count: then the count is left out
const pagesText = (n: number | null | undefined, t: T) => (n == null ? "" : n === 1 ? t("1 page") : t("{n} pages", { n }));
const ocrText = (r: AnyRow, t: T) => (r.ocr_mean_conf != null ? t("scan, OCR {conf} %", { conf: Math.floor(r.ocr_mean_conf) }) : "");

/** "How we know", short - the list's second line when no reason why a person looks applies (Words.tsx
 *  whyLines comes first). Spec 3.1, left column. */
export function howShort(i: Item, t: T, searched: number): string {
  if (i.kind === "excluded") return exclusionReason(i.reason ?? "", t);
  if (!i.row) return "";
  const r = i.row;
  const scan = r.doc_status === "OCR_DONE" || r.doc_status === "LOW_QUALITY" ? ocrText(r, t) : "";
  switch (r.status) {
    case "ABSENT":
      if (r.light_why === "poor_scan") return t("poor scan, OCR {conf} %", { conf: Math.floor(r.ocr_mean_conf ?? 0) });
      return [t("whole contract read"), pagesText(r.page_count, t), scan].filter(Boolean).join(" · ");
    case "UNCLEAR":
      return r.model_status === "PRESENT" ? t("proposed passage rejected") : t("the register cannot settle it");
    case "PRESENT":
      return [r.section, r.page != null && t("page {n}", { n: r.page })].filter(Boolean).join(" · ");
    case "LEGACY_NAME":
    case "NAME_RESOLVED": {
      const pages = [...new Set((r.hits ?? []).map((h) => h.page))].join(", ");
      // the word already names the name: here only where it is
      return r.status === "NAME_RESOLVED" ? t("former name replaced by {id}", { id: r.hits?.[0]?.resolved_by ?? "?" }) : t("page {n}", { n: pages });
    }
    case "NAME_NOT_RULED_OUT":
      return t("0 hits · poor scan, OCR {conf} %", { conf: Math.floor(r.ocr_mean_conf ?? 0) });
    case "NO_FORMER_NAME":
      return t("{k} names searched · 0 hits", { k: searched });
    case "SAME_LAW_NOT_CHECKED":
      return t("no quote yet (read with extract-v2)");
    case "SAME_LAW":
      return r.law_page != null ? t("page {n}", { n: r.law_page }) : "";
    case "OTHER_LAW":
      return r.law_flags == null ? t("no quote yet (read with extract-v2)")
        : r.law_page != null ? t("page {n}", { n: r.law_page }) : "";
    case "DUPLICATE":
      return r.match === "near_identical" ? t("at least 98 % the same text as {id}", { id: r.duplicate_of ?? "?" })
        : t("same text as {id}", { id: r.duplicate_of ?? "?" });
    case "ORIGINAL":
      return t("its copy is counted once");
    case "UNIQUE":
      return r.light_why === "poor_scan" ? t("poor scan, OCR {conf} %", { conf: Math.floor(r.ocr_mean_conf ?? 0) })
        : t("no other document with this text");
    default:
      return "";
  }
}

/** The next step on the list's first line: Legal's step, or "No decision" for green. */
export function itemNext(i: Item, t: T): { text: string; open: boolean } {
  const legal = legalOf(i);
  if (i.kind === "reported" && i.row && isReported(i.row)) {
    return { text: nextStep(i.row.review, i.row.triage, i.row.sample, t), open: isOpen(i) };
  }
  if (i.kind === "unreported" && i.row && legal && (i.lane === "orange" || legal.state !== "FOUND")) {
    return { text: nextStep(legal, i.row.triage ?? "REVIEW", false, t), open: isOpen(i) };
  }
  if (i.lane === "orange") return { text: t("Read the page"), open: false };
  if (i.lane === "excluded") return { text: "–", open: false };
  return { text: t("No decision"), open: false };
}

/** The lanes of one answer (spec 1.2): red, orange, the green ones, older, excluded - each with its word and
 *  the line under it. The first green lane always shows (also with 0); a second green lane ("Resolved by an
 *  amendment", "Original") only when it has a contract. */
export interface LaneSpec {
  key: string;
  lane: Lane;
  word: string;
  sub: string;
  items: Item[];
}

const GREEN_LANES: Record<string, [string, string, string][]> = {     // [status, word, line]
  missing_clause: [["PRESENT", "Found", "positive, with the passage"]],
  legacy_names: [["NO_FORMER_NAME", "No former name", "none of the names in the text"],
                 ["NAME_RESOLVED", "Resolved", "by an amendment"]],
  governing_law_not: [["SAME_LAW", "{law} law", "with the checked passage"]],
  duplicates: [["UNIQUE", "Unique", "no other document has this text"], ["ORIGINAL", "Original", "its copy is counted once"]],
};
const RED_ORANGE: Record<string, [string, string, string, string]> = {   // red word, red line, orange word, orange line
  missing_clause: ["Not found", "whole contract read", "Unclear", "a person looks"],
  legacy_names: ["Former name", "exact match in the text", "Cannot rule out", "poor scan – a person looks"],
  governing_law_not: ["Other law", "another law than {law}", "Not confirmed", "a person reads the page"],
  duplicates: ["Copy", "counted once", "Cannot rule out", "poor scan – a person looks"],
};

export function lanes(run: Run, items: Item[], t: T): LaneSpec[] {
  const check = run.plan.check;
  const law = run.plan.params.law ?? "";
  const [redWord, redSub, orangeWord, orangeSub] = RED_ORANGE[check] ?? RED_ORANGE.missing_clause;
  const greens = GREEN_LANES[check] ?? GREEN_LANES.missing_clause;
  const green = items.filter((i) => i.lane === "green");
  const older = items.filter((i) => i.lane === "older");
  const out: LaneSpec[] = [
    { key: "red", lane: "red", word: t(redWord), sub: t(redSub, { law }), items: items.filter((i) => i.lane === "red") },
    { key: "orange", lane: "orange", word: t(orangeWord), sub: t(orangeSub), items: items.filter((i) => i.lane === "orange") },
  ];
  greens.forEach(([status, word, sub], n) => {
    // the first green lane also takes a green status the table does not know: nothing drops out
    const mine = green.filter((i) => i.row?.status === status || (n === 0 && !greens.some(([s]) => s === i.row?.status)));
    // an older answer did not store its green contracts: no empty "Found" lane, they are in "Evaluated"
    if ((n === 0 && !older.length) || mine.length) out.push({ key: `green-${status}`, lane: "green", word: t(word, { law }), sub: t(sub), items: mine });
  });
  if (older.length) out.push({ key: "older", lane: "older", word: t("Evaluated"), sub: t("details not stored"), items: older });
  const excluded = items.filter((i) => i.lane === "excluded");
  if (excluded.length) out.push({ key: "excluded", lane: "excluded", word: t("Excluded"), sub: t("named, with the reason"), items: excluded });
  return out;
}

/** The answer in two sentences (spec 1.2), per analysis - whole sentences as keys, because German declines. */
export function headline(run: Run, items: Item[], t: T, clause: string): [string, string] {
  const l = lightsOf(run, items);
  const n = run.coverage.checked;
  const p = { r: l.red, o: l.orange, g: l.green, n, clause, law: run.plan.params.law ?? "",
              k: (run.unreported ?? []).filter((r) => r.status === "NAME_RESOLVED").length };
  if (!run.unreported) {
    // older than the traffic light: only the reported rows have a colour
    return [t("{r} red, {o} orange – the other contracts were evaluated, details not stored", p),
            t("Ask again to see every contract with its evidence.")];
  }
  switch (run.plan.check) {
    case "missing_clause":
      return run.intent === "find"
        ? [t("{clause}: found in {g} of {n} contracts – with the passage", p), t("{r} lack it, {o} are unclear – a person decides those.", p)]
        : [t("{clause}: not found in {r} of {n} contracts", p), t("{o} more are unclear – a person looks. {g} contain it, with the passage.", p)];
    case "legacy_names":
      return [t("{r} of {n} contracts still name a former company", p),
              t("{o} cannot be ruled out (poor scan). {g} name none – {k} of them resolved by an amendment.", p)];
    case "governing_law_not":
      return [t("{r} of {n} contracts are under another law than {law}", p),
              t("{o} are not confirmed – a person looks. {g} are under {law} law, with the checked passage.", p)];
    default:
      return [t("{r} of {n} documents are copies of another", p),
              t("{g} are originals or unique – compared with all {n} documents.", p)];
  }
}
