import type { LayerNode } from "@tuja/component-playground";

export function parentsOf(nodes: LayerNode[]): Record<string, string> {
  const parents: Record<string, string> = {};
  const walk = (node: LayerNode) => {
    for (const child of node.children) {
      parents[child.id] = node.id;
      walk(child);
    }
  };
  for (const node of nodes) walk(node);
  return parents;
}
