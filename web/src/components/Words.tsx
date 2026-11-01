// The words of a finding (spec section 3, decision 91), the same on every screen: what the text says
// (one word, always with its icon), the next step (the triage level and Legal's decision in one word)
// and why a person looks. They replace the badges, the flag chips and the warning bars.
import type { Finding, ReviewState, RunRow, Triage } from "../api";
import { useT, type T } from "../i18n";
import { nextStep, OPEN_STATES, overruled, statusWord, WHY, type WhyRule } from "../labels";
import { statusColor, StatusIcon } from "./Badges";
import { flagName, type Alert } from "./SafetyBar";
import "../workbench/workbench.css";

/** What the text says: the status icon and its word, e.g. "Not found". `signal`: counted as one of the
 *  few marks of a finding (data-signal, acceptance C1). */
export function StatusWord({ status, law, signal = false }: { status: string; law?: string | null; signal?: boolean }) {
  const t = useT();
  return (
    <span className={`sw sw-${statusColor(status)}`} data-signal={signal ? "status" : undefined}>
      <StatusIcon status={status} />
      {statusWord(status, t, law)}
    </span>
  );
}

/** Where Legal's decision stands. A run row is one; a finding from the register gives its review and triage. */
export interface Standing {
  review: ReviewState;
  triage: Triage;
  sample: boolean;
}

/** The next step: "Confirm", "Review", "Four eyes · 1 of 2", "Confirmed ✓" ... */
export function NextStep({ standing, signal = false }: { standing: Standing; signal?: boolean }) {
  const t = useT();
  const open = OPEN_STATES.includes(standing.review.state);
  return (
    <span className={`ns${open ? "" : " done"}`} data-signal={signal ? "next" : undefined}>
      {nextStep(standing.review, standing.triage, standing.sample, t)}
    </span>
  );
}

/** One reason why a person looks: the short form for a table row, the sentence for the finding card. */
export interface Why {
  id: WhyRule["id"];
  short: string;
  callout: string;
  red: boolean;
  page: number | null;          // injection: the page to show
}

/** What the why lines read: a run row, or a finding of the register with its document. */
export interface WhySubject {
  docId: string;
  status: string;
  modelStatus?: string | null;
  confidence: number | null;
  flags: string[];              // the finding's flags and the document's
  review?: ReviewState | null;
  sample?: boolean;
  docStatus?: string | null;    // LOW_QUALITY: a poor scan
  ocrConf?: number | null;      // the document's mean OCR confidence
}

/** A run row as a why subject. */
export const rowSubject = (r: RunRow): WhySubject => ({
  docId: r.doc_id, status: r.status, modelStatus: r.model_status, confidence: r.confidence, flags: r.flags,
  review: r.review, sample: r.sample, docStatus: r.doc_status, ocrConf: r.ocr_mean_conf,
});

/** A finding of the register as a why subject; the document's flags count too (an injection is a document flag). */
export const findingSubject = (f: Finding, doc: { doc_id: string; flags: string[]; status: string; ocr_mean_conf: number | null },
                               review: ReviewState | null = null): WhySubject => ({
  docId: doc.doc_id, status: f.status, modelStatus: f.model_status, confidence: f.confidence,
  flags: [...f.flags, ...doc.flags], review, docStatus: doc.status, ocrConf: doc.ocr_mean_conf,
});

/** What is known beyond the row: the pages from the document's alerts, and whether the passage that hints
 *  at the clause lies in text addressed to AI systems (then it is no hint). */
export interface WhyContext {
  alerts?: Alert[];
  injectionPage?: number | null;
  suspect?: boolean;
}

/** Every reason why a person looks, in the order of spec 3.3: a table row shows the first, the finding
 *  card all of them. Empty: nothing needs a second look (a routine "Confirm"). */
export function whyLines(s: WhySubject, ctx: WhyContext, t: T, num: (n: number) => string): Why[] {
  const names = s.flags.map(flagName);
  const has = (rule: WhyRule) => !!rule.flags?.some((f) => names.includes(f));
  const injection = ctx.alerts?.find((a) => a.kind === "injection");
  const ocr = ctx.alerts?.find((a) => a.kind === "ocr");
  const out: Why[] = [];
  const add = (rule: WhyRule, short: string, callout: string, page: number | null = null) =>
    out.push({ id: rule.id, short, callout, red: !!rule.red, page });
  for (const rule of WHY) {
    switch (rule.id) {
      case "injection": {
        if (!has(rule)) break;
        const page = injection?.page ?? ctx.injectionPage ?? null;
        if (page == null) {
          add(rule, t("Text addressed to AI systems"), t("This contract contains text addressed to AI systems, not to the contract parties – a suspected prompt injection. It is never used as evidence, and two reviewers must approve the finding."));
        } else {
          add(rule, t(rule.short, { page }), t(rule.callout!, { page }), page);
        }
        break;
      }
      case "contradiction":
        if (has(rule)) add(rule, t(rule.short), t(rule.callout!, { amendment: s.docId }));
        break;
      case "escalated": {
        const e = s.review?.escalated ? s.review.reviews.find((r) => r.decision === "ESCALATED") : undefined;
        if (e) add(rule, t(rule.short, { user: e.reviewer_name }), t(rule.callout!, { user: e.reviewer_name, reason: e.reason ?? "" }));
        break;
      }
      case "poor_scan": {
        if (!has(rule) && s.docStatus !== "LOW_QUALITY") break;
        const conf = s.ocrConf ?? ocr?.conf;
        const short = conf != null ? t(rule.short, { conf: Math.round(conf) }) : t("Poor scan quality");
        const callout = ocr?.page != null && ocr.conf != null
          ? t(rule.callout!, { page: ocr.page, conf: Math.round(ocr.conf) })
          : t("This contract was read by text recognition (OCR) with low confidence. Compare the finding with the original before relying on it.");
        add(rule, short, callout);
        break;
      }
      case "overruled":
        if (s.modelStatus && s.modelStatus !== s.status) add(rule, t(rule.short), overruled(s.modelStatus, s.flags, t));
        break;
      case "hint": {
        // a hint inside text addressed to AI systems is no hint: the injection reason says what it is
        const hint = s.flags.find((f) => flagName(f) === "signal_despite_absent");
        const inInjection = ctx.suspect ?? out.some((w) => w.id === "injection");
        if (hint && !inInjection) {
          const snippet = hint.slice(hint.indexOf(":") + 1).trim().replace(/^'|'$/g, "");
          add(rule, t(rule.short), t(rule.callout!, { snippet }));
        }
        break;
      }
      case "base_missing":
        if (has(rule)) add(rule, t(rule.short), t(rule.short));
        break;
      case "unsure":
        // only when nothing above explains it: then the confidence itself is the reason (0.8 is REVIEW_BELOW
        // in pipeline/portfolio.py: below it a person looks)
        if (s.confidence != null && s.confidence < 0.8 && out.length === 0) {
          add(rule, t(rule.short, { c: num(s.confidence) }), t(rule.callout!, { c: num(s.confidence) }));
        }
        break;
      case "no_law":
        if (s.status === "LAW_UNKNOWN") add(rule, t(rule.short), t(rule.short));
        break;
      case "sample":
        if (s.sample) add(rule, t(rule.short), t(rule.callout!));
        break;
    }
  }
  return out;
}

/** "Not found" for a chip and a legend: OTHER_LAW without a law, the rows may name several. */
export const statusLabel = (status: string, t: T) => (status === "OTHER_LAW" ? t("Other law") : statusWord(status, t));
