"""Configuration: paths, environment, prices and thresholds."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
VAR = ROOT / "var"
# REGISTER_DB points a run at another register file, e.g. an evaluation run (eval/repeat.py),
# so the production register is never touched by experiments.
DB_PATH = Path(os.environ.get("REGISTER_DB", VAR / "register.sqlite"))

# Source folders. In production a Microsoft Graph connector on the SharePoint
# library replaces the watch folder; the rest of the pipeline stays the same.
SOURCE_DIRS = [DATA / "raw", DATA / "cuad_subset"]
# INBOX_DIR points the watcher at another folder, like REGISTER_DB for the register: a rehearsal
# of the live demo (tools/demo.py) or a test never touches data/inbox.
WATCH_DIR = Path(os.environ.get("INBOX_DIR", DATA / "inbox"))

# Deterministic thresholds
MIN_TEXT_CHARS_PER_PAGE = 30        # below this a page is treated as image and sent to OCR
OCR_LOW_QUALITY_CONFIDENCE = 70.0   # mean word confidence (0-100) below this -> LOW_QUALITY
OCR_DPI = 200
OCR_LANGUAGES = "deu+eng"
QUOTE_MATCH_MIN_SCORE = 90          # fuzzy match score (0-100) for citation verification

PROMPT_VERSION = "extract-v2"   # v2: doc type definitions, one quote per clause type, checker

# Prices in USD per 1M tokens (Azure Global Standard), keyed by deployment name. Source:
# azurespeed.com, checked 2026-10-29 (gpt-4.1: 2026-10-30) - verify against the Azure price
# list before using numbers externally. A deployment without a price stops the pipeline.
PRICES_PER_MILLION = {
    "gpt-4.1-mini": {"input": 0.40, "cached_input": 0.10, "output": 1.60},
    "gpt-4.1": {"input": 2.00, "cached_input": 0.50, "output": 8.00},     # comparison model
    "text-embedding-3-small": {"input": 0.02, "cached_input": 0.02, "output": 0.0},
}


def load_env(path: Path = ROOT / ".env") -> None:
    """Minimal .env loader (no extra dependency). Existing variables win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env()

AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.environ.get("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21")
CHAT_DEPLOYMENT = os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4.1-mini")
EMBED_DEPLOYMENT = os.environ.get("AZURE_OPENAI_EMBED_DEPLOYMENT", "text-embedding-3-small")


def check_prices() -> None:
    """Fail loudly: a model without a price would be logged as $0 and the cost view would lie."""
    missing = [d for d in (CHAT_DEPLOYMENT, EMBED_DEPLOYMENT) if d not in PRICES_PER_MILLION]
    if missing:
        raise RuntimeError(f"No price for {missing} in config.PRICES_PER_MILLION - "
                           "add the Azure price per 1M tokens before running.")
