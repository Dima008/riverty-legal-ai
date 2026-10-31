// Safety signals that must not be missed: a suspected prompt injection and a poor scan. They are
// shown as a full-width warning with the page and a button to open it, not as one chip among
// others. Minor flags stay chips (decision 77, design audit).
import { MessageBar, MessageBarBody, MessageBarTitle } from "@fluentui/react-components";
import { api, type DocText, type DocumentInfo } from "../api";
import { useT } from "../i18n";

const INJECTION_FLAGS = ["prompt_injection_suspected", "document_contains_suspected_injection", "quote_in_suspected_injection"];
const OCR_FLAGS = ["low_ocr_quality"];
/** Flags shown as a warning bar; the badges leave them out, so nothing is said twice. */
export const ALERT_FLAGS = new Set([...INJECTION_FLAGS, ...OCR_FLAGS]);
export const flagName = (flag: string) => flag.split(":")[0];

// The same patterns as INJECTION_PATTERNS in pipeline/catalogue.py. The register stores THAT a
// contract contains text addressed to software, not WHERE. The tool looks for the page itself, only
// to offer "Show page n": if no pattern matches here, the warning still shows, without the button.
const INJECTION_PATTERNS = [
  /ignore (all |any )?(previous|prior|above|earlier) instructions/i,
  /disregard (all |any )?(previous|prior|above) (instructions|rules)/i,
  /note to (automated|ai|automatic) (review|system|assistant)/i,
  /(automated|ai) review systems?/i,
  /system prompt/i,
  /ignoriere (alle )?(vorherigen|bisherigen) anweisungen/i,
];

/** The page of the first passage addressed to software: page_offsets holds where each page starts. */
function injectionPage(text: DocText): number | null {
  const starts = INJECTION_PATTERNS.map((p) => text.text.search(p)).filter((i) => i >= 0);
  if (starts.length === 0) return null;
  const at = Math.min(...starts);
  return text.page_offsets.filter((offset) => offset <= at).length || 1;
}

/** The passages addressed to software, cut as in pipeline/catalogue.py injection_spans: from the
 *  line break before a match to the next blank line. Character offsets in the text. */
function injectionSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  for (const pattern of INJECTION_PATTERNS) {
    for (const m of text.matchAll(new RegExp(pattern.source, "gi"))) {
      const at = m.index ?? 0;
      let start = text.lastIndexOf("\n\n", at);
      if (start === -1) start = text.lastIndexOf("\n", at);
      const end = text.indexOf("\n\n", at + m[0].length);
      spans.push([Math.max(start, 0), end === -1 ? text.length : end]);
    }
  }
  return spans;
}

/** Does this passage overlap text addressed to software? The pipeline stores a hint with its
 *  whitespace collapsed (' '.join(text.split())), so the text is collapsed the same way, keeping
 *  where each character came from. */
export function inInjection(text: string, passage: string): boolean {
  const spans = injectionSpans(text);
  const wanted = passage.split(/\s+/).filter(Boolean).join(" ");
  if (spans.length === 0 || !wanted) return false;
  let flat = "";
  const at: number[] = [];             // at[i] = offset of flat[i] in the original text
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) {
      if (flat && !flat.endsWith(" ")) {
        flat += " ";
        at.push(i);
      }
    } else {
      flat += text[i];
      at.push(i);
    }
  }
  const found = flat.indexOf(wanted);
  if (found === -1) return false;
  const from = at[found];
  const to = at[found + wanted.length - 1];
  return spans.some(([s, e]) => from < e && to >= s);
}

/** Highlight boxes that must not look like evidence: the quote or the hint lies in text addressed
 *  to software. For a quote the pipeline says so itself (flag quote_in_suspected_injection); for a
 *  hint ("the clause may exist after all") the tool looks where the hint is. */
export async function suspectHighlight(docId: string, flags: string[]): Promise<boolean> {
  const names = flags.map(flagName);
  if (names.includes("quote_in_suspected_injection")) return true;
  const hint = flags.find((f) => flagName(f) === "signal_despite_absent");
  if (!hint || !names.some((n) => INJECTION_FLAGS.includes(n))) return false;
  const source = await api.text(docId).catch(() => null);
  return !!source && inInjection(source.text, hint.slice(hint.indexOf(":") + 1).trim().replace(/^'|'$/g, ""));
}

export interface Alert {
  kind: "injection" | "ocr";
  page: number | null;          // null: the page is not known, or the document has no page images
  conf?: number | null;         // OCR confidence of that page, in percent
}

/** The warnings for one document, from its flags (and the flags of a run row or finding). */
export async function documentAlerts(doc: DocumentInfo, flags: string[], text: DocText | null = null): Promise<Alert[]> {
  const names = new Set([...doc.flags, ...flags].map(flagName));
  const pages = doc.format !== "txt";             // plain-text contracts (CUAD) have no page view
  const alerts: Alert[] = [];
  if (INJECTION_FLAGS.some((f) => names.has(f))) {
    const source = pages ? text ?? (await api.text(doc.doc_id).catch(() => null)) : null;
    alerts.push({ kind: "injection", page: source ? injectionPage(source) : null });
  }
  if (OCR_FLAGS.some((f) => names.has(f)) || doc.status === "LOW_QUALITY") {
    const worst = doc.pages.filter((p) => p.ocr_conf != null).sort((a, b) => a.ocr_conf! - b.ocr_conf!)[0];
    alerts.push({ kind: "ocr", page: pages && worst ? worst.page_no : null, conf: worst?.ocr_conf ?? doc.ocr_mean_conf });
  }
  return alerts;
}

const TEXT = {
  injection: {
    title: "Text addressed to AI systems",
    page: "Page {page} contains text addressed to AI systems, not to the contract parties – a suspected prompt injection. It is never used as evidence, and two reviewers must approve the finding.",
    doc: "This contract contains text addressed to AI systems, not to the contract parties – a suspected prompt injection. It is never used as evidence, and two reviewers must approve the finding.",
  },
  ocr: {
    title: "Poor scan quality",
    page: "Page {page} was read by text recognition (OCR) with only {conf} % confidence. Compare the finding with the original page before relying on it.",
    doc: "This contract was read by text recognition (OCR) with low confidence. Compare the finding with the original before relying on it.",
  },
};

export function SafetyBars({ alerts, onPage }: { alerts: Alert[]; onPage?: (page: number) => void }) {
  const t = useT();
  if (alerts.length === 0) return null;
  return (
    <div className="safety-bars">
      {alerts.map((a) => (
        <MessageBar key={a.kind} intent="warning" className="safety-bar">
          <MessageBarBody>
            <MessageBarTitle>{t(TEXT[a.kind].title)}</MessageBarTitle>
            {a.page != null
              ? t(TEXT[a.kind].page, { page: a.page, conf: Math.round(a.conf ?? 0) })
              : t(TEXT[a.kind].doc)}
            {/* at the end of the sentence, not on a line of its own: the bar stays two lines high */}
            {a.page != null && onPage && (
              <>
                {" "}
                <button type="button" className="link-btn" onClick={() => onPage(a.page!)}>
                  {t("Show page {page}", { page: a.page })}
                </button>
              </>
            )}
          </MessageBarBody>
        </MessageBar>
      ))}
    </div>
  );
}
