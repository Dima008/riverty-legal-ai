// The work bar under the header (spec 2.0): the three steps - done steps are links, the current one is
// tinted, the ones not reached yet are grey - the question on one line, and on the right whether the
// answer is still up to date. Sticky under the header, so it never scrolls away.
import { Button } from "@fluentui/react-components";
import { useEffect, useState, type ReactNode } from "react";
import type { Plan, Run } from "../api";
import { freshness, samePlan, type Freshness } from "../freshness";
import { useLang, useT } from "../i18n";
import { useRegisterLive } from "../live";
import "./workbench.css";

export type Step = 1 | 2 | 3;

interface Props {
  step: Step;
  hrefs: Partial<Record<Step, string>>;   // the address of each step that can be opened
  question: string | null;
  right?: ReactNode;                       // freshness: "Up to date · asked 09:14", or out of date with Ask again
}

const STEPS: [Step, string][] = [[1, "Ask"], [2, "Answer"], [3, "Decide"]];

export function WorkBar({ step, hrefs, question, right }: Props) {
  const t = useT();
  return (
    <div className="workbar">
      <ol className="wb-steps" aria-label={t("Workbench")}>
        {STEPS.map(([n, label]) => {
          const inner = <><span className="wb-num">{n}</span> {t(label)}</>;
          const href = hrefs[n];
          return (
            <li key={n} className={n === step ? "current" : n < step ? "done" : "todo"} aria-current={n === step ? "step" : undefined}>
              {n < step && href ? <a href={href}>{inner}</a> : <span>{inner}</span>}
            </li>
          );
        })}
      </ol>
      {question && <p className="wb-question" title={question}>{question}</p>}
      <div className="wb-right">{right}</div>
    </div>
  );
}

// "H01, H02, M05 +2": the work bar has one line; the full list is in the tooltip
const few = (ids: string[]) => ids.slice(0, 3).join(", ") + (ids.length > 3 ? ` +${ids.length - 3}` : "");

/** Is the open answer still up to date (5.4)? "Up to date · asked 09:14", or the first change that applies -
 *  arrived, read since, removed - with Ask again: a new run with the same plan. The answer itself never changes. */
export function FreshnessNote({ run, busy, onAskAgain }: { run: Run; busy: boolean; onAskAgain: (plan: Plan) => void }) {
  const t = useT();
  const lang = useLang();
  const live = useRegisterLive();
  const [checked, setChecked] = useState<{ runId: string; f: Freshness } | null>(null);
  // checked again whenever the register changes; until the new result is in, the last one stays
  useEffect(() => {
    let cancelled = false;
    freshness(run, live)
      .then((f) => !cancelled && setChecked({ runId: run.run_id, f }))
      .catch(() => !cancelled && setChecked(null));         // an older API without the preview: say nothing
    return () => {
      cancelled = true;
    };
  }, [run.run_id, live.version, live.matrix]);
  const f = checked?.runId === run.run_id ? checked.f : null;
  if (!f || f.current === null) return null;                // an older answer cannot tell

  if (f.current) {
    const asked = new Date(run.created_at).toLocaleTimeString(lang === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit" });
    return <span className="wb-fresh">{t("Up to date · asked {time}", { time: asked })}</span>;
  }
  // every new contract is still being read: asking again now would only list them as "not read yet"
  const stillReading = f.added.length > 0 && f.added.every((id) => f.reading.includes(id));
  const [key, list] = f.added.length
    ? [stillReading ? "Out of date: {ids} arrived after this answer – the model is still reading it" : "Out of date: {ids} arrived after this answer", f.added]
    : f.read.length ? ["Out of date: {ids} has been read since", f.read]
    : ["Out of date: {ids} was removed from the register", f.removed];
  const plan = live.matrix ? samePlan(run, live.matrix.rows) : null;
  return (
    <>
      <span className="wb-stale" role="status" title={t(key, { ids: list.join(", ") })}>{t(key, { ids: few(list) })}</span>
      {plan && !stillReading && (
        <Button size="small" appearance="primary" disabled={busy} onClick={() => onAskAgain(plan)}
                title={t("Decisions on clauses carry over; decisions on former names, law and copies are asked again.")}>
          {t("Ask again")}
        </Button>
      )}
    </>
  );
}

/** Decide one finding, opened from the register (D6): no steps, the way back instead. */
export function OneFindingBar({ docId, clause, back }: { docId: string; clause: string; back: string }) {
  const t = useT();
  return (
    <div className="workbar">
      <p className="wb-question">{t("From the register › Decide · {doc} · {clause}", { doc: docId, clause })}</p>
      <div className="wb-right">
        <a className="wb-back" href={back}>{t("Back to the register")}</a>
      </div>
    </div>
  );
}
