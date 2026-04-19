"""
LinguaLink — Embedding Engine
Uses sentence-transformers LaBSE for multilingual semantic embeddings.
"""

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine
import logging

logger = logging.getLogger(__name__)


class EmbeddingEngine:
    """Wraps a multilingual sentence-transformer model for semantic encoding."""

    def __init__(self, model_name: str = "sentence-transformers/LaBSE"):
        logger.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        logger.info("Embedding model loaded successfully")

    def encode(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        """Batch-encode a list of texts into dense vectors."""
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embeddings

    def semantic_similarity_matrix(self, embeddings: np.ndarray) -> np.ndarray:
        """Compute pairwise cosine similarity between all embeddings."""
        return sklearn_cosine(embeddings)
