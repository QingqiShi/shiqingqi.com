/** The inspector's groups, in the order the spec fixes. */
export const GROUP_ORDER = [
  "Background",
  "Text",
  "Border",
  "Spacing",
  "Size",
  "Layout",
  "Effects",
  "Motion",
  "Stacking",
] as const;

export type PropertyGroup = (typeof GROUP_ORDER)[number];

/**
 * What a property takes. The kind picks the token groups the picker offers;
 * `enum` offers CSS keywords, and `free` has neither, so the value is read
 * only.
 */
export type ValueKind =
  | "color"
  | "length"
  | "borderWidth"
  | "radius"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "fontFamily"
  | "zIndex"
  | "opacity"
  | "aspectRatio"
  | "transition"
  | "duration"
  | "easing"
  | "enum"
  | "free";

interface PropertyEntry {
  group: PropertyGroup;
  kind: ValueKind;
}

function entries(
  group: PropertyGroup,
  kind: ValueKind,
  properties: string[],
): Record<string, PropertyEntry> {
  return Object.fromEntries(
    properties.map((property) => [property, { group, kind }]),
  );
}

const SIDES = [
  "",
  "Block",
  "Inline",
  "BlockStart",
  "BlockEnd",
  "InlineStart",
  "InlineEnd",
];

function sided(prefix: string): string[] {
  return SIDES.map((side) => `${prefix}${side}`);
}

export const PROPERTIES: Record<string, PropertyEntry> = {
  ...entries("Background", "color", ["backgroundColor", "fill", "stroke"]),

  ...entries("Text", "color", ["color", "caretColor"]),
  ...entries("Text", "fontSize", ["fontSize"]),
  ...entries("Text", "fontWeight", ["fontWeight"]),
  ...entries("Text", "lineHeight", ["lineHeight"]),
  ...entries("Text", "letterSpacing", ["letterSpacing"]),
  ...entries("Text", "fontFamily", ["fontFamily"]),
  ...entries("Text", "enum", [
    "textAlign",
    "textTransform",
    "whiteSpace",
    "fontStyle",
    "textDecorationLine",
  ]),

  ...entries("Border", "borderWidth", [
    "borderWidth",
    "borderBlockWidth",
    "borderInlineWidth",
    "outlineWidth",
  ]),
  ...entries("Border", "color", [
    "borderColor",
    "borderBlockColor",
    "borderInlineColor",
    "outlineColor",
  ]),
  ...entries("Border", "radius", ["borderRadius"]),
  ...entries("Border", "length", ["outlineOffset"]),
  ...entries("Border", "enum", ["borderStyle", "outlineStyle", "cornerShape"]),

  ...entries("Spacing", "length", [
    ...sided("padding"),
    ...sided("margin"),
    "gap",
    "rowGap",
    "columnGap",
  ]),

  ...entries("Size", "length", [
    "inlineSize",
    "blockSize",
    "minInlineSize",
    "minBlockSize",
    "maxInlineSize",
    "maxBlockSize",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
  ]),
  ...entries("Size", "aspectRatio", ["aspectRatio"]),

  ...entries("Layout", "enum", [
    "display",
    "flexDirection",
    "flexWrap",
    "alignItems",
    "alignContent",
    "alignSelf",
    "justifyContent",
    "justifyItems",
    "justifySelf",
    "position",
    "overflow",
    "overflowX",
    "overflowY",
    "cursor",
  ]),
  ...entries("Layout", "length", [
    ...sided("inset"),
    "top",
    "right",
    "bottom",
    "left",
  ]),
  ...entries("Layout", "length", ["flexBasis"]),
  ...entries("Layout", "free", ["flexGrow", "flexShrink", "flex", "order"]),

  ...entries("Effects", "opacity", ["opacity"]),
  ...entries("Effects", "free", [
    "boxShadow",
    "clipPath",
    "filter",
    "backdropFilter",
  ]),

  ...entries("Motion", "transition", ["transition"]),
  ...entries("Motion", "duration", ["transitionDuration", "animationDuration"]),
  ...entries("Motion", "easing", [
    "transitionTimingFunction",
    "animationTimingFunction",
  ]),
  ...entries("Motion", "free", [
    "transitionProperty",
    "animationName",
    "animationIterationCount",
    "animationFillMode",
    "willChange",
  ]),

  ...entries("Stacking", "zIndex", ["zIndex"]),
  ...entries("Stacking", "enum", ["isolation", "mixBlendMode"]),
};

/** The CSS keywords an enum property takes. */
export const ENUM_KEYWORDS: Record<string, string[]> = {
  display: [
    "block",
    "inline",
    "inline-block",
    "flex",
    "inline-flex",
    "grid",
    "inline-grid",
    "contents",
    "none",
  ],
  flexDirection: ["row", "row-reverse", "column", "column-reverse"],
  flexWrap: ["nowrap", "wrap", "wrap-reverse"],
  alignItems: ["stretch", "flex-start", "center", "flex-end", "baseline"],
  alignContent: [
    "stretch",
    "flex-start",
    "center",
    "flex-end",
    "space-between",
    "space-around",
  ],
  alignSelf: [
    "auto",
    "stretch",
    "flex-start",
    "center",
    "flex-end",
    "baseline",
  ],
  justifyContent: [
    "flex-start",
    "center",
    "flex-end",
    "space-between",
    "space-around",
    "space-evenly",
  ],
  justifyItems: ["start", "center", "end", "stretch"],
  justifySelf: ["auto", "start", "center", "end", "stretch"],
  position: ["static", "relative", "absolute", "sticky", "fixed"],
  overflow: ["visible", "hidden", "clip", "scroll", "auto"],
  overflowX: ["visible", "hidden", "clip", "scroll", "auto"],
  overflowY: ["visible", "hidden", "clip", "scroll", "auto"],
  cursor: ["auto", "default", "pointer", "text", "move", "not-allowed", "grab"],
  borderStyle: ["none", "solid", "dashed", "dotted", "double"],
  outlineStyle: ["none", "solid", "dashed", "dotted"],
  cornerShape: ["round", "squircle", "bevel", "scoop", "notch"],
  textAlign: ["start", "center", "end", "justify"],
  textTransform: ["none", "uppercase", "lowercase", "capitalize"],
  textDecorationLine: ["none", "underline", "line-through", "overline"],
  whiteSpace: ["normal", "nowrap", "pre", "pre-wrap", "pre-line"],
  fontStyle: ["normal", "italic", "oblique"],
  isolation: ["auto", "isolate"],
  mixBlendMode: ["normal", "multiply", "screen", "overlay", "difference"],
};

const UNKNOWN: PropertyEntry = { group: "Layout", kind: "free" };

export function propertyEntry(property: string): PropertyEntry {
  return PROPERTIES[property] ?? UNKNOWN;
}

export function groupOf(property: string): PropertyGroup {
  return propertyEntry(property).group;
}

export function kindOf(property: string): ValueKind {
  return propertyEntry(property).kind;
}

/** True where the picker has something to offer. */
export function isEditable(property: string): boolean {
  return kindOf(property) !== "free";
}

/** Every property the "+" of one group can add, minus the ones already set. */
export function addableIn(
  group: PropertyGroup,
  alreadySet: Set<string>,
): string[] {
  return Object.entries(PROPERTIES)
    .filter(
      ([property, entry]) =>
        entry.group === group &&
        entry.kind !== "free" &&
        !alreadySet.has(property),
    )
    .map(([property]) => property)
    .sort();
}

/**
 * Values CSS itself names. They are a deliberate choice, not a value the
 * design system failed to name, so the inspector marks them as keywords.
 */
const CSS_KEYWORDS = new Set([
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

export function isCssKeyword(value: string): boolean {
  return CSS_KEYWORDS.has(value.trim().toLowerCase());
}
