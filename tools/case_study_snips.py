"""Sentence screenshots of the case study for the talk (decision 98).

Finds each key sentence in Riverty's case-study PDF, marks it in yellow like a highlighter, and
crops the lines it sits on, across the full text column, as a PNG. So the card in the talk shows
the original document, not retyped quotes. The PDF itself is not in the repo; the PNGs are.

    python -m tools.case_study_snips "C:/Users/Dima/Downloads/Software Engineer (RAG) Case Study_285144.pdf"

Writes web/public/case-study/<id>.png and prints each sentence. Fails if a sentence is not found,
so a changed PDF cannot silently produce a wrong crop.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pymupdf

OUT = Path(__file__).resolve().parents[1] / "web" / "public" / "case-study"
ZOOM = 3                      # render at 3x for a sharp image on a projector
PAD_Y = 2                     # points above and below the lines, so no half neighbour line shows
COLUMN = (62, 535)            # x range of the text column on every page (points)
MARKER = (1.0, 0.85, 0.30)    # a soft highlighter yellow (RGB 0-1), drawn half transparent
MARKER_OPACITY = 0.6

# id, page (0-based), the exact text to highlight as it stands in the PDF
SNIPS = [
    ("engineers", 0, "create more with the same number of engineers"),
    ("agents-fail", 0, "in day-to-day operations they often fail due to the sheer size and complexity of the "
                       "environments they have to operate in."),
    ("workload", 1, "the main workload still consists of organizing and reviewing contracts, comparing them, and "
                    "ensuring they comply with our corporate guidelines and represent the company’s best interests."),
    ("sharepoint", 1, "Most documents reside on SharePoint and are in PDF format. Some of them are scans of really old, "
                      "handwritten contracts that exist only as JPEG files."),
    ("storage", 1, "You may solely use it to store an additional copy of a contract in a legally compliant manner."),
    ("principles", 1, "First, we evaluate best-of-breed solutions and what they offer. Second, as we are a Microsoft "
                      "shop, we compare these solutions against what Microsoft provides."),
    ("the-task", 1, "contracts that do not contain a certain text passage or contracts in which a company name needs "
                    "to be updated."),
    ("semi-manual", 1, "So far, this is semi-manual work: they have to open the documents, search for the relevant "
                       "content, and verify the results themselves."),
    ("repetitive", 1, "They approached us to ask whether AI could help with this task, as it is purely repetitive work "
                      "that nobody enjoys doing."),
    ("understand", 2, "As a team, we encourage any form of AI usage, as long as we understand what is happening."),
]


def snip(doc: pymupdf.Document, page_no: int, text: str, out: Path) -> None:
    page = doc[page_no]
    quads = page.search_for(text, quads=True)
    if not quads:
        raise SystemExit(f"not found on page {page_no + 1}: {text!r}")
    marker = page.add_highlight_annot(quads)
    marker.set_colors(stroke=MARKER)
    marker.update(opacity=MARKER_OPACITY)
    rects = [q.rect for q in quads]
    # crop at whole text lines: every line the sentence touches, from its top to its bottom
    lines = [pymupdf.Rect(line["bbox"]) for block in page.get_text("dict")["blocks"] for line in block.get("lines", [])
             if any(pymupdf.Rect(line["bbox"]).intersects(r) for r in rects)]
    clip = pymupdf.Rect(COLUMN[0], min(r.y0 for r in lines) - PAD_Y, COLUMN[1], max(r.y1 for r in lines) + PAD_Y)
    page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), clip=clip, annots=True).save(out)


def main(pdf: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for sid, page_no, text in SNIPS:
        # a fresh copy per crop, so one sentence's highlight never shows in another crop
        with pymupdf.open(pdf) as doc:
            snip(doc, page_no, text, OUT / f"{sid}.png")
        print(f"{sid:12} p{page_no + 1}  {text[:70]}{'…' if len(text) > 70 else ''}")
    print(f"{len(SNIPS)} crops in {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
