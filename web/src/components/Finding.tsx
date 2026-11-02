// One finding of the guardrail sandwich: the checks as a timeline and the passage, used by the finding card
// (FindingCard.tsx).
import { CheckmarkCircle20Filled, Info20Regular, Warning20Filled } from "@fluentui/react-icons";
import { useLayoutEffect, useRef, useState } from "react";
import type { Finding } from "../api";
import { useFormat, useT, type T } from "../i18n";
import { CHECK_LABEL, flagLabel } from "../labels";
import type { Look } from "./evidence";

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

/** Every check of the guardrail sandwich, one per line: passed, raised a doubt, or no verdict. */
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
          state === "fail" ? <Warning20Filled aria-label={t("raised a doubt")} /> : <Info20Regular aria-hidden />;
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

/** A passage with its section and page - of a clause, or of the governing law (decision 94). The look is the
 *  page's (decision 95): "ev" = checked evidence, marked in the same yellow as on the page; "look" = a passage
 *  the checks rejected, in a dashed box, never marked. `clamp`: three lines with "Show all" (the finding card,
 *  where the decision below must stay on the screen). */
export function Quote({ finding, clamp = false, look = "ev", label, onShow }:
  { finding: Pick<Finding, "quote" | "section" | "page">; clamp?: boolean; look?: Look; label?: string; onShow?: () => void }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const [cut, setCut] = useState(false);      // the quote is longer than three lines
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = text.current;
    setCut(!!el && el.scrollHeight > el.clientHeight + 1);
  }, [finding.quote, clamp]);
  if (!finding.quote) return null;
  return (
    <figure className={`quote q-${look}`}>
      {label && <figcaption className="fc-label">{label}</figcaption>}
      <blockquote>
        <span ref={text} className={clamp && !all ? "clamp-3" : undefined}>
          {look === "ev" ? <mark className="ev">{finding.quote}</mark> : `“${finding.quote}”`}
        </span>
      </blockquote>
      {clamp && cut && !all && (
        <button type="button" className="link-btn" onClick={() => setAll(true)}>{t("Show all")}</button>
      )}
      <cite>
        {[finding.section, finding.page && t("page {n}", { n: finding.page })].filter(Boolean).join(" · ")}
        {onShow && (
          <>
            {" · "}
            <button type="button" className="link-btn" onClick={onShow}>{t("Show on page")}</button>
          </>
        )}
      </cite>
    </figure>
  );
}
