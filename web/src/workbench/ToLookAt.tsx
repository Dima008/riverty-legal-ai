// The contracts of an answer that a person looks at (spec 2.2, 2.3, 4.2): the table "To look at" in
// step 2 and the queue in step 3, built from the same words - one status icon, the status word, why a
// person looks, the next step. The chips narrow the rows to work on; they never hide anything silently
// ("Showing 2 of 6 · Unclear · Show all"), and their counts always come from every row of the answer.
import { Button } from "@fluentui/react-components";
import { useEffect, useState, type KeyboardEvent } from "react";
import type { RunRow } from "../api";
import { StatusIcon } from "../components/Badges";
import { flagName, injectionPageOf } from "../components/SafetyBar";
import { NextStep, rowSubject, StatusWord, statusLabel, whyLines } from "../components/Words";
import { useFormat, useT } from "../i18n";
import { OPEN_STATES, WHY } from "../labels";
import "./workbench.css";

/** Which rows to work on: one status (or all), only open ones, only new ones. Shared by steps 2 and 3. */
export interface Chips {
  status: string | null;
  open: boolean;
  fresh: boolean;          // arrived in the last 24 hours ("New")
}
export const NO_CHIPS: Chips = { status: null, open: false, fresh: false };

const isOpen = (r: RunRow) => OPEN_STATES.includes(r.review.state);
const INJECTION = WHY.find((w) => w.id === "injection")?.flags ?? [];

/** The rows the chips let through. */
export const chipRows = (rows: RunRow[], c: Chips, fresh: Set<string>) =>
  rows.filter((r) => (!c.status || r.status === c.status) && (!c.open || isOpen(r)) && (!c.fresh || fresh.has(r.doc_id)));

/** The rows "Confirm n at once" may confirm: marked Confirm, not a spot check, not decided. The server
 *  checks the same (api/review.py confirm_batch); the chips never change this count. */
export const batchRows = (rows: RunRow[]) => rows.filter((r) => r.triage === "CONFIRM" && !r.sample && r.review.state === "FOUND");

export function ChipBar({ rows, chips, fresh, onChips }:
  { rows: RunRow[]; chips: Chips; fresh: Set<string>; onChips: (c: Chips) => void }) {
  const t = useT();
  const statuses = [...new Set(rows.map((r) => r.status))];
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const newCount = rows.filter((r) => fresh.has(r.doc_id)).length;
  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={onClick}>{label}</button>
  );
  return (
    <div className="chips" role="group" aria-label={t("To look at")}>
      {chip(!chips.status, t("All {n}", { n: rows.length }), () => onChips({ ...chips, status: null }))}
      {statuses.map((s) => <span key={s}>{chip(chips.status === s, `${statusLabel(s, t)} ${count(s)}`, () => onChips({ ...chips, status: s }))}</span>)}
      {chip(chips.open, t("Open {n}", { n: rows.filter(isOpen).length }), () => onChips({ ...chips, open: !chips.open }))}
      {newCount > 0 && chip(chips.fresh, t("New {n}", { n: newCount }), () => onChips({ ...chips, fresh: !chips.fresh }))}
    </div>
  );
}

/** "Showing 2 of 6 · Unclear · Show all" - only when a chip hides rows. */
export function Showing({ shown, rows, chips, onChips }: { shown: number; rows: RunRow[]; chips: Chips; onChips: (c: Chips) => void }) {
  const t = useT();
  if (shown === rows.length) return null;
  const on = [chips.status && statusLabel(chips.status, t), chips.open && t("open"), chips.fresh && t("New")].filter(Boolean);
  return (
    <p className="showing" role="status">
      {t("Showing {n} of {of}", { n: shown, of: rows.length })} · {on.join(" · ")} ·{" "}
      <button type="button" className="link-btn" onClick={() => onChips({ status: null, open: false, fresh: false })}>{t("Show all")}</button>
    </p>
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
function useInjectionPages(rows: RunRow[]): Record<string, number | null> {
  const [pages, setPages] = useState<Record<string, number | null>>({});
  const ids = rows.filter((r) => r.flags.some((f) => INJECTION.includes(flagName(f)))).map((r) => r.doc_id).join(",");
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

/** Step 2: one row per reported contract, sorted by ID like the tiles; a click opens it in step 3. */
export function ToLookAtTable({ rows, fresh, onOpen }: { rows: RunRow[]; fresh: Set<string>; onOpen: (docId: string) => void }) {
  const t = useT();
  const { num } = useFormat();
  const pages = useInjectionPages(rows);
  return (
    <table className="tla">
      <thead>
        <tr>
          <th>{t("Contract")}</th>
          <th>{t("The register says")}</th>
          <th>{t("Why a person looks")}</th>
          <th>{t("Next step")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const why = whyLines(rowSubject(r), { injectionPage: pages[r.doc_id] }, t, num)[0];
          return (
            // the whole row opens step 3; the ID is the button, so a keyboard reaches it too
            <tr key={r.doc_id} onClick={() => onOpen(r.doc_id)}>
              <td>
                <button type="button" className="tla-open" onClick={(e) => { e.stopPropagation(); onOpen(r.doc_id); }}>
                  <span className="tla-id">{r.doc_id}</span>
                  {fresh.has(r.doc_id) && <span className="new-tag">{t("New")}</span>}
                  <span className="tla-party">{r.counterparty_name ?? t("unknown party")}</span>
                </button>
              </td>
              <td><StatusWord status={r.status} law={r.governing_law} /></td>
              <td className="tla-why">{why ? why.short : "–"}</td>
              <td><NextStep standing={r} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Step 3: the queue beside the page. ↑/↓ move to the next row; the focus stays in the queue. */
export function Queue({ rows, selected, fresh, onOpen }:
  { rows: RunRow[]; selected: string; fresh: Set<string>; onOpen: (docId: string, byKey: boolean) => void }) {
  const t = useT();
  const move = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : -1;
    if (next < 0 || next >= rows.length) return;
    e.preventDefault();
    onOpen(rows[next].doc_id, true);
    // the list re-renders with the new row selected: move the focus with it
    window.requestAnimationFrame(() => document.getElementById(`q-${rows[next].doc_id}`)?.focus());
  };
  return (
    <ul className="queue">
      {rows.map((r, i) => (
        <li key={r.doc_id}>
          <button id={`q-${r.doc_id}`} type="button" className={`q-item${r.doc_id === selected ? " on" : ""}`}
                  aria-current={r.doc_id === selected} onClick={() => onOpen(r.doc_id, false)} onKeyDown={(e) => move(e, i)}>
            <span className="q-line1">
              <span className="q-id">{r.doc_id}</span>
              {fresh.has(r.doc_id) && <span className="new-tag">{t("New")}</span>}
              <span className="q-party">{r.counterparty_name ?? t("unknown party")}</span>
            </span>
            <span className="q-line2">
              <StatusIcon status={r.status} />
              <span>{statusLabel(r.status, t)} · <NextStep standing={r} /></span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
