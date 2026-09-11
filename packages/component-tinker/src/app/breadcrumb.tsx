import type { RenderedCell } from "@tuja/component-tinker";
import { ancestorChain } from "./model/ancestor-chain.ts";
import { parentsOf } from "./model/parents-of.ts";

interface BreadcrumbProps {
  cell: RenderedCell;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Breadcrumb({ cell, selectedId, onSelect }: BreadcrumbProps) {
  const parents = parentsOf(cell.tree);
  const chain = selectedId ? ancestorChain(selectedId, cell.byId, parents) : [];
  return (
    <nav className="tk-crumbs" aria-label="Selected layer">
      <span className="tk-crumb-cell">{cell.title}</span>
      {chain.map((node) => (
        <button
          key={node.id}
          type="button"
          className={
            node.id === selectedId ? "tk-crumb tk-crumb--on" : "tk-crumb"
          }
          onClick={() => {
            onSelect(node.id);
          }}
        >
          {node.layer}
        </button>
      ))}
      {chain.length === 0 ? (
        <span className="tk-crumb-hint">Tap a layer on the canvas</span>
      ) : null}
    </nav>
  );
}
