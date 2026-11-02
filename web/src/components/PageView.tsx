// The page as an image with the evidence marked (decision 52): the server renders the page, the browser
// draws boxes from the stored word coordinates, scaled in percent of the page size. Three looks (decision 95):
// "ev" a yellow fill = checked evidence; "look" a dashed orange outline = look here, not evidence; "suspect"
// red = text addressed to AI systems. Above the page: the page chips ("Pages read 1 ✓ 2 ✓" when the whole
// contract was read for an absence) and what is marked; on the dark desk, the verdict strip (`strip`).
import { Button } from "@fluentui/react-components";
import { ChevronLeft16Regular, ChevronRight16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { api, type DocumentInfo } from "../api";
import { useT } from "../i18n";
import type { Look } from "./evidence";

const CHIPS_UP_TO = 8;     // more pages: the arrows and "Page x of n"

interface Props {
  doc: DocumentInfo;
  page: number;
  onPage: (page: number) => void;
  boxes: Record<number, number[][]>;
  hint?: string | null;     // what is marked, e.g. "the passage – checked" (English, translated here)
  look?: Look;
  fill?: boolean;           // step 4: the page takes the free height of its column and scrolls inside it
  pagesRead?: boolean;      // an absence: every page was read - the chips say so
  empty?: string | null;    // nothing is marked: why, e.g. "nothing to mark – the clause is missing"
  markFailed?: boolean;     // a marking could not be loaded (F40)
  strip?: ReactNode;        // the verdict on the dark desk, above the paper
}

export function PageView({ doc, page, onPage, boxes, hint, look = "ev", fill = false, pagesRead = false, empty, markFailed, strip }: Props) {
  const t = useT();
  const info = doc.pages.find((p) => p.page_no === page);
  const scroller = useRef<HTMLDivElement>(null);
  const firstBox = useRef<HTMLDivElement>(null);
  const pagesWithHits = Object.keys(boxes).map(Number).filter((p) => boxes[p].length > 0);
  // "look here" is one dashed box around the whole passage on its page, not one per word
  const drawn = (p: number): number[][] => {
    const b = boxes[p] ?? [];
    if (look !== "look" || b.length === 0) return b;
    return [[Math.min(...b.map((x) => x[0])), Math.min(...b.map((x) => x[1])), Math.max(...b.map((x) => x[2])), Math.max(...b.map((x) => x[3]))]];
  };

  // Scroll inside the page viewer only (the window stays where the reviewer is): the mark at a third.
  const scrollToHighlight = useCallback(() => {
    const box = firstBox.current;
    const area = scroller.current;
    if (!box || !area) return;
    const delta = box.getBoundingClientRect().top - area.getBoundingClientRect().top;
    area.scrollBy({ top: delta - area.clientHeight / 3, behavior: "smooth" });
  }, []);
  useEffect(scrollToHighlight, [page, boxes, scrollToHighlight]);

  const pages = Array.from({ length: doc.page_count }, (_, i) => i + 1);
  const ocr = info?.source === "ocr" && info.ocr_conf != null ? t("scanned, read by OCR ({conf} %)", { conf: Math.round(info.ocr_conf) }) : "";
  const paper = (
    <div className="page-scroll" ref={scroller}>
      <div className="page-frame">
        <img src={api.pageImageUrl(doc.doc_id, page)} alt={t("{doc}, page {page}", { doc: doc.doc_id, page })} onLoad={scrollToHighlight} />
        {info &&
          drawn(page).map((b, i) => (
            <div
              key={i}
              ref={i === 0 ? firstBox : undefined}
              className={`hl ${look}`}
              style={{
                left: `${(b[0] / info.width) * 100}%`,
                top: `${(b[1] / info.height) * 100}%`,
                width: `${((b[2] - b[0]) / info.width) * 100}%`,
                height: `${((b[3] - b[1]) / info.height) * 100}%`,
              }}
            />
          ))}
      </div>
    </div>
  );

  return (
    <div className={`pageview${fill ? " fill" : ""}`}>
      <div className="pageview-nav">
        {doc.page_count <= CHIPS_UP_TO ? (
          <span className="page-chips" role="group" aria-label={pagesRead ? t("Pages read") : t("Pages")}>
            <span className="pc-label">{pagesRead ? t("Pages read") : t("Pages")}</span>
            {pages.map((p) => {
              const marked = pagesWithHits.includes(p);
              const label = [t("page {n}", { n: p }), pagesRead && t("read"), marked && t(hint ?? "marked")].filter(Boolean).join(", ");
              return (
                <button key={p} type="button" className={`pc${p === page ? " on" : ""}${marked ? ` m-${look}` : ""}`}
                        aria-pressed={p === page} aria-label={label} title={label} onClick={() => onPage(p)}>
                  {p}{pagesRead && " ✓"}
                </button>
              );
            })}
            {ocr && <span className="pc-ocr">{ocr}</span>}
          </span>
        ) : (
          <>
            <Button size="small" icon={<ChevronLeft16Regular />} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("Previous page")} />
            <span>{t("Page {page} of {count}", { page, count: doc.page_count })}{ocr && ` · ${ocr}`}</span>
            <Button size="small" icon={<ChevronRight16Regular />} disabled={page >= doc.page_count} onClick={() => onPage(page + 1)} aria-label={t("Next page")} />
          </>
        )}
        {markFailed ? (
          <span className="hl-hint failed" role="status">{t("The marking could not be loaded – the page is shown without it.")}</span>
        ) : pagesWithHits.length > 0 ? (
          <span className={`hl-hint ${look}`} data-signal="page">
            <span className={`hl-swatch ${look}`} /> {t(hint ?? "marked")} · {t("page {n}", { n: pagesWithHits.join(` ${t("and")} `) })}
          </span>
        ) : empty ? (
          <span className="hl-hint none"><span className="hl-swatch none" /> {t(empty)}</span>
        ) : null}
      </div>
      {strip ? <div className="desk">{strip}{paper}</div> : paper}
    </div>
  );
}

// Plain-text documents (the public CUAD contracts) have no page image: show the passage instead.
export function TextExcerpt({ text, start, end, look = "ev" }: { text: string; start: number | null; end: number | null; look?: Look }) {
  if (start == null || end == null) {
    return <pre className="text-excerpt">{text.slice(0, 1500)}…</pre>;
  }
  const from = Math.max(0, start - 500);
  const to = Math.min(text.length, end + 500);
  return (
    <pre className="text-excerpt">
      {from > 0 && "…"}
      {text.slice(from, start)}
      <mark className={look}>{text.slice(start, end)}</mark>
      {text.slice(end, to)}
      {to < text.length && "…"}
    </pre>
  );
}
