// One finding of the guardrail sandwich, used by the workbench and the contract file:
// "model proposed -> n checks -> register says", and the checks as a timeline.
import { ArrowRight20Regular, CheckmarkCircle20Filled, DismissCircle20Filled, Info20Regular } from "@fluentui/react-icons";
import type { Finding } from "../api";
import { flagLabel, LAYER_LABEL } from "../labels";
import { StatusBadge } from "./Badges";

function layerDetail(layer: string, detail: string | null | undefined): string | null {
  if (!detail) return null;
  if (layer === "document_signals") return detail.split(", ").map(flagLabel).join(", ");
  if (layer === "no_absence_signal") return `found in the text: …${detail.replace(/^'|'$/g, "")}…`;
  return detail;
}

export function Checks({ finding }: { finding: Finding }) {
  const steps = finding.layers.filter((l) => l.layer !== "model" && l.layer !== "register");
  return (
    <ol className="timeline" aria-label="Checks applied to this finding">
      {steps.map((l) => {
        const state = l.passed === true ? "pass" : l.passed === false ? "fail" : "info";
        const icon =
          state === "pass" ? <CheckmarkCircle20Filled aria-label="passed" /> :
          state === "fail" ? <DismissCircle20Filled aria-label="failed" /> : <Info20Regular aria-hidden />;
        return (
          <li key={l.layer} className={`step ${state}`}>
            <span className="step-icon">{icon}</span>
            <div className="step-body">
              <div className="step-title">{LAYER_LABEL[l.layer] ?? l.layer}</div>
              {l.detail && <div className="step-detail">{layerDetail(l.layer, l.detail)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Verdict({ finding }: { finding: Finding }) {
  const checks = finding.layers.filter((l) => l.layer !== "model" && l.layer !== "register");
  const failed = checks.filter((l) => l.passed === false).length;
  return (
    <div className={`verdict${finding.changed_by_checks ? " overruled" : ""}`}>
      <div className="v-box">
        <span className="v-label">Model proposed</span>
        <StatusBadge status={finding.model_status} />
      </div>
      <div className="v-arrow">
        <ArrowRight20Regular />
        <span>{checks.length} checks{failed ? `, ${failed} failed` : ""}</span>
      </div>
      <div className="v-box result">
        <span className="v-label">Register says</span>
        <StatusBadge status={finding.status} />
        <span className="v-conf">confidence {finding.confidence.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function Quote({ finding }: { finding: Finding }) {
  if (!finding.quote) {
    return <p className="note">No passage: the model read the whole contract and reported no such clause.</p>;
  }
  return (
    <blockquote className="quote">
      “{finding.quote}”
      <cite>{[finding.section, finding.page && `page ${finding.page}`].filter(Boolean).join(" · ")}</cite>
    </blockquote>
  );
}
