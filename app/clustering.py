"""
LinguaLink — Graph-Based Transitive Clustering
Builds a similarity graph and uses Louvain community detection.
"""

import networkx as nx
import community as community_louvain
import logging

logger = logging.getLogger(__name__)


class GraphClusterer:
    """
    Builds a similarity graph from pairwise scores and detects
    duplicate clusters using Louvain community detection.
    """

    def __init__(self, edge_threshold: float = 0.55):
        self.edge_threshold = edge_threshold

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
        Returns dict mapping node index -> cluster_id.
        """
        # Only consider connected subgraph for clustering
        # Isolates get their own cluster
        subgraph_nodes = [n for n in G.nodes() if G.degree(n) > 0]

        if not subgraph_nodes:
            return {n: n for n in G.nodes()}

        subgraph = G.subgraph(subgraph_nodes)
        partition = community_louvain.best_partition(subgraph, weight="weight")

        # Assign isolated nodes their own unique clusters
        max_cluster = max(partition.values()) + 1 if partition else 0
        full_partition = {}
        for n in G.nodes():
            if n in partition:
                full_partition[n] = partition[n]
            else:
                full_partition[n] = max_cluster
                max_cluster += 1

        num_real_clusters = len(
            set(v for k, v in full_partition.items() if G.degree(k) > 0)
        )
        logger.info(f"Detected {num_real_clusters} duplicate clusters")
        return full_partition

    def get_cluster_info(
        self, partition: dict, G: nx.Graph
    ) -> list[dict]:
        """
        Build cluster summary information.
        Returns list of cluster dicts with member indices and stats.
        """
        clusters_map: dict[int, list[int]] = {}
        for node, cluster_id in partition.items():
            if G.degree(node) > 0:
                clusters_map.setdefault(cluster_id, []).append(node)

        clusters = []
        for cid, members in clusters_map.items():
            if len(members) < 2:
                continue

            # Average internal edge weight
            internal_edges = []
            for i, m1 in enumerate(members):
                for m2 in members[i + 1:]:
                    if G.has_edge(m1, m2):
                        internal_edges.append(G[m1][m2]["weight"])

            avg_confidence = (
                sum(internal_edges) / len(internal_edges) if internal_edges else 0
            )

            clusters.append({
                "cluster_id": cid,
                "members": members,
                "size": len(members),
                "avg_confidence": round(avg_confidence, 4),
            })

        clusters.sort(key=lambda x: x["size"], reverse=True)
        return clusters
