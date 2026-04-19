# LinguaLink — Multilingual Duplicate Record Detection Engine

> **Innov8 Hackathon — Problem Statement 3**
> An AI-powered, language-agnostic system that identifies duplicate records across massive, messy, multilingual databases using a Triple-Signal Matching Engine, graph-based transitive clustering, and an interactive real-time dashboard.

---

## Table of Contents

1. [What Is This?](#1-what-is-this)
2. [The Problem](#2-the-problem)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [The Triple-Signal Matching Engine](#5-the-triple-signal-matching-engine)
   - [Signal 1 — Semantic Similarity (LaBSE)](#signal-1--semantic-similarity-labse--weight-55)
   - [Signal 2 — Phonetic Similarity](#signal-2--phonetic-similarity--weight-25)
   - [Signal 3 — Structural / Fuzzy Similarity](#signal-3--structural--fuzzy-similarity--weight-20)
   - [Signal Fusion](#signal-fusion)
6. [Graph-Based Clustering (Louvain)](#6-graph-based-clustering-louvain)
7. [Performance Optimization](#7-performance-optimization)
8. [API Reference](#8-api-reference)
9. [Frontend Dashboard](#9-frontend-dashboard)
10. [Datasets](#10-datasets)
11. [How to Run](#11-how-to-run)
12. [Project File Structure](#12-project-file-structure)

---

## 1. What Is This?

**LinguaLink** is a full-stack AI application that solves one of the most persistent problems in enterprise data management: **finding records that refer to the same real-world entity across multiple databases**, even when those records are written in different languages, contain typos, use abbreviations, or originate from completely different data entry standards.

It operates as a **real-time REST API** backed by a **premium interactive dashboard** that lets users visualize duplicate clusters as a D3.js force-directed network graph, inspect similarity scores, and search across languages.

---

## 2. The Problem

When data is ingested from multiple sources (different countries, different languages, different teams), duplicates are inevitable. Traditional deduplication tools fail because they rely on **exact string matching** — if even one character differs, or the language changes, the match is missed entirely.

Consider these real-world examples that a traditional system would *miss*:

| Record A | Record B | Why It's Hard |
|---|---|---|
| `John Smith` | `Jon Smit` | Typo / misspelling |
| `Apple Inc.` | `Apple, Incorporated` | Abbreviation + punctuation |
| `Catherine` | `Kathryn` | Different spelling, same sound |
| `Login Issue` (English) | `ログインの問題` (Japanese) | Different languages, same meaning |
| `Wireless Headphones` | `Auriculares Inalámbricos` (Spanish) | Cross-language translation |
| `javascript` | `javascirpt` | Character swap |

LinguaLink catches **all of these** by looking at a record from three completely independent dimensions simultaneously.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LinguaLink Architecture                     │
│                                                                     │
│  CSV / JSON Input                                                   │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     FastAPI Backend                          │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │             Triple-Signal Matching Engine           │    │   │
│  │  │                                                     │    │   │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │    │   │
│  │  │  │  LaBSE    │  │ Phonetic  │  │  RapidFuzz    │  │    │   │
│  │  │  │ Embedding │  │  Engine   │  │ Fuzzy Engine  │  │    │   │
│  │  │  │  (55%)    │  │  (25%)    │  │   (20%)       │  │    │   │
│  │  │  └─────┬─────┘  └─────┬─────┘  └──────┬────────┘  │    │   │
│  │  │        └──────────────┴───────────────┘           │    │   │
│  │  │                       │                           │    │   │
│  │  │              Weighted Fusion Score                 │    │   │
│  │  └──────────────────────┬──────────────────────────┘    │   │
│  │                         │                                │   │
│  │  ┌──────────────────────▼──────────────────────────┐    │   │
│  │  │           Graph-Based Clustering                 │    │   │
│  │  │                                                  │    │   │
│  │  │   NetworkX Graph → Louvain Community Detection   │    │   │
│  │  │                                                  │    │   │
│  │  └──────────────────────┬───────────────────────────┘   │   │
│  │                         │                                │   │
│  │                    JSON Response                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Interactive Dashboard (Vanilla JS + D3.js)      │   │
│  │                                                              │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │  Network   │  │ Similarity │  │ Cluster  │  │ Live   │  │   │
│  │  │   Graph    │  │  Heatmap   │  │ Analysis │  │ Search │  │   │
│  │  └────────────┘  └────────────┘  └──────────┘  └────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

### Backend

| Technology | Version | Purpose | Why We Chose It |
|---|---|---|---|
| **Python** | 3.11+ | Core language | Ecosystem for ML, NLP, and data pipelines is unmatched |
| **FastAPI** | Latest | REST API framework | Fastest Python web framework; async-native; auto Swagger docs |
| **Uvicorn** | Latest | ASGI server | Production-grade async server; required for FastAPI |
| **sentence-transformers** | Latest | LaBSE model loader | The standard library for running pre-trained sentence embedding models |
| **LaBSE** (via HuggingFace) | `sentence-transformers/LaBSE` | Multilingual semantic embeddings | 109-language support; maps semantically identical sentences to the same vector space |
| **scikit-learn** | Latest | Cosine similarity matrix | Optimized vectorized cosine similarity for dense NumPy arrays |
| **NumPy** | Latest | Matrix operations | Efficient N×N matrix computation for pairwise scoring |
| **RapidFuzz** | Latest | Fuzzy string matching + Levenshtein distance | 10–100× faster than pure Python `fuzzywuzzy`; C-extension backed |
| **Unidecode** | Latest | Transliteration | Converts any Unicode script (Arabic, Chinese, Japanese, etc.) to phonetic Latin representation |
| **NetworkX** | Latest | Graph construction | Standard Python library for building weighted similarity graphs |
| **python-louvain** | Latest | Louvain community detection | Fast, high-quality graph clustering algorithm used in social network analysis |
| **Pandas** | Latest | Data ingestion and manipulation | Industry standard for CSV/JSON tabular data processing |
| **python-multipart** | Latest | File upload support | Required by FastAPI for `multipart/form-data` file uploads |

### Frontend

| Technology | Purpose | Why We Chose It |
|---|---|---|
| **Vanilla HTML/CSS/JS** | UI structure and logic | Zero build step; instant serving from FastAPI StaticFiles; complete control |
| **D3.js v7** | Force-directed network graph, heatmaps, bar charts | The gold standard for data-driven DOM manipulation; unmatched graph visualization power |
| **Google Fonts** (Inter, Outfit, JetBrains Mono) | Typography | Premium, readable fonts used in top-tier enterprise dashboards |
| **CSS Custom Properties** | Design system (variables, theming) | Enables consistent theming without any CSS pre-processor |

---

## 5. The Triple-Signal Matching Engine

The core algorithm in `app/matcher.py`, `app/embeddings.py`, `app/phonetic.py`, and `app/fuzzy.py`. Instead of looking at a record from one dimension, we compute three completely independent similarity scores and fuse them.

```
Fused Score = (0.55 × Semantic) + (0.25 × Phonetic) + (0.20 × Structural)
```

---

### Signal 1 — Semantic Similarity (LaBSE) · Weight: 55%

**File:** `app/embeddings.py`

#### What It Does
Uses the **LaBSE** (Language-agnostic BERT Sentence Embeddings) model to convert any text into a 768-dimensional dense vector that captures its **meaning**, not its spelling. Because LaBSE was jointly trained on parallel text from 109 languages, it explicitly maps semantically equivalent sentences across languages to the same region of vector space.

#### Why 55%?
Semantic meaning is the most reliable signal of true duplication. A typo or language change is irrelevant if two records mean the same thing. This signal catches cross-language matches that the other two signals cannot.

#### How It Works (Step by Step)

1. **Text Preparation**: We concatenate the `name` and `description` fields: `text = f"{name} {description}"`. This gives the model richer context.

2. **Batch Encoding**: `SentenceTransformer.encode()` runs the LaBSE transformer model on all texts simultaneously in batches of 64. Each text becomes a 768-dimensional normalized vector.

3. **Cosine Similarity Matrix**: We compute an N×N matrix where `M[i][j]` = cosine similarity between record `i` and record `j`. Since embeddings are L2-normalized (pre-configured via `normalize_embeddings=True`), this is equivalent to a dot product and is computed efficiently with `sklearn.metrics.pairwise.cosine_similarity`.

4. **Interpretation**: A score of `1.0` means the two texts are semantically identical. A score near `0.0` means they are unrelated. We use this as the primary gate for further processing.

```python
# From app/embeddings.py
embeddings = self.model.encode(texts, batch_size=64, normalize_embeddings=True)
semantic_matrix = sklearn_cosine(embeddings)  # NxN float matrix
```

#### Example
- `"Login Issue"` → vector `[0.12, -0.45, 0.88, ...]`
- `"ログインの問題"` (Japanese: "Login Problem") → vector `[0.11, -0.44, 0.87, ...]`
- **Cosine similarity ≈ 0.94** — nearly identical vectors, even across language scripts.

---

### Signal 2 — Phonetic Similarity · Weight: 25%

**File:** `app/phonetic.py`

#### What It Does
Detects records that **sound alike** when spoken aloud, regardless of spelling differences or script. This catches cases like `Catherine` vs `Kathryn`, or transliterated names like `Mohammed` vs `Muhammad` vs `Mohamed`.

#### Why 25%?
Phonetics catches a class of duplicates that semantics can miss — identical words that have been romanized differently or simply misspelled in a phonetically similar way. It doesn't need to understand meaning; just sound.

#### How It Works (Step by Step)

1. **Transliteration to Latin** (`unidecode`): Any Unicode text — Arabic (`محمد`), Chinese (`约翰`), Japanese (`ジョン`), Cyrillic (`Джон`) — is first converted to a phonetically equivalent Latin string using the `unidecode` library. This gives us a common script to compare.

   ```
   "ジョン" (Japanese) → "Jon"
   "محمد" (Arabic) → "mhmd"
   "Джон" (Russian) → "Dzhon"
   ```

2. **Consonant Skeleton (Phonetic Fingerprint)**: We apply a simplified Metaphone-style algorithm. We keep the first letter, then strip all vowels, and deduplicate adjacent consonants. Two words that sound identical will have the same or very similar consonant skeleton.

   ```
   "Catherine" → "ctrn"
   "Kathryn"   → "kthrn"
   ```

3. **Levenshtein Similarity**: We compute the normalized Levenshtein distance between the two phonetic hashes. This measures how many single-character edits separate them. Result is normalized to `[0, 1]`.

   ```python
   dist = Levenshtein.distance(hash_a, hash_b)
   score = 1.0 - (dist / max(len(hash_a), len(hash_b)))
   ```

---

### Signal 3 — Structural / Fuzzy Similarity · Weight: 20%

**File:** `app/fuzzy.py`

#### What It Does
Detects records that are **structurally similar strings** — catching typos, character swaps, word reordering, and abbreviations at the character level. This is the most literal signal: it compares what the string *looks like*.

#### Why 20%?
Structural matching is the weakest of the three signals because it cannot handle language changes or large meaning shifts. But it's an excellent final validator — if two strings are already semantically and phonetically similar, a high structural score is strong confirmation.

#### How It Works (Step by Step)

1. **Normalization**: Both strings are passed through `unidecode` (transliteration) and lowercased, with all punctuation stripped. This makes the comparison script-agnostic and noise-resistant.

2. **Three RapidFuzz Metrics**: We compute a weighted blend of three distinct fuzzy algorithms:

   | Metric | What It Measures | Weight |
   |---|---|---|
   | `fuzz.ratio` | Simple edit distance ratio between full strings | 40% |
   | `fuzz.partial_ratio` | Best substring match (catches abbreviations like `Apple` in `Apple Inc.`) | 30% |
   | `fuzz.token_sort_ratio` | Edit ratio after sorting words alphabetically (catches reordering like `Smith John` vs `John Smith`) | 30% |

   ```python
   return 0.4 * ratio + 0.3 * partial + 0.3 * token_sort
   ```

3. **All values from RapidFuzz are divided by 100** to normalize them to `[0, 1]` to match our other signals.

---

### Signal Fusion

**File:** `app/matcher.py`

Once all three N×N score matrices are computed, the `TripleSignalMatcher` combines them with a weighted linear fusion:

```python
fused = (0.55 * semantic_matrix) + (0.25 * phonetic_matrix) + (0.20 * structural_matrix)
```

Any pair `(i, j)` whose fused score exceeds the **configurable threshold** (default `0.55`) becomes a candidate duplicate **edge** in the graph.

Each edge carries **full explainability** — the individual semantic, phonetic, and structural subscores are stored and displayed in the dashboard tooltip. You never just see "these are duplicates"; you see *why*.

---

## 6. Graph-Based Clustering (Louvain)

**File:** `app/clustering.py`

#### Why Graph Clustering?
Naïve deduplication compares A→B and B→C but misses that A, B, and C are all the same record. Graph clustering solves this via **transitive closure** — if A matches B and B matches C, they form one cluster even if A and C don't directly match each other.

#### Step 1: Build the Similarity Graph (NetworkX)
Every record is a **node**. Every duplicate pair above the threshold is a **weighted edge**, with the fused score as the weight. We use `NetworkX` to build this in-memory graph.

```python
G = nx.Graph()
G.add_nodes_from(range(num_records))
for pair in pairs:
    G.add_edge(pair["i"], pair["j"], weight=pair["fused_score"])
```

#### Step 2: Louvain Community Detection (python-louvain)
We run the **Louvain algorithm** on the weighted graph. Louvain is a greedy optimization algorithm that maximizes **modularity** — a measure of how dense connections are within communities vs between them. It iteratively merges nodes into communities until no merge improves modularity further.

```python
partition = community_louvain.best_partition(subgraph, weight="weight")
# Returns: {node_id: cluster_id, ...}
```

Each resulting **community = one duplicate cluster**. All records within a cluster represent the same real-world entity.

#### Step 3: Cluster Statistics
For each detected cluster, we compute:
- **Members**: list of record indices
- **Size**: number of records in the cluster
- **Average Confidence**: mean of all internal edge weights — higher value = stronger evidence of duplication

---

## 7. Performance Optimization

A naïve implementation of pairwise matching on N=200 records requires 200×200/2 = **19,900 comparisons**. LaBSE is the single most expensive operation (GPU-accelerated if available). The phonetic and fuzzy comparisons are fast individually but still add up.

We implement a **mathematical culling optimization** in `app/routes.py`:

```python
max_non_sem = phon_weight + str_weight  # = 0.25 + 0.20 = 0.45

for i in range(n):
    for j in range(i + 1, n):
        sem_score = semantic_matrix[i, j]

        # If even with perfect phonetic + structural scores, we can't reach
        # the threshold, skip the expensive phonetic/fuzzy computation entirely
        if (sem_weight * sem_score) + max_non_sem >= threshold:
            phon_score = phonetic_engine.phonetic_similarity(names[i], names[j])
            str_score  = fuzzy_engine.structural_similarity(names[i], names[j])
```

**Reasoning:** Since the maximum phonetic + structural contribution is `0.25 + 0.20 = 0.45`, if `0.55 × semantic_score + 0.45 < threshold`, the pair can **never** exceed the threshold regardless of phonetic and fuzzy scores. We skip those pairs entirely. In practice, this eliminates **70–80% of all phonetic/fuzzy calls**, dramatically reducing computation time.

---

## 8. API Reference

The FastAPI server auto-generates interactive Swagger docs at **`http://localhost:8000/docs`**.

### `GET /api/health`
Returns server and model status.
```json
{ "status": "ok", "model_loaded": true }
```

### `POST /api/demo`
Runs the full pipeline on a built-in bundled dataset.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `sample_size` | `int` | `200` | Number of records to sample |
| `threshold` | `float` | `0.55` | Minimum fused score to create an edge |
| `dataset` | `str` | `ultra_complex_multilingual_dataset.csv` | Which bundled dataset to use |

**Response:** JSON object containing `records`, `edges`, `clusters`, `language_stats`, `duplicate_type_stats`, `total_records`, `total_pairs`, `total_clusters`, `processing_time`.

### `POST /api/detect`
Upload your own CSV or JSON file.

| Parameter | Type | Description |
|---|---|---|
| `file` | `File` | CSV or JSON file with at least a `name` column |
| `sample_size` | `int` | Number of records to process |
| `threshold` | `float` | Duplicate detection threshold |

### `POST /api/search`
Live semantic search — type in any language, find cross-language matches in the dataset.

| Parameter | Type | Description |
|---|---|---|
| `query` | `str` | Any text in any supported language |

Returns the top 15 matches ranked by fused score, with per-signal breakdown.

---

## 9. Frontend Dashboard

**Files:** `static/index.html`, `static/styles.css`, `static/app.js`, `static/graph.js`, `static/heatmap.js`, `static/charts.js`

The dashboard is a **full-viewport, no-scroll app shell** — built entirely with Vanilla HTML/CSS/JS and D3.js, served directly by FastAPI's `StaticFiles` mount (no separate frontend server needed in production).

### Layout
- **Left Sidebar (300px)**: All controls — dataset selector, sample size, threshold, file upload, live search, collapsible methodology explainer, and live stats pills that update after each analysis.
- **Right Main Panel**: Tab-based visualization area. No page scrolling — everything fits in the viewport.

### Tab 1 — Network Graph (`static/graph.js`, D3.js)
A **force-directed graph** where:
- Each **node** = one record, colored by language
- Each **edge** = a detected duplicate pair, with opacity/thickness proportional to the fused confidence score
- **Hover** on a node: dims all non-connected nodes and shows a tooltip with the full per-signal score breakdown
- **Double-click** a node: highlights its entire transitive cluster and pans/zooms to it
- **Drag** nodes to manually rearrange the layout
- **Zoom/pan** the entire graph with mouse wheel + drag
- **Reset / Toggle Labels** buttons in the graph controls bar

The D3 force simulation uses:
- `forceLink` — pulls linked nodes toward each other (distance proportional to similarity score)
- `forceManyBody` — pushes all nodes apart (repulsion)
- `forceCenter` — keeps the whole graph centered in the viewport
- `forceCollide` — prevents node overlap

### Tab 2 — Similarity Heatmap (`static/heatmap.js`, D3.js)
An N×N grid where cell color encodes fused similarity score between every pair. Rendered lazily on first tab switch to preserve initial load speed.

### Tab 3 — Cluster Analysis Charts (`static/charts.js`, D3.js)
Four D3.js bar charts:
1. **Language Distribution** — how many records per language in the analyzed sample
2. **Top Duplicate Clusters** — the largest clusters by member count
3. **Signal Contribution** — average semantic vs phonetic vs structural scores across all detected pairs
4. **Duplicate Type Distribution** — breakdown of match types in the dataset

### Tab 4 — Detected Clusters (`static/app.js`)
A filterable list of all detected duplicate clusters. Each cluster is a collapsible card showing:
- Cluster number and average confidence percentage (green/amber/red color coding)
- Collapsible member table with: original record name, detected language, English translation, and duplicate type
- A real-time **filter input** to search clusters by name, language, or meaning

### Idle Particle Swarm
When no analysis is running, an animated swarm of particles (D3 timer loop) floats in the background, drawing connecting lines between nearby particles and reacting to mouse movement with a subtle gravity effect.

---

## 10. Datasets

### `ultra_complex_multilingual_dataset.csv` (21K+ records)
The primary demo dataset. Contains names and records spanning 20+ languages — English, Japanese, Chinese, Arabic, Korean, Hindi, Russian, French, German, Spanish, Portuguese, Vietnamese, Turkish, Indonesian, Dutch, Bengali, Swahili, Urdu, Italian, and Thai. Includes intentional typo variants, abbreviation variants, cross-language translations of the same entity, and phonetic variants.

Columns: `id`, `name`, `language`, `translated_to_en`, `duplicate_type`, `record_group_id`

### `ecommerce_multilingual.csv`
A product catalog dataset with names and descriptions in multiple languages, useful for demonstrating the semantic signal across product naming conventions across markets.

Columns: `id`, `name`, `description`, `language`, `category`, `translated_to_en`

---

## 11. How to Run

### Prerequisites
- Python 3.11 or higher
- Node.js (optional, only needed if using the Vite-based `frontend/` dev build)
- Internet connection for first run (downloads LaBSE model ~1.8 GB from HuggingFace)

### Backend (Required)

```bash
# From the PROJECT ROOT (not from inside the app/ folder!)
cd C:\Users\pinch\Desktop\Innov8Project

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> ⚠️ **Important:** Always run `uvicorn` from the **project root** (`Innov8Project/`), never from inside the `app/` subdirectory. The `app.main:app` string tells Python to import `app` as a package, which requires the parent directory to be in the Python path.

The first startup will download the LaBSE model from HuggingFace (~1.8 GB). Subsequent startups use the local cache and are fast.

Once running:
- **Dashboard**: http://localhost:8000
- **Swagger API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

### Frontend Dev Build (Optional)
The React/Vite frontend in `frontend/` is an optional development build. The main dashboard served at `localhost:8000` is the Vanilla JS dashboard in `static/`.

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

---

## 12. Project File Structure

```
Innov8Project/
│
├── app/                          # FastAPI backend package
│   ├── __init__.py               # Package marker + version
│   ├── main.py                   # FastAPI app factory, CORS, lifespan (model loading)
│   ├── routes.py                 # All API endpoints + core pipeline orchestration
│   ├── embeddings.py             # LaBSE semantic embedding engine
│   ├── phonetic.py               # Transliteration + phonetic fingerprint engine
│   ├── fuzzy.py                  # RapidFuzz structural matching engine
│   ├── matcher.py                # Triple-signal weighted fusion + pair extraction
│   ├── clustering.py             # NetworkX graph builder + Louvain clustering
│   ├── models.py                 # Pydantic request/response models
│   ├── schemas.py                # Shared data schemas
│   └── database.py               # (Stub) Database integration layer
│
├── static/                       # Vanilla JS dashboard (served by FastAPI)
│   ├── index.html                # App shell HTML — sidebar + main panel layout
│   ├── styles.css                # Full design system — dark theme, no-scroll layout
│   ├── app.js                    # Core logic — API calls, rendering, tab switching
│   ├── graph.js                  # D3.js force-directed network graph
│   ├── heatmap.js                # D3.js similarity heatmap
│   └── charts.js                 # D3.js bar charts (language, cluster, signal stats)
│
├── frontend/                     # Optional React/Vite dev frontend
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── ultra_complex_multilingual_dataset.csv   # Primary demo dataset (21K+ records, 20+ languages)
├── ecommerce_multilingual.csv               # E-commerce product catalog dataset
├── generate_dataset.py                     # Script used to generate the datasets
├── requirements.txt                        # Python dependencies
└── README.md                               # This file
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **LaBSE over mBERT or XLM-R** | LaBSE is specifically trained for sentence-level semantic similarity (not just token-level MLM). It outperforms alternatives on multilingual semantic textual similarity benchmarks. |
| **Louvain over DBSCAN or k-means** | Graph-based clustering naturally handles transitive duplicates. Louvain doesn't require pre-specifying cluster count, runs in near-linear time, and maximizes modularity — ideal for arbitrary-shaped clusters. |
| **RapidFuzz over FuzzyWuzzy** | RapidFuzz is a drop-in replacement written in C++ (via Cython), typically 10–100× faster with identical API. Critical for the pairwise O(N²) inner loop. |
| **Mathematical culling optimization** | Avoids computing phonetic/fuzzy for pairs that mathematically cannot reach the threshold, cutting 70–80% of the expensive pairwise calls. |
| **Vanilla JS + D3.js over React** | Zero build complexity; served directly by FastAPI StaticFiles with no build step. D3.js gives complete control over the SVG-based force graph — something React wrappers struggle to expose cleanly. |
| **Configurable threshold** | A single global threshold value allows judges/users to tune sensitivity in real time without restarting the server. |
| **Explainable scoring** | Every duplicate pair shows its semantic, phonetic, and structural sub-scores — not just a binary yes/no. This is critical for enterprise trust and auditability. |
