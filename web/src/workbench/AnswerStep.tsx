// Step 3 · Answer (decision 95, spec 1.2): on the left the picture - the answer in two sentences, the key
// to the colours, one lane per colour with every contract in scope as a tile, and the coverage as a sum
// that adds up; on the right the work - the list "To decide" and the way into step 4. Everything comes from
// the answer's own snapshot, so a contract that arrives later never changes it.
import { Button } from "@fluentui/react-components";
import type { ClauseSpec, Run, RunRow } from "../api";
import { LightIcon } from "../components/Badges";
import { describe, readRecorded } from "../filters";
import { useFormat, useT } from "../i18n";
import { ANALYSES, DOC_TYPE_LABEL, OF_TYPE, scopeText } from "../labels";
import { answerItems, headline, isOpen, lightsOf, passes, toDecide, type Filter, type Item } from "./answerRows";
import { Lanes } from "./Lanes";
import { BatchButton, ChipBar, DecideList } from "./ToLookAt";
import "./workbench.css";

interface Props {
  run: Run;
  clauses: Record<string, ClauseSpec>;
  filter: Filter;
  fresh: Set<string>;               // contracts that arrived in the last 24 hours
  busy: boolean;
  onFilter: (f: Filter) => void;
  onOpen: (docId: string) => void;       // step 4 for this contract
  onFile: (docId: string) => void;       // an older answer's contract: the read-only contract file
  onBatch: (rows: RunRow[]) => void;
}

/** The analysis box an answer came from: "Find a clause" when the run says so, else by its check. */
export const analysisOf = (run: Pick<Run, "plan" | "intent">) =>
  ANALYSES.find((a) => (run.intent === "find" ? a.id === "find" : a.check === run.plan.check && a.id !== "find")) ?? ANALYSES[0];

/** The first contract to open: the first open red row, then orange; else the first green passage (Find a
 *  clause) or simply the first contract. */
export function firstToOpen(items: Item[], find: boolean): Item | undefined {
  return (find ? items.find((i) => i.lane === "green") : items.find(isOpen)) ?? items.find(toDecide) ?? items[0];
}

export function AnswerStep({ run, clauses, filter, fresh, busy, onFilter, onOpen, onFile, onBatch }: Props) {
  const t = useT();
  const { usd } = useFormat();
  const c = run.coverage;
  const sel = c.selection;
  const recorded = sel ? readRecorded(sel.filters) : null;
  const items = answerItems(run);
  const shown = items.filter((i) => passes(i, filter));
  const analysis = analysisOf(run);
  const clause = run.plan.params.clause_type ? t(clauses[run.plan.params.clause_type]?.label ?? run.plan.params.clause_type) : "";
  const [line1, line2] = headline(run, items, t, clause);
  const l = lightsOf(run, items);
  const open = items.filter(isOpen);
  const todo = items.filter(toDecide).length;
  const greens = items.filter((i) => i.lane === "green").length;
  const find = run.intent === "find";
  const first = firstToOpen(items, find);
  const param = run.plan.params.clause_type ? clause : run.plan.params.law ? t("expected: {law} law", { law: run.plan.params.law }) : "";
  const types = c.scope === "all documents" ? t("documents") : t(DOC_TYPE_LABEL[c.scope] ?? c.scope);
  const searched = run.info.searched_names ?? [];

  return (
    <div className="answer-grid">
      <section className="panel answer-sum" aria-label={t("Answer")}>
        {/* the footer is hidden on this work screen: its line "lawyers decide" stands beside the eyebrow */}
        <div className="answer-top">
          <div className="eyebrow">{[t(analysis.title), param, `${c.in_scope} ${types}`].filter(Boolean).join(" · ")}</div>
          <span className="answer-obs">{t("observations about the text – lawyers decide")}</span>
        </div>
        <h2>{line1}</h2>
        <p className="answer-line2">{line2}</p>
        <p className="key-line">
          <span><LightIcon light="red" /> <b className="sw-red">{t("red")}</b> – {t("the issue is there")}</span>
          <span><LightIcon light="orange" /> <b className="sw-orange">{t("orange")}</b> – {t("not sure, a person looks")}</span>
          <span><LightIcon light="green" /> <b className="sw-green">{t("green")}</b> – {t("positive: in order, with evidence")}</span>
        </p>
        {sel && (
          <p className="sel-line">
            {t("A selection: {part} ({filters}) – this answer covers only these.", {
              part: t(OF_TYPE[""], { n: sel.chosen, of: sel.of }),
              filters: recorded ? [recorded[0] && scopeText({ type: recorded[0] }, t), describe(recorded[1], t)].filter(Boolean).join(" · ")
                : scopeText(sel.filters, t),
            })}
          </p>
        )}

        <Lanes run={run} items={items} filter={filter} onFilter={onFilter} onOpen={onOpen} onFile={onFile} />

        <p className="cov-sum">
          <b>{t("{n} in scope", { n: c.in_scope })}</b> ={" "}
          <LightIcon light="red" /> {l.red} + <LightIcon light="orange" /> {l.orange}
          {run.unreported && <> + <LightIcon light="green" /> {l.green}</>}
          {c.excluded.length > 0 && <> + <LightIcon light="excluded" /> {c.excluded.length}</>}
          {!run.unreported && <> + {t("{n} evaluated earlier", { n: c.checked - run.rows.length })}</>}
          {" · "}
          {run.plan.check === "duplicates" ? t("every document compared") : t("every evaluated contract read in full")}
          {" · "}
          {t("this question: {usd} – reading every contract cost {total}, once", { usd: usd(run.cost.usd), total: usd(run.cost.register_total_usd) })}
          {searched.length > 0 && <> · {t("searched for: {names}", { names: searched.join(", ") })}</>}
        </p>
        {!run.unreported && (
          <p className="sel-line">{t("This answer is older than the traffic light – Ask again shows every contract with its evidence.")}</p>
        )}
      </section>

      <section className="panel todo-panel" aria-labelledby="todo-title">
        <div className="todo-head">
          <h3 id="todo-title">{t("To decide")}</h3>
          <span className="todo-count">{t("{n} to decide · {open} open", { n: todo, open: open.length })}</span>
        </div>
        <ChipBar items={items} filter={filter} onFilter={onFilter} />
        {shown.length === 0 ? (
          <p className="lead">{filter === "todo" ? t("Nothing to decide: no contract in scope is red or orange.") : t("No contract in this colour.")}</p>
        ) : (
          <div className="dlist-scroll">
            <DecideList items={shown} fresh={fresh} searched={searched.length} onOpen={onOpen} />
          </div>
        )}
        {greens > 0 && filter !== "green" && (
          <p className="green-note"><LightIcon light="green" /> {t("The {n} green contracts need no decision. Click a green tile to see its evidence.", { n: greens })}</p>
        )}
        <div className="todo-go">
          <BatchButton rows={run.rows} busy={busy} onBatch={onBatch} />
          <div className="spacer" />
          {first && (
            <Button appearance="primary" onClick={() => onOpen(first.id)}>
              {find ? t("Open the first passage →") : open.length ? t("Decide the {n} open →", { n: open.length }) : t("Look at the evidence →")}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
