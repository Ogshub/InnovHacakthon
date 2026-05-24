"""
LinguaLink — API Routes
FastAPI endpoints for duplicate detection pipeline.
"""

import time
import pandas as pd
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
import io
import json
import logging

from app.embeddings import EmbeddingEngine
from app.phonetic import PhoneticEngine
from app.fuzzy import FuzzyEngine
from app.matcher import TripleSignalMatcher
from app.clustering import GraphClusterer

logger = logging.getLogger(__name__)
router = APIRouter()

# Global singletons — initialized at startup
embedding_engine: EmbeddingEngine | None = None
phonetic_engine = PhoneticEngine()
fuzzy_engine = FuzzyEngine()
matcher = TripleSignalMatcher()
clusterer = GraphClusterer(edge_threshold=0.55)


def init_engines():
    """Initialize heavy ML models (called at server startup)."""
    global embedding_engine
    embedding_engine = EmbeddingEngine()


def _run_pipeline(df: pd.DataFrame, sample_size: int = 200, threshold: float = 0.55):
    """
    Run the full triple-signal matching + clustering pipeline on a DataFrame.
    Samples records if dataset is too large for real-time demo.
    """
    start = time.time()

    # Sample if too large
    if len(df) > sample_size:
        df = df.sample(n=sample_size, random_state=42).reset_index(drop=True)

    n = len(df)
    names = df["name"].tolist()
    descriptions = df.get("description", df["name"]).tolist()

    # Combine name + description for richer signal
    texts = [f"{n} {d}" for n, d in zip(names, descriptions)]

    # === Signal 1: Semantic Embeddings ===
    logger.info("Computing semantic embeddings...")
    embeddings = embedding_engine.encode(texts)
    semantic_matrix = embedding_engine.semantic_similarity_matrix(embeddings)

    # === Signal 2 & 3: Fast Phonetic & Structural Similarity ===
    logger.info("Computing phonetic & structural similarity (optimized)...")
    phonetic_matrix = np.zeros((n, n))
    structural_matrix = np.zeros((n, n))
    
    # Mathematical culling optimization
    sem_weight = 0.55
    phon_weight = 0.25
    str_weight = 0.20
    max_non_sem = phon_weight + str_weight
    
    for i in range(n):
        phonetic_matrix[i, i] = 1.0
        structural_matrix[i, i] = 1.0
        for j in range(i + 1, n):
            sem_score = semantic_matrix[i, j]
            
            # Skip expensive calculations if mathematically impossible to reach threshold
            if (sem_weight * sem_score) + max_non_sem >= threshold:
                phon_score = phonetic_engine.phonetic_similarity(names[i], names[j])
                str_score = fuzzy_engine.structural_similarity(names[i], names[j])
                
                phonetic_matrix[i, j] = phon_score
                phonetic_matrix[j, i] = phon_score
                
                structural_matrix[i, j] = str_score
                structural_matrix[j, i] = str_score

    # === Fusion ===
    logger.info("Fusing triple signals...")
    fused_matrix = matcher.fuse_scores(
        semantic_matrix, phonetic_matrix, structural_matrix
    )

    # === Pairs ===
    pairs = matcher.get_pairs_above_threshold(
        fused_matrix, semantic_matrix, phonetic_matrix, structural_matrix,
        threshold=threshold
    )

    # === Clustering ===
    logger.info("Running graph clustering...")
    G = clusterer.build_graph(pairs, n)
    partition = clusterer.detect_clusters(G)
    cluster_info = clusterer.get_cluster_info(partition, G)

    elapsed = time.time() - start
    logger.info(f"Pipeline completed in {elapsed:.2f}s")

    # Build response
    records = []
    for idx, row in df.iterrows():
        records.append({
            "idx": int(idx),
            "id": str(row.get("id", idx)),
            "name": str(row["name"]),
            "description": str(row.get("description", "")),
            "language": str(row.get("language", "unknown")),
            "category": str(row.get("category", "")),
            "translated_to_en": str(row.get("translated_to_en", "")),
            "cluster_id": int(partition.get(idx, -1)),
            "duplicate_type": str(row.get("duplicate_type", "")),
            "record_group_id": str(row.get("record_group_id", "")),
        })

    # Build edge list for graph
    edges = []
    for pair in pairs[:2000]:  # Cap edges for frontend performance
        edges.append({
            "source": pair["i"],
            "target": pair["j"],
            "fused_score": pair["fused_score"],
            "semantic": pair["semantic"],
            "phonetic": pair["phonetic"],
            "structural": pair["structural"],
        })

    # Language stats
    lang_counts = df["language"].value_counts().to_dict() if "language" in df.columns else {}

    # Duplicate type stats
    dup_type_counts = df["duplicate_type"].value_counts().to_dict() if "duplicate_type" in df.columns else {}

    return {
        "records": records,
        "edges": edges,
        "clusters": cluster_info,
        "language_stats": {str(k): int(v) for k, v in lang_counts.items()},
        "duplicate_type_stats": {str(k): int(v) for k, v in dup_type_counts.items()},
        "total_records": n,
        "total_pairs": len(pairs),
        "total_clusters": len(cluster_info),
        "processing_time": round(elapsed, 2),
        "threshold": threshold,
    }


@router.get("/health")
async def health():
    return {"status": "ok", "model_loaded": embedding_engine is not None}


@router.post("/demo")
async def run_demo(
    sample_size: int = 200,
    threshold: float = 0.55,
    dataset: str = "ultra_complex_multilingual_dataset.csv"
):
    """Run pipeline on the built-in or provided sample dataset."""
    try:
        if dataset not in ["ultra_complex_multilingual_dataset.csv", "ecommerce_multilingual.csv"]:
            dataset = "ultra_complex_multilingual_dataset.csv"
            
        import os
        df = pd.read_csv(os.path.join("data", dataset))
        result = _run_pipeline(df, sample_size=sample_size, threshold=threshold)
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception("Demo pipeline failed")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.post("/detect")
async def detect_duplicates(
    file: UploadFile = File(...),
    sample_size: int = Form(200),
    threshold: float = Form(0.55),
):
    """Upload a CSV/JSON and run duplicate detection."""
    try:
        content = await file.read()

        if file.filename.endswith(".json"):
            data = json.loads(content)
            df = pd.DataFrame(data)
        else:
            df = pd.read_csv(io.StringIO(content.decode("utf-8")))

        if "name" not in df.columns:
            return JSONResponse(
                content={"error": "Dataset must have a 'name' column"},
                status_code=400,
            )

        result = _run_pipeline(df, sample_size=sample_size, threshold=threshold)
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception("Detection pipeline failed")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.post("/search")
async def search_duplicates(query: str = Form(...)):
    """Search for duplicates of a single query term in the demo dataset."""
    try:
        import os
        df = pd.read_csv(os.path.join("data", "ultra_complex_multilingual_dataset.csv"))
        # Sample a manageable subset
        if len(df) > 500:
            df = df.sample(n=500, random_state=42).reset_index(drop=True)

        query_embedding = embedding_engine.encode([query])
        names = df["name"].tolist()
        text_embeddings = embedding_engine.encode(names)

        similarities = np.dot(text_embeddings, query_embedding.T).flatten()

        # Get top matches
        top_indices = np.argsort(similarities)[::-1][:20]

        results = []
        for idx in top_indices:
            idx = int(idx)
            sim = float(similarities[idx])
            if sim > 0.3:
                row = df.iloc[idx]
                # Also compute phonetic and fuzzy
                phon = phonetic_engine.phonetic_similarity(query, str(row["name"]))
                fuz = fuzzy_engine.structural_similarity(query, str(row["name"]))
                fused = 0.55 * sim + 0.25 * phon + 0.20 * fuz

                results.append({
                    "name": str(row["name"]),
                    "language": str(row.get("language", "")),
                    "translated_to_en": str(row.get("translated_to_en", "")),
                    "category": str(row.get("category", "")),
                    "semantic_score": round(sim, 4),
                    "phonetic_score": round(phon, 4),
                    "structural_score": round(fuz, 4),
                    "fused_score": round(fused, 4),
                })

        results.sort(key=lambda x: x["fused_score"], reverse=True)
        return JSONResponse(content={"query": query, "results": results[:15]})
    except Exception as e:
        logger.exception("Search failed")
        return JSONResponse(content={"error": str(e)}, status_code=500)
