"""
LinguaLink — Triple-Signal Fusion Matcher

Improvements over v1:
  - Weights are runtime-configurable (accept override per request)
  - confidence_tier() helper: high ≥0.80, medium ≥0.65, borderline ≥0.55
  - explain_pair() picks the dominant signal and returns a text label
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)

# Confidence tier thresholds
TIER_HIGH       = 0.80
TIER_MEDIUM     = 0.65
TIER_BORDERLINE = 0.55


class TripleSignalMatcher:
    """
    Fuses three matching signals with configurable weights:
      - Semantic similarity  (embedding cosine)
      - Phonetic similarity  (transliteration + fingerprint)
      - Structural similarity (fuzzy string matching)
    """

    # Default weights
    DEFAULT_W_SEM = 0.55
    DEFAULT_W_PHO = 0.25
    DEFAULT_W_STR = 0.20

    def __init__(
        self,
        weight_semantic: float = DEFAULT_W_SEM,
        weight_phonetic: float = DEFAULT_W_PHO,
        weight_structural: float = DEFAULT_W_STR,
    ):
        self.w_sem = weight_semantic
        self.w_pho = weight_phonetic
        self.w_str = weight_structural
        logger.info(
            f"Matcher weights: semantic={self.w_sem}, "
            f"phonetic={self.w_pho}, structural={self.w_str}"
        )

    # ── Weight management ─────────────────────────────────────────────────────

    def with_weights(
        self,
        weight_semantic: float | None = None,
        weight_phonetic: float | None = None,
        weight_structural: float | None = None,
    ) -> "TripleSignalMatcher":
        """
        Return a *new* TripleSignalMatcher with overridden weights.
        Weights are auto-normalized to sum to 1.0.
        Omit any weight to keep the instance default.
        """
        w_sem = weight_semantic if weight_semantic is not None else self.w_sem
        w_pho = weight_phonetic if weight_phonetic is not None else self.w_pho
        w_str = weight_structural if weight_structural is not None else self.w_str

        total = w_sem + w_pho + w_str
        if total <= 0:
            raise ValueError("Weights must sum to a positive value")
        return TripleSignalMatcher(
            weight_semantic=w_sem / total,
            weight_phonetic=w_pho / total,
            weight_structural=w_str / total,
        )

    # ── Core fusion ───────────────────────────────────────────────────────────

    def fuse_scores(
        self,
        semantic_matrix: np.ndarray,
        phonetic_matrix: np.ndarray,
        structural_matrix: np.ndarray,
    ) -> np.ndarray:
        """
        Compute weighted fusion of the three signal matrices.
        Each matrix should be NxN with values in [0, 1].
        Returns an NxN fused score matrix.
        """
        return (
            self.w_sem * semantic_matrix
            + self.w_pho * phonetic_matrix
            + self.w_str * structural_matrix
        )

    def get_pairs_above_threshold(
        self,
        fused_matrix: np.ndarray,
        semantic_matrix: np.ndarray,
        phonetic_matrix: np.ndarray,
        structural_matrix: np.ndarray,
        threshold: float = 0.55,
    ) -> list[dict]:
        """
        Extract all pairs with fused score above threshold.
        Returns list of dicts with indices and per-signal scores.
        """
        n = fused_matrix.shape[0]
        pairs = []

        for i in range(n):
            for j in range(i + 1, n):
                score = float(fused_matrix[i, j])
                if score >= threshold:
                    pairs.append({
                        "i": i,
                        "j": j,
                        "fused_score": round(score, 4),
                        "semantic":    round(float(semantic_matrix[i, j]),    4),
                        "phonetic":    round(float(phonetic_matrix[i, j]),    4),
                        "structural":  round(float(structural_matrix[i, j]),  4),
                    })

        pairs.sort(key=lambda x: x["fused_score"], reverse=True)
        logger.info(f"Found {len(pairs)} pairs above threshold {threshold}")
        return pairs

    # ── Confidence & explanation helpers ─────────────────────────────────────

    @staticmethod
    def confidence_tier(fused_score: float) -> str:
        """
        Classify a fused score into a human-readable confidence tier.
          high       — fused_score ≥ 0.80
          medium     — fused_score ≥ 0.65
          borderline — fused_score ≥ 0.55
        """
        if fused_score >= TIER_HIGH:
            return "high"
        if fused_score >= TIER_MEDIUM:
            return "medium"
        return "borderline"

    @staticmethod
    def explain_pair(
        semantic: float,
        phonetic: float,
        structural: float,
        fused_score: float,
    ) -> str:
        """
        Return a short human-readable label describing the dominant signal.
        Example: "Semantic duplicate (translation/synonym) — high semantic similarity (0.91)"
        """
        dominant = max(
            {"semantic": semantic, "phonetic": phonetic, "structural": structural},
            key=lambda k: {"semantic": semantic, "phonetic": phonetic, "structural": structural}[k],
        )
        tier = TripleSignalMatcher.confidence_tier(fused_score)
        tier_word = {"high": "very likely", "medium": "likely", "borderline": "possibly"}[tier]

        if dominant == "semantic":
            return f"{tier_word.capitalize()} a semantic duplicate — semantic score {semantic:.2f}"
        if dominant == "phonetic":
            return f"{tier_word.capitalize()} a transliteration duplicate — phonetic score {phonetic:.2f}"
        return f"{tier_word.capitalize()} a structural duplicate — structural score {structural:.2f}"
