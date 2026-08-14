/**
 * Network graph utilities for modeling research article relationships,
 * topic co-occurrence, degree centrality, and interconnected research clusters.
 */

import { BlogPost } from "../types";
import { extractArxivId } from "./arxivUtils";

export interface NetworkNode {
  id: string;
  label: string;
  group: string;
  degree: number;
  size: number;
  data?: Record<string, unknown>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  relationshipType: "shared_tag" | "direct_reference" | "author_overlap";
}

export interface ArticleNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

/**
 * Builds a network graph from a collection of blog posts.
 * Edges represent thematic affinity (shared tags, citations, similar keywords).
 */
export function buildArticleNetwork(posts: BlogPost[]): ArticleNetwork {
  if (!Array.isArray(posts) || posts.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: NetworkNode[] = posts.map((p) => {
    const primaryTag = (p.tags && p.tags.length > 0) ? p.tags[0] : "General";
    return {
      id: p.id,
      label: p.title,
      group: primaryTag,
      degree: 0,
      size: 10,
      data: {
        slug: p.slug,
        arxivLink: p.arxivLink,
        tags: p.tags
      }
    };
  });

  const edges: NetworkEdge[] = [];
  const nodeMap = new Map<string, NetworkNode>(nodes.map(n => [n.id, n]));

  // Compare all pairs of articles
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const p1 = posts[i];
      const p2 = posts[j];

      const tags1 = new Set((p1.tags || []).map(t => t.toLowerCase().trim()));
      const tags2 = new Set((p2.tags || []).map(t => t.toLowerCase().trim()));

      let sharedTagCount = 0;
      for (const t of tags1) {
        if (tags2.has(t)) sharedTagCount++;
      }

      const arxiv1 = extractArxivId(p1.arxivLink || "");
      const arxiv2 = extractArxivId(p2.arxivLink || "");

      // Check if p1 mentions p2 or p2 mentions p1
      const mentions1 = (p1.content || "").toLowerCase().includes(p2.title.toLowerCase()) ||
        (arxiv2 && (p1.content || "").includes(arxiv2));
      const mentions2 = (p2.content || "").toLowerCase().includes(p1.title.toLowerCase()) ||
        (arxiv1 && (p2.content || "").includes(arxiv1));

      if (sharedTagCount > 0 || mentions1 || mentions2) {
        const weight = sharedTagCount * 1.5 + (mentions1 ? 3 : 0) + (mentions2 ? 3 : 0);
        edges.push({
          source: p1.id,
          target: p2.id,
          weight: Math.round(weight * 10) / 10,
          relationshipType: (mentions1 || mentions2) ? "direct_reference" : "shared_tag"
        });

        // Update node degrees
        const n1 = nodeMap.get(p1.id);
        const n2 = nodeMap.get(p2.id);
        if (n1) n1.degree++;
        if (n2) n2.degree++;
      }
    }
  }

  // Adjust node sizes based on degree centrality
  for (const node of nodes) {
    node.size = 10 + node.degree * 4;
  }

  return { nodes, edges };
}

/**
 * Extracts a tag co-occurrence matrix from all articles.
 */
export function extractTagCooccurrence(posts: BlogPost[]): Array<{ tagA: string; tagB: string; count: number }> {
  if (!Array.isArray(posts)) return [];

  const pairCounts = new Map<string, number>();

  for (const post of posts) {
    const rawTags = (post.tags || []).map(t => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set(rawTags)).sort();

    for (let i = 0; i < uniqueTags.length; i++) {
      for (let j = i + 1; j < uniqueTags.length; j++) {
        const key = `${uniqueTags[i]}|||${uniqueTags[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const results: Array<{ tagA: string; tagB: string; count: number }> = [];
  for (const [key, count] of pairCounts.entries()) {
    const [tagA, tagB] = key.split("|||");
    results.push({ tagA, tagB, count });
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Computes isolated or connected clusters (communities) in the article network using Breadth-First Search.
 */
export function findConnectedClusters(network: ArticleNetwork): string[][] {
  const { nodes, edges } = network;
  if (!nodes || nodes.length === 0) return [];

  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const cluster: string[] = [];
      const queue: string[] = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        cluster.push(current);

        const neighbors = adjacency.get(current) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      clusters.push(cluster);
    }
  }

  return clusters.sort((a, b) => b.length - a.length);
}
