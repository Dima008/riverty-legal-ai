// The register in the header (spec 2.0, R2): how many contracts it holds, and whether one is being
// read, could not be read or is new. Quiet when nothing changed - then it is a link to the register;
// otherwise a click lists what is new, in the talk's words (newLines.ts), with a way into the register.
// It reads the live register (live.tsx), so it changes within 3 s of the pipeline, on every tool screen.
import { Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";
import { useState } from "react";
import type { MatrixRow } from "../api";
import { useLang, useT } from "../i18n";
import { useRegisterLive } from "../live";
import { newLines } from "./newLines";
import "./live.css";

const ids = (rows: MatrixRow[]) => rows.map((r) => r.doc_id).join(", ");

export function RegisterPulse() {
  const t = useT();
  const lang = useLang();
  const live = useRegisterLive();
  const [open, setOpen] = useState(false);
  if (live.offline) return <span className="env-pill off"><span className="dot" /> {t("API offline")}</span>;
  if (!live.matrix) return null;

  const n = live.matrix.rows.length;
  // being read first (it changes in seconds), then a failure (a person must act), then what is new
  const state = live.reading.length ? "reading" : live.failed.length ? "failed" : live.newDocs.length ? "new" : "quiet";
  const what =
    state === "reading" ? t("{id}: the model is reading it …", { id: ids(live.reading) })
    : state === "failed" ? t("{id} could not be read", { id: ids(live.failed) })
    : t("{n} new", { n: live.newDocs.length });
  // "48 contracts"; below 1280 px only "48" (live.css)
  const total = (
    <>
      <span className="pulse-long">{t("{n} contracts", { n })}</span>
      <span className="pulse-short">{n}</span>
    </>
  );
  // read out once a contract arrives; a screen reader does not have to open the popover
  const news = live.newDocs;
  const announce = news.length === 1 ? t("1 new contract: {ids}", { ids: ids(news) })
    : news.length > 1 ? t("{n} new contracts: {ids}", { n: news.length, ids: ids(news) }) : "";
  const spoken = <span className="sr-only" aria-live="polite">{announce}</span>;

  if (state === "quiet") {
    return <a className="pulse quiet" href="#/tool/register">{total}{spoken}</a>;
  }
  // every contract that is new, being read or failed, in register order
  const busy = new Set([...news, ...live.reading, ...live.failed].map((r) => r.doc_id));
  const listed = live.matrix.rows.filter((r) => busy.has(r.doc_id));
  const clauses = live.matrix.clauses;
  const close = () => setOpen(false);
  return (
    <Popover open={open} onOpenChange={(_, d) => setOpen(d.open)} positioning="below-end" withArrow>
      <PopoverTrigger disableButtonEnhancement>
        {/* in a narrow bar the text is cut with "…" (live.css): the whole of it is in the tooltip and the popover */}
        <button type="button" className={`pulse ${state}`} aria-expanded={open} title={`${t("{n} contracts", { n })} · ${what}`}>
          {state === "reading" && <span className="pulse-spin" aria-hidden />}
          {state === "new" && <span className="pulse-dot" aria-hidden />}
          <span className="pulse-text">{total}<span aria-hidden> · </span>{what}</span>
          {spoken}
        </button>
      </PopoverTrigger>
      <PopoverSurface className="pulse-pop" aria-label={t("New in the register – last 24 hours")}>
        <div className="pulse-pop-title">{t("New in the register – last 24 hours")}</div>
        <ul className="pulse-list">
          {listed.map((r) => (
            <li key={r.doc_id}>
              <div className="pulse-doc">
                <b>{r.doc_id}</b>
                <a href={`#/tool/register?doc=${r.doc_id}`} onClick={close}>{t("Open file")}</a>
              </div>
              <ul className="pulse-lines">
                {newLines(r, clauses, t, lang).map((l) => (
                  <li key={l.text} className={l.warn ? "warn" : undefined}>{l.text}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <a className="pulse-all" href="#/tool/register?type=all&only=new" onClick={close}>{t("Show new in the register")}</a>
      </PopoverSurface>
    </Popover>
  );
}
