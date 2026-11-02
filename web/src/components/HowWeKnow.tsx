// "How we know" (decision 95, spec 3.1): the register's reasons for one contract as short lines - ✓ a check
// that passed, ! a doubt, i information. For a Found they come from the finding's checks; for a Not found
// they say what was read and what was searched; for names, law and copies how the deterministic check works.
// The full layer-by-layer record stays folded below ("How the register decided").
import { CheckmarkCircle16Filled, Info16Regular, Warning16Filled } from "@fluentui/react-icons";
import type { ReactElement } from "react";
import type { DocumentInfo, Finding } from "../api";
import { useFormat, useT, type T } from "../i18n";
import { lawReason } from "../labels";
import type { AnyRow } from "../workbench/answerRows";
import type { Alert } from "./SafetyBar";

type Mark = "pass" | "doubt" | "info";
export interface Line {
  mark: Mark;
  text: string;
}

const OCR_THRESHOLD = 70;      // pipeline/config.py OCR_LOW_QUALITY_CONFIDENCE

interface Input {
  status: string;
  finding: Finding | null;
  row: AnyRow | null;
  doc: DocumentInfo;
  alerts: Alert[];
  suspect: boolean;              // the hint lies in text addressed to AI systems
  absenceWords: string[];        // the playbook's typical wordings (GET /catalogue)
  searched: string[];            // the former names the exact search looked for
  documents: number;             // copies: how many documents were compared
}

const quoted = (words: string[]) => words.slice(0, 3).map((w) => `“${w}”`).join(", ") + (words.length > 3 ? " …" : "");

/** The scan in one line: a text layer, a good scan read by OCR, or a poor scan (a doubt). */
function scanLine(doc: DocumentInfo, t: T, num: (n: number) => string, confidence?: number | null): Line {
  const conf = confidence != null ? ` · ${t("confidence {c}", { c: num(confidence) })}` : "";
  if (doc.status === "LOW_QUALITY") {
    return { mark: "doubt", text: t("Poor scan: OCR {conf} %, below the {threshold} % threshold – a word can be misread. Compare with the page.", { conf: Math.floor(doc.ocr_mean_conf ?? 0), threshold: OCR_THRESHOLD }) };
  }
  if (doc.ocr_mean_conf != null) return { mark: "info", text: t("Scan, read by OCR at {conf} %", { conf: Math.floor(doc.ocr_mean_conf) }) + conf };
  return { mark: "info", text: t("Text layer – no OCR needed") + conf };
}

export function howWeKnow(x: Input, t: T, num: (n: number) => string): Line[] {
  const { status, finding: f, row, doc } = x;
  const out: Line[] = [];
  const layer = (name: string) => f?.layers.find((l) => l.layer === name);
  const injection = x.alerts.find((a) => a.kind === "injection");
  const pages = doc.page_count;

  if (f && f.model_status === "PRESENT" && (status === "PRESENT" || status === "UNCLEAR")) {
    // a passage the model proposed: every check on it, passed or not
    const found = layer("quote_found_in_source");
    const score = f.quote_score ?? (found?.detail?.match(/match ([\d.]+)/)?.[1] ?? "?");
    out.push(found?.passed ? { mark: "pass", text: t("Word for word in the contract (match {score} %)", { score: Math.round(Number(score)) }) }
      : { mark: "doubt", text: t("The passage is not in the contract word for word") });
    out.push(layer("quote_has_clause_vocabulary")?.passed ? { mark: "pass", text: t("It uses the clause's words") }
      : { mark: "doubt", text: t("It has none of the clause's words") });
    const checker = layer("checker_four_eyes");
    if (checker?.passed === true) out.push({ mark: "pass", text: t("A second model call agreed") });
    if (checker?.passed === false) out.push({ mark: "doubt", text: checker.detail ? t("A second model call disagreed: “{reason}”", { reason: checker.detail }) : t("A second model call disagreed") });
    out.push(layer("quote_not_from_suspected_injection")?.passed === false
      ? { mark: "doubt", text: t("It comes from text addressed to AI systems – never evidence") }
      : { mark: "pass", text: t("Not from text addressed to AI systems") });
    if (injection && status === "PRESENT") {
      out.push({ mark: "doubt", text: t("The contract contains text addressed to AI systems (page {page}) – two people approve", { page: injection.page ?? "?" }) });
    }
    out.push(scanLine(doc, t, num, f.confidence));
    return out;
  }

  if (status === "ABSENT" || status === "UNCLEAR") {
    out.push({ mark: "pass", text: pages === 1 ? t("The model read the whole contract (1 page) and found no passage that fits")
      : t("The model read all {n} pages and found no passage that fits", { n: pages }) });
    const signal = layer("no_absence_signal");
    if (signal?.passed === false) {
      out.push(x.suspect
        ? { mark: "doubt", text: t("The only wording that hints at the clause is text addressed to AI systems (page {page}) – never evidence", { page: injection?.page ?? "?" }) }
        : { mark: "doubt", text: t("The text hints at the clause: …{text}… – read the marked passage", { text: (signal.detail ?? "").replace(/^'|'$/g, "") }) });
    } else if (x.absenceWords.length) {
      out.push({ mark: "pass", text: t("None of {k} typical wordings in the whole text: {words}", { k: x.absenceWords.length, words: quoted(x.absenceWords) }) });
    }
    if (injection && !x.suspect) {
      out.push({ mark: "doubt", text: t("The contract contains text addressed to AI systems (page {page}) – two people approve", { page: injection.page ?? "?" }) });
    }
    out.push(scanLine(doc, t, num, f?.confidence));
    return out;
  }

  if (["LEGACY_NAME", "NAME_NOT_RULED_OUT", "NO_FORMER_NAME", "NAME_RESOLVED"].includes(status)) {
    const read = pages === 1 ? t("1 page") : t("{n} pages", { n: pages });
    out.push({ mark: "pass", text: t("Exact search over the whole text ({pages}, any capitalisation) for: {names}", { pages: read, names: x.searched.join(" · ") }) });
    const hits = row?.hits?.length ?? 0;
    if (status === "NO_FORMER_NAME" || status === "NAME_NOT_RULED_OUT") out.push({ mark: "pass", text: t("No hit") });
    if (status === "NAME_RESOLVED") out.push({ mark: "pass", text: t("{n} hits – each replaced by amendment {id}", { n: hits, id: row?.hits?.[0]?.resolved_by ?? "?" }) });
    if (status === "LEGACY_NAME") out.push({ mark: "doubt", text: t("{n} hits – each marked on its page", { n: hits }) });
    out.push(doc.status === "LOW_QUALITY"
      ? { mark: "doubt", text: t("OCR {conf} % is below the {threshold} % threshold: the search cannot prove that no name is there", { conf: Math.floor(doc.ocr_mean_conf ?? 0), threshold: OCR_THRESHOLD }) }
      : { mark: "pass", text: t("A good scan: text layer or OCR at {threshold} % or more", { threshold: OCR_THRESHOLD }) });
    // the model's reading of our company: never evidence. On a poor scan it can be the only sign of a
    // former name the search missed (H01: OCR wrote "Arfto financial Solutions") - then it is a doubt
    const own = doc.metadata?.own_entity_name;
    if (own) {
      const former = status === "NAME_NOT_RULED_OUT" && x.searched.some((n) => own.toLowerCase().includes(n.toLowerCase()));
      out.push({ mark: former ? "doubt" : "info", text: t("The model reads our company as {name} – a reading, not evidence", { name: own }) });
    }
    return out;
  }

  if (["OTHER_LAW", "LAW_UNKNOWN", "LAW_NOT_CONFIRMED", "SAME_LAW", "SAME_LAW_NOT_CHECKED"].includes(status)) {
    const law = row?.governing_law ?? doc.metadata?.governing_law;
    const flags = row?.law_flags !== undefined ? row.law_flags : doc.metadata?.law_flags;   // null: not checked yet
    if (status === "LAW_UNKNOWN") out.push({ mark: "doubt", text: t("No choice of law found in the contract") });
    else out.push({ mark: "info", text: t("The register read: {law} law", { law: law ?? "?" }) });
    if (flags == null && status !== "LAW_UNKNOWN") {
      out.push({ mark: status === "OTHER_LAW" ? "info" : "doubt", text: t("No passage checked yet: this contract was read before the register quoted the law (F26)") });
    } else if (flags && flags.length === 0) {
      out.push({ mark: "pass", text: t("The quote is in the contract") }, { mark: "pass", text: t("It names the law's country") });
    } else if (flags && row?.reason) {
      out.push({ mark: "doubt", text: lawReason(row.reason, t) });
    }
    out.push(scanLine(doc, t, num));
    return out;
  }

  if (["DUPLICATE", "ORIGINAL", "UNIQUE"].includes(status)) {
    if (status === "DUPLICATE") {
      out.push(row?.match === "near_identical"
        ? { mark: "pass", text: t("At least 98 % the same text, same party") }
        : { mark: "pass", text: t("Identical text after normalising (fingerprint)") });
      out.push({ mark: "pass", text: t("Counted once – the original {id} is evaluated", { id: row?.duplicate_of ?? "?" }) });
    } else {
      out.push({ mark: "pass", text: t("Fingerprint compared with all {n} documents", { n: x.documents }) });
      // a poor scan: a misread text can hide a copy (F43) - the scan line says it as a doubt
      if (doc.status === "LOW_QUALITY") out.push(scanLine(doc, t, num));
    }
    return out;
  }
  return out;
}

const ICON: Record<Mark, ReactElement> = {
  pass: <CheckmarkCircle16Filled />,
  doubt: <Warning16Filled />,
  info: <Info16Regular />,
};

/** The lines as a list, with a heading: "How we know" or, for an absence, "How we know it is missing". */
export function HowWeKnow({ input, missing }: { input: Input; missing: boolean }) {
  const t = useT();
  const { num } = useFormat();
  const lines = howWeKnow(input, t, num);
  if (lines.length === 0) return null;
  return (
    <section className="fc-how" aria-label={missing ? t("How we know it is missing") : t("How we know")}>
      <div className="fc-label">{missing ? t("How we know it is missing") : t("How we know")}</div>
      <ul>
        {lines.map((l, i) => (
          <li key={i} className={`how-${l.mark}`}>
            <span className="how-icon" aria-label={t(l.mark === "pass" ? "passed" : l.mark === "doubt" ? "doubt" : "information")}>{ICON[l.mark]}</span>
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
