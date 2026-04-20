"""
LinguaLink — Graph-Based Transitive Clustering

Improvements over v1:
  - Connected-components fallback when Louvain fails (e.g., single-node graph)
  - Enriched cluster info: max_confidence, min_confidence, dominant_language,
    dominant_category, per-cluster avg signal breakdown (semantic/phonetic/structural)
"""

import logging
from collections import Counter

import networkx as nx

try:
    import community as community_louvain
    _LOUVAIN_AVAILABLE = True
except ImportError:
    _LOUVAIN_AVAILABLE = False
    logging.warning("python-louvain not available — using connected-components fallback")

logger = logging.getLogger(__name__)


class GraphClusterer:
    """
    Builds a similarity graph from pairwise scores and detects
    duplicate clusters using Louvain community detection.
    Falls back to connected-components if Louvain is unavailable or fails.
    """

    def __init__(self, edge_threshold: float = 0.55):
        self.edge_threshold = edge_threshold

    # ── Public API ────────────────────────────────────────────────────────────

    def build_graph(self, pairs: list[dict], num_records: int) -> nx.Graph:
        """
        Build a weighted graph from pair list.
        Nodes = record indices, edges = similarity scores.
        """
        G = nx.Graph()
        G.add_nodes_from(range(num_records))

        for pair in pairs:
            G.add_edge(
                pair["i"],
                pair["j"],
                weight=pair["fused_score"],
                semantic=pair["semantic"],
                phonetic=pair["phonetic"],
                structural=pair["structural"],
            )

        logger.info(
            f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges"
        )
        return G

    def detect_clusters(self, G: nx.Graph) -> dict:
        """
        Run Louvain community detection on the similarity graph.
        Falls back to connected-components if Louvain fails.
        Returns dict mapping node index -> cluster_id.
        """
        subgraph_nodes = [n for n in G.nodes() if G.degree(n) > 0]

        if not subgraph_nodes:
            return {n: n for n in G.nodes()}

        subgraph = G.subgraph(subgraph_nodes)
        partition = self._run_louvain_or_fallback(subgraph)

        # Assign isolated nodes their own unique clusters
        max_cluster = max(partition.values()) + 1 if partition else 0
        full_partition: dict[int, int] = {}
        for n in G.nodes():
            if n in partition:
                full_partition[n] = partition[n]
            else:
                full_partition[n] = max_cluster
                max_cluster += 1

        num_real = len(set(v for k, v in full_partition.items() if G.degree(k) > 0))
        logger.info(f"Detected {num_real} duplicate clusters")
        return full_partition

    def get_cluster_info(
        self,
        partition: dict,
        G: nx.Graph,
        records: list[dict] | None = None,
    ) -> list[dict]:
        """
        Build enriched cluster summary information.

        Args:
            partition: node -> cluster_id mapping
            G:         similarity graph
            records:   optional list of record dicts (same order as node indices)
                       Used to derive dominant_language / dominant_category.

        Returns list of cluster dicts with:
          cluster_id, members, size, avg_confidence, max_confidence, min_confidence,
          avg_semantic, avg_phonetic, avg_structural,
          dominant_language, dominant_category  (if records supplied)
        """
        clusters_map: dict[int, list[int]] = {}
        for node, cluster_id in partition.items():
            if G.degree(node) > 0:
                clusters_map.setdefault(cluster_id, []).append(node)

        clusters = []
        for cid, members in clusters_map.items():
            if len(members) < 2:
                continue

            # Collect all internal edges
            edge_weights:    list[float] = []
            edge_semantic:   list[float] = []
            edge_phonetic:   list[float] = []
            edge_structural: list[float] = []

            for i, m1 in enumerate(members):
                for m2 in members[i + 1:]:
                    if G.has_edge(m1, m2):
                        ed = G[m1][m2]
                        edge_weights.append(ed["weight"])
                        edge_semantic.append(ed.get("semantic", 0.0))
                        edge_phonetic.append(ed.get("phonetic", 0.0))
                        edge_structural.append(ed.get("structural", 0.0))

            def _avg(lst: list[float]) -> float:
                return round(sum(lst) / len(lst), 4) if lst else 0.0

            cluster_dict: dict = {
                "cluster_id":      cid,
                "members":         members,
                "size":            len(members),
                "avg_confidence":  _avg(edge_weights),
                "max_confidence":  round(max(edge_weights), 4) if edge_weights else 0.0,
                "min_confidence":  round(min(edge_weights), 4) if edge_weights else 0.0,
                "avg_semantic":    _avg(edge_semantic),
                "avg_phonetic":    _avg(edge_phonetic),
                "avg_structural":  _avg(edge_structural),
            }

            # Enrich with language / category if records are provided
            if records:
                langs = [records[m].get("language", "") for m in members if m < len(records)]
                cats  = [records[m].get("category", "") for m in members if m < len(records)]
                lang_counter = Counter(l for l in langs if l)
                cat_counter  = Counter(c for c in cats  if c)
                cluster_dict["dominant_language"] = lang_counter.most_common(1)[0][0] if lang_counter else ""
                cluster_dict["dominant_category"] = cat_counter.most_common(1)[0][0]  if cat_counter  else ""

            clusters.append(cluster_dict)

        clusters.sort(key=lambda x: x["size"], reverse=True)
        return clusters

    # ── Private ───────────────────────────────────────────────────────────────

    @staticmethod
    def _run_louvain_or_fallback(subgraph: nx.Graph) -> dict:
        """Attempt Louvain; fall back to connected-components on any failure."""
        if _LOUVAIN_AVAILABLE:
            try:
                return community_louvain.best_partition(subgraph, weight="weight")
            except Exception as exc:
                logger.warning(f"Louvain failed ({exc}), using connected-components fallback")

        # Connected-components fallback
        partition: dict[int, int] = {}
        for cluster_id, component in enumerate(nx.connected_components(subgraph)):
            for node in component:
                partition[node] = cluster_id
        return partition
