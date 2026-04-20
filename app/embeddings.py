"""
LinguaLink — Embedding Engine
Uses sentence-transformers LaBSE for multilingual semantic embeddings.

Improvements over v1:
  - Per-text embedding cache (keyed by SHA-256 of text) to skip re-encoding
  - encode_single() helper for single-query search endpoint
  - Model warmup ping on init to force JIT compilation before first request
"""

import hashlib
import logging
import time

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine

logger = logging.getLogger(__name__)


class EmbeddingEngine:
    """Wraps a multilingual sentence-transformer model for semantic encoding."""

    def __init__(self, model_name: str = "sentence-transformers/LaBSE"):
        t0 = time.time()
        logger.info(f"Loading embedding model: {model_name}")
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

        # Per-text embedding cache: sha256(text) -> np.ndarray (1D, normalized)
        self._cache: dict[str, np.ndarray] = {}

        # Warmup — encode a dummy sentence to trigger any JIT/lazy init
        _ = self.model.encode(["warmup"], normalize_embeddings=True)
        elapsed = time.time() - t0
        logger.info(f"Embedding model '{model_name}' ready in {elapsed:.2f}s")

    # ── Public API ────────────────────────────────────────────────────────────

    def encode(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        """
        Batch-encode a list of texts into dense normalized vectors.
        Uses the internal cache: already-seen texts are returned instantly.
        """
        results: list[np.ndarray] = []
        uncached_indices: list[int] = []
        uncached_texts: list[str] = []

        for idx, text in enumerate(texts):
            key = self._hash(text)
            if key in self._cache:
                results.append(self._cache[key])
            else:
                results.append(None)  # placeholder
                uncached_indices.append(idx)
                uncached_texts.append(text)

        if uncached_texts:
            new_embeddings = self.model.encode(
                uncached_texts,
                batch_size=batch_size,
                show_progress_bar=len(uncached_texts) > 50,
                convert_to_numpy=True,
                normalize_embeddings=True,
            )
            for list_pos, original_idx in enumerate(uncached_indices):
                vec = new_embeddings[list_pos]
                self._cache[self._hash(texts[original_idx])] = vec
                results[original_idx] = vec

        return np.stack(results)

    def encode_single(self, text: str) -> np.ndarray:
        """Encode a single text string; returns a 1-D normalized vector."""
        return self.encode([text])[0]

    def semantic_similarity_matrix(self, embeddings: np.ndarray) -> np.ndarray:
        """Compute pairwise cosine similarity between all embeddings."""
        return sklearn_cosine(embeddings)

    @property
    def cache_size(self) -> int:
        """Number of texts currently cached."""
        return len(self._cache)

    # ── Private ───────────────────────────────────────────────────────────────

    @staticmethod
    def _hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()
