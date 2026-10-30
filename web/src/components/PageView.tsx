// The page as an image with the evidence highlighted (decision 52): the server renders the page,
// the browser draws boxes from the stored word coordinates, scaled in percent of the page size.
import { Button, Caption1, Text } from "@fluentui/react-components";
import { ChevronLeft16Regular, ChevronRight16Regular } from "@fluentui/react-icons";
import { useEffect, useRef } from "react";
import { api, type DocumentInfo } from "../api";

interface Props {
  doc: DocumentInfo;
  page: number;
  onPage: (page: number) => void;
  boxes: Record<number, number[][]>;
}

export function PageView({ doc, page, onPage, boxes }: Props) {
  const info = doc.pages.find((p) => p.page_no === page);
  const firstBox = useRef<HTMLDivElement>(null);
  const pagesWithHits = Object.keys(boxes).map(Number).filter((p) => boxes[p].length > 0);

  useEffect(() => {
    firstBox.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [page, boxes]);

  return (
    <div className="pageview">
      <div className="pageview-nav">
        <Button size="small" icon={<ChevronLeft16Regular />} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" />
        <Text size={200}>
          Page {page} of {doc.page_count}
          {info?.source === "ocr" && info.ocr_conf != null ? ` · read by OCR, ${Math.round(info.ocr_conf)} % confidence` : ""}
        </Text>
        <Button size="small" icon={<ChevronRight16Regular />} disabled={page >= doc.page_count} onClick={() => onPage(page + 1)} aria-label="Next page" />
        {pagesWithHits.length > 0 && <Caption1>highlighted on page {pagesWithHits.join(" and ")}</Caption1>}
      </div>
      <div className="page-scroll">
        <div className="page-frame">
          <img src={api.pageImageUrl(doc.doc_id, page)} alt={`${doc.doc_id}, page ${page}`} />
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
