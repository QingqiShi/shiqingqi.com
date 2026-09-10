import type {
  ChangeStore,
  EffectStyle,
  TokenIndex,
} from "@tuja/component-playground";

export const TOGGLE_NAMES = [
  "texture",
  "wash",
  "floating",
  "scrollMask",
  "glass",
] as const;

export type ToggleName = (typeof TOGGLE_NAMES)[number];

export const TOGGLE_LABELS: Record<ToggleName, string> = {
  texture: "Texture",
  wash: "Wash",
  floating: "Floating",
  scrollMask: "Scroll mask",
  glass: "Glass",
};

export const NONE = "none";

/** Named after the `texture` member each one switches on. */
export const TEXTURE_MARKS = ["dot", "line"] as const;

/** Named after the `wash` member each one switches on. */
export const WASH_DIRECTIONS = [
  "toBottom",
  "toTop",
  "toRight",
  "toLeft",
] as const;

export const SCROLL_ORIENTATIONS = ["vertical", "horizontal"] as const;

/** The cap `blurLayerSteps` enforces, offered as the steps a user can pick. */
export const BLUR_RADII = [4, 8, 16, 24, 32];

/** The alpha steps a glass part's colour token can be scaled to. */
export const GLASS_OPACITY_STEPS = [100, 80, 60, 40, 20];

/** The `stylex.create` member the Glass toggle switches on. */
const GLASS = "glassSurface.base";

export interface Texture {
  mark: string;
  spacing: string;
  color: string;
}

export interface Wash {
  color: string;
  direction: string;
}

export interface Floating {
  radius: number;
}

export interface ScrollMask {
  orientation: string;
  radius: number;
}

/**
 * A blur radius from `BLUR_RADII`, or `"off"` for a Glass over an opaque
 * fill that has nothing to sample.
 */
export type GlassRadius = number | "off";

export interface Glass {
  fill: string;
  fillOpacity: number;
  border: string;
  borderOpacity: number;
  highlight: string;
  highlightOpacity: number;
  radius: GlassRadius;
}

export const TEXTURE_DEFAULT = "dot space._1 color.neutralBorder";
export const WASH_DEFAULT = "color.surfaceAccentSubtle toBottom";
export const FLOATING_DEFAULT = "radius 16px";
export const SCROLL_MASK_DEFAULT = "vertical radius 8px";
export const GLASS_DEFAULT =
  "color.glassFill 100% color.glassBorder 100% color.glassHighlight 100% radius 8px";

export const TOGGLE_DEFAULTS: Record<ToggleName, string> = {
  texture: TEXTURE_DEFAULT,
  wash: WASH_DEFAULT,
  floating: FLOATING_DEFAULT,
  scrollMask: SCROLL_MASK_DEFAULT,
  glass: GLASS_DEFAULT,
};

function words(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

export function parseTexture(value: string): Texture | undefined {
  if (value === NONE) return undefined;
  const [mark, spacing, color] = words(value);
  if (!mark || !spacing || !color) return undefined;
  return { mark, spacing, color };
}

export function parseWash(value: string): Wash | undefined {
  if (value === NONE) return undefined;
  const [color, direction] = words(value);
  if (!color || !direction) return undefined;
  // A snapshot saved before the members were renamed holds `to-bottom`, which
  // names no member now.
  return {
    color,
    direction: direction.replace(/-([a-z])/g, (_dash, letter: string) =>
      letter.toUpperCase(),
    ),
  };
}

function radiusIn(value: string): number {
  const match = /radius\s+(\d+)px/.exec(value);
  return match ? Number(match[1]) : 0;
}

function glassRadiusIn(value: string): GlassRadius {
  return /radius\s+off\b/.test(value) ? "off" : radiusIn(value);
}

export function parseFloating(value: string): Floating | undefined {
  if (value === NONE) return undefined;
  return { radius: radiusIn(value) };
}

export function parseScrollMask(value: string): ScrollMask | undefined {
  if (value === NONE) return undefined;
  const orientation = words(value).at(0) ?? "vertical";
  return { orientation, radius: radiusIn(value) };
}

function percentIn(value: string): number {
  return Number.parseInt(value, 10) || 0;
}

export function parseGlass(value: string): Glass | undefined {
  if (value === NONE) return undefined;
  const [fill, fillPct, border, borderPct, highlight, highlightPct] =
    words(value);
  if (
    !fill ||
    !fillPct ||
    !border ||
    !borderPct ||
    !highlight ||
    !highlightPct
  ) {
    return undefined;
  }
  return {
    fill,
    fillOpacity: percentIn(fillPct),
    border,
    borderOpacity: percentIn(borderPct),
    highlight,
    highlightOpacity: percentIn(highlightPct),
    radius: glassRadiusIn(value),
  };
}

export function formatTexture(texture: Texture): string {
  return `${texture.mark} ${texture.spacing} ${texture.color}`;
}

export function formatWash(wash: Wash): string {
  return `${wash.color} ${wash.direction}`;
}

export function formatFloating(floating: Floating): string {
  return `radius ${String(floating.radius)}px`;
}

export function formatScrollMask(mask: ScrollMask): string {
  return `${mask.orientation} radius ${String(mask.radius)}px`;
}

export function formatGlass(glass: Glass): string {
  return [
    glass.fill,
    `${String(glass.fillOpacity)}%`,
    glass.border,
    `${String(glass.borderOpacity)}%`,
    glass.highlight,
    `${String(glass.highlightOpacity)}%`,
    "radius",
    glass.radius === "off" ? "off" : `${String(glass.radius)}px`,
  ].join(" ");
}

/** The custom property the design system dials through a `var()` reference. */
function dialProperty(reference: string): string | undefined {
  return /^var\((--[A-Za-z0-9_-]+)\)$/.exec(reference)?.[1];
}

/** One dial, turned to the value the user picked, as an inline declaration. */
function dial(
  name: string,
  value: string,
  index: TokenIndex,
): [string, string][] {
  const reference = index.ref(name);
  const property =
    reference === undefined ? undefined : dialProperty(reference);
  return property === undefined ? [] : [[property, value]];
}

/** A token reference resolved for a dial, or the text as written. */
function resolved(value: string, index: TokenIndex): string {
  return index.ref(value) ?? value;
}

export interface LayerEffects {
  texture?: Texture;
  wash?: Wash;
  floating?: Floating;
  scrollMask?: ScrollMask;
  glass?: Glass;
}

export function layerEffects(store: ChangeStore, layer: string): LayerEffects {
  return {
    texture: parseTexture(store.toggle(layer, "texture")),
    wash: parseWash(store.toggle(layer, "wash")),
    floating: parseFloating(store.toggle(layer, "floating")),
    scrollMask: parseScrollMask(store.toggle(layer, "scrollMask")),
    glass: parseGlass(store.toggle(layer, "glass")),
  };
}

/** Every named layer's effects, read from the store once instead of per site. */
export function layerEffectsByLayer(
  store: ChangeStore,
  layers: string[],
): Record<string, LayerEffects> {
  return Object.fromEntries(
    layers.map((layer) => [layer, layerEffects(store, layer)]),
  );
}

/**
 * A glass part's colour: the token's own value at 100%, else that value
 * scaled to the part's opacity. The step scales the token's own alpha rather
 * than adding a second one.
 */
function glassColor(token: string, opacity: number, index: TokenIndex): string {
  const value = resolved(token, index);
  if (opacity === 100) return value;
  return `color-mix(in srgb, ${value} ${String(opacity)}%, transparent)`;
}

/** The compiled class of a design-system member a toggle switches on. */
function memberClass(name: string, index: TokenIndex): string | undefined {
  return index.catalogue.presets[name]?.className || undefined;
}

/**
 * The box the Texture draws on: the layer's own area, behind its content and
 * over its background, so a Wash on the layer stays visible under the mark.
 */
const TEXTURE_BOX: Record<string, string> = {
  position: "absolute",
  inset: "0",
  zIndex: "-1",
  borderRadius: "inherit",
  cornerShape: "inherit",
  pointerEvents: "none",
};

/** Makes the layer the Texture box's containing block and stacking context. */
const HOLDS_TEXTURE: Record<string, string> = {
  position: "relative",
  isolation: "isolate",
};

/**
 * What one layer's toggles put on it: the design system's own members as
 * their compiled classes, and the dials turned to the values the user picked.
 * The declarations stay the ones `@tuja/ui` compiled, so a change to a
 * treatment there reaches the playground on its own.
 */
export function effectStyle(
  effects: LayerEffects,
  index: TokenIndex,
): EffectStyle | undefined {
  const classNames: string[] = [];
  const style: Record<string, string> = {};
  let texture: EffectStyle["texture"];

  const mark = effects.texture;
  const markClass = mark && memberClass(`texture.${mark.mark}`, index);
  if (mark && markClass) {
    texture = {
      className: markClass,
      style: {
        ...TEXTURE_BOX,
        ...Object.fromEntries([
          ...dial("textureTokens.pitch", resolved(mark.spacing, index), index),
          ...dial("textureTokens.ink", resolved(mark.color, index), index),
        ]),
      },
    };
    Object.assign(style, HOLDS_TEXTURE);
  }

  const { wash } = effects;
  const washClass = wash && memberClass(`wash.${wash.direction}`, index);
  if (wash && washClass) {
    classNames.push(washClass);
    Object.assign(
      style,
      Object.fromEntries(
        dial("washTokens.tone", resolved(wash.color, index), index),
      ),
    );
  }

  // The blur belongs to the page behind the element, so the element has to
  // paint above the blur plane that sits over the rest of the cell.
  if (effects.floating)
    Object.assign(style, { position: "relative", zIndex: "1" });

  const { glass } = effects;
  const glassClass = glass && memberClass(GLASS, index);
  if (glass && glassClass) {
    classNames.push(glassClass);
    // The rim is an absolute pseudo-element, so the layer is its containing
    // block.
    style.position = "relative";
    Object.assign(
      style,
      Object.fromEntries([
        ...dial(
          "glassTokens.fill",
          glassColor(glass.fill, glass.fillOpacity, index),
          index,
        ),
        ...dial(
          "glassTokens.border",
          glassColor(glass.border, glass.borderOpacity, index),
          index,
        ),
        ...dial(
          "glassTokens.highlight",
          glassColor(glass.highlight, glass.highlightOpacity, index),
          index,
        ),
        ...dial(
          "glassTokens.blur",
          glass.radius === "off" ? "0px" : `${String(glass.radius)}px`,
          index,
        ),
      ]),
    );
  }

  if (classNames.length === 0 && !texture && Object.keys(style).length === 0) {
    return undefined;
  }
  return { classNames, style, texture };
}
