// One finding as a card (spec 2.3), the same in the Workbench - with the decision below it - and in the
// contract file - read-only, with Legal's decision as one line (prop `legal`). From top to bottom: what
// the finding is about, what the text says and the next step, why a person looks, the evidence, and
// folded away how the register decided. A lawyer reads four marks, not eighteen (spec 3.7).
import { ChevronRight16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, type DocumentInfo, type Finding, type FindingReviewState, type ReviewState, type RunRow } from "../api";
import { useFormat, useLang, useT, type T } from "../i18n";
import { statusWord, warningLabels } from "../labels";
import { workbenchHref } from "../routing";
import { Checks, Quote } from "./Finding";
import type { Alert } from "./SafetyBar";
import { findingSubject, NextStep, rowSubject, StatusWord, whyLines, type Standing } from "./Words";
import "../workbench/workbench.css";

interface Props {
  doc: DocumentInfo;
  finding: Finding | null;          // a clause finding; null for a former name, the law or a copy (then `row` says it;
                                    // the law's quote comes from `doc`, decision 94)
  row?: RunRow | null;              // the run row: its status, the name hits, the law, the original of a copy
  standing?: Standing | null;       // where Legal's decision stands, shown as the next step (a run row is one)
  alerts?: Alert[];                 // the document's alerts from load(): the page of an injection, the worst OCR page
  suspect?: boolean;                // the passage that hints at the clause lies in text addressed to AI systems
  onPage?: (page: number) => void;  // "Show page n"
  onName?: (name: string, page: number) => void;   // highlight a former name on its page
  onOpenDoc?: (docId: string) => void;             // open the original of a copy
  legal?: boolean;                  // the contract file: Legal's decision as a line, and "Decide in the Workbench →"
}

/** What the card is about: the clause, or the question's subject for a run row of another check. */
function title(finding: Finding | null, row: RunRow | null | undefined, t: T): string {
  if (finding) return t(finding.label);
  const status = row?.status;
  if (status === "LEGACY_NAME" || status === "NAME_NOT_RULED_OUT") return t("Former company name");
  if (LAW_STATUSES.includes(status ?? "")) return t("Governing law");
  if (status === "DUPLICATE") return t("Copy of {id}", { id: row?.duplicate_of ?? "" });
  return "";
}

const LAW_STATUSES = ["OTHER_LAW", "LAW_UNKNOWN", "LAW_NOT_CONFIRMED"];

/** What the register checked about the law's quote (decision 94), in one sentence. null: nothing to add -
 *  a failed check is said above among the reasons why a person looks, and on a poor scan the "not
 *  confirmed" sentence says it once (never "Checked" next to "too poor to confirm"). */
function lawCheck(lawFlags: string[] | null | undefined, poorScan: boolean, t: T): string | null {
  if (lawFlags == null) return t("No quote yet: this contract was read before the register asked for the law's quote.");
  return lawFlags.length === 0 && !poorScan ? t("Checked: the quote is in the contract and names this law.") : null;
}

/** Why the law is not confirmed (F36), in the card's words: the quote failed its check (the reason is
 *  said above), or a poor scan - whose quote may name the law all the same. */
function notConfirmed(law: string, poorScan: boolean, quoteNamesLaw: boolean, t: T): string {
  if (!poorScan) return t("The register read {law} law, but cannot confirm it from the contract. Read the choice of law and decide.", { law });
  return quoteNamesLaw
    ? t("The quote names {law} law, but this scan is too poor to confirm it. Read the choice of law and decide.", { law })
    : t("The register read {law} law, but this scan is too poor to confirm it. Read the choice of law and decide.", { law });
}

/** Legal's decision in one line, for the contract file: "Confirmed by Legal Reviewer A and Legal Reviewer B, 1 Nov, 09:16". */
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

export function FindingCard({ doc, finding, row, standing, alerts = [], suspect, onPage, onName, onOpenDoc, legal = false }: Props) {
  const t = useT();
  const lang = useLang();
  const { num } = useFormat();
  // the contract file loads Legal's decision itself: it shows it, it never changes it
  const [legalReview, setLegalReview] = useState<FindingReviewState | null>(null);
  const clause = finding?.clause_type;
  useEffect(() => {
    if (!legal || !clause) return;
    let cancelled = false;
    setLegalReview(null);
    api.findingReview(doc.doc_id, clause).then((r) => !cancelled && setLegalReview(r)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [legal, doc.doc_id, clause]);
  const shown: Standing | null = standing ?? (legalReview ? { review: legalReview, triage: legalReview.triage, sample: false } : null);

  const status = finding?.status ?? row?.status ?? "";
  // a run row is the snapshot the lawyer decides on; the document fills in what an older run did not store
  const subject = row
    ? { ...rowSubject(row), docStatus: row.doc_status ?? doc.status, ocrConf: row.ocr_mean_conf ?? doc.ocr_mean_conf }
    : finding ? findingSubject(finding, doc, shown?.review ?? null) : null;
  const whys = subject ? whyLines(subject, { alerts, suspect }, t, num) : [];
  const checks = finding?.layers.filter((l) => l.layer !== "model" && l.layer !== "register") ?? [];
  const failed = checks.filter((l) => l.passed === false).length;
  // the law's evidence is the register's current one, like a clause finding (the page shows the same passage)
  const m = doc.metadata;
  const law = LAW_STATUSES.includes(status) && m?.governing_law ? m : null;
  const poorScan = subject?.docStatus === "LOW_QUALITY";
  const when = (ts: string) =>
    new Date(ts).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <article className="fcard" aria-label={title(finding, row, t)}>
      <h3 className="fc-title">{title(finding, row, t)}</h3>
      <div className="fc-status">
        <StatusWord status={status} law={row?.governing_law} signal />
        {shown && (
          <>
            <span className="fc-arrow" aria-hidden>→</span>
            <NextStep standing={shown} signal />
          </>
        )}
      </div>

      {whys.length > 0 && (
        // every reason as a sentence; red when two people approve
        <div className={`fc-why${whys.some((w) => w.red) ? " red" : ""}`} data-signal="why">
          {whys.map((w) => (
            <p key={w.id}>
              {w.callout}
              {w.page != null && onPage && (
                <>
                  {" "}
                  <button type="button" className="link-btn" onClick={() => onPage(w.page!)}>
                    {t("Show page {page}", { page: w.page })}
                  </button>
                </>
              )}
            </p>
          ))}
        </div>
      )}

      {/* the evidence: the quote, the names, the law, the original */}
      {finding && <Quote key={`${doc.doc_id}-${finding.clause_type}`} finding={finding} clamp />}
      {status === "LEGACY_NAME" && (row?.hits?.length ?? 0) > 0 && (
        <ul className="fc-hits">
          {row!.hits!.map((h, i) => (
            <li key={i}>
              <button type="button" className="link-btn" onClick={() => onName?.(h.name, h.page)} disabled={!onName}>
                {h.name} · {t("page {n}", { n: h.page })}
              </button>{" "}
              <span className="fc-snippet">…{h.snippet}…</span>
            </li>
          ))}
        </ul>
      )}
      {status === "NAME_NOT_RULED_OUT" && (
        <p className="fc-text">
          {t("The exact search found no former company name – but this scan is too poor to prove that none is there. Read the page: confirm if it names a former company, reject if it does not.")}
        </p>
      )}
      {law?.governing_law_quote && (
        <Quote key={`${doc.doc_id}-law`} finding={{ quote: law.governing_law_quote, section: null, page: law.law_page ?? null }} clamp />
      )}
      {status === "OTHER_LAW" && row?.governing_law && (
        <p className="fc-text">{t("The register read: {law} law", { law: row.governing_law })}</p>
      )}
      {status === "LAW_NOT_CONFIRMED" && (
        <p className="fc-text">{notConfirmed(row?.governing_law ?? "?", poorScan, law?.law_flags?.length === 0, t)}</p>
      )}
      {law && (
        <p className="fc-text">
          {lawCheck(law.law_flags, poorScan, t)}{" "}
          {law.law_page != null && onPage && (
            <button type="button" className="link-btn" onClick={() => onPage(law.law_page!)}>
              {t("Show page {page}", { page: law.law_page })}
            </button>
          )}
        </p>
      )}
      {status === "DUPLICATE" && row?.duplicate_of && (
        <p className="fc-text">
          {t("Copy of {id} – the original is checked; this copy is not counted twice.", { id: row.duplicate_of })}{" "}
          {onOpenDoc && (
            <button type="button" className="link-btn" onClick={() => onOpenDoc(row.duplicate_of!)}>
              {t("Open {id} →", { id: row.duplicate_of })}
            </button>
          )}
        </p>
      )}

      {finding && (
        <details className="checks fc-fold" key={`fold-${doc.doc_id}-${finding.clause_type}`}>
          <summary>
            <ChevronRight16Regular className="checks-chevron" aria-hidden />
            <span className="section-title">{t("How the register decided")}</span>
            <span className={`fc-sum${failed ? " failed" : ""}`} data-signal="fold">
              {failed ? t("{failed} of {n} checks failed", { failed, n: checks.length }) : t("{n} checks passed", { n: checks.length })}
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
          <a className="fc-decide" href={workbenchHref({ doc: doc.doc_id, clause: finding.clause_type })}>
            {t("Decide in the Workbench →")}
          </a>
        </div>
      )}
    </article>
  );
}
