"""
LinguaLink — Phonetic Similarity Engine

Improvements over v1:
  - Soundex fingerprint alongside the metaphone skeleton
  - Double-metaphone-style consonant-cluster normalisation (voiced/unvoiced collapse)
  - Both fingerprints are blended for a richer phonetic signal
  - Returns debug hash info alongside the similarity score
"""

import re
import logging

from unidecode import unidecode
from rapidfuzz.distance import Levenshtein

logger = logging.getLogger(__name__)


# ── Soundex digit map (char -> digit string) ─────────────────────────────────
_SOUNDEX_MAP: dict[str, str] = {
    **{c: "0" for c in "aehiouwy"},
    **{c: "1" for c in "bfpv"},
    **{c: "2" for c in "cgjkqsxz"},
    **{c: "3" for c in "dt"},
    "l": "4",
    **{c: "5" for c in "mn"},
    "r": "6",
}

# Consonant-cluster mappings (double-metaphone-style collapse)
_CLUSTER_PATTERNS = [
    (re.compile(r"sch"), "sk"),
    (re.compile(r"ph"), "f"),
    (re.compile(r"ck"), "k"),
    (re.compile(r"qu"), "k"),
    (re.compile(r"[gz](?=[ei])"), "j"),   # ge/ze → j sound
    (re.compile(r"[kc](?=[ei])"), "s"),   # ce/ke → s sound
    (re.compile(r"[dt](?=ch)"), ""),      # tch → ch silent prefix
    (re.compile(r"([a-z])\1+"), r"\1"),   # collapse consecutive duplicates
]


class PhoneticEngine:
    """Cross-script phonetic similarity using transliteration + fingerprint comparison."""

    # ── Public API ────────────────────────────────────────────────────────────

    @staticmethod
    def transliterate_to_latin(text: str) -> str:
        """Convert any script to a Latin approximation using unidecode."""
        latin = unidecode(text).lower().strip()
        latin = re.sub(r"[^a-z0-9\s]", "", latin)
        latin = re.sub(r"\s+", " ", latin).strip()
        return latin

    def phonetic_hash(self, text: str) -> dict[str, str]:
        """
        Generate phonetic fingerprints for a text.

        Returns a dict with:
          'metaphone'  — consonant-skeleton fingerprint
          'soundex'    — Soundex code (per word, joined)
          'blended'    — concatenation used for final comparison
        """
        latin = self.transliterate_to_latin(text)
        words = latin.split()

        meta_parts = [self._metaphone_enhanced(w) for w in words if len(w) > 1]
        sdx_parts = [self._soundex(w) for w in words if len(w) > 1]

        metaphone_str = " ".join(meta_parts)
        soundex_str = " ".join(sdx_parts)
        # Blend: interleave metaphone and soundex tokens
        blended = " ".join(
            f"{m}{s}" for m, s in zip(meta_parts, sdx_parts)
        )

        return {
            "metaphone": metaphone_str,
            "soundex": soundex_str,
            "blended": blended,
        }

    def phonetic_similarity(self, a: str, b: str) -> float:
        """
        Compare phonetic fingerprints of two texts. Returns 0.0 – 1.0.
        Uses a weighted blend of metaphone and soundex similarity.
        """
        ha = self.phonetic_hash(a)
        hb = self.phonetic_hash(b)

        meta_sim = self._levenshtein_sim(ha["metaphone"], hb["metaphone"])
        sdx_sim = self._levenshtein_sim(ha["soundex"], hb["soundex"])
        blended_sim = self._levenshtein_sim(ha["blended"], hb["blended"])

        # Weighted blend: blended ≥ individual signals since it merges info
        return round(0.40 * blended_sim + 0.35 * meta_sim + 0.25 * sdx_sim, 4)

    def phonetic_similarity_with_debug(self, a: str, b: str) -> dict:
        """Full breakdown including per-signal scores and fingerprints."""
        ha = self.phonetic_hash(a)
        hb = self.phonetic_hash(b)

        meta_sim = self._levenshtein_sim(ha["metaphone"], hb["metaphone"])
        sdx_sim = self._levenshtein_sim(ha["soundex"], hb["soundex"])
        blended_sim = self._levenshtein_sim(ha["blended"], hb["blended"])
        final = round(0.40 * blended_sim + 0.35 * meta_sim + 0.25 * sdx_sim, 4)

        return {
            "score": final,
            "metaphone_sim": round(meta_sim, 4),
            "soundex_sim": round(sdx_sim, 4),
            "hashes_a": ha,
            "hashes_b": hb,
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _soundex(word: str) -> str:
        """Standard Soundex algorithm returning a 4-character code."""
        if not word:
            return "0000"
        word = word.lower()
        first = word[0].upper()
        code = first
        prev_digit = _SOUNDEX_MAP.get(word[0], "0")
        for ch in word[1:]:
            digit = _SOUNDEX_MAP.get(ch, "0")
            if digit != "0" and digit != prev_digit:
                code += digit
            prev_digit = digit
        code = (code + "000")[:4]
        return code

    @staticmethod
    def _metaphone_enhanced(word: str) -> str:
        """
        Enhanced consonant-skeleton fingerprint with cluster normalisation.
        Removes vowels except initial, collapses common consonant clusters.
        """
        if not word:
            return ""
        # Apply cluster substitutions
        text = word
        for pattern, repl in _CLUSTER_PATTERNS:
            text = pattern.sub(repl, text)

        # Keep first letter, remove interior vowels
        vowels = set("aeiou")
        result = [text[0]] if text else []
        for ch in text[1:]:
            if ch not in vowels and (not result or ch != result[-1]):
                result.append(ch)
        return "".join(result)

    @staticmethod
    def _levenshtein_sim(a: str, b: str) -> float:
        """Normalised Levenshtein similarity in [0, 1]."""
        if not a and not b:
            return 1.0
        if not a or not b:
            return 0.0
        max_len = max(len(a), len(b))
        dist = Levenshtein.distance(a, b)
        return 1.0 - (dist / max_len)
