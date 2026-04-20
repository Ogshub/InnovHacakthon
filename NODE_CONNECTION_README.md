# LinguaLink Node & Connection Explanation (Step-by-Step)

This document explains exactly:

1. What each **node** in the graph represents  
2. How/why two nodes become connected by an **edge**  
3. Why some nodes are **not** connected  
4. Which libraries are used at every stage of the process  
5. How the frontend visual graph maps to backend outputs

---

## 1) What Is a Node?

In LinguaLink, a **node** is one input record after sampling and preprocessing.

- Source records come from a CSV/JSON dataset in `app/routes.py` (`_run_pipeline`).
- Each row is converted to a record object with fields like:
  - `idx` (internal numeric index)
  - `name`
  - `description`
  - `language`
  - `translated_to_en`
  - `duplicate_type`
  - `cluster_id` (assigned later)

On the frontend, `static/graph.js` builds nodes from `data.records`:

- `id` = `idx`
- `name`, `language`, `translated_to_en`, `duplicate_type`
- `cluster_id` is used for cluster highlighting and node radius sizing

So: **one row in your dataset = one logical node candidate**.  
Only records that participate in at least one duplicate edge are drawn in the force graph panel.

---

## 2) End-to-End Pipeline (How Connections Are Built)

The pipeline in `app/routes.py::_run_pipeline()` does this:

1. Load and sample records (`pandas`)
2. Build semantic vectors (`sentence-transformers`, `numpy`, `scikit-learn`)
3. Compute phonetic and structural scores for viable pairs (`rapidfuzz`, `unidecode`)
4. Fuse 3 signals into one score (`numpy`)
5. Keep only pairs above threshold
6. Build graph and detect communities (`networkx`, `python-louvain`)
7. Return `records`, `edges`, `clusters` to the frontend

Each stage below explains **how** and **why** nodes become connected.

---

## 3) Stage A — Semantic Signal (Meaning Similarity)

### What happens

- Text for each record is built as:
  - `text = name + " " + description`
- `EmbeddingEngine` (`app/embeddings.py`) encodes text using:
  - `SentenceTransformer("sentence-transformers/LaBSE")`
- Embeddings are normalized and compared with cosine similarity.

### Libraries used

- `sentence-transformers` (LaBSE multilingual model)
- `numpy`
- `scikit-learn` (`cosine_similarity`)
- Internal SHA-256 cache for repeated texts

### Why this matters for node connections

Semantic similarity detects same meaning across:

- different languages
- synonyms
- rephrased text

If two nodes have high semantic score, they are more likely to connect.

---

## 4) Stage B — Phonetic Signal (Sound Similarity)

### What happens

In `app/phonetic.py`:

1. Transliterate text to Latin (`unidecode`)
2. Build phonetic fingerprints:
   - enhanced metaphone-like skeleton
   - Soundex code
   - blended hash
3. Compare hashes with normalized Levenshtein similarity
4. Blend into one phonetic score

### Libraries used

- `unidecode` (cross-script transliteration)
- `rapidfuzz.distance.Levenshtein`
- `re` (regex normalization)

### Why this matters for node connections

Phonetic scoring links records that **sound alike** despite spelling/script differences (e.g. transliterations, typos in names).

---

## 5) Stage C — Structural Signal (String Pattern Similarity)

### What happens

In `app/fuzzy.py`:

1. Normalize strings:
   - transliterate
   - lowercase
   - remove currency/unit/brand noise
2. Compute fuzzy metrics:
   - `ratio`
   - `partial_ratio`
   - `token_sort_ratio`
   - `token_set_ratio`
3. Weighted blend => structural score

### Libraries used

- `rapidfuzz.fuzz`
- `unidecode`
- `re`

### Why this matters for node connections

Structural score catches:

- typos
- token reorderings
- abbreviations/subsets

This provides strong evidence when meaning and sound are also aligned.

---

## 6) Stage D — Fusion (Final Edge Score)

`TripleSignalMatcher` in `app/matcher.py` fuses matrices:

- Default weights:
  - semantic = 0.55
  - phonetic = 0.25
  - structural = 0.20

Formula:

`fused = 0.55*semantic + 0.25*phonetic + 0.20*structural`

### Threshold rule (why nodes connect)

If `fused >= threshold` (default threshold `0.55`), the pair becomes a duplicate connection candidate.

The matcher returns pair objects with:

- `i`, `j` (node indices)
- `fused_score`
- `semantic`
- `phonetic`
- `structural`

Those values explain **why these specific two nodes are connected**.

---

## 7) Optimization Rule (Why Some Pairs Are Skipped)

In `app/routes.py`, before expensive phonetic/structural computation:

- Compute `max_non_sem = w_pho + w_str`
- If `(w_sem * semantic) + max_non_sem < threshold`, pair is skipped

Reason:

- Even with perfect non-semantic scores, that pair can never cross threshold.
- So no edge can ever exist for that pair.

This is a major speed optimization and also explains why many node pairs are never fully evaluated.

---

## 8) Graph Construction (How Edge Objects Are Created)

In `app/clustering.py::build_graph()`:

- Create `networkx.Graph()`
- Add all nodes `0..n-1`
- For each accepted pair, add edge with attributes:
  - `weight` = fused score
  - `semantic`
  - `phonetic`
  - `structural`

So each backend edge is not just a line; it stores explainability data.

---

## 9) Cluster Detection (Why a Node Belongs to a Particular Group)

In `app/clustering.py::detect_clusters()`:

- Primary method: Louvain community detection (`python-louvain`)
- Fallback: connected components (`networkx`) if Louvain unavailable/fails

### Why nodes group together

Nodes with denser and stronger internal edge weights are grouped into the same community/cluster.

Each node gets `cluster_id`, which is sent to frontend.

Cluster summaries include:

- `size`
- `avg_confidence`, `max_confidence`, `min_confidence`
- average semantic/phonetic/structural inside cluster
- dominant language/category (if available)

---

## 10) API Response → Frontend Graph Mapping

Backend returns:

- `records`: node metadata
- `edges`: connected node pairs + score breakdown
- `clusters`: group summaries

Frontend in `static/graph.js`:

1. Builds node set from `edges` (connected nodes only)
2. Builds links from `edges`
3. Uses D3 force simulation:
   - `forceLink`: stronger fused edges pull nodes closer (shorter distance)
   - `forceManyBody`: repulsion to avoid overlap
   - `forceCenter`, `forceCollide`, axis forces for stable layout
4. Node visuals:
   - color by language
   - radius influenced by cluster size
5. Edge visuals:
   - stroke color/thickness by fused confidence
6. Tooltip shows node details; hover/dbl-click expose neighborhood and cluster context

---

## 11) Why Two Particular Nodes Are Connected (Practical Checklist)

For any edge `(A, B)`:

1. Semantic(A,B), Phonetic(A,B), Structural(A,B) were computed
2. Fused score was produced by weighted sum
3. Fused score met/exceeded threshold
4. Pair was included in `edges`
5. `networkx` added an edge with per-signal attributes
6. Frontend drew a link between those two node IDs

So connection is always score-driven and explainable by the three component signals.

---

## 12) Full Library Inventory Used in Node/Edge Logic

### Data/API layer

- `fastapi`
- `pandas`
- `numpy`

### Similarity engines

- `sentence-transformers` (LaBSE)
- `scikit-learn` (cosine similarity)
- `unidecode`
- `rapidfuzz` (fuzzy + Levenshtein)
- `re` (normalization patterns)

### Graph + clustering

- `networkx`
- `python-louvain` (`community` package)

### Frontend visualization

- `d3.js` (force-directed network and interactions)

---

## 13) Interpretation Guidance (How to Read Graph Quality)

- **High fused + high semantic**: translation/synonym duplicates likely  
- **High fused + high phonetic**: transliteration/pronunciation duplicates likely  
- **High fused + high structural**: typo/reformatting duplicates likely  
- **Low connectivity node**: either unique record or threshold too strict  
- **Very dense cluster**: many mutually reinforcing duplicate relationships

---

## 14) Tuning Recommendations

- Increase threshold (e.g. `0.65`) for stricter links (higher precision)
- Lower threshold (e.g. `0.50`) for broader links (higher recall)
- Adjust weights if your domain needs:
  - more semantic emphasis for multilingual sentence-level data
  - more phonetic emphasis for person/entity names
  - more structural emphasis for SKU/product text noise

---

If you want, I can also generate a second file with **worked examples** (real pair-by-pair calculations from your dataset showing exact semantic/phonetic/structural/fused math for selected node connections).
