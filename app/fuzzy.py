"""
LinguaLink — Fuzzy Structural Matching Engine

Improvements over v1:
  - Added token_set_ratio (best for subset/abbreviation matching)
  - Rebalanced weights: ratio=0.30, partial=0.25, token_sort=0.25, token_set=0.20
  - Enhanced normalization: strips currency symbols, measurement units, brand suffixes
"""

import re
import logging

from unidecode import unidecode
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)


# ── Normalization patterns ─────────────────────────────────────────────────────

# Currency symbols
_CURRENCY_RE = re.compile(r"[$€£¥₹₽¢₩₪฿₺]")

# Measurement units (e.g. "500ml", "2kg", "10cm")
_UNIT_RE = re.compile(
    r"\b\d+\s*(?:ml|l|kg|g|mg|lb|oz|cm|mm|m|km|in|ft|yd|"
    r"pcs|pc|pk|pack|box|set|pair|roll|sheet|ct)\b",
    re.IGNORECASE,
)

# Common brand/product suffixes that add noise
_BRAND_SUFFIX_RE = re.compile(
    r"\b(?:ltd|llc|inc|corp|co|gmbh|s\.a|pvt|brand|original|"
    r"official|genuine|authentic|certified|premium|pro|plus|max|"
    r"ultra|super|mini|lite|light|edition|series|collection|line)\b",
    re.IGNORECASE,
)

# Generic noise characters
_NOISE_RE = re.compile(r"[!@#$%^&*()_+=\[\]{};:'\",.<>?/\\|`~\-]")


class FuzzyEngine:
    """Structural similarity via fuzzy matching on normalized, transliterated text."""

    # ── Public API ────────────────────────────────────────────────────────────

    @staticmethod
    def normalize(text: str) -> str:
        """
        Normalize text for structural comparison:
          1. Transliterate to Latin (unidecode)
          2. Lowercase
          3. Strip currency symbols, measurement units, brand suffixes
          4. Remove remaining noise characters
          5. Collapse whitespace
        """
        norm = unidecode(text).lower().strip()
        norm = _CURRENCY_RE.sub(" ", norm)
        norm = _UNIT_RE.sub(" ", norm)
        norm = _BRAND_SUFFIX_RE.sub(" ", norm)
        norm = _NOISE_RE.sub(" ", norm)
        norm = re.sub(r"\s+", " ", norm).strip()
        return norm

    def structural_similarity(self, a: str, b: str) -> float:
        """
        Compute fuzzy structural similarity between two texts.
        Returns 0.0 – 1.0.

        Four-signal weighted blend:
          ratio      (0.30) — exact character-level overlap
          partial    (0.25) — best substring match (handles extra tokens)
          token_sort (0.25) — order-invariant token matching
          token_set  (0.20) — subset/abbreviation matching (Nike Air Max 90 vs Air Max)
        """
        norm_a = self.normalize(a)
        norm_b = self.normalize(b)

        if not norm_a or not norm_b:
            return 0.0

        ratio = fuzz.ratio(norm_a, norm_b) / 100.0
        partial = fuzz.partial_ratio(norm_a, norm_b) / 100.0
        token_sort = fuzz.token_sort_ratio(norm_a, norm_b) / 100.0
        token_set = fuzz.token_set_ratio(norm_a, norm_b) / 100.0

        return round(
            0.30 * ratio
            + 0.25 * partial
            + 0.25 * token_sort
            + 0.20 * token_set,
            4,
        )
