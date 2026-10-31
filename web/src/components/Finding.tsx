// One finding of the guardrail sandwich, used by the workbench and the contract file:
// "model proposed -> n checks -> register says", and the checks as a timeline.
import {
  ArrowDown16Regular, CheckmarkCircle20Filled, ChevronRight16Regular, DismissCircle20Filled, Info20Regular,
  Warning16Filled,
} from "@fluentui/react-icons";
import { useState, type Ref, type RefObject } from "react";
import type { Finding } from "../api";
import { useFormat, useT, type T } from "../i18n";
import { flagLabel, LAYER_LABEL } from "../labels";
import { StatusBadge } from "./Badges";

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
              <div className="step-title">{t(LAYER_LABEL[l.layer] ?? l.layer)}</div>
              {l.detail && <div className="step-detail">{layerDetail(l.layer, l.detail, t, num)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** The checks behind a finding, folded away unless they matter: open when the finding is unclear
 *  or the checks overruled the model. Folded, the reviewer's decision starts on the first screen.
 *  Give it a key per finding, so another finding starts folded or open again. The verdict's
 *  checks chip opens it through detailsRef (see showChecks). */
export function ChecksDisclosure({ finding, detailsRef }: { finding: Finding; detailsRef?: Ref<HTMLDetailsElement> }) {
  const t = useT();
  const [open, setOpen] = useState(finding.status === "UNCLEAR" || finding.changed_by_checks);
  return (
    <details className="checks" open={open} onToggle={(e) => setOpen(e.currentTarget.open)} ref={detailsRef}>
      <summary>
        <ChevronRight16Regular className="checks-chevron" aria-hidden />
        <span className="section-title">{t("How the register decided")}</span>
      </summary>
      <Checks finding={finding} />
    </details>
  );
}

/** Open the checks and bring them into view (the verdict's chip). Setting `open` fires the
 *  details' toggle event, so ChecksDisclosure's own state follows. */
export function showChecks(ref: RefObject<HTMLDetailsElement | null>) {
  const el = ref.current;
  if (!el) return;
  el.open = true;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  el.querySelector("summary")?.focus({ preventScroll: true });
}

export function Verdict({ finding, onShowChecks }: { finding: Finding; onShowChecks?: () => void }) {
  const t = useT();
  const { num } = useFormat();
  const checks = finding.layers.filter((l) => l.layer !== "model" && l.layer !== "register");
  const failed = checks.filter((l) => l.passed === false).length;
  const overruled = finding.changed_by_checks;
  const chipText = failed ? t("{n} checks · {failed} failed", { n: checks.length, failed }) : t("{n} checks", { n: checks.length });
  return (
    // short labels ("Found", "Unclear"): the verdict sits in a narrow column; the header has the long one
    <div className={`verdict${overruled ? " overruled" : ""}${failed ? " failed" : ""}`}>
      <div className="v-box model">
        <span className="v-label">{t("Model proposed")}</span>
        <StatusBadge status={finding.model_status} short large />
      </div>
      <div className="v-arrow">
        {onShowChecks ? (
          <button type="button" className="v-chip" onClick={onShowChecks} title={t("Show how the register decided")}>
            <ArrowDown16Regular aria-hidden /> {chipText}
          </button>
        ) : (
          <span className="v-chip static"><ArrowDown16Regular aria-hidden /> {chipText}</span>
        )}
      </div>
      <div className="v-box result">
        {overruled && (
          <div className="v-overruled"><Warning16Filled aria-hidden /> {t("The checks overruled the model")}</div>
        )}
        <span className="v-label">{t("Register says")}</span>
        <StatusBadge status={finding.status} short large />
        <span className="v-conf">{t("confidence {c}", { c: num(finding.confidence) })}</span>
      </div>
    </div>
  );
}

export function Quote({ finding }: { finding: Finding }) {
  const t = useT();
  if (!finding.quote) {
    return <p className="note">{t("No passage: the model read the whole contract and reported no such clause.")}</p>;
  }
  return (
    <blockquote className="quote">
      “{finding.quote}”
      <cite>{[finding.section, finding.page && t("page {n}", { n: finding.page })].filter(Boolean).join(" · ")}</cite>
    </blockquote>
  );
}
