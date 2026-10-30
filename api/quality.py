"""Quality: the evaluation against the gold set, computed live from the register, next to the runs
stored in eval/results/*.json (repeated runs, other models). No model call."""

from __future__ import annotations

import json
import sqlite3

from fastapi import APIRouter, Depends

from eval.check_register import evaluate
from pipeline import config

from .deps import get_con

router = APIRouter()

RESULTS = config.ROOT / "eval" / "results"
CAVEAT = ("Prompt and checks were improved on the same gold set they are measured on; "
          "a held-out set that nobody looked at before the measurement follows in step 6.")


def _summary(name: str, data: dict) -> dict:
    """The headline numbers of one stored run."""
    questions = data.get("questions", [])
    return {
        "file": name,
        "generated_at": data.get("generated_at"),
        "config": data.get("config"),
        "recall_min": min((q["recall"] for q in questions), default=None),
        "precision_min": min((q["precision"] for q in questions), default=None),
        "ablation": data.get("ablation"),
        "cuad": {k: data.get("cuad", {}).get(k) for k in ("n", "tp", "tn", "fp", "fn", "unclear")},
        "cost_usd": data.get("cost", {}).get("cost_usd"),
    }


@router.get("/evaluation")
def evaluation(con: sqlite3.Connection = Depends(get_con)) -> dict:
    """Live evaluation of the current register plus every stored run, oldest first."""
    runs = []
    for path in sorted(RESULTS.glob("*.json")):
        try:
            runs.append(_summary(path.name, json.loads(path.read_text(encoding="utf-8"))))
        except (ValueError, KeyError):
            continue        # a file that is not an evaluation result is skipped, not fatal
    return {"live": evaluate(con), "runs": runs, "caveat": CAVEAT}
