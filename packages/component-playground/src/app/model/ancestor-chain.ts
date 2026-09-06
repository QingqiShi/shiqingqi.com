import type { LayerNode } from "@tuja/component-playground";

/** The selected layer's ancestors, outermost first, then the layer itself. */
export function ancestorChain(
  id: string,
  byId: Record<string, LayerNode | undefined>,
  parents: Record<string, string>,
): LayerNode[] {
  const chain: LayerNode[] = [];
  let current: string | undefined = id;
  while (current) {
    const node = byId[current];
    if (!node) break;
    chain.unshift(node);
    current = parents[current];
  }
  return chain;
}
