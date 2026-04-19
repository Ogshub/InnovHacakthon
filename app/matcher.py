"""
LinguaLink — Triple-Signal Fusion Matcher
Combines semantic, phonetic, and structural signals into a unified score.
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)


class TripleSignalMatcher:
    """
    Fuses three matching signals with configurable weights:
      - Semantic similarity (embedding cosine)
      - Phonetic similarity (transliteration + fingerprint)
      - Structural similarity (fuzzy string matching)
    """

    def __init__(
        self,
        weight_semantic: float = 0.55,
        weight_phonetic: float = 0.25,
        weight_structural: float = 0.20,
    ):
        self.w_sem = weight_semantic
        self.w_pho = weight_phonetic
        self.w_str = weight_structural
        logger.info(
            f"Matcher weights: semantic={self.w_sem}, "
            f"phonetic={self.w_pho}, structural={self.w_str}"
        )

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
        fused = (
            self.w_sem * semantic_matrix
            + self.w_pho * phonetic_matrix
            + self.w_str * structural_matrix
        )
        return fused

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
                        "semantic": round(float(semantic_matrix[i, j]), 4),
                        "phonetic": round(float(phonetic_matrix[i, j]), 4),
                        "structural": round(float(structural_matrix[i, j]), 4),
                    })

        pairs.sort(key=lambda x: x["fused_score"], reverse=True)
        logger.info(f"Found {len(pairs)} pairs above threshold {threshold}")
        return pairs
