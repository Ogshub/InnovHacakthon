"""
LinguaLink — Phonetic Similarity Engine
Transliterates non-Latin scripts to Latin and computes phonetic fingerprints.
"""

import re
from unidecode import unidecode
from rapidfuzz.distance import Levenshtein
import logging

logger = logging.getLogger(__name__)


class PhoneticEngine:
    """Cross-script phonetic similarity using transliteration + fingerprint comparison."""

    @staticmethod
    def transliterate_to_latin(text: str) -> str:
        """Convert any script to a Latin approximation using unidecode."""
        latin = unidecode(text).lower().strip()
        # Remove non-alphanumeric characters
        latin = re.sub(r'[^a-z0-9\s]', '', latin)
        # Collapse whitespace
        latin = re.sub(r'\s+', ' ', latin).strip()
        return latin

    @staticmethod
    def _metaphone_simple(word: str) -> str:
        """Simplified phonetic fingerprint (consonant skeleton)."""
        if not word:
            return ""
        # Keep first letter, then remove vowels
        vowels = set('aeiou')
        result = [word[0]]
        for ch in word[1:]:
            if ch not in vowels and ch != result[-1]:
                result.append(ch)
        return ''.join(result)

    def phonetic_hash(self, text: str) -> str:
        """Generate phonetic fingerprint for a text."""
        latin = self.transliterate_to_latin(text)
        words = latin.split()
        hashes = [self._metaphone_simple(w) for w in words if len(w) > 1]
        return ' '.join(hashes)

    def phonetic_similarity(self, a: str, b: str) -> float:
        """Compare phonetic fingerprints of two texts. Returns 0.0 to 1.0."""
        hash_a = self.phonetic_hash(a)
        hash_b = self.phonetic_hash(b)

        if not hash_a or not hash_b:
            return 0.0

        # Normalized Levenshtein similarity
        max_len = max(len(hash_a), len(hash_b))
        if max_len == 0:
            return 1.0

        dist = Levenshtein.distance(hash_a, hash_b)
        return 1.0 - (dist / max_len)
