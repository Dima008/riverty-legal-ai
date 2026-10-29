"""Clean page texts and split documents at clause boundaries.

Contracts are structured by numbered sections. Splitting there keeps a clause
together (also across page breaks), so a hit always carries its full context.
Sections that are too long fall back to paragraph windows with overlap.
"""

from __future__ import annotations

import bisect
import json
import re
from collections import Counter
from dataclasses import dataclass

from .store import transaction

MAX_CHUNK_CHARS = 2500
WINDOW_CHARS = 1500

# Known letterhead/footer lines. In production these are learned per template;
# lines repeated on every page are removed generically below.
BOILERPLATE = [
    re.compile(r"^\s*(page|seite)\s+\d+(\s*(of|von)\s*\d+)?\s*$", re.IGNORECASE),
    re.compile(r"^\s*-?\s*\d+\s*-?\s*$"),
    re.compile(r"^\s*SYNTHETIC TEST DOCUMENT\b.*$", re.IGNORECASE),
]

HEADING = re.compile(
    r"^(?:"
    r"(?:§\s*)?\d{1,2}\.?\s+[A-ZÄÖÜ][^\n]{0,80}"             # "7. Liability", "§ 7 Haftung"
    r"|(?:ARTICLE|Article|ARTIKEL|Artikel|SECTION|Section)\s+[\dIVX]+[^\n]{0,80}"
    r"|(?:Annex|Anlage|Schedule|Exhibit|Appendix|Anhang)\b[^\n]{0,80}"
    r")$"
)
# Inline heading in long paragraphs: "7. DISCLAIMER OF WARRANTIES.  EACH PARTY ..."
INLINE_HEADING = re.compile(r"^((?:§\s*)?\d{1,2}\.\s+[A-ZÄÖÜ][A-ZÄÖÜ0-9 \-&/,']{2,60}[.:])(?:\s|$)")


@dataclass
class Chunk:
    chunk_id: str
    seq: int
    section_title: str
    page_start: int
    page_end: int
    char_start: int
    char_end: int
    text: str


def clean_pages(pages: list[str]) -> list[str]:
    """Remove boilerplate lines and lines repeated on every page (headers/footers)."""
    repeated = set()
    if len(pages) >= 2:
        counts = Counter(line.strip() for page in pages for line in set(page.splitlines()) if line.strip())
        repeated = {line for line, n in counts.items() if n == len(pages) and len(line) > 3}
    cleaned = []
    for page in pages:
        keep = [line for line in page.splitlines()
                if line.strip() not in repeated and not any(p.match(line) for p in BOILERPLATE)]
        cleaned.append("\n".join(keep).strip("\n"))
    return cleaned


def build_doc_text(pages: list[str]) -> tuple[str, list[int]]:
    """Join cleaned pages into one text; page_offsets[i] is the start of page i+1."""
    offsets, parts, pos = [], [], 0
    for page in clean_pages(pages):
        offsets.append(pos)
        parts.append(page)
        pos += len(page) + 1
    return "\n".join(parts), offsets


def page_of(offsets: list[int], char_pos: int) -> int:
    return bisect.bisect_right(offsets, char_pos)


def heading_title(line: str) -> str | None:
    line = line.strip()
    if HEADING.match(line):
        # a numbered sentence ("2. The Merchant shall ...") is a paragraph, not a heading
        if not (len(line) > 60 and line.endswith((".", ";", ",")) and " shall " in line):
            return line
    m = INLINE_HEADING.match(line)
    return m.group(1) if m else None


def split_sections(text: str) -> list[tuple[str, int, int]]:
    """Return (title, start, end) per section; text before the first heading is the preamble."""
    starts = []
    pos = 0
    for line in text.splitlines(keepends=True):
        title = heading_title(line)
        if title:
            starts.append((title, pos))
        pos += len(line)
    if not starts or starts[0][1] > 0:
        starts.insert(0, ("Preamble", 0))
    sections = []
    for i, (title, start) in enumerate(starts):
        end = starts[i + 1][1] if i + 1 < len(starts) else len(text)
        if text[start:end].strip():
            sections.append((title, start, end))
    return sections


def _windows(text: str, start: int, end: int) -> list[tuple[int, int]]:
    """Split a long section at paragraph/line boundaries into overlapping windows."""
    out, cur = [], start
    while cur < end:
        stop = min(cur + WINDOW_CHARS, end)
        if stop < end:
            cut = max(text.rfind("\n", cur + WINDOW_CHARS // 2, stop), text.rfind(". ", cur + WINDOW_CHARS // 2, stop))
            stop = cut + 1 if cut > cur else stop
        out.append((cur, stop))
        if stop >= end:
            break
        back = text.rfind("\n", cur, stop - 200)          # overlap: last ~line of previous window
        cur = back + 1 if back > cur else stop
    return out


def chunk_document(doc_id: str, text: str, offsets: list[int]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for title, s, e in split_sections(text):
        spans = [(s, e)] if e - s <= MAX_CHUNK_CHARS else _windows(text, s, e)
        for part, (cs, ce) in enumerate(spans):
            body = text[cs:ce].strip()
            if not body:
                continue
            seq = len(chunks) + 1
            chunks.append(Chunk(f"{doc_id}:{seq:03d}", seq, title if part == 0 else f"{title} (cont. {part + 1})",
                                page_of(offsets, cs), page_of(offsets, max(cs, ce - 1)), cs, ce, body))
    return chunks


def run(con, doc_ids: list[str]) -> int:
    total = 0
    for doc_id in doc_ids:
        pages = [r["text"] for r in con.execute("SELECT text FROM pages WHERE doc_id=? ORDER BY page_no", (doc_id,))]
        if not pages:
            continue
        text, offsets = build_doc_text(pages)
        chunks = chunk_document(doc_id, text, offsets)
        with transaction(con):
            con.execute("INSERT OR REPLACE INTO doc_text VALUES (?,?,?)", (doc_id, text, json.dumps(offsets)))
            old = [r["chunk_id"] for r in con.execute("SELECT chunk_id FROM chunks WHERE doc_id=?", (doc_id,))]
            con.executemany("DELETE FROM embeddings WHERE chunk_id=?", [(c,) for c in old])
            con.execute("DELETE FROM chunks WHERE doc_id=?", (doc_id,))
            con.execute("DELETE FROM chunks_fts WHERE doc_id=?", (doc_id,))
            con.executemany(
                "INSERT INTO chunks (chunk_id, doc_id, seq, section_title, page_start, page_end, char_start,"
                " char_end, text, context) VALUES (?,?,?,?,?,?,?,?,?,?)",
                [(c.chunk_id, doc_id, c.seq, c.section_title, c.page_start, c.page_end, c.char_start, c.char_end,
                  c.text, None) for c in chunks])
        total += len(chunks)
    return total
