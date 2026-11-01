// What is new about a contract, in the words of the talk's live-add card (spec 3.4): when it arrived,
// how far the pipeline is, and what a person has to look at. One builder for the header pill, its
// popover and the "New in the register" strip of step 1, so the three always say the same.
import type { MatrixRow } from "../api";
import type { Lang, T } from "../i18n";
import { DOC_TYPE_SINGULAR, STAGE_WORD } from "../labels";

export interface NewLine {
  text: string;
  warn?: boolean;          // a person has to look: amber
}

const LOCALE: Record<Lang, string> = { en: "en-GB", de: "de-DE" };

/** "09:01" today, "31 Oct, 17:20" on another day - local time, as in the audit log. */
export function arrivedAt(ts: string, lang: Lang): string {
  const d = new Date(ts);
  const today = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(LOCALE[lang], today
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** The model is still reading it - also for an older API without `stage`: no metadata yet. */
export const isReading = (r: MatrixRow) => r.stage === "reading" || (r.stage == null && r.doc_type == null);

// "Data processing agreement (Art. 28 GDPR)" -> "Data processing agreement", as on the card
const short = (label: string) => label.replace(/\s*\(.*\)$/, "");

/** The lines for one new contract: arrival, stage or type, then what goes to a person. The findings are
 *  named only once the contract is read; a poor scan is known before that (it comes from OCR). */
export function newLines(r: MatrixRow, clauses: Record<string, { label: string }>, t: T, lang: Lang): NewLine[] {
  const lines: NewLine[] = [];
  if (r.ingested_at) lines.push({ text: t("arrived {time}", { time: arrivedAt(r.ingested_at, lang) }) });
  if (r.stage === "failed") lines.push({ text: t(STAGE_WORD.failed), warn: true });
  else if (isReading(r)) lines.push({ text: t(STAGE_WORD.reading) });
  else if (r.doc_type && DOC_TYPE_SINGULAR[r.doc_type]) {
    // "merchant agreement" in English, as the card says it; German nouns keep their capital
    const type = t(DOC_TYPE_SINGULAR[r.doc_type]);
    lines.push({ text: lang === "en" ? type.toLowerCase() : type });
  }
  if (r.ingest_status === "LOW_QUALITY") lines.push({ text: t("poor scan → a person"), warn: true });
  if (r.stage === "failed" || isReading(r)) return lines;

  // recall first: not found and unclear are both named, each under its own words (playbook order)
  const required = (status: string) => Object.keys(clauses)
    .filter((k) => r.cells[k]?.required && r.cells[k].status === status)
    .map((k) => short(t(clauses[k].label)));
  const notFound = required("ABSENT");
  const unclear = required("UNCLEAR");
  if (notFound.length) lines.push({ text: t("not found: {clauses}", { clauses: notFound.join(", ") }) });
  if (unclear.length) lines.push({ text: t("unclear → a person: {clauses}", { clauses: unclear.join(", ") }) });
  const open = r.former_names.open;
  if (open > 0) lines.push({ text: open === 1 ? t("1 former name") : t("{n} former names", { n: open }), warn: true });
  else if (r.former_names.not_ruled_out) lines.push({ text: t("former name: cannot be ruled out – a person checks"), warn: true });
  if (r.flags.some((f) => f.includes("injection"))) lines.push({ text: t("hidden instruction → four eyes"), warn: true });
  return lines;
}
