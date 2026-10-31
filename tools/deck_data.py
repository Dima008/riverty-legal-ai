"""Numbers and data for the talk's cards (acts 2, 3, 5, 6), read from the register - never typed by hand.

The cards import web/src/deck/slides/deck-data.json; this script writes it. Run it again after the
register changed, and the cards follow:

    python -m tools.deck_data            # needs the built register; embeds two queries (< $0.0001)
    python -m tools.deck_data --measure-h01   # OCR of the handwritten demo page -> eval/results (no model call)

What it collects:
- embedding ruler: the query "limitation of liability" embedded once, every passage's cosine
  similarity to it, the k = 5 nearest, M14's planted note against M19's real German cap, and the
  similarities of a few passages to M01's liability section (the decoy lesson);
- register snapshot of the merchant agreements: the three required clauses, copy, former names;
- one contract through the pipeline (M18), the chunking comparison for M09, the M08 liability
  finding (model said vs register says), the M14 hidden note, coverage and cost totals;
- the Prompt Shields probe result from eval/results;
- deep dives: M18 read again by OCR with the word confidences the register does not keep (guarded
  against the stored pages), the handwritten demo page H01 as measured by --measure-h01 (decision
  82; the demo reset removes H01 from the register, so the measurement is kept in eval/results),
  the fixed form of the extraction call with M18's real answer, the agent patterns in numbers, and
  one hybrid search ("cap on damages", embeds one more query).
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import inspect
import io
import json
import re
from datetime import date
from pathlib import Path

import numpy as np
import pymupdf
import pytesseract
from fastapi.testclient import TestClient
from PIL import Image

from api.main import app
from pipeline import catalogue, config, ingest, portfolio, queries, search
from pipeline.extract import CLAUSE_SCHEMA, EXTRACTION_SCHEMA, MAX_SINGLE_PASS_CHARS
from pipeline.llm import ModelAdapter
from pipeline.search import RRF_K, hybrid_search
from pipeline.store import connect
from tools import generate_goldset

OUT = config.ROOT / "web" / "src" / "deck" / "slides" / "deck-data.json"
QUERY = "limitation of liability"
K = 5
Q1_LACKING = ["M03", "M08", "M10", "M14", "M18"]          # data/gold_queries.json, Q1
REQUIRED = ["liability_limitation", "consumer_terms_checkout", "dpa_reference"]
LIABILITY = re.compile(r"liabil|haftung", re.I)
DECOY_ANCHOR = "M01:008"                                     # "7. Liability" of M01
DECOY_PASSAGES = ["M02:008", "M10:008", "M01:005", "M01:010", "M19:008"]


def group(doc_id: str) -> str:
    return doc_id[0] if doc_id[0] in "MVCH" else "?"


def embedding_map(con) -> dict:
    """Every passage as one dot on a ruler: how close its vector is to the question's vector
    (cosine similarity). A 2-D projection (PCA) was tried first and rejected: it sorts the dots by
    contract group and template, not by meaning, so 'near on the map' would have been misleading."""
    rows = con.execute("SELECT e.chunk_id, e.vector, c.doc_id, c.section_title FROM embeddings e "
                       "JOIN chunks c ON c.chunk_id = e.chunk_id ORDER BY c.doc_id, c.seq").fetchall()
    ids = [r["chunk_id"] for r in rows]
    mat = np.vstack([np.frombuffer(r["vector"], dtype=np.float32) for r in rows]).astype(np.float64)
    unit = mat / np.linalg.norm(mat, axis=1, keepdims=True)
    q = np.asarray(ModelAdapter(record=False).embed([QUERY], purpose="search")[0], dtype=np.float64)
    q /= np.linalg.norm(q)
    sims = unit @ q
    order = np.argsort(-sims)
    rank = {ids[i]: n + 1 for n, i in enumerate(order)}
    titles = {r["chunk_id"]: r["section_title"] for r in rows}
    spot = lambda cid, has_cap: {"id": cid, "title": titles[cid], "sim": round(float(sims[ids.index(cid)]), 3),  # noqa: E731
                                 "rank": rank[cid], "has_cap": has_cap}
    anchor = unit[ids.index(DECOY_ANCHOR)]
    return {
        "query": QUERY, "k": K, "passages": len(rows), "dims": int(mat.shape[1]),
        "points": [{"id": ids[i], "s": round(float(sims[i]), 3), "g": group(r["doc_id"]),
                    "lia": bool(LIABILITY.search(r["section_title"] or ""))} for i, r in enumerate(rows)],
        "near": [{"id": ids[i], "title": titles[ids[i]], "sim": round(float(sims[i]), 3)} for i in order[:K]],
        # the planted note in M14 (no cap) scores higher than M19's real cap in German
        "spots": [spot("M14:013", False), spot("M19:008", True)],
        "decoy": {"anchor": DECOY_ANCHOR, "anchor_title": titles[DECOY_ANCHOR],
                  "sims": [{"id": cid, "title": titles[cid], "sim": round(float(unit[ids.index(cid)] @ anchor), 3)}
                           for cid in DECOY_PASSAGES]},
    }


def register_snapshot(con) -> dict:
    docs = con.execute("SELECT d.doc_id, d.duplicate_of, m.counterparty_name FROM documents d JOIN metadata m "
                       "ON m.doc_id = d.doc_id WHERE m.doc_type = 'merchant_agreement' ORDER BY d.doc_id").fetchall()
    status = {(r["doc_id"], r["clause_type"]): r["status"]
              for r in con.execute("SELECT doc_id, clause_type, status FROM clauses")}
    names = {r["doc_id"]: r["n"] for r in con.execute(
        "SELECT doc_id, COUNT(*) AS n FROM name_hits WHERE resolved_by IS NULL GROUP BY doc_id")}
    rows = [{"id": d["doc_id"], "party": d["counterparty_name"], "copy_of": d["duplicate_of"],
             "cells": [status.get((d["doc_id"], c), "UNCLEAR") for c in REQUIRED],
             "former_names": names.get(d["doc_id"], 0)} for d in docs]
    return {"clauses": ["Limitation of liability", "Consumer terms in checkout", "Data processing agreement"],
            "rows": rows, "documents": con.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
            "passages": con.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]}


def chunking_m09(client) -> dict:
    data = client.get("/documents/M09/chunks", params={"compare": "fixed", "size": 2000}).json()
    sections = [{"title": c["section_title"], "start": c["char_start"], "end": c["char_end"]} for c in data["chunks"]]
    liability = next(s for s in sections if LIABILITY.search(s["title"]))
    fixed = [{"start": w["char_start"], "end": w["char_end"]} for w in data["fixed"]["windows"]]
    return {"length": data["text_length"], "page_break": data["page_offsets"][1], "sections": sections,
            "fixed": fixed, "liability": liability, "fixed_size": data["fixed"]["size"],
            "cut_by_fixed": data["fixed"]["cut_sections"]}


def finding(con, doc_id: str, clause: str) -> dict:
    r = con.execute("SELECT status, model_status, quote, quote_score, confidence, flags, section, page "
                    "FROM clauses WHERE doc_id=? AND clause_type=?", (doc_id, clause)).fetchone()
    return {**dict(r), "flags": json.loads(r["flags"] or "[]")}


LETTERS = re.compile(r"[^A-Za-zÄÖÜäöüß]")
OCR_DOC = "M18"
FOOTER = {LETTERS.sub("", w) for w in f"{generate_goldset.WATERMARK} Page".split()} - {""}   # printed on every page
RESULTS = config.ROOT / "eval" / "results"
H01_IMAGE = config.ROOT / "data" / "demo" / "H01.jpg"       # the handwritten live-demo page (decision 82)
SEARCH_QUERY = "cap on damages"
SEARCH_FILTER = {"doc_type": "merchant_agreement"}
SEARCH_K = 8


def wrong_letters(ocr: list[str], source: list[str]) -> list[tuple[int, str | None]]:
    """OCR words with wrong letters: the OCR word list is aligned with the source text word by word
    (difflib.SequenceMatcher on the letters of each word), and every OCR word whose letters differ
    from the source word at its place counts - an exact count, not only words missing from a word
    list. Not counted: digits and punctuation, and the printed footer, which is not in the source."""
    key = lambda w: LETTERS.sub("", w) or w  # noqa: E731
    out = []
    matcher = difflib.SequenceMatcher(None, [key(w) for w in source], [key(w) for w in ocr], autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag in ("equal", "delete"):
            continue
        block = [LETTERS.sub("", w) for w in source[i1:i2]]
        for j in range(j1, j2):
            letters = LETTERS.sub("", ocr[j])
            if not letters or letters in FOOTER:
                continue
            truth = block[j - j1] if len(block) == j2 - j1 else next(iter(difflib.get_close_matches(letters, block, n=1, cutoff=0)), None)
            if letters != truth:
                out.append((j, truth))
    return out


def measure_h01() -> Path:
    """The handwritten live-demo page H01 (data/demo/H01.jpg, decision 82) through the pipeline's own
    OCR call for an image page (ingest._ocr_image). Read-only: no model call, the register is not
    touched. Stored in eval/results, because the demo reset forgets H01 - the register cannot show it."""
    ingest.check_ocr_languages()            # importing ingest also points pytesseract at Tesseract
    text, conf, words = ingest._ocr_image(Image.open(H01_IMAGE))
    result = {
        "date": date.today().isoformat(), "doc_id": "H01", "image": H01_IMAGE.relative_to(config.ROOT).as_posix(),
        "sha256": hashlib.sha256(H01_IMAGE.read_bytes()).hexdigest(), "ocr_call": "pipeline.ingest._ocr_image",
        "tesseract": str(pytesseract.get_tesseract_version()), "languages": config.OCR_LANGUAGES,
        "words": len(words), "mean_conf": round(conf, 1), "threshold": config.OCR_LOW_QUALITY_CONFIDENCE,
        "status": "LOW_QUALITY" if conf < config.OCR_LOW_QUALITY_CONFIDENCE else "OCR_DONE",
        "text": text.splitlines(),
    }
    path = RESULTS / f"{result['date']}_h01_ocr.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"written {path.relative_to(config.ROOT).as_posix()}: {result['words']} words, mean confidence "
          f"{conf:.1f} (threshold {result['threshold']:.0f}) -> {result['status']}")
    return path


def handwritten() -> dict:
    """The newest H01 measurement (python -m tools.deck_data --measure-h01)."""
    found = sorted(RESULTS.glob("*_h01_ocr.json"))
    if not found:
        raise SystemExit("no H01 measurement in eval/results: run python -m tools.deck_data --measure-h01")
    r = json.loads(found[-1].read_text(encoding="utf-8"))
    return {k: r[k] for k in ("date", "doc_id", "words", "mean_conf", "threshold", "status")} | {"file": found[-1].name}


def ocr_m18(con) -> dict:
    """M18 read again with the pipeline's own OCR settings, to get what the register throws away:
    each word's confidence. The register keeps only the boxes and the page mean, so this run must
    reproduce both exactly - OCR differs between machines (F9); on another machine the script stops.
    Misreads: wrong_letters() against the generated source text (the scan was made from
    tools/generate_goldset.py, so the true words are known)."""
    ingest.check_ocr_languages()            # importing ingest also points pytesseract at Tesseract
    doc = con.execute("SELECT source_path, ocr_mean_conf FROM documents WHERE doc_id=?", (OCR_DOC,)).fetchone()
    stored = con.execute("SELECT page_no, ocr_conf, width, height, words_json FROM pages WHERE doc_id=? "
                         "ORDER BY page_no", (OCR_DOC,)).fetchall()
    row = next(r for r in generate_goldset.MERCHANTS if r[0] == OCR_DOC)
    source = re.sub(r"<[^>]+>", " ", " ".join(generate_goldset.merchant_de(generate_goldset.MerchantDoc(*row))))
    source_words = source.replace("&nbsp;", " ").split()
    pdf = pymupdf.open(config.ROOT / doc["source_path"])
    pages, low, read = [], [], []          # read: every OCR word of the contract as (page, index on the page, word, conf)
    for page, st in zip(pdf, stored):
        img = Image.open(io.BytesIO(page.get_pixmap(dpi=config.OCR_DPI).tobytes("png")))
        data = pytesseract.image_to_data(img, lang=config.OCR_LANGUAGES, output_type=pytesseract.Output.DICT)
        words = [(w.strip(), float(c)) for w, c in zip(data["text"], data["conf"]) if w.strip() and float(c) >= 0]
        kept = json.loads(st["words_json"])
        mean = sum(c for _, c in words) / len(words)
        if [w for w, _ in words] != [k[4] for k in kept] or abs(mean - st["ocr_conf"]) > 1e-6:
            raise SystemExit(f"OCR of {OCR_DOC} page {st['page_no']} differs from the register "
                             f"({len(words)} words at {mean:.2f} vs {len(kept)} at {st['ocr_conf']:.2f}): "
                             "run this on the machine that built the register")
        w_, h_ = st["width"], st["height"]
        pages.append({"page": st["page_no"], "words": len(words), "conf": round(mean, 1), "size": [round(w_, 1), round(h_, 1)],
                      # every word box in % of the page, with its confidence
                      "boxes": [[round(k[0] / w_ * 100, 2), round(k[1] / h_ * 100, 2), round((k[2] - k[0]) / w_ * 100, 2),
                                 round((k[3] - k[1]) / h_ * 100, 2), round(c)] for k, (_, c) in zip(kept, words)]})
        for i, (w, c) in enumerate(words):
            if c < config.OCR_LOW_QUALITY_CONFIDENCE:
                low.append({"page": st["page_no"], "i": i, "word": w, "conf": round(c)})
            read.append((st["page_no"], i, w, c))
    misread = [{"page": read[j][0], "i": read[j][1], "word": read[j][2], "conf": round(read[j][3]), "truth": truth}
               for j, truth in wrong_letters([r[2] for r in read], source_words)]
    sources = dict(con.execute("SELECT source, COUNT(*) FROM pages GROUP BY source").fetchall())
    return {
        "doc": OCR_DOC, "mean_conf": round(doc["ocr_mean_conf"], 1), "threshold": config.OCR_LOW_QUALITY_CONFIDENCE,
        "dpi": config.OCR_DPI, "languages": config.OCR_LANGUAGES, "pages": pages, "low": low, "misread": misread,
        "misread_counted": "OCR words aligned with the source text (difflib.SequenceMatcher); letters differ",
        "ocr_pages": sources.get("ocr", 0), "all_pages": sum(sources.values()),
        "handwritten": handwritten(),
    }


def fixed_form(con) -> dict:
    """The form the extraction call must fill (strict JSON schema), M18's real answer, and what is
    added after the call: page and confidence by our code, the checker's verdict by a second model
    call - the extraction call never gives a page. The model cites a section by its marker (S4);
    the card shows the section title the register stores for it."""
    src = inspect.getsource(ModelAdapter.chat_json)
    raw = json.loads(con.execute("SELECT raw_json FROM metadata WHERE doc_id=?", (OCR_DOC,)).fetchone()[0])
    answer = raw["extraction"]
    rows = {r["clause_type"]: r for r in con.execute(
        "SELECT clause_type, status, section, page, confidence, flags FROM clauses WHERE doc_id=?", (OCR_DOC,))}
    calls = {p["purpose"]: p for p in queries.costs(con)["by_purpose"]}
    return {
        "strict": '"strict": True' in src,
        "fields": EXTRACTION_SCHEMA["required"], "clause_fields": CLAUSE_SCHEMA["required"],
        "statuses": CLAUSE_SCHEMA["properties"]["status"]["enum"],
        "doc": OCR_DOC,
        "facts": {"doc_type": answer["doc_type"], "parties": [p["name"] for p in answer["parties"]],
                  "effective_date": answer["effective_date"], "governing_law": answer["governing_law"],
                  "is_amendment": answer["amendment"]["is_amendment"]},
        "clauses": [{"key": key, "label": catalogue.CLAUSES[key]["label"], **answer["clauses"][key],
                     "section": rows[key]["section"], "page": rows[key]["page"], "confidence": rows[key]["confidence"],
                     "checker": next((f.split(":")[0] for f in json.loads(rows[key]["flags"] or "[]")
                                      if f.startswith("checker_")), None)}
                    for key in catalogue.CLAUSES],
        "extract_calls": calls["extract"]["calls"], "extract_cost": calls["extract"]["cost_usd"],
        "most_calls_per_document": con.execute("SELECT COALESCE(MAX(n), 0) FROM (SELECT COUNT(*) n FROM llm_calls "
                                               "WHERE purpose='extract' GROUP BY doc_id)").fetchone()[0],
        "documents": con.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
        # above this length a contract is read in parts (map-reduce over section batches, pipeline/extract.py)
        "single_pass_chars": MAX_SINGLE_PASS_CHARS,
        "longest_chars": con.execute("SELECT COALESCE(MAX(LENGTH(text)), 0) FROM doc_text").fetchone()[0],
    }


def agent_patterns(con) -> dict:
    """Four agent patterns, built as code inside a fixed workflow: plan first (a fixed list of
    checks), maker and checker, a tool behind a gate, a person decides (Q1's triage, not stored)."""
    q1 = json.loads((config.DATA / "gold_queries.json").read_text(encoding="utf-8"))[0]
    plan = {"check": "missing_clause", "params": {"clause_type": "liability_limitation", "doc_type": "merchant_agreement"}}
    run = portfolio.run_check(con, plan, run_id="deck")
    reported = sorted(r["doc_id"] for r in run["rows"])
    if reported != sorted(q1["expected"]):
        raise SystemExit(f"Q1 plan reports {reported}, the answer key says {q1['expected']}")
    check = next(p for p in queries.costs(con)["by_purpose"] if p["purpose"] == "check")
    one = lambda sql: con.execute(sql).fetchone()[0]  # noqa: E731
    return {
        "checks": [c["label"] for c in portfolio.CHECKS.values()],
        "found_by_model": one("SELECT COUNT(*) FROM clauses WHERE model_status='PRESENT'"),
        "checker_agreed": one("SELECT COUNT(*) FROM clauses WHERE flags LIKE '%checker_agreed%'"),
        "checker_rejected": [r[0] for r in con.execute(
            "SELECT doc_id FROM clauses WHERE flags LIKE '%checker_rejected%' ORDER BY doc_id")],
        "changed_by_checks": one("SELECT COUNT(*) FROM clauses WHERE model_status != status"),
        "checker_calls": check["calls"], "checker_cost": check["cost_usd"],
        "q1": {"id": q1["id"], "reported": len(reported), "triage": run["triage"]},
    }


def hybrid(con) -> dict:
    """One open question through hybrid search: the keyword list (BM25), the meaning list (vectors)
    and both merged by rank (RRF). Embeds the query once, not recorded in llm_calls. 'passages' are
    the ones the filtered search really ranked (search._allowed: merchant agreements, no copies);
    'words' says which query words each keyword hit contains (the search joins them with OR)."""
    r = hybrid_search(con, ModelAdapter(record=False), SEARCH_QUERY, SEARCH_FILTER, k=SEARCH_K, explain=True)
    allowed = sorted(search._allowed(con, SEARCH_FILTER))
    terms = re.findall(r'"([^"]+)"', search._fts_query(SEARCH_QUERY))
    has = {t: {row[0] for row in con.execute("SELECT chunk_id FROM chunks_fts WHERE chunks_fts MATCH ?", (f'"{t}"',))}
           for t in terms}
    item = lambda x, **more: {"id": x["chunk_id"], "doc": x["doc_id"], "title": x["section_title"], **more}  # noqa: E731
    return {
        "query": SEARCH_QUERY, "filter": SEARCH_FILTER, "k": SEARCH_K, "rrf_k": RRF_K, "terms": terms,
        "keywords": [item(x, words=[t for t in terms if x["chunk_id"] in has[t]]) for x in r["bm25"]],
        "meaning": [item(x, sim=round(x["similarity"], 3)) for x in r["vector"]],
        "merged": [item(x, score=x["score"]) for x in r["fused"]],
        "contracts": len(allowed),
        "passages": con.execute(f"SELECT COUNT(*) FROM chunks WHERE doc_id IN ({','.join('?' * len(allowed))})",
                                allowed).fetchone()[0],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--measure-h01", action="store_true",
                        help="OCR the handwritten demo page into eval/results (no model call, register untouched)")
    if parser.parse_args().measure_h01:
        measure_h01()
        return
    con = connect()
    client = TestClient(app)
    hidden = con.execute("SELECT text FROM chunks WHERE chunk_id='M14:013'").fetchone()["text"]
    probe = json.loads(sorted((config.ROOT / "eval" / "results").glob("*_prompt_shields_probe.json"))[-1].read_text(encoding="utf-8"))
    journey = client.get("/documents/M18/journey").json()
    data = {
        "embedding": embedding_map(con),
        "register": register_snapshot(con),
        "m18": journey,
        "m09": chunking_m09(client),
        "m08": finding(con, "M08", "liability_limitation"),
        "m14": {"note": hidden.strip(), "finding": finding(con, "M14", "liability_limitation")},
        "costs": queries.costs(con),
        "prompt_shields": {"cases": probe["cases"], "chunks": probe["register"]["chunks"],
                           "flagged": [f["chunk_id"] for f in probe["register"]["flagged"]],
                           "characters": probe["register"]["characters"]},
        # deep dives
        "ocr": ocr_m18(con),
        "form": fixed_form(con),
        "patterns": agent_patterns(con),
        "hybrid": hybrid(con),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    e = data["embedding"]
    print(f"written {OUT.relative_to(config.ROOT)}: {e['passages']} passages, nearest {[n['id'] for n in e['near']]}, spots {e['spots']}, "
          f"decoy {[(s['id'], s['sim']) for s in e['decoy']['sims']]}, M09 cut by the fixed size: {data['m09']['cut_by_fixed']}")
    o, pa, h = data["ocr"], data["patterns"], data["hybrid"]
    hw = o["handwritten"]
    print(f"OCR {o['doc']}: {[(p['words'], p['conf']) for p in o['pages']]}, below {o['threshold']:.0f}: "
          f"{[(w['word'], w['conf']) for w in o['low']]}, misread {[(w['word'], w['conf'], w['truth']) for w in o['misread']]}; "
          f"{hw['doc_id']} {hw['mean_conf']} -> {hw['status']} ({hw['file']}); "
          f"form: {data['form']['extract_calls']} calls for {data['form']['documents']} documents; patterns: "
          f"{pa['found_by_model']} found, {len(pa['checker_rejected'])} overruled, Q1 triage {pa['q1']['triage']}; "
          f"search '{h['query']}' over {h['passages']} passages in {h['contracts']} contracts: keywords "
          f"{[(x['doc'], x['words']) for x in h['keywords']]}, merged {[x['doc'] for x in h['merged']]}")


if __name__ == "__main__":
    main()
