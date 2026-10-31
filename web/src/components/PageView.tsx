// The page as an image with the evidence highlighted (decision 52): the server renders the page,
// the browser draws boxes from the stored word coordinates, scaled in percent of the page size.
import { Button } from "@fluentui/react-components";
import { ChevronLeft16Regular, ChevronRight16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useRef } from "react";
import { api, type DocumentInfo } from "../api";
import { useT } from "../i18n";

interface Props {
  doc: DocumentInfo;
  page: number;
  onPage: (page: number) => void;
  boxes: Record<number, number[][]>;
  hint?: string | null;   // what is highlighted, e.g. "the model's quote" (English, translated here)
}

export function PageView({ doc, page, onPage, boxes, hint }: Props) {
  const t = useT();
  const info = doc.pages.find((p) => p.page_no === page);
  const scroller = useRef<HTMLDivElement>(null);
  const firstBox = useRef<HTMLDivElement>(null);
  const pagesWithHits = Object.keys(boxes).map(Number).filter((p) => boxes[p].length > 0);

  // Scroll inside the page viewer only (the window stays where the reviewer is).
  const scrollToHighlight = useCallback(() => {
    const box = firstBox.current;
    const area = scroller.current;
    if (!box || !area) return;
    const delta = box.getBoundingClientRect().top - area.getBoundingClientRect().top;
    area.scrollBy({ top: delta - area.clientHeight / 3, behavior: "smooth" });
  }, []);
  useEffect(scrollToHighlight, [page, boxes, scrollToHighlight]);

  return (
    <div className="pageview">
      <div className="pageview-nav">
        <Button size="small" icon={<ChevronLeft16Regular />} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("Previous page")} />
        <span>
          {t("Page {page} of {count}", { page, count: doc.page_count })}
          {info?.source === "ocr" && info.ocr_conf != null ? ` · ${t("scanned, read by OCR ({conf} %)", { conf: Math.round(info.ocr_conf) })}` : ""}
        </span>
        <Button size="small" icon={<ChevronRight16Regular />} disabled={page >= doc.page_count} onClick={() => onPage(page + 1)} aria-label={t("Next page")} />
        {pagesWithHits.length > 0 && (
          <span className="hl-hint">
            <span className="hl-swatch" /> {t(hint ?? "highlighted")} · {t("page {n}", { n: pagesWithHits.join(` ${t("and")} `) })}
          </span>
        )}
      </div>
      <div className="page-scroll" ref={scroller}>
        <div className="page-frame">
          <img src={api.pageImageUrl(doc.doc_id, page)} alt={t("{doc}, page {page}", { doc: doc.doc_id, page })} onLoad={scrollToHighlight} />
          {info &&
            (boxes[page] ?? []).map((b, i) => (
              <div
                key={i}
                ref={i === 0 ? firstBox : undefined}
                className="hl"
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
    </div>
  );
}

// Plain-text documents (the public CUAD contracts) have no page image: show the passage instead.
export function TextExcerpt({ text, start, end }: { text: string; start: number | null; end: number | null }) {
  if (start == null || end == null) {
    return <pre className="text-excerpt">{text.slice(0, 1500)}…</pre>;
  }
  const from = Math.max(0, start - 500);
  const to = Math.min(text.length, end + 500);
  return (
    <pre className="text-excerpt">
      {from > 0 && "…"}
      {text.slice(from, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end, to)}
      {to < text.length && "…"}
    </pre>
  );
}
