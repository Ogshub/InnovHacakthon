"""
LinguaLink — API Routes

Full endpoint surface:
  GET  /api/health           Enhanced — model name, uptime, cache size
  GET  /api/stats            Server metrics — total jobs, cache hit rate
  POST /api/demo             Same as before + explained pairs + runtime weights
  POST /api/detect           Async upload → returns job_id immediately
  GET  /api/jobs/{job_id}    Poll job status / result
  POST /api/search           Improved — min_score filter, uses cached embeddings
  POST /api/compare          NEW: compare two raw strings — full triple-signal breakdown
  GET  /api/export/{job_id}  NEW: stream duplicate pairs as CSV download
"""

import csv
import io
import json
import logging
import time

import numpy as np
import pandas as pd
from fastapi import APIRouter, Form, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.embeddings import EmbeddingEngine
from app.phonetic import PhoneticEngine
from app.fuzzy import FuzzyEngine
from app.matcher import TripleSignalMatcher
from app.clustering import GraphClusterer
from app.explainer import pair_explainer
from app.cache import result_cache, job_store, generate_job_id, get_uptime
from app.background import run_pipeline_in_background
from app.schemas import CompareRequest

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Global singletons ─────────────────────────────────────────────────────────
embedding_engine: EmbeddingEngine | None = None
phonetic_engine = PhoneticEngine()
fuzzy_engine    = FuzzyEngine()
matcher         = TripleSignalMatcher()
clusterer       = GraphClusterer(edge_threshold=0.55)


def init_engines():
    """Initialize heavy ML models (called at server startup)."""
    global embedding_engine
    embedding_engine = EmbeddingEngine()


# ── Pipeline helper ───────────────────────────────────────────────────────────

def _run_pipeline(
    df: pd.DataFrame,
    sample_size: int = 200,
    threshold: float = 0.55,
    weight_semantic: float | None = None,
    weight_phonetic: float | None = None,
    weight_structural: float | None = None,
    include_explanations: bool = False,
) -> dict:
    """
    Run the full triple-signal matching + clustering pipeline on a DataFrame.
    Supports runtime weight overrides and optional per-pair explanations.
    """
    start = time.time()

    # Sample if too large
    if len(df) > sample_size:
        df = df.sample(n=sample_size, random_state=42).reset_index(drop=True)

    n = len(df)
    names        = df["name"].tolist()
    descriptions = df.get("description", df["name"]).tolist()
    texts        = [f"{nm} {desc}" for nm, desc in zip(names, descriptions)]

    # ── Signal 1: Semantic Embeddings ────────────────────────────────────────
    logger.info("Computing semantic embeddings...")
    embeddings      = embedding_engine.encode(texts)
    semantic_matrix = embedding_engine.semantic_similarity_matrix(embeddings)

    # ── Signal 2 & 3: Phonetic & Structural ──────────────────────────────────
    logger.info("Computing phonetic & structural similarity...")

    # Build a matcher with optional runtime weight overrides
    run_matcher = matcher.with_weights(weight_semantic, weight_phonetic, weight_structural)
    w_sem = run_matcher.w_sem
    w_pho = run_matcher.w_pho
    w_str = run_matcher.w_str
    max_non_sem = w_pho + w_str

    phonetic_matrix   = np.zeros((n, n))
    structural_matrix = np.zeros((n, n))

    for i in range(n):
        phonetic_matrix[i, i]   = 1.0
        structural_matrix[i, i] = 1.0
        for j in range(i + 1, n):
            sem_score = semantic_matrix[i, j]
            if (w_sem * sem_score) + max_non_sem >= threshold:
                phon = phonetic_engine.phonetic_similarity(names[i], names[j])
                stru = fuzzy_engine.structural_similarity(names[i], names[j])
                phonetic_matrix[i, j]   = phonetic_matrix[j, i]   = phon
                structural_matrix[i, j] = structural_matrix[j, i] = stru

    # ── Fusion ────────────────────────────────────────────────────────────────
    logger.info("Fusing triple signals...")
    fused_matrix = run_matcher.fuse_scores(semantic_matrix, phonetic_matrix, structural_matrix)

    # ── Pairs ─────────────────────────────────────────────────────────────────
    pairs = run_matcher.get_pairs_above_threshold(
        fused_matrix, semantic_matrix, phonetic_matrix, structural_matrix,
        threshold=threshold,
    )

    # ── Explained pairs (optional) ────────────────────────────────────────────
    explained_pairs = []
    if include_explanations:
        for pair in pairs[:500]:  # cap to avoid huge payloads
            i, j = pair["i"], pair["j"]
            expl = pair_explainer.explain(
                name_a=names[i],
                name_b=names[j],
                semantic=pair["semantic"],
                phonetic=pair["phonetic"],
                structural=pair["structural"],
                fused_score=pair["fused_score"],
            )
            explained_pairs.append({
                "i": i,
                "j": j,
                "name_a": names[i],
                "name_b": names[j],
                "fused_score": pair["fused_score"],
                **expl,
            })

    # ── Clustering ────────────────────────────────────────────────────────────
    logger.info("Running graph clustering...")
    records_list = [{
        "language": str(df.iloc[k].get("language", "")) if hasattr(df.iloc[k], "get") else "",
        "category": str(df.iloc[k].get("category", "")) if hasattr(df.iloc[k], "get") else "",
    } for k in range(n)]

    G         = clusterer.build_graph(pairs, n)
    partition = clusterer.detect_clusters(G)
    cluster_info = clusterer.get_cluster_info(partition, G, records=records_list)

    elapsed = time.time() - start
    logger.info(f"Pipeline completed in {elapsed:.2f}s")

    # ── Build response ────────────────────────────────────────────────────────
    records_out = []
    for idx, row in df.iterrows():
        records_out.append({
            "idx":             int(idx),
            "id":              str(row.get("id", idx)),
            "name":            str(row["name"]),
            "description":     str(row.get("description", "")),
            "language":        str(row.get("language", "unknown")),
            "category":        str(row.get("category", "")),
            "translated_to_en": str(row.get("translated_to_en", "")),
            "cluster_id":      int(partition.get(idx, -1)),
            "duplicate_type":  str(row.get("duplicate_type", "")),
            "record_group_id": str(row.get("record_group_id", "")),
        })

    edges = []
    for pair in pairs[:2000]:
        edges.append({
            "source":      pair["i"],
            "target":      pair["j"],
            "fused_score": pair["fused_score"],
            "semantic":    pair["semantic"],
            "phonetic":    pair["phonetic"],
            "structural":  pair["structural"],
        })

    lang_counts    = df["language"].value_counts().to_dict()    if "language"       in df.columns else {}
    dup_type_counts = df["duplicate_type"].value_counts().to_dict() if "duplicate_type" in df.columns else {}

    result: dict = {
        "records":               records_out,
        "edges":                 edges,
        "clusters":              cluster_info,
        "language_stats":        {str(k): int(v) for k, v in lang_counts.items()},
        "duplicate_type_stats":  {str(k): int(v) for k, v in dup_type_counts.items()},
        "total_records":         n,
        "total_pairs":           len(pairs),
        "total_clusters":        len(cluster_info),
        "processing_time":       round(elapsed, 2),
        "threshold":             threshold,
        "weights": {
            "semantic":    round(w_sem, 4),
            "phonetic":    round(w_pho, 4),
            "structural":  round(w_str, 4),
        },
    }

    if include_explanations:
        result["explained_pairs"] = explained_pairs

    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    """Enhanced health check — includes model name, uptime, and cache size."""
    return {
        "status":       "ok",
        "model_loaded": embedding_engine is not None,
        "model_name":   embedding_engine.model_name if embedding_engine else None,
        "uptime_s":     get_uptime(),
        "cache_size":   result_cache.size(),
        "embed_cache":  embedding_engine.cache_size if embedding_engine else 0,
    }


@router.get("/stats")
async def stats():
    """Server metrics — total jobs run, cache hit rate, uptime."""
    job_totals = job_store.totals
    return {
        "uptime_s":             get_uptime(),
        "model_name":           embedding_engine.model_name if embedding_engine else None,
        "total_jobs_created":   job_totals["total_created"],
        "total_jobs_completed": job_totals["total_completed"],
        "jobs_in_store":        job_totals["in_store"],
        "result_cache":         result_cache.stats,
        "embed_cache_size":     embedding_engine.cache_size if embedding_engine else 0,
    }


@router.post("/demo")
async def run_demo(
    sample_size: int   = 200,
    threshold:   float = 0.55,
    dataset:     str   = "ultra_complex_multilingual_dataset.csv",
    weight_semantic:   float | None = None,
    weight_phonetic:   float | None = None,
    weight_structural: float | None = None,
    explain:     bool  = True,
):
    """
    Run pipeline on the built-in dataset.
    Supports runtime weight overrides, returns explained pairs, uses LRU cache.
    """
    try:
        if dataset not in ["ultra_complex_multilingual_dataset.csv", "ecommerce_multilingual.csv"]:
            dataset = "ultra_complex_multilingual_dataset.csv"

        # Cache key includes all parameters
        cache_key = f"demo:{dataset}:{sample_size}:{threshold}:{weight_semantic}:{weight_phonetic}:{weight_structural}"
        cached = result_cache.get(cache_key)
        if cached is not None:
            logger.info(f"Cache HIT for demo run (key={cache_key})")
            cached["_from_cache"] = True
            return JSONResponse(content=cached)

        df     = pd.read_csv(dataset)
        result = _run_pipeline(
            df,
            sample_size=sample_size,
            threshold=threshold,
            weight_semantic=weight_semantic,
            weight_phonetic=weight_phonetic,
            weight_structural=weight_structural,
            include_explanations=explain,
        )
        result_cache.put(cache_key, result)
        result["_from_cache"] = False
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception("Demo pipeline failed")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.post("/detect")
async def detect_duplicates(
    file:        UploadFile = File(...),
    sample_size: int        = Form(200),
    threshold:   float      = Form(0.55),
):
    """
    Upload a CSV/JSON and run duplicate detection asynchronously.
    Returns job_id immediately; poll GET /api/jobs/{job_id} for results.
    """
    try:
        content = await file.read()

        if file.filename.endswith(".json"):
            data = json.loads(content)
            df   = pd.DataFrame(data)
        else:
            df = pd.read_csv(io.StringIO(content.decode("utf-8")))

        if "name" not in df.columns:
            return JSONResponse(
                content={"error": "Dataset must have a 'name' column"},
                status_code=400,
            )

        job_id = generate_job_id("detect")
        config = {"sample_size": sample_size, "threshold": threshold, "filename": file.filename}
        job_store.create(job_id, config=config)

        run_pipeline_in_background(
            job_id, _run_pipeline, df,
            sample_size=sample_size,
            threshold=threshold,
            include_explanations=True,
        )

        return JSONResponse(content={
            "job_id": job_id,
            "status": "pending",
            "message": f"Job queued. Poll GET /api/jobs/{job_id} for status.",
        })
    except Exception as e:
        logger.exception("Detect endpoint failed")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Poll job status and result for an async detection job."""
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    # Return lightweight status unless job is done
    if job["status"] == "done":
        return JSONResponse(content={
            "job_id":       job["job_id"],
            "status":       job["status"],
            "progress":     job["progress"],
            "created_at":   job["created_at"],
            "completed_at": job["completed_at"],
            "result":       job["result"],
            "error":        job["error"],
        })

    return JSONResponse(content={
        "job_id":       job["job_id"],
        "status":       job["status"],
        "progress":     job["progress"],
        "created_at":   job["created_at"],
        "completed_at": job["completed_at"],
        "error":        job["error"],
    })


@router.post("/search")
async def search_duplicates(
    query:     str   = Form(...),
    min_score: float = Form(0.30),
    top_k:     int   = Form(15),
):
    """
    Search for duplicates of a single query term in the demo dataset.
    Supports min_score filter and top_k result count.
    Uses the embedding engine's built-in cache for repeated queries.
    """
    try:
        df = pd.read_csv("ultra_complex_multilingual_dataset.csv")
        if len(df) > 500:
            df = df.sample(n=500, random_state=42).reset_index(drop=True)

        query_vec  = embedding_engine.encode_single(query)
        names      = df["name"].tolist()
        text_vecs  = embedding_engine.encode(names)

        similarities = np.dot(text_vecs, query_vec).flatten()
        top_indices  = np.argsort(similarities)[::-1][:top_k * 2]  # over-fetch, then filter

        results = []
        for idx in top_indices:
            idx = int(idx)
            sim = float(similarities[idx])
            if sim < min_score:
                continue
            row  = df.iloc[idx]
            phon = phonetic_engine.phonetic_similarity(query, str(row["name"]))
            fuz  = fuzzy_engine.structural_similarity(query, str(row["name"]))
            fused = 0.55 * sim + 0.25 * phon + 0.20 * fuz

            expl = pair_explainer.explain(
                name_a=query,
                name_b=str(row["name"]),
                semantic=sim,
                phonetic=phon,
                structural=fuz,
                fused_score=fused,
            )

            results.append({
                "name":             str(row["name"]),
                "language":         str(row.get("language", "")),
                "translated_to_en": str(row.get("translated_to_en", "")),
                "category":         str(row.get("category", "")),
                "semantic_score":   round(sim,   4),
                "phonetic_score":   round(phon,  4),
                "structural_score": round(fuz,   4),
                "fused_score":      round(fused, 4),
                "confidence_tier":  expl["confidence_tier"],
                "reason":           expl["reason"],
            })

        results.sort(key=lambda x: x["fused_score"], reverse=True)
        return JSONResponse(content={"query": query, "results": results[:top_k]})
    except Exception as e:
        logger.exception("Search failed")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.post("/compare")
async def compare_strings(req: CompareRequest):
    """
    Compare two raw text strings and return a full triple-signal breakdown
    with human-readable explanation.
    """
    try:
        vec_a = embedding_engine.encode_single(req.text_a)
        vec_b = embedding_engine.encode_single(req.text_b)

        semantic   = float(np.dot(vec_a, vec_b))
        semantic   = max(0.0, min(1.0, semantic))  # clip to [0,1]
        phonetic   = phonetic_engine.phonetic_similarity(req.text_a, req.text_b)
        structural = fuzzy_engine.structural_similarity(req.text_a, req.text_b)
        fused      = matcher.w_sem * semantic + matcher.w_pho * phonetic + matcher.w_str * structural

        explanation = pair_explainer.explain(
            name_a=req.text_a,
            name_b=req.text_b,
            semantic=semantic,
            phonetic=phonetic,
            structural=structural,
            fused_score=fused,
        )

        phonetic_debug = phonetic_engine.phonetic_similarity_with_debug(req.text_a, req.text_b)

        return JSONResponse(content={
            "text_a":     req.text_a,
            "text_b":     req.text_b,
            "scores": {
                "semantic":    round(semantic,    4),
                "phonetic":    round(phonetic,    4),
                "structural":  round(structural,  4),
                "fused":       round(fused,       4),
            },
            "weights": {
                "semantic":   matcher.w_sem,
                "phonetic":   matcher.w_pho,
                "structural": matcher.w_str,
            },
            "explanation": explanation,
            "phonetic_debug": phonetic_debug,
        })
    except Exception as e:
        logger.exception("Compare failed")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@router.get("/export/{job_id}")
async def export_job(job_id: str):
    """
    Stream the duplicate pairs of a completed job as a CSV download.
    Columns: name_a, name_b, fused_score, semantic, phonetic, structural, confidence_tier, reason
    """
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    if job["status"] != "done":
        raise HTTPException(status_code=409, detail=f"Job '{job_id}' is not yet done (status={job['status']})")

    result  = job.get("result") or {}
    records = result.get("records", [])
    edges   = result.get("edges",   [])

    # Build index for fast name lookups
    idx_to_name = {r["idx"]: r["name"] for r in records}

    def _csv_generator():
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "name_a", "name_b", "fused_score", "semantic", "phonetic", "structural",
            "confidence_tier", "reason",
        ])
        writer.writeheader()
        yield output.getvalue()

        for edge in edges:
            name_a = idx_to_name.get(edge["source"], str(edge["source"]))
            name_b = idx_to_name.get(edge["target"], str(edge["target"]))
            expl   = pair_explainer.explain(
                name_a=name_a,
                name_b=name_b,
                semantic=edge["semantic"],
                phonetic=edge["phonetic"],
                structural=edge["structural"],
                fused_score=edge["fused_score"],
            )
            row_out = io.StringIO()
            row_writer = csv.DictWriter(row_out, fieldnames=[
                "name_a", "name_b", "fused_score", "semantic", "phonetic", "structural",
                "confidence_tier", "reason",
            ])
            row_writer.writerow({
                "name_a":          name_a,
                "name_b":          name_b,
                "fused_score":     edge["fused_score"],
                "semantic":        edge["semantic"],
                "phonetic":        edge["phonetic"],
                "structural":      edge["structural"],
                "confidence_tier": expl["confidence_tier"],
                "reason":          expl["reason"],
            })
            yield row_out.getvalue()

    return StreamingResponse(
        _csv_generator(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="lingualink_export_{job_id}.csv"'},
    )
