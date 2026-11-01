// One finding of the guardrail sandwich: the checks as a timeline and the model's quote, used by the
// finding card (FindingCard.tsx).
import { CheckmarkCircle20Filled, DismissCircle20Filled, Info20Regular } from "@fluentui/react-icons";
import { useLayoutEffect, useRef, useState } from "react";
import type { Finding } from "../api";
import { useFormat, useT, type T } from "../i18n";
import { CHECK_LABEL, flagLabel } from "../labels";

function layerDetail(layer: string, detail: string | null | undefined, t: T, num: (n: number, digits?: number) => string): string | null {
  if (!detail) return null;
  if (layer === "document_signals") return detail.split(", ").map((f) => t(flagLabel(f))).join(", ");
  if (layer === "no_absence_signal") return t("found in the text: …{text}…", { text: detail.replace(/^'|'$/g, "") });
  // api/register.py writes "match 100.0, page 1": a template, shown in the chosen language
  const match = detail.match(/^match ([\d.]+)(?:, page (\d+))?$/);
  if (match) {
    const score = num(Number(match[1]), 1);
    return match[2] ? t("match {score}, page {page}", { score, page: match[2] }) : t("match {score}", { score });
  }
  return detail;   // e.g. the second model call's reason: free text stays as it is
}

export function Checks({ finding }: { finding: Finding }) {
  const t = useT();
  const { num } = useFormat();
  const steps = finding.layers.filter((l) => l.layer !== "model" && l.layer !== "register");
  return (
    <ol className="timeline" aria-label={t("Checks applied to this finding")}>
      {steps.map((l) => {
        const state = l.passed === true ? "pass" : l.passed === false ? "fail" : "info";
        const icon =
          state === "pass" ? <CheckmarkCircle20Filled aria-label={t("passed")} /> :
          state === "fail" ? <DismissCircle20Filled aria-label={t("failed")} /> : <Info20Regular aria-hidden />;
        return (
          <li key={l.layer} className={`step ${state}`}>
            <span className="step-icon">{icon}</span>
            <div className="step-body">
              <div className="step-title">{t(CHECK_LABEL[l.layer] ?? l.layer)}</div>
              {l.detail && <div className="step-detail">{layerDetail(l.layer, l.detail, t, num)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The model's quote with its section and page - of a clause, or of the governing law (decision 94).
 *  `clamp`: cut to three lines with "Show all" (the finding card, where the decision below it must stay
 *  on the screen). */
export function Quote({ finding, clamp = false }: { finding: Pick<Finding, "quote" | "section" | "page">; clamp?: boolean }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const [cut, setCut] = useState(false);      // the quote is longer than three lines
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = text.current;
    setCut(!!el && el.scrollHeight > el.clientHeight + 1);
  }, [finding.quote, clamp]);
  if (!finding.quote) {
    return <p className="note">{t("No passage: the model read the whole contract and found no such clause.")}</p>;
  }
  return (
    <blockquote className="quote">
      <span ref={text} className={clamp && !all ? "clamp-3" : undefined}>“{finding.quote}”</span>
      {clamp && cut && !all && (
        <button type="button" className="link-btn" onClick={() => setAll(true)}>{t("Show all")}</button>
      )}
      <cite>{[finding.section, finding.page && t("page {n}", { n: finding.page })].filter(Boolean).join(" · ")}</cite>
    </blockquote>
  );
}
