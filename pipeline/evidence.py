"""Evidence on the page: find the word boxes of a quote so the UI can highlight it on the page image.

Deterministic. The quote was already verified against the cleaned text (extract.locate_quote);
here we only map it back onto the words of the page, which still contain headers, footers and
OCR noise. A quote may run across a page break (M09), so the finding's page and the next one
are searched together.

Method: align the quote's words with the page's words (difflib). Matching runs of words are
highlighted; anything inserted in between - a 17-word page header at a page break - is skipped,
and a short run of misread words between two matches (OCR typo) is kept.
"""

from __future__ import annotations

import json
import re
from difflib import SequenceMatcher

MIN_COVERAGE = 80       # % of the quote's words that must be found on the page image
MIN_RUN = 3             # shorter matching runs are ignored (stray "the", "of")
MAX_TYPO_RUN = 3        # up to 3 misread words between two runs still belong to the quote


def _norm(word: str) -> str:
    return re.sub(r"[^\w]", "", word.lower())


def _align(page_words: list[str], quote_words: list[str]) -> tuple[float, list[int]]:
    """Return (coverage in %, indices of page words that belong to the quote)."""
    sm = SequenceMatcher(None, page_words, quote_words, autojunk=False)
    runs = [b for b in sm.get_matching_blocks() if b.size >= MIN_RUN]
    if not runs:
        return 0.0, []
    # keep runs near the longest one: the same phrase may also occur in another clause
    main = max(runs, key=lambda b: b.size)
    runs = [b for b in runs if abs(b.a - main.a) <= len(quote_words) + 40]
    indices = [k for b in runs for k in range(b.a, b.a + b.size)]
    matched = len(indices)
    for prev, nxt in zip(runs, runs[1:]):    # same-length gap on both sides = misread words, keep them
        gap_page, gap_quote = nxt.a - (prev.a + prev.size), nxt.b - (prev.b + prev.size)
        if 0 < gap_page == gap_quote <= MAX_TYPO_RUN:
            indices += range(prev.a + prev.size, nxt.a)
            matched += gap_quote
    return 100 * matched / len(quote_words), sorted(indices)


def quote_boxes(con, doc_id: str, quote: str | None, page: int | None) -> dict:
    """Boxes per page for a quote: {"coverage": .., "pages": [{"page": 2, "boxes": [[x0, y0, x1, y1], ...]}]}.

    Coordinates are in the page's own system (pages.width / pages.height), so the UI scales them
    to whatever size it renders the page image. An empty pages list means: not found on the page
    image (plain-text documents have no word boxes; the UI then highlights via char offsets)."""
    if not quote or not page:
        return {"coverage": 0.0, "pages": []}
    rows = con.execute("SELECT page_no, words_json FROM pages WHERE doc_id=? AND page_no IN (?, ?) ORDER BY page_no",
                       (doc_id, page, page + 1)).fetchall()
    words = [(r["page_no"], w) for r in rows for w in json.loads(r["words_json"] or "[]")]
    norm = [_norm(w[4]) for _, w in words]
    by_page: dict[int, list[list[float]]] = {}
    coverages = []
    # quotes joined with "..." are separate passages (failure case F4): highlight each part
    for part in (p for p in re.split(r"\.\.\.|…", quote) if p.strip()):
        target = [t for t in map(_norm, part.split()) if t]
        if not target or not words:
            continue
        coverage, indices = _align(norm, target)
        coverages.append(coverage)
        if coverage < MIN_COVERAGE:
            continue
        for k in indices:
            page_no, w = words[k]
            by_page.setdefault(page_no, []).append([round(c, 1) for c in w[:4]])
    return {"coverage": round(min(coverages), 1) if coverages else 0.0,
            "pages": [{"page": p, "boxes": b} for p, b in sorted(by_page.items())]}
