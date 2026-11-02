// One contract's finding as a card (decision 95, spec 1.3), the same in the Workbench - with the decision below
// it - and in the contract file - read-only, with Legal's decision as one line (prop `legal`). From top to
// bottom: what it is about, the verdict and the next step, why a person looks (red and orange only), the
// evidence (the checked passage, the passage the checks rejected, or "Not in this contract"), how we know,
// what we looked for, and folded away how the register decided. The right column is never empty (E5).
import { ChevronRight16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, type ClauseSpec, type DocumentInfo, type Finding, type FindingReviewState, type ReviewState } from "../api";
import { useFormat, useLang, useT, type T } from "../i18n";
import { exclusionReason, statusWord, warningLabels } from "../labels";
import { workbenchHref } from "../routing";
import { itemWord, type AnyRow, type Item } from "../workbench/answerRows";
import { lightOf } from "./Badges";
import type { Look } from "./evidence";
import { Checks, Quote } from "./Finding";
import { HowWeKnow } from "./HowWeKnow";
import type { Alert } from "./SafetyBar";
import { findingSubject, NextStep, rowSubject, StatusWord, whyLines, type Standing } from "./Words";
import "../workbench/workbench.css";

interface Props {
  doc: DocumentInfo;
  finding: Finding | null;          // a clause finding; null for a former name, the law or a copy (then `row` says it)
  row?: AnyRow | null;              // the answer's row: its status, the name hits, the law, the copies
  item?: Item | null;               // the answer's contract: its light and kind (decision 95)
  check?: string;                   // the analysis (run.plan.check)
  clause?: ClauseSpec | null;       // the playbook entry: definition and absence wordings
  searched?: string[];              // the former names the exact search looked for
  documents?: number;               // copies: how many documents were compared
  standing?: Standing | null;       // where Legal's decision stands, shown as the next step
  next?: string | null;             // the next step when nothing can be decided ("No decision needed")
  alerts?: Alert[];                 // the document's alerts: the page of an injection, the worst OCR page
  suspect?: boolean;                // the hint lies in text addressed to AI systems
  look?: Look;                      // how the passage is marked on the page
  onPage?: (page: number) => void;  // "Show on page"
  onName?: (name: string, page: number) => void;   // mark one former name on its page
  onOpenDoc?: (docId: string) => void;             // open another contract (the original of a copy, an amendment)
  legal?: boolean;                  // the contract file: Legal's decision as a line, and "Decide in the Workbench →"
}

const NAME_STATUSES = ["LEGACY_NAME", "NAME_NOT_RULED_OUT", "NO_FORMER_NAME", "NAME_RESOLVED"];
const LAW_STATUSES = ["OTHER_LAW", "LAW_UNKNOWN", "LAW_NOT_CONFIRMED", "SAME_LAW", "SAME_LAW_NOT_CHECKED"];
const COPY_STATUSES = ["DUPLICATE", "ORIGINAL", "UNIQUE"];

/** What the card is about: the clause, or the question's subject. */
function title(finding: Finding | null, status: string, item: Item | null | undefined, t: T): string {
  if (item?.kind === "excluded") return t("Not evaluated");
  if (finding) return t(finding.label);
  if (NAME_STATUSES.includes(status)) return t("Former company name");
  if (LAW_STATUSES.includes(status)) return t("Governing law");
  if (COPY_STATUSES.includes(status)) return t("Copies");
  return "";
}

/** Legal's decision in one line: "Confirmed by Legal Reviewer A and Legal Reviewer B, 1 Nov, 09:16". */
function legalLine(review: ReviewState, t: T, when: (ts: string) => string): string {
  const votes = review.reviews.filter((r) => r.decision !== "ESCALATED");
  const names = votes.map((v) => v.reviewer_name).join(` ${t("and")} `);
  const last = votes.length ? when(votes[votes.length - 1].ts) : "";
  switch (review.state) {
    case "FOUND": return t("Legal: not decided yet");
    case "CONFIRMED": return t("Confirmed by {names}, {when} (in the Workbench)", { names, when: last });
    case "REJECTED": return t("Rejected by {names}, {when}", { names, when: last });
    case "CORRECTED": return t("Corrected by {names}, {when}", { names, when: last });
    case "DISPUTED": return t("Reviewers disagree");
    default: return t("In review – {done} of 2 approvals", { done: review.done });   // IN_REVIEW, ESCALATED
  }
}

/** The id an exclusion points to: "duplicate of M01 - ..." -> M01, "amendment of M05 - ..." -> M05. */
const pointsTo = (reason: string | null) => reason?.match(/(?:duplicate|amendment) of (\S+)/)?.[1] ?? null;

export function FindingCard({ doc, finding, row, item, check, clause, searched = [], documents = 0, standing, next, alerts = [],
                              suspect = false, look = "ev", onPage, onName, onOpenDoc, legal = false }: Props) {
  const t = useT();
  const lang = useLang();
  const { num } = useFormat();
  // the contract file loads Legal's decision itself: it shows it, it never changes it
  const [legalReview, setLegalReview] = useState<FindingReviewState | null>(null);
  const clauseKey = finding?.clause_type;
  useEffect(() => {
    if (!legal || !clauseKey) return;
    let cancelled = false;
    setLegalReview(null);
    api.findingReview(doc.doc_id, clauseKey).then((r) => !cancelled && setLegalReview(r)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [legal, doc.doc_id, clauseKey]);
  const shown: Standing | null = standing ?? (legalReview ? { review: legalReview, triage: legalReview.triage, sample: false } : null);
  const when = (ts: string) =>
    new Date(ts).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const status = row?.status ?? finding?.status ?? "";
  const lane = item?.lane === "older" ? lightOf(status) : item?.lane ?? row?.light ?? lightOf(status);
  const word = item ? itemWord(item, t) : undefined;
  const pages = doc.page_count;
  const kind = check ?? (finding ? "missing_clause" : "");

  if (item?.kind === "excluded") {
    const other = pointsTo(item.reason);
    return (
      <article className="fcard" aria-label={t("Not evaluated")}>
        <h3 className="fc-title">{t("Not evaluated")}</h3>
        <div className="fc-status"><StatusWord status="" light="excluded" word={t("Excluded")} signal /></div>
        <div className="fc-block grey">
          <b>{exclusionReason(item.reason ?? "", t)}</b>
          <span>{t("The answer names it, so nothing is dropped silently.")}</span>
        </div>
        {other && onOpenDoc && (
          <button type="button" className="link-btn fc-open" onClick={() => onOpenDoc(other)}>{t("Open {id} →", { id: other })}</button>
        )}
        <p className="fc-obs">{t("An observation about the text, not a legal assessment.")}</p>
      </article>
    );
  }

  // why a person looks: only for red and orange - a green row has nothing to explain
  const subject = row
    ? { ...rowSubject(row), docStatus: row.doc_status ?? doc.status, ocrConf: row.ocr_mean_conf ?? doc.ocr_mean_conf }
    : finding ? findingSubject(finding, doc, shown?.review ?? null) : null;
  const whys = subject && lane !== "green" ? whyLines(subject, { alerts, suspect }, t, num) : [];
  const checks = finding?.layers.filter((l) => l.layer !== "model" && l.layer !== "register") ?? [];
  const doubts = checks.filter((l) => l.passed === false).length;
  const m = doc.metadata;
  const missing = status === "ABSENT" || (status === "UNCLEAR" && !finding?.quote);
  // F34: Legal disagrees with a Found that the answer does not report - said honestly, kept orange
  const legalDoubt = row && !("review" in row) && row.light_why === "legal" && row.legal ? row.legal : null;

  return (
    <article className="fcard" aria-label={title(finding, status, item, t)}>
      <h3 className="fc-title">{title(finding, status, item, t)}</h3>
      <div className="fc-status">
        <StatusWord status={status} law={row?.governing_law} light={lane} word={word} signal />
        {(shown || next) && (
          <>
            <span className="fc-arrow" aria-hidden>→</span>
            {shown ? <NextStep standing={shown} signal /> : <span className="ns done" data-signal="next">{next}</span>}
          </>
        )}
      </div>

      {(whys.length > 0 || legalDoubt) && (
        // every reason as a sentence; red when two people approve, amber otherwise
        <div className={`fc-why${whys.some((w) => w.red) ? " red" : ""}`} data-signal="why">
          {legalDoubt && (
            <p>
              {legalLine(legalDoubt, t, when)}.{" "}
              {t("The register still says Found, so this answer and the evaluation do not count it yet (F34). It stays orange so it is not lost.")}
            </p>
          )}
          {whys.map((w) => (
            <p key={w.id}>
              {w.callout}
              {w.page != null && onPage && (
                <>
                  {" "}
                  <button type="button" className="link-btn" onClick={() => onPage(w.page!)}>{t("Show page {page}", { page: w.page })}</button>
                </>
              )}
            </p>
          ))}
        </div>
      )}

      {/* the evidence: the passage, what is missing, the names, the law, the copies */}
      {finding?.quote && (status === "PRESENT" || status === "UNCLEAR") && (
        <Quote key={`${doc.doc_id}-${finding.clause_type}`} finding={finding} clamp look={status === "PRESENT" ? look : "look"}
               label={status === "PRESENT" ? t("The passage · page {n}", { n: finding.page ?? "?" })
                 : t("The proposed passage – rejected · page {n}", { n: finding.page ?? "?" })}
               onShow={onPage && finding.page ? () => onPage(finding.page!) : undefined} />
      )}
      {missing && kind === "missing_clause" && (
        lane === "orange" && subject?.docStatus === "LOW_QUALITY" ? (
          <div className="fc-block orange">
            <b>{t("Not found – but this scan was read by OCR at {conf} %", { conf: Math.floor(doc.ocr_mean_conf ?? 0) })}</b>
            <span>{t("Below the 70 % threshold a word can be misread, so the scan cannot prove the clause is missing.")}</span>
          </div>
        ) : (
          <div className={`fc-block ${lane === "red" ? "red" : "orange"}`}>
            <b>{t("Not in this contract")}</b>
            <span>
              {t("Whole contract read: {n} of {n} pages", { n: pages })} ·{" "}
              {doc.ocr_mean_conf != null ? t("scan, OCR {conf} %", { conf: Math.floor(doc.ocr_mean_conf) }) : t("text layer")}
            </span>
          </div>
        )
      )}

      {(status === "LEGACY_NAME" || status === "NAME_RESOLVED") && (row?.hits?.length ?? 0) > 0 && (
        <div className="fc-names">
          <div className="fc-label">{status === "NAME_RESOLVED" ? t("Former name – replaced by an amendment") : t("Former company name in the text")}</div>
          <ul className="fc-hits">
            {row!.hits!.map((h, i) => (
              <li key={i}>
                <button type="button" className="link-btn" onClick={() => onName?.(h.name, h.page)} disabled={!onName}>
                  {h.name} · {t("page {n}", { n: h.page })}
                </button>{" "}
                <span className="fc-snippet">…{h.snippet}…</span>
                {h.resolved_by && <span className="fc-snippet"> · {t("replaced by {id}", { id: h.resolved_by })}</span>}
              </li>
            ))}
          </ul>
          {status === "NAME_RESOLVED" && row?.hits?.[0]?.resolved_by && onOpenDoc && (
            <button type="button" className="link-btn fc-open" onClick={() => onOpenDoc(row.hits![0].resolved_by!)}>
              {t("Open {id} →", { id: row.hits[0].resolved_by })}
            </button>
          )}
        </div>
      )}
      {status === "NO_FORMER_NAME" && (
        <div className="fc-block green">
          <b>{t("None of the {k} former names in this contract", { k: searched.length || 4 })}</b>
          <span>{t("Exact search over the whole text: {n} of {n} pages", { n: pages })}</span>
        </div>
      )}
      {status === "NAME_NOT_RULED_OUT" && (
        <div className="fc-block orange">
          <b>{t("The search found no former name – but this scan is too poor to prove it.")}</b>
          <span>{t("Read the page: confirm if it names a former company, reject if it does not.")}</span>
        </div>
      )}

      {LAW_STATUSES.includes(status) && m?.governing_law_quote && (
        <Quote key={`${doc.doc_id}-law`} finding={{ quote: m.governing_law_quote, section: null, page: m.law_page ?? null }} clamp
               look={(m.law_flags ?? []).length === 0 ? look : "look"} label={t("The choice of law · page {n}", { n: m.law_page ?? "?" })}
               onShow={onPage && m.law_page ? () => onPage(m.law_page!) : undefined} />
      )}
      {LAW_STATUSES.includes(status) && !m?.governing_law_quote && status !== "LAW_UNKNOWN" && (
        <div className={`fc-block ${lane}`}>
          <b>{statusWord(status, t, row?.governing_law ?? m?.governing_law)}</b>
          <span>
            {(row?.law_flags ?? m?.law_flags) == null
              ? t("The register read the law before it quoted it (extract-v2). Read the choice of law on the page.")
              : t("No passage for the law is stored. Read the choice of law on the page.")}
          </span>
        </div>
      )}
      {status === "LAW_UNKNOWN" && (
        <div className="fc-block orange"><b>{t("No choice of law on any of the {n} pages", { n: pages })}</b></div>
      )}

      {status === "DUPLICATE" && row?.duplicate_of && (
        <div className="fc-block red">
          <b>{t("Same text as {id} – counted once", { id: row.duplicate_of })}</b>
          <span>{row.match === "near_identical" ? t("at least 98 % the same text, same party") : t("identical after normalising")}</span>
          {onOpenDoc && <button type="button" className="link-btn fc-open" onClick={() => onOpenDoc(row.duplicate_of!)}>{t("Open {id} →", { id: row.duplicate_of })}</button>}
        </div>
      )}
      {status === "ORIGINAL" && (
        <div className="fc-block green">
          <b>{t("{ids} is a copy of this contract – counted once", { ids: (row?.copies ?? []).join(", ") })}</b>
          {onOpenDoc && (row?.copies ?? []).map((c) => (
            <button key={c} type="button" className="link-btn fc-open" onClick={() => onOpenDoc(c)}>{t("Open {id} →", { id: c })}</button>
          ))}
        </div>
      )}
      {status === "UNIQUE" && (lane === "green"
        ? <div className="fc-block green"><b>{t("No other document has this text")}</b></div>
        : <div className="fc-block orange"><b>{t("No copy found – but this scan is too poor to prove it.")}</b></div>
      )}

      <HowWeKnow missing={missing}
                 input={{ status, finding, row: row ?? null, doc, alerts, suspect, absenceWords: clause?.absence_words ?? [], searched, documents }} />

      {/* the contract file shows the playbook in its own panel below the card */}
      {missing && clause?.definition && !legal && <LookedFor definition={clause.definition} />}

      {finding && (
        <details className="checks fc-fold" key={`fold-${doc.doc_id}-${finding.clause_type}`}>
          <summary>
            <ChevronRight16Regular className="checks-chevron" aria-hidden />
            <span className="section-title">{t("How the register decided")}</span>
            <span className={`fc-sum${doubts ? " failed" : ""}`} data-signal="fold">
              {doubts ? t("{failed} of {n} checks raised a doubt", { failed: doubts, n: checks.length }) : t("{n} checks passed", { n: checks.length })}
            </span>
          </summary>
          <p className="fc-model">
            {t("The model said {status}", { status: statusWord(finding.model_status, t) })} · {t("confidence {c}", { c: num(finding.confidence) })}
          </p>
          <Checks finding={finding} />
          {warningLabels(finding.flags, t).length > 0 && <p className="note">{warningLabels(finding.flags, t).join(" · ")}</p>}
          {finding.rationale && <p className="note">{t("Model's reason: {reason}", { reason: finding.rationale })}</p>}
        </details>
      )}

      <p className="fc-obs">{t("An observation about the text, not a legal assessment.")}</p>

      {legal && finding && (
        <div className="fc-legal">
          <span>{legalReview ? legalLine(legalReview, t, when) : ""}</span>
          <a className="fc-decide" href={workbenchHref({ doc: doc.doc_id, clause: finding.clause_type })}>{t("Decide in the Workbench →")}</a>
        </div>
      )}
    </article>
  );
}

/** "What we looked for · the playbook": the clause's definition, two lines and "Show all". */
function LookedFor({ definition }: { definition: string }) {
  const t = useT();
  const [all, setAll] = useState(false);
  return (
    <section className="fc-looked">
      <div className="fc-label">{t("What we looked for · the playbook")}</div>
      <p className={all ? undefined : "clamp-2"}>{definition}</p>
      {!all && <button type="button" className="link-btn" onClick={() => setAll(true)}>{t("Show all")}</button>}
    </section>
  );
}
