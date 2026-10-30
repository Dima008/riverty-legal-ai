"""Ingest: discover documents, read text layers, OCR scans, store pages.

Fully deterministic. Every page keeps its words with bounding boxes, so the UI
can highlight the exact evidence later.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import shutil
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf
import pytesseract
from PIL import Image

from . import config
from .store import audit, now, transaction

# Tesseract binary: TESSERACT_CMD from .env, else PATH, else the default Windows install location
_WINDOWS_TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.environ.get("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
elif not shutil.which("tesseract") and _WINDOWS_TESSERACT.exists():
    pytesseract.pytesseract.tesseract_cmd = str(_WINDOWS_TESSERACT)

IMAGE_EXT = {".jpg", ".jpeg", ".png"}
PAGE_SUFFIX = re.compile(r"_p(\d+)$", re.IGNORECASE)
DOC_ID = re.compile(r"^([A-Z]\d{2}(?:-[A-Z])?)")

GERMAN_HINTS = {"der", "die", "das", "und", "des", "vertrag", "nicht", "werden", "dem", "zur", "mit"}
ENGLISH_HINTS = {"the", "and", "of", "agreement", "shall", "this", "with", "for", "any", "party"}


@dataclass
class SourceDoc:
    doc_id: str
    files: list[Path]
    kind: str  # pdf | image | txt


@dataclass
class Page:
    page_no: int
    text: str
    source: str            # text_layer | ocr | txt
    ocr_conf: float | None
    width: float
    height: float
    words: list = field(default_factory=list)   # [x0, y0, x1, y1, word] in page coordinates


def discover(dirs: list[Path] | None = None) -> list[SourceDoc]:
    """Find the documents in the source folders. Only the page images of one scan
    (M20_Buerowelt_p1.jpg, M20_Buerowelt_p2.jpg) form one document; every other file is a
    document of its own (F17). Files are taken in sorted order: the first one gets the short id
    from the test-set file name (M03_Bergmann.pdf -> M03); a further file with the same prefix
    keeps its name as id (M03_copy.pdf -> M03_copy), so it is registered - and marked as a
    duplicate if its text is the same. In production the id is the SharePoint item id."""
    groups: dict[str, list[Path]] = {}
    kinds: dict[str, str] = {}
    scans: dict[str, str] = {}      # doc id -> file name without the page suffix, for scan pages
    for root in dirs or config.SOURCE_DIRS:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            ext = path.suffix.lower()
            if not path.is_file() or ext not in IMAGE_EXT | {".pdf", ".txt"}:
                continue
            is_page = ext in IMAGE_EXT and PAGE_SUFFIX.search(path.stem) is not None
            stem = PAGE_SUFFIX.sub("", path.stem) if is_page else path.stem
            doc_id = _free_id(stem, is_page, groups, scans)
            groups.setdefault(doc_id, []).append(path)
            kinds[doc_id] = "image" if ext in IMAGE_EXT else ext.lstrip(".")
            if is_page:
                scans[doc_id] = stem
    return [SourceDoc(d, sorted(f, key=_page_index), kinds[d]) for d, f in sorted(groups.items())]


def _free_id(stem: str, is_page: bool, groups: dict, scans: dict) -> str:
    """The first id that is still free - or taken by an earlier page of the same scan."""
    match = DOC_ID.match(stem)
    name = re.sub(r"[^A-Za-z0-9_-]+", "_", stem)[:40]
    candidates = ([match.group(1)] if match else []) + [name] + [f"{name}_{n}" for n in range(2, 100)]
    for doc_id in candidates:
        if doc_id not in groups or (is_page and scans.get(doc_id) == stem):
            return doc_id
    raise ValueError(f"no free document id for {stem!r}")


def _page_index(path: Path) -> int:
    m = PAGE_SUFFIX.search(path.stem)
    return int(m.group(1)) if m else 0


def _ocr_image(img: Image.Image) -> tuple[str, float, list]:
    data = pytesseract.image_to_data(img, lang=config.OCR_LANGUAGES, output_type=pytesseract.Output.DICT)
    words, confs, lines = [], [], {}
    for i, word in enumerate(data["text"]):
        word = word.strip()
        conf = float(data["conf"][i])
        if not word or conf < 0:
            continue
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        words.append([x, y, x + w, y + h, word])
        confs.append(conf)
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        lines.setdefault(key, []).append(word)
    text = "\n".join(" ".join(ws) for ws in lines.values())
    mean = sum(confs) / len(confs) if confs else 0.0
    return text, mean, words


def read_pages(src: SourceDoc) -> list[Page]:
    pages: list[Page] = []
    if src.kind == "txt":
        text = src.files[0].read_text(encoding="utf-8", errors="replace")
        return [Page(1, text, "txt", None, 0, 0, [])]
    if src.kind == "image":
        for n, path in enumerate(src.files, 1):
            img = Image.open(path)
            text, conf, words = _ocr_image(img)
            pages.append(Page(n, text, "ocr", conf, img.width, img.height, words))
        return pages
    doc = pymupdf.open(src.files[0])
    for n, page in enumerate(doc, 1):
        text = page.get_text("text")
        if len(text.strip()) >= config.MIN_TEXT_CHARS_PER_PAGE:
            words = [[w[0], w[1], w[2], w[3], w[4]] for w in page.get_text("words")]
            pages.append(Page(n, text, "text_layer", None, page.rect.width, page.rect.height, words))
        else:  # image-only page -> OCR; boxes are scaled back to page coordinates
            pix = page.get_pixmap(dpi=config.OCR_DPI)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text, conf, words = _ocr_image(img)
            scale = 72 / config.OCR_DPI
            words = [[w[0] * scale, w[1] * scale, w[2] * scale, w[3] * scale, w[4]] for w in words]
            pages.append(Page(n, text, "ocr", conf, page.rect.width, page.rect.height, words))
    return pages


def detect_language(text: str) -> str:
    tokens = Counter(re.findall(r"[a-zäöüß]+", text.lower()))
    de = sum(tokens[w] for w in GERMAN_HINTS)
    en = sum(tokens[w] for w in ENGLISH_HINTS)
    if de == en == 0:
        return "unknown"
    return "de" if de > en else "en"


def normalise_for_hash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def check_ocr_languages() -> None:
    """Fail loudly: without the language model Tesseract silently falls back to English (no umlauts)."""
    available = set(pytesseract.get_languages(config=""))
    missing = [lang for lang in config.OCR_LANGUAGES.split("+") if lang not in available]
    if missing:
        raise RuntimeError(f"Tesseract language data missing: {missing}. Set TESSDATA_PREFIX in .env.")


def ingest(con, sources: list[SourceDoc] | None = None, actor: str = "pipeline") -> list[str]:
    """Ingest new or changed documents. Returns the ids that were (re)processed."""
    check_ocr_languages()
    processed = []
    for src in sources or discover():
        file_hash = hashlib.sha256(b"".join(p.read_bytes() for p in src.files)).hexdigest()
        row = con.execute("SELECT file_sha256, ingested_at FROM documents WHERE doc_id=?", (src.doc_id,)).fetchone()
        if row and row["file_sha256"] == file_hash:
            continue  # unchanged (delta logic, like a Graph delta query)
        # The first ingest time is kept: families keep the earlier document as the original, so
        # reading the original again must not turn it into the copy (F6, F14).
        first_ingested = row["ingested_at"] if row and row["ingested_at"] else now()
        try:
            pages = read_pages(src)
        except Exception as exc:  # keep going, mark as failed
            with transaction(con):
                con.execute("INSERT OR REPLACE INTO documents (doc_id, source_path, file_sha256, status, ingested_at)"
                            " VALUES (?,?,?,?,?)", (src.doc_id, str(src.files[0]), file_hash, "FAILED", first_ingested))
                audit(con, actor, "ingest_failed", src.doc_id, error=str(exc))
            continue
        full = "\n".join(p.text for p in pages)
        ocr = [p.ocr_conf for p in pages if p.ocr_conf is not None]
        mean_conf = sum(ocr) / len(ocr) if ocr else None
        if src.kind == "txt":
            fmt = "txt"
        elif src.kind == "image":
            fmt = "jpeg"
        else:
            fmt = "pdf_image" if ocr else "pdf_text"
        if mean_conf is None:
            status = "INGESTED"
        else:
            status = "LOW_QUALITY" if mean_conf < config.OCR_LOW_QUALITY_CONFIDENCE else "OCR_DONE"
        with transaction(con):
            con.execute("DELETE FROM pages WHERE doc_id=?", (src.doc_id,))
            con.execute(
                "INSERT OR REPLACE INTO documents (doc_id, source_path, file_sha256, text_sha256, format, language,"
                " page_count, ocr_mean_conf, status, family_id, duplicate_of, ingested_at)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (src.doc_id, ";".join(str(p.relative_to(config.ROOT)) for p in src.files), file_hash,
                 hashlib.sha256(normalise_for_hash(full).encode()).hexdigest(), fmt, detect_language(full),
                 len(pages), mean_conf, status, src.doc_id, None, first_ingested))
            for p in pages:
                con.execute("INSERT INTO pages VALUES (?,?,?,?,?,?,?,?)",
                            (src.doc_id, p.page_no, p.text, p.source, p.ocr_conf, p.width, p.height,
                             json.dumps(p.words, ensure_ascii=False)))
            audit(con, actor, "ingested", src.doc_id, format=fmt, pages=len(pages), status=status,
                  ocr_mean_conf=mean_conf)
        processed.append(src.doc_id)
    return processed
