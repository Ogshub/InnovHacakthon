"""
LinguaLink — Fuzzy Structural Matching Engine
Uses rapidfuzz for string similarity on transliterated forms.
"""

import re
from unidecode import unidecode
from rapidfuzz import fuzz
import logging

logger = logging.getLogger(__name__)


class FuzzyEngine:
    """Structural similarity via fuzzy matching on normalized, transliterated text."""

    @staticmethod
    def normalize(text: str) -> str:
        """Normalize text: transliterate, lowercase, remove noise."""
        norm = unidecode(text).lower().strip()
        # Remove common noise characters
        norm = re.sub(r'[!@#$%^&*()_+=\[\]{};:\'",.<>?/\\|`~\-]', '', norm)
        norm = re.sub(r'\s+', ' ', norm).strip()
        return norm

    def structural_similarity(self, a: str, b: str) -> float:
        """
        Compute fuzzy structural similarity between two texts.
        Returns 0.0 to 1.0.
        Uses token_sort_ratio for order-invariant matching.
        """
        norm_a = self.normalize(a)
        norm_b = self.normalize(b)

        if not norm_a or not norm_b:
            return 0.0

        # Weighted combo of different fuzzy algorithms
        ratio = fuzz.ratio(norm_a, norm_b) / 100.0
        partial = fuzz.partial_ratio(norm_a, norm_b) / 100.0
        token_sort = fuzz.token_sort_ratio(norm_a, norm_b) / 100.0

        # Weighted blend
        return 0.4 * ratio + 0.3 * partial + 0.3 * token_sort
