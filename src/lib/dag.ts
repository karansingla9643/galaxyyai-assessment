import type { Node, Edge } from "@xyflow/react";
import type { NodeData } from "@/types/nodes";

/** Topologically sort nodes using Kahn's algorithm. Returns null if cycle detected. */
export function topologicalSort(
  nodes: Node<NodeData>[],
  edges: Edge[]
): Node<NodeData>[] | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: Node<NodeData>[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) result.push(node);

    for (const neighbor of adj.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (result.length !== nodes.length) return null; // cycle detected
  return result;
}

/** Detect if adding an edge would create a cycle. */
export function wouldCreateCycle(
  nodes: Node<NodeData>[],
  edges: Edge[],
  newEdge: Edge
): boolean {
  const testEdges = [...edges, newEdge];
  return topologicalSort(nodes, testEdges) === null;
}

/** Group sorted nodes into parallel execution levels. */
export function getParallelGroups(
  nodes: Node<NodeData>[],
  edges: Edge[]
): Node<NodeData>[][] {
  const sorted = topologicalSort(nodes, edges);
  if (!sorted) return [];

  const levels = new Map<string, number>();
  for (const node of sorted) {
    const maxParentLevel = edges
      .filter((e) => e.target === node.id)
      .reduce((max, e) => Math.max(max, levels.get(e.source) ?? -1), -1);
    levels.set(node.id, maxParentLevel + 1);
  }

  const maxLevel = Math.max(...levels.values());
  const groups: Node<NodeData>[][] = Array.from({ length: maxLevel + 1 }, () => []);
  for (const node of sorted) {
    groups[levels.get(node.id) ?? 0].push(node);
  }
  return groups;
}

/** Get direct upstream dependencies of a node. */
export function getUpstreamNodes(nodeId: string, edges: Edge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

/** Get all downstream nodes (BFS) starting from a set of node IDs. */
export function getDownstreamNodes(startIds: string[], edges: Edge[]): string[] {
  const visited = new Set<string>(startIds);
  const queue = [...startIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === id && !visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return [...visited].filter((id) => !startIds.includes(id));
}
