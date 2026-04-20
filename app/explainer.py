"""
LinguaLink — Duplicate Pair Explainer

Generates human-readable explanations for why two records were flagged as
duplicates by examining the dominant signals and their relative strengths.
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Confidence tier thresholds
# ──────────────────────────────────────────────────────────────────────────────
TIER_HIGH        = 0.80
TIER_MEDIUM      = 0.65
TIER_BORDERLINE  = 0.55

# ──────────────────────────────────────────────────────────────────────────────
# Duplicate type heuristics
# ──────────────────────────────────────────────────────────────────────────────
DUP_TYPE_TRANSLITERATION = "transliteration"  # high phonetic, moderate semantic
DUP_TYPE_SEMANTIC        = "semantic"          # high semantic, low phonetic/structural
DUP_TYPE_STRUCTURAL      = "structural"        # high structural (abbreviation / reorder)
DUP_TYPE_EXACT           = "near-exact"        # all three signals very high
DUP_TYPE_MIXED           = "mixed-signal"      # no single dominant signal

# Score thresholds for signal classification
_HIGH = 0.75
_MOD  = 0.55
_LOW  = 0.35


class PairExplainer:
    """Produces explanations and confidence tiers for duplicate pairs."""

    # ── Public API ────────────────────────────────────────────────────────────

    def confidence_tier(self, fused_score: float) -> str:
        """Classify the confidence level of a pair."""
        if fused_score >= TIER_HIGH:
            return "high"
        if fused_score >= TIER_MEDIUM:
            return "medium"
        return "borderline"

    def duplicate_type(
        self,
        semantic: float,
        phonetic: float,
        structural: float,
    ) -> str:
        """Infer the most likely duplicate relationship type."""
        if semantic >= _HIGH and phonetic >= _HIGH and structural >= _HIGH:
            return DUP_TYPE_EXACT

        # Transliteration: semantics moderate+ and phonetic high
        if phonetic >= _HIGH and semantic >= _MOD:
            return DUP_TYPE_TRANSLITERATION

        # Pure semantic (translation / synonym)
        if semantic >= _HIGH and phonetic < _MOD and structural < _MOD:
            return DUP_TYPE_SEMANTIC

        # Structural wins (abbreviation, reorder, partial match)
        if structural >= _HIGH and semantic < _HIGH:
            return DUP_TYPE_STRUCTURAL

        return DUP_TYPE_MIXED

    def explain(
        self,
        name_a: str,
        name_b: str,
        semantic: float,
        phonetic: float,
        structural: float,
        fused_score: float,
    ) -> dict[str, Any]:
        """
        Return a full explanation dict for a pair.

        Fields:
            reason          — short human-readable sentence
            confidence_tier — 'high' | 'medium' | 'borderline'
            duplicate_type  — type label (transliteration, semantic, etc.)
            dominant_signal — which signal contributed most
            signal_scores   — {semantic, phonetic, structural}
            fused_score     — combined score
        """
        tier     = self.confidence_tier(fused_score)
        dup_type = self.duplicate_type(semantic, phonetic, structural)
        dominant = self._dominant_signal(semantic, phonetic, structural)
        reason   = self._build_reason(name_a, name_b, semantic, phonetic, structural, dup_type, tier)

        return {
            "reason":           reason,
            "confidence_tier":  tier,
            "duplicate_type":   dup_type,
            "dominant_signal":  dominant,
            "signal_scores": {
                "semantic":    round(semantic,    4),
                "phonetic":    round(phonetic,    4),
                "structural":  round(structural,  4),
            },
            "fused_score": round(fused_score, 4),
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _dominant_signal(semantic: float, phonetic: float, structural: float) -> str:
        scores = {"semantic": semantic, "phonetic": phonetic, "structural": structural}
        return max(scores, key=scores.__getitem__)

    @staticmethod
    def _build_reason(
        name_a: str,
        name_b: str,
        semantic: float,
        phonetic: float,
        structural: float,
        dup_type: str,
        tier: str,
    ) -> str:
        tier_word = {"high": "very likely", "medium": "likely", "borderline": "possibly"}[tier]

        fragments = []

        if semantic >= _HIGH:
            fragments.append(f"strong semantic similarity ({semantic:.0%})")
        elif semantic >= _MOD:
            fragments.append(f"moderate semantic overlap ({semantic:.0%})")

        if phonetic >= _HIGH:
            fragments.append(f"strong phonetic match ({phonetic:.0%})")
        elif phonetic >= _MOD:
            fragments.append(f"partial phonetic match ({phonetic:.0%})")

        if structural >= _HIGH:
            fragments.append(f"high string similarity ({structural:.0%})")
        elif structural >= _MOD:
            fragments.append(f"partial string overlap ({structural:.0%})")

        signal_str = " + ".join(fragments) if fragments else "combined signals"

        type_descriptions = {
            DUP_TYPE_EXACT:           "near-exact duplicate (likely same product in different format)",
            DUP_TYPE_TRANSLITERATION: "transliteration duplicate (same name across scripts)",
            DUP_TYPE_SEMANTIC:        "semantic duplicate (translation or synonym)",
            DUP_TYPE_STRUCTURAL:      "structural duplicate (abbreviation or reordered tokens)",
            DUP_TYPE_MIXED:           "probable duplicate (mixed signals)",
        }
        type_desc = type_descriptions.get(dup_type, "probable duplicate")

        return f'"{name_a}" and "{name_b}" are {tier_word} a {type_desc} — {signal_str}.'


# Module-level singleton
pair_explainer = PairExplainer()
