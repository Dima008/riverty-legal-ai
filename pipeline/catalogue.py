"""Clause catalogue (the legal team's playbook as data).

Each clause type has a definition the model works with, the contract types for
which it is required, and keyword patterns for the deterministic second check.
Legal owns this file: changing a definition is a reviewed change with a new
prompt version, not a code change hidden in a prompt.
"""

from __future__ import annotations

import re

CLAUSES: dict[str, dict] = {
    "liability_limitation": {
        "label": "Limitation of liability",
        "definition": (
            "A provision that limits a party's liability: a maximum amount or a cap tied to fees paid, an "
            "exclusion of categories of damages (e.g. indirect or consequential damages, lost profits), or a "
            "time limit for bringing claims. Plain-language paraphrases count. Unlimited liability, carve-outs "
            "alone, indemnities and insurance obligations are NOT a limitation."
        ),
        "required_for": ["merchant_agreement"],
        "keywords": [r"liab", r"\bhaft", r"limited to", r"shall not exceed", r"in no event", r"cap on",
                     r"begrenzt", r"höchstens", r"mehr .{0,60}als", r"more than", r"consequential", r"damages",
                     r"schaden"],
        "absence_signals": [r"limitation (of|on) liability", r"liability .{0,80}(limited|shall not exceed)",
                            r"shall not exceed", r"in no event", r"haftungsbegrenzung", r"haftung .{0,80}begrenzt",
                            r"höchstens", r"consequential damages"],
    },
    "consumer_terms_checkout": {
        "label": "Consumer terms in checkout",
        "definition": (
            "An obligation of the merchant to display or link the provider's terms and conditions for "
            "consumers (and/or the provider's privacy notice) in the merchant's checkout."
        ),
        "required_for": ["merchant_agreement"],
        "keywords": [r"consumer terms", r"terms and conditions for consumers", r"verbraucherbedingungen",
                     r"geschäftsbedingungen", r"privacy notice", r"datenschutzhinweis"],
        "absence_signals": [r"consumer terms", r"terms and conditions for consumers", r"verbraucherbedingungen"],
    },
    "dpa_reference": {
        "label": "Data processing agreement (Art. 28 GDPR)",
        "definition": (
            "A provision that the parties conclude or have concluded a data processing agreement / an "
            "agreement on processing on behalf under Art. 28 GDPR (German: Auftragsverarbeitung, AVV). A "
            "generic statement that the parties comply with data protection law does NOT count."
        ),
        "required_for": ["merchant_agreement"],
        "keywords": [r"art\.?\s*28", r"data processing agreement", r"processing on behalf",
                     r"auftragsverarbeitung", r"\bavv\b", r"on behalf of"],
        "absence_signals": [r"art\.?\s*28", r"data processing agreement", r"auftragsverarbeitung"],
    },
    "subprocessor_clause": {
        "label": "Sub-processors",
        "definition": (
            "Rules for engaging sub-processors (further processors): prior specific or general written "
            "authorisation of the controller, information about intended changes, right to object."
        ),
        "required_for": ["data_processing_agreement"],
        "keywords": [r"sub-?processor", r"another processor", r"unterauftragsverarbeit",
                     r"weitere[rn]? auftragsverarbeiter", r"subcontract", r"unterauftrag"],
        "absence_signals": [r"sub-?processor", r"another processor", r"unterauftragsverarbeit",
                            r"weitere[rn]? auftragsverarbeiter"],
    },
    "audit_clause": {
        "label": "Audit and inspection rights",
        "definition": (
            "The controller's right to audit or inspect the processor, or the processor's duty to provide "
            "all information necessary to demonstrate compliance (Art. 28(3)(h) GDPR)."
        ),
        "required_for": ["data_processing_agreement"],
        "keywords": [r"audit", r"inspect", r"kontroll", r"überprüf", r"demonstrate compliance", r"nachweis",
                     r"inspektion", r"prüfung"],
        "absence_signals": [r"\baudit", r"inspection", r"inspektion", r"kontrollrecht", r"demonstrate compliance"],
    },
}

DOC_TYPES = ["merchant_agreement", "data_processing_agreement", "amendment", "other_commercial_agreement",
             "unknown"]

# Company names (UC3). Legacy names are the brands that were merged into Riverty in 2021/2022.
OWN_ENTITY_CURRENT = ["Riverty"]
OWN_ENTITY_LEGACY = ["Arvato Financial Solutions", "AfterPay", "Arvato Payment Solutions",
                     "arvato infoscore"]

# Text that addresses software instead of the contract parties. A hit never changes a finding by
# itself; it flags the document and blocks any quote taken from that span.
INJECTION_PATTERNS = [
    r"ignore (all |any )?(previous|prior|above|earlier) instructions",
    r"disregard (all |any )?(previous|prior|above) (instructions|rules)",
    r"note to (automated|ai|automatic) (review|system|assistant)",
    r"(automated|ai) review systems?",
    r"system prompt",
    r"ignoriere (alle )?(vorherigen|bisherigen) anweisungen",
]


def keyword_hits(clause_type: str, text: str) -> list[tuple[int, int]]:
    hits = []
    for pattern in CLAUSES[clause_type]["keywords"]:
        hits += [(m.start(), m.end()) for m in re.finditer(pattern, text, re.IGNORECASE)]
    return sorted(hits)


def absence_signals(clause_type: str, text: str) -> list[tuple[int, int]]:
    """Narrow patterns that suggest the clause exists after all (second check for ABSENT)."""
    hits = []
    for pattern in CLAUSES[clause_type]["absence_signals"]:
        hits += [(m.start(), m.end()) for m in re.finditer(pattern, text, re.IGNORECASE)]
    return sorted(hits)


def injection_spans(text: str) -> list[tuple[int, int]]:
    """Return spans (whole paragraphs) that look like instructions to software."""
    spans = []
    for pattern in INJECTION_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            start = text.rfind("\n\n", 0, m.start())
            start = text.rfind("\n", 0, m.start()) if start == -1 else start
            end = text.find("\n\n", m.end())
            spans.append((max(start, 0), len(text) if end == -1 else end))
    return sorted(set(spans))


def catalogue_prompt() -> str:
    lines = []
    for key, c in CLAUSES.items():
        lines.append(f"- {key} ({c['label']}): {c['definition']}")
    return "\n".join(lines)
