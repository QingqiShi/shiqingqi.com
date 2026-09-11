import type { LayerNode } from "./render-cell.ts";

/** Every node in the tree, top-down: a node before its children. */
export function flattenTree(nodes: LayerNode[]): LayerNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export interface FlatLayerNode {
  node: LayerNode;
  depth: number;
}

/** Every node in the tree, top-down, paired with how many ancestors it has. */
export function flattenTreeWithDepth(
  nodes: LayerNode[],
  depth = 0,
): FlatLayerNode[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenTreeWithDepth(node.children, depth + 1),
  ]);
}
