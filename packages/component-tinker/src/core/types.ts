import type { ReactNode } from "react";

/** A token reference, a literal CSS string, or a brace expression. */
export type StyleValue = string | number;

/** camelCase CSS property to value. */
export type StyleMap = Record<string, StyleValue>;

export interface LayerConfig {
  /** Design-system primitives applied verbatim, as their compiled classes. */
  presets?: string[];
  base?: StyleMap;
  variants?: Record<string, StyleMap>;
  /**
   * One state per key, or a compound key — one state and one or more variants,
   * space separated (`"checked sm"`) — for a value that changes with both.
   */
  states?: Record<string, StyleMap>;
  /** Shown in the tree and selectable, with no editable property. */
  opaque?: boolean;
}

export interface CellConfig {
  title: string;
  tree: ReactNode;
}

export interface TinkerConfig {
  component: string;
  source: string;
  layers: Record<string, LayerConfig>;
  cells: CellConfig[];
}

export type Condition =
  | { kind: "base" }
  | { kind: "variant"; name: string }
  | { kind: "state"; name: string }
  /** A compound key, so `name` is every part of it: `"checked sm"`. */
  | { kind: "compound"; name: string }
  /** A preset's own pseudo-class branch. Read-only, so never an edit scope. */
  | { kind: "preset"; name: string };

/** A condition flattened to a string, for keying a map. */
export type ConditionKey = string;

export interface TokenEntry {
  name: string;
  member: string;
  /** The CSS text a reference to this token resolves to. */
  ref?: string;
  /** Preset-kind tokens carry classes rather than a value. */
  className?: string;
  hint: string;
  roles?: string[];
  role?: string;
  scale?: string;
  light?: string;
  dark?: string;
}

export interface TokenGroup {
  kind: "var" | "const" | "preset";
  tokens: TokenEntry[];
}

export interface PresetEntry {
  name: string;
  group: string;
  member: string;
  className: string;
  source: string;
  properties: Record<string, unknown>;
  /** The declarations the preset paints while a state is active. */
  states: Record<string, StyleMap>;
  hint: string;
}

/** What an effect toggle puts on a layer. */
export interface EffectStyle {
  /** The compiled classes of the design-system members the toggles switch on. */
  classNames: string[];
  /** The dials the toggles turn, plus what an effect needs to sit right. */
  style: Record<string, string>;
  /**
   * The Texture draws on a box of its own inside the layer. A Texture and a
   * Wash are both one `background-image`, so on one element the later class
   * would replace the earlier and only one of the two would be drawn.
   */
  texture?: { className: string; style: Record<string, string> };
}

export interface Catalogue {
  version: number;
  /** Every map here is looked up by a name a config writes, so a miss is normal. */
  groups: Record<string, TokenGroup | undefined>;
  presets: Record<string, PresetEntry | undefined>;
  /** Tokens that resolve but are offered by no picker — `shadow.*`, the dials. */
  unlisted: Record<string, string | undefined>;
}
