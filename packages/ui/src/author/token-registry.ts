// The editable-token registry: the single source of truth for which design
// tokens author mode can tweak, and how each one is edited and written back.
//
// Entries are DERIVED from the live token objects in `tokens.stylex.ts` rather
// than hand-listed, so the registry can't silently miss a token. Anything that
// shouldn't be editable goes in `SKIPPED`; anything new that doesn't match a
// known classification lands in `unclassifiedTokens`, which the registry test
// asserts is empty. Add a token to `tokens.stylex.ts` without handling it here
// and CI fails — that's the anti-drift guarantee.
//
// Out of scope by design: font families (excluded by request), the responsive
// `vp*`/`cq*` sizes (a single CSS-var override desyncs their breakpoint ramp),
// and the rgba-channel / HSL-triplet / opacity tokens (they don't map onto a
// color or length editor cleanly). See `SKIPPED` for the exact list.

import { border, color, font, space } from "../tokens.stylex.ts";

export type TokenKind = "color" | "length" | "number" | "integer";

export type TokenGroup = "color" | "font" | "space" | "border";

export interface TokenEntry {
  /** Logical dotted path, e.g. "color.textMain" — the changeset key + label. */
  path: string;
  group: TokenGroup;
  /** Member key within the group, e.g. "textMain". */
  member: string;
  kind: TokenKind;
  /** Runtime `var(--x)` reference, read from the live token object. */
  ref: string;
  /** Human-friendly label for the panel. */
  label: string;
  /** Panel grouping bucket. */
  category: string;
  /** Colors are per-theme; scalars are not. */
  themed: boolean;
  /** Source wraps the value in `stylex.types.*` — preserve it when editing. */
  stylexType?: "number" | "integer";
  /** Unit hint for the length editor when the current value is unitless. */
  defaultUnit?: string;
}

interface UnclassifiedToken {
  group: TokenGroup;
  member: string;
}

interface ScalarClassification {
  kind: TokenKind;
  category: string;
  stylexType?: "number" | "integer";
  defaultUnit?: string;
}

/** Members intentionally not editable, by group. Keep reasons in the header. */
export const SKIPPED: Readonly<Record<TokenGroup, ReadonlySet<string>>> = {
  color: new Set([
    "colorScheme", // not a color
    "bgCanvasChannels", // rgba channel triple, not a color value
    "bgSurfaceChannels",
    "shadowColor", // bare HSL components for hsl(... / ...)
    "shadowStrength", // percent string consumed inside calc()
    "opacityActive", // themed opacity number, not a color
  ]),
  font: new Set([
    "family",
    "familyMono",
    "vpDisplay", // responsive, multi-value across breakpoints
    "vpSubDisplay",
    "vpHeading1",
    "vpHeading2",
    "vpHeading3",
    "cqTitle",
  ]),
  space: new Set<string>(),
  border: new Set<string>(),
};

function humanize(member: string): string {
  const spaced = member
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function colorCategory(member: string): string {
  if (member.startsWith("text") || member.endsWith("Text")) return "Text";
  if (member.startsWith("bgCanvas")) return "Page";
  if (member.startsWith("bgSurface")) return "Surface";
  if (member.startsWith("bgInteractive")) return "Interactive";
  if (member.startsWith("surface")) return "Intent surfaces";
  if (member.endsWith("Border")) return "Borders";
  if (member.startsWith("brand")) return "Brand";
  if (
    member.startsWith("bgInverse") ||
    member.startsWith("bgOverlay") ||
    member.startsWith("bgScrim")
  ) {
    return "Inverse & overlay";
  }
  if (
    member.startsWith("info") ||
    member.startsWith("success") ||
    member.startsWith("warning") ||
    member.startsWith("danger")
  ) {
    return "Semantic";
  }
  return "Roles";
}

function classifyFont(member: string): ScalarClassification | null {
  if (member.startsWith("ui")) {
    return { kind: "length", category: "Type · sizes", defaultUnit: "rem" };
  }
  if (member.startsWith("weight_")) {
    return {
      kind: "integer",
      category: "Type · weights",
      stylexType: "integer",
    };
  }
  if (member.startsWith("lineHeight")) {
    return {
      kind: "number",
      category: "Type · line height",
      stylexType: "number",
    };
  }
  if (member.startsWith("tracking")) {
    return { kind: "length", category: "Type · tracking", defaultUnit: "em" };
  }
  return null;
}

function classifyBorder(member: string): ScalarClassification | null {
  if (member.startsWith("size_")) {
    return { kind: "length", category: "Border · width", defaultUnit: "px" };
  }
  if (member.startsWith("radius_")) {
    return { kind: "length", category: "Border · radius", defaultUnit: "rem" };
  }
  return null;
}

// StyleX adds internal enumerable keys (e.g. `__varGroupHash__`) to the objects
// returned by `defineVars`. They're plumbing, not tokens — skip any `__`-key.
function isInternal(member: string): boolean {
  return member.startsWith("__");
}

// `defineVars` returns a VarGroup whose members are `StyleXVar<string>` with no
// string index signature, so neither `Object.entries` (widens to `any`) nor a
// `Record<string, string>` assignment type-checks. Copy each group into a plain
// record, reading values through `Reflect.get` and narrowing to string — no
// `any`, no assertions.
function toRecord(group: object): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of Object.keys(group)) {
    const value: unknown = Reflect.get(group, key);
    if (typeof value === "string") record[key] = value;
  }
  return record;
}

const GROUP_VARS: Record<TokenGroup, Record<string, string>> = {
  color: toRecord(color),
  font: toRecord(font),
  space: toRecord(space),
  border: toRecord(border),
};

const entries: TokenEntry[] = [];
const unclassified: UnclassifiedToken[] = [];

for (const [member, ref] of Object.entries(GROUP_VARS.color)) {
  if (isInternal(member) || SKIPPED.color.has(member)) continue;
  entries.push({
    path: `color.${member}`,
    group: "color",
    member,
    kind: "color",
    ref,
    label: humanize(member),
    category: colorCategory(member),
    themed: true,
  });
}

for (const [member, ref] of Object.entries(GROUP_VARS.font)) {
  if (isInternal(member) || SKIPPED.font.has(member)) continue;
  const meta = classifyFont(member);
  if (!meta) {
    unclassified.push({ group: "font", member });
    continue;
  }
  entries.push({
    path: `font.${member}`,
    group: "font",
    member,
    kind: meta.kind,
    ref,
    label: humanize(member),
    category: meta.category,
    themed: false,
    stylexType: meta.stylexType,
    defaultUnit: meta.defaultUnit,
  });
}

for (const [member, ref] of Object.entries(GROUP_VARS.space)) {
  if (isInternal(member) || SKIPPED.space.has(member)) continue;
  entries.push({
    path: `space.${member}`,
    group: "space",
    member,
    kind: "length",
    ref,
    label: humanize(member),
    category: "Spacing",
    themed: false,
    defaultUnit: "rem",
  });
}

for (const [member, ref] of Object.entries(GROUP_VARS.border)) {
  if (isInternal(member) || SKIPPED.border.has(member)) continue;
  const meta = classifyBorder(member);
  if (!meta) {
    unclassified.push({ group: "border", member });
    continue;
  }
  entries.push({
    path: `border.${member}`,
    group: "border",
    member,
    kind: meta.kind,
    ref,
    label: humanize(member),
    category: meta.category,
    themed: false,
    defaultUnit: meta.defaultUnit,
  });
}

/** Every editable token, in source order within each group. */
export const editableTokens: readonly TokenEntry[] = entries;

// Path → entry lookup, for resolving a clicked `data-author-token` back to its
// editor. Paths are unique (asserted by the registry test), so the map can't
// collide. Non-editable paths (`shadow._N`, skipped members) are simply absent.
const byPath = new Map(entries.map((entry) => [entry.path, entry]));

/** Resolve a dotted token path to its entry, or undefined if it isn't editable. */
export function findEditableToken(path: string): TokenEntry | undefined {
  return byPath.get(path);
}

/** Tokens that matched no classification and aren't skipped — must be empty. */
export const unclassifiedTokens: readonly UnclassifiedToken[] = unclassified;
