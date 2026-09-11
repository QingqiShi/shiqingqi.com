import type { Catalogue, StyleValue, TokenEntry } from "./types.ts";

const TOKEN_NAME = /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9_]+$/;
const BRACE = /\{([^{}]+)\}/g;

export type ParsedValue =
  | { kind: "token"; token: string }
  | { kind: "literal"; text: string }
  | { kind: "expression"; text: string; tokens: string[] };

export interface TokenIndex {
  catalogue: Catalogue;
  /** Every listed token name, for a "did you mean" message. */
  names: string[];
  presetNames: string[];
  token(name: string): TokenEntry | undefined;
  /** The CSS text the name resolves to, or undefined when it is unknown. */
  ref(name: string): string | undefined;
  /** True when the token is applied as a class rather than as a declaration. */
  isPresetToken(name: string): boolean;
}

export function createTokenIndex(catalogue: Catalogue): TokenIndex {
  const tokens = new Map<string, TokenEntry>();
  const presetKinds = new Set<string>();

  for (const [groupName, group] of Object.entries(catalogue.groups)) {
    if (!group) continue;
    if (group.kind === "preset") presetKinds.add(groupName);
    for (const token of group.tokens) tokens.set(token.name, token);
  }

  return {
    catalogue,
    names: [...tokens.keys()],
    presetNames: Object.keys(catalogue.presets),
    token: (name) => tokens.get(name),
    ref(name) {
      const token = tokens.get(name);
      if (token?.ref !== undefined) return token.ref;
      if (token?.className !== undefined) return undefined;
      return catalogue.unlisted[name];
    },
    isPresetToken(name) {
      const group = name.split(".")[0];
      return presetKinds.has(group) && tokens.has(name);
    },
  };
}

function isKnown(name: string, index: TokenIndex): boolean {
  return index.token(name) !== undefined || name in index.catalogue.unlisted;
}

export function parseStyleValue(
  raw: StyleValue,
  index: TokenIndex,
): ParsedValue {
  const text = String(raw);
  if (TOKEN_NAME.test(text) && isKnown(text, index)) {
    return { kind: "token", token: text };
  }
  const braced = [...text.matchAll(BRACE)].map((match) => match[1].trim());
  if (braced.length > 0) return { kind: "expression", text, tokens: braced };
  return { kind: "literal", text };
}

/** Every token name a value refers to, whether bare or inside braces. */
export function tokenReferencesIn(
  raw: StyleValue,
  index: TokenIndex,
): string[] {
  const parsed = parseStyleValue(raw, index);
  if (parsed.kind === "token") return [parsed.token];
  if (parsed.kind === "expression") return parsed.tokens;
  const text = String(raw);
  return TOKEN_NAME.test(text) ? [text] : [];
}

/** The CSS text a config value becomes. Throws on an unknown token. */
export function resolveStyleValue(raw: StyleValue, index: TokenIndex): string {
  const parsed = parseStyleValue(raw, index);
  if (parsed.kind === "literal") return parsed.text;
  if (parsed.kind === "token") {
    const ref = index.ref(parsed.token);
    if (ref === undefined) {
      throw new Error(`Unknown token reference "${parsed.token}"`);
    }
    return ref;
  }
  return parsed.text.replace(BRACE, (_match, name: string) => {
    const ref = index.ref(name.trim());
    if (ref === undefined) {
      throw new Error(`Unknown token reference "${name.trim()}"`);
    }
    return ref;
  });
}

/** `border.radius_2` pairs with a squircle; `border.radius_round` with a cap. */
export function cornerShapeFor(
  raw: StyleValue,
  index: TokenIndex,
): string | undefined {
  const parsed = parseStyleValue(raw, index);
  if (parsed.kind !== "token") return undefined;
  if (!parsed.token.startsWith("border.radius_")) return undefined;
  return parsed.token === "border.radius_round" ? "round" : "squircle";
}
