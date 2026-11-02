// The contracts of an answer as a list (decision 95): "To decide" beside the lanes in step 3, and the rail
// beside the page in step 4, built from the same words - the light's icon and word, how we know (or why a
// person looks), and the next step. The chips ("To decide", ✕, ?, ✓, All) are one state for both; their
// counts always come from every contract of the answer, and a chip never hides anything silently.
import { Button } from "@fluentui/react-components";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import type { RunRow } from "../api";
import { LightIcon } from "../components/Badges";
import { flagName, injectionPageOf } from "../components/SafetyBar";
import { rowSubject, whyLines } from "../components/Words";
import { useFormat, useT, type T } from "../i18n";
import { WHY } from "../labels";
import { howShort, itemNext, itemWord, passes, toDecide, type Filter, type Item, type LaneSpec } from "./answerRows";
import "./workbench.css";

const INJECTION = WHY.find((w) => w.id === "injection")?.flags ?? [];

/** The rows "Confirm n at once" may confirm: marked Confirm, not a spot check, not decided. The server
 *  checks the same (api/review.py confirm_batch); the chips never change this count. */
export const batchRows = (rows: RunRow[]) => rows.filter((r) => r.triage === "CONFIRM" && !r.sample && r.review.state === "FOUND");

/** The chips. `rail`: step 4 walks every contract, so "All" replaces "To decide" there. */
export function ChipBar({ items, filter, onFilter, rail = false }: { items: Item[]; filter: Filter; onFilter: (f: Filter) => void; rail?: boolean }) {
  const t = useT();
  const n = (f: Filter) => items.filter((i) => passes(i, f)).length;
  const on = (f: Filter) => filter === f || (rail && f === "all" && filter === "todo");
  const chip = (f: Filter, label: ReactNode, aria: string) => (
    <button type="button" className={`chip${on(f) ? " on" : ""}`} aria-pressed={on(f)} aria-label={aria} onClick={() => onFilter(f)}>
      {label}
    </button>
  );
  return (
    <div className="chips" role="group" aria-label={t("Show in the list")}>
      {!rail && chip("todo", t("To decide {n}", { n: n("todo") }), t("To decide {n}", { n: n("todo") }))}
      {chip("red", <><LightIcon light="red" /> {n("red")}</>, `${t("red")} ${n("red")}`)}
      {chip("orange", <><LightIcon light="orange" /> {n("orange")}</>, `${t("orange")} ${n("orange")}`)}
      {chip("green", <><LightIcon light="green" /> {n("green")}</>, `${t("green")} ${n("green")}`)}
      {chip("all", t("All {n}", { n: items.length }), t("All {n}", { n: items.length }))}
    </div>
  );
}

/** "Confirm 2 at once" with the rows it confirms in the tooltip. */
export function BatchButton({ rows, busy, onBatch }: { rows: RunRow[]; busy: boolean; onBatch: (rows: RunRow[]) => void }) {
  const t = useT();
  const routine = batchRows(rows);
  if (routine.length === 0) return null;
  return (
    <Button size="small" disabled={busy} onClick={() => onBatch(routine)}
            title={t("{ids} – only rows marked Confirm; spot checks are opened one by one.", { ids: routine.map((r) => r.doc_id).join(", ") })}>
      {t("Confirm {n} at once", { n: routine.length })}
    </Button>
  );
}

/** The page of the text addressed to AI systems for the rows that have one: "Text addressed to AI systems (page 3)". */
export function useInjectionPages(items: Item[]): Record<string, number | null> {
  const [pages, setPages] = useState<Record<string, number | null>>({});
  const ids = items.filter((i) => i.row?.flags.some((f) => INJECTION.includes(flagName(f)))).map((i) => i.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    Promise.all(ids.split(",").map(async (id) => [id, await injectionPageOf(id)] as const))
      .then((found) => !cancelled && setPages(Object.fromEntries(found)));
    return () => {
      cancelled = true;
    };
  }, [ids]);
  return pages;
}

/** The second line of a row: why a person looks (red and orange), else how we know. */
export function rowLine(i: Item, t: T, num: (n: number) => string, pages: Record<string, number | null>, searched: number): string {
  const why = i.row && toDecide(i) ? whyLines(rowSubject(i.row), { injectionPage: pages[i.id] }, t, num)[0] : undefined;
  return why?.short ?? howShort(i, t, searched);
}

/** Step 3: "To decide" - two lines per contract; a click opens it in step 4. */
export function DecideList({ items, fresh, searched, onOpen }:
  { items: Item[]; fresh: Set<string>; searched: number; onOpen: (docId: string) => void }) {
  const t = useT();
  const { num } = useFormat();
  const pages = useInjectionPages(items);
  return (
    <ul className="dlist">
      {items.map((i) => {
        const next = itemNext(i, t);
        return (
          <li key={i.id}>
            <button type="button" className="d-row" onClick={() => onOpen(i.id)}>
              <span className="d-line1">
                <span className="d-id">{i.id}</span>
                {fresh.has(i.id) && <span className="new-tag">{t("New")}</span>}
                <span className="d-party">{i.row?.counterparty_name ?? ""}</span>
                <span className={`d-next${next.open ? "" : " done"}`}>{next.text}</span>
              </span>
              <span className="d-line2">
                <LightIcon light={i.lane === "older" ? "excluded" : i.lane} />
                <b className={`sw-${i.lane}`}>{itemWord(i, t)}</b>
                <span className="d-how">· {rowLine(i, t, num, pages, searched)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Step 4: the rail beside the page, grouped like the lanes of step 3 (groupOf: the lane of each contract).
 *  Red and orange rows have two lines (word · next step), green and excluded one. ↑/↓ move to the next row;
 *  the focus stays in the rail. */
export function Rail({ items, groupOf, selected, fresh, onOpen }:
  { items: Item[]; groupOf: Record<string, LaneSpec>; selected: string; fresh: Set<string>;
    onOpen: (docId: string, byKey: boolean) => void }) {
  const t = useT();
  const move = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : -1;
    if (next < 0 || next >= items.length) return;
    e.preventDefault();
    onOpen(items[next].id, true);
    // the list re-renders with the new row selected: move the focus with it
    window.requestAnimationFrame(() => document.getElementById(`q-${items[next].id}`)?.focus());
  };
  return (
    <ul className="queue">
      {items.map((i, n) => {
        const group = groupOf[i.id];
        const head = n === 0 || groupOf[items[n - 1].id]?.key !== group?.key;
        const next = itemNext(i, t);
        const two = toDecide(i);
        return (
          <li key={i.id}>
            {head && (
              <div className={`rail-head sw-${i.lane}`}>
                {/* the count is of the whole answer, not only the rows a chip shows */}
                <LightIcon light={i.lane === "older" ? "excluded" : i.lane} /> {group?.word ?? i.lane} · {group?.items.length ?? 0}
              </div>
            )}
            <button id={`q-${i.id}`} type="button" className={`q-item${i.id === selected ? " on" : ""}${two ? "" : " one"}`}
                    aria-current={i.id === selected} onClick={() => onOpen(i.id, false)} onKeyDown={(e) => move(e, n)}>
              <span className="q-line1">
                <span className="q-id">{i.id}</span>
                {fresh.has(i.id) && <span className="new-tag">{t("New")}</span>}
                <span className="q-party">{i.row?.counterparty_name ?? ""}</span>
                {!two && i.lane === "green" && i.row?.page != null && <span className="q-page">{t("p. {n}", { n: i.row.page })}</span>}
              </span>
              {two && (
                <span className="q-line2">
                  <LightIcon light={i.lane === "older" ? "excluded" : i.lane} />
                  <span><b className={`sw-${i.lane}`}>{itemWord(i, t)}</b> · <span className={`ns${next.open ? "" : " done"}`}>{next.text}</span></span>
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

