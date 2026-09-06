import type { ReactNode } from "react";
import { createElement, isValidElement, Fragment } from "react";
import type { StyleReader } from "./compose-layer-style.ts";
import { composeLayerStyle } from "./compose-layer-style.ts";
import type { ChangeStore } from "./create-change-store.ts";
import type { TokenIndex } from "./create-token-index.ts";
import type { CellConfig, PlaygroundConfig } from "./types.ts";

/** What a config's element carries: `data-*` attributes and its children. */
interface HostProps {
  children?: ReactNode;
  [attribute: string]: unknown;
}

export interface LayerNode {
  /** Stable across renders: the element's path through the cell's tree. */
  id: string;
  layer: string;
  tag: string;
  variants: string[];
  states: string[];
  opaque: boolean;
  children: LayerNode[];
}

export interface RenderedCell {
  index: number;
  title: string;
  tree: LayerNode[];
  /** Keyed by a node id the caller holds, which a re-render can retire. */
  byId: Record<string, LayerNode | undefined>;
  element: ReactNode;
}

/** The style map reader one layer's composition and edit scope both read. */
export function styleReader(store: ChangeStore, layer: string): StyleReader {
  return (condition) => store.style(layer, condition);
}

/**
 * A config's components must be plain functions with no hook and no context,
 * so every function type in a playground tree is one of those.
 */
function isPlainComponent(
  type: unknown,
): type is (props: HostProps) => ReactNode {
  return typeof type === "function";
}

function splitTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.split(/\s+/).filter(Boolean);
}

function isChildList(children: ReactNode): children is Iterable<ReactNode> {
  return (
    typeof children === "object" &&
    children !== null &&
    Symbol.iterator in children
  );
}

/** One flat list of the children that render, nested arrays included. */
function toChildArray(children: ReactNode): ReactNode[] {
  if (children === undefined || children === null) return [];
  if (typeof children === "boolean") return [];
  if (isChildList(children)) return Array.from(children).flatMap(toChildArray);
  return [children];
}

interface WalkContext {
  config: PlaygroundConfig;
  index: TokenIndex;
  store: ChangeStore;
  byId: Record<string, LayerNode | undefined>;
  /** Reports a layer name the config does not declare. */
  onUnknownLayer?: (layer: string) => void;
}

function renderChildren(
  children: ReactNode,
  path: string,
  collect: LayerNode[],
  context: WalkContext,
): ReactNode {
  const list = toChildArray(children);
  if (list.length === 0) return children;
  const rendered = list.map((child, childIndex) =>
    renderNode(child, `${path}.${String(childIndex)}`, collect, context),
  );
  return rendered.length === 1 ? rendered[0] : rendered;
}

function renderNode(
  node: ReactNode,
  path: string,
  collect: LayerNode[],
  context: WalkContext,
): ReactNode {
  if (!isValidElement<HostProps>(node)) return node;

  const { type, props } = node;

  if (type === Fragment) {
    return createElement(
      Fragment,
      { key: node.key ?? path },
      renderChildren(props.children, path, collect, context),
    );
  }

  if (isPlainComponent(type)) {
    // The stand-in is static, so a config's components are read by calling them.
    const rendered = type(props);
    return renderNode(rendered, path, collect, context);
  }

  if (typeof type !== "string") {
    throw new Error(
      `A playground tree takes host elements and plain function components only, not ${String(type)}.`,
    );
  }

  const layer = props["data-layer"];
  const { children } = props;

  if (typeof layer !== "string") {
    return createElement(
      type,
      { ...props, key: node.key ?? path },
      renderChildren(children, path, collect, context),
    );
  }

  const variants = splitTokens(props["data-variant"]);
  const states = splitTokens(props["data-state"]);
  const layerConfig = Object.hasOwn(context.config.layers, layer)
    ? context.config.layers[layer]
    : undefined;
  if (!layerConfig) context.onUnknownLayer?.(layer);
  const composed = layerConfig
    ? composeLayerStyle({
        layerConfig,
        variants,
        states,
        index: context.index,
        read: styleReader(context.store, layer),
      })
    : undefined;

  const treeNode: LayerNode = {
    id: path,
    layer,
    tag: type,
    variants,
    states,
    opaque: layerConfig?.opaque === true,
    children: [],
  };
  collect.push(treeNode);
  context.byId[path] = treeNode;

  return createElement(
    type,
    {
      ...props,
      key: node.key ?? path,
      "data-playground-id": path,
      className: composed?.classNames.join(" ") || undefined,
      style: composed?.style,
    },
    renderChildren(children, path, treeNode.children, context),
  );
}

/**
 * Turns one cell's element tree into the layer tree the panel shows and the
 * element the canvas renders, with each layer's composed styles applied.
 */
export function renderCell(args: {
  cell: CellConfig;
  cellIndex: number;
  config: PlaygroundConfig;
  index: TokenIndex;
  store: ChangeStore;
  onUnknownLayer?: (layer: string) => void;
}): RenderedCell {
  const { cell, cellIndex, config, index, store, onUnknownLayer } = args;
  const context: WalkContext = {
    config,
    index,
    store,
    byId: {},
    onUnknownLayer,
  };
  const tree: LayerNode[] = [];
  const element = renderNode(cell.tree, `c${String(cellIndex)}`, tree, context);
  return {
    index: cellIndex,
    title: cell.title,
    tree,
    byId: context.byId,
    element,
  };
}
