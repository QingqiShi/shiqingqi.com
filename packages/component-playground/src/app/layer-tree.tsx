import {
  flattenTreeWithDepth,
  type LayerNode,
  type RenderedCell,
} from "@tuja/component-playground";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { ConditionChips } from "./condition-chips.tsx";
import { parentsOf } from "./model/parents-of.ts";

interface LayerTreeProps {
  cells: RenderedCell[];
  cellIndex: number;
  selectedId: string | null;
  onSelectCell: (cellIndex: number) => void;
  onSelect: (cellIndex: number, id: string) => void;
}

function Row({
  node,
  depth,
  isSelected,
  onSelect,
}: {
  node: LayerNode;
  depth: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const row = ref.current;
    if (!isSelected || !row) return;
    row.scrollIntoView({ block: "nearest" });
    // Focus follows the arrow keys, but a click on the canvas must not pull
    // focus away from wherever the pointer user is working.
    const tree = row.closest('[role="tree"]');
    if (tree?.contains(document.activeElement)) row.focus();
  }, [isSelected]);
  return (
    <button
      type="button"
      ref={ref}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      data-layer-row={node.id}
      className={isSelected ? "pg-tree-row pg-tree-row--on" : "pg-tree-row"}
      style={{ paddingInlineStart: `${String(8 + depth * 12)}px` }}
      onClick={onSelect}
    >
      <span className="pg-layer-name">{node.layer}</span>
      <span className="pg-tag">{node.tag}</span>
      <ConditionChips node={node} />
      {node.opaque ? (
        <span className="pg-lock" title="Opaque layer, nothing to edit">
          locked
        </span>
      ) : null}
    </button>
  );
}

/** The DOM of the selected cell, one row per layer. */
export function LayerTree({
  cells,
  cellIndex,
  selectedId,
  onSelectCell,
  onSelect,
}: LayerTreeProps) {
  const cell = cells[cellIndex];
  const flat = flattenTreeWithDepth(cell.tree);
  const parents = parentsOf(cell.tree);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!selectedId) return;
    const at = flat.findIndex((item) => item.node.id === selectedId);
    if (at < 0) return;
    const go = (next: number) => {
      const item = flat[Math.max(0, Math.min(flat.length - 1, next))];
      onSelect(cellIndex, item.node.id);
      event.preventDefault();
    };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(flat.length - 1);
    else if (event.key === "ArrowRight") {
      const child = flat[at].node.children.at(0);
      if (child) {
        onSelect(cellIndex, child.id);
        event.preventDefault();
      }
    } else if (event.key === "ArrowLeft") {
      const parent = parents[selectedId];
      if (parent) {
        onSelect(cellIndex, parent);
        event.preventDefault();
      }
    }
  };

  return (
    <div className="pg-tree">
      <label className="pg-cell-select">
        <span className="pg-field-label">cell</span>
        <select
          value={cellIndex}
          onChange={(event) => {
            onSelectCell(Number(event.target.value));
          }}
        >
          {cells.map((option) => (
            <option key={option.index} value={option.index}>
              {option.title}
            </option>
          ))}
        </select>
      </label>
      <div
        role="tree"
        aria-label="Layers"
        className="pg-tree-rows"
        onKeyDown={move}
      >
        {flat.map(({ node, depth }) => (
          <Row
            key={node.id}
            node={node}
            depth={depth}
            isSelected={node.id === selectedId}
            onSelect={() => {
              onSelect(cellIndex, node.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
