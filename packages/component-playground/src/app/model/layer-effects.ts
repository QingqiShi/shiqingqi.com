import type { ChangeStore, TokenIndex } from "@tuja/component-playground";

export const TOGGLE_NAMES = [
  "texture",
  "wash",
  "floating",
  "scrollMask",
] as const;

export type ToggleName = (typeof TOGGLE_NAMES)[number];

export const TOGGLE_LABELS: Record<ToggleName, string> = {
  texture: "Texture",
  wash: "Wash",
  floating: "Floating",
  scrollMask: "Scroll mask",
};

export const NONE = "none";

export const TEXTURE_MARKS = ["dot", "line"] as const;

export const WASH_DIRECTIONS = [
  "to-bottom",
  "to-top",
  "to-right",
  "to-left",
] as const;

export const SCROLL_ORIENTATIONS = ["vertical", "horizontal"] as const;

/** The cap `blurLayerSteps` enforces, offered as the steps a user can pick. */
export const BLUR_RADII = [4, 8, 16, 24, 32];

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

export const TEXTURE_DEFAULT = "dot space._1 color.neutralBorder";
export const WASH_DEFAULT = "color.surfaceAccentSubtle to-bottom";
export const FLOATING_DEFAULT = "radius 16px";
export const SCROLL_MASK_DEFAULT = "vertical radius 8px";

export const TOGGLE_DEFAULTS: Record<ToggleName, string> = {
  texture: TEXTURE_DEFAULT,
  wash: WASH_DEFAULT,
  floating: FLOATING_DEFAULT,
  scrollMask: SCROLL_MASK_DEFAULT,
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
  return { color, direction };
}

function radiusIn(value: string): number {
  const match = /radius\s+(\d+)px/.exec(value);
  return match ? Number(match[1]) : 0;
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

function directionCss(direction: string): string {
  return direction.replace(/-/g, " ");
}

/**
 * One drawn mark at one spacing, as a repeating gradient. DESIGN.md keeps the
 * mark to a 1px line or a dot of 1px or less, so the size is fixed and only
 * the spacing and the colour vary.
 */
function textureImage(texture: Texture, index: TokenIndex): string | undefined {
  const color = index.ref(texture.color) ?? texture.color;
  if (texture.mark === "line") {
    return `repeating-linear-gradient(to bottom, ${color} 0 1px, transparent 1px 100%)`;
  }
  return `radial-gradient(circle at 1px 1px, ${color} 1px, transparent 1px)`;
}

function washImage(wash: Wash, index: TokenIndex): string {
  const color = index.ref(wash.color) ?? wash.color;
  return `linear-gradient(${directionCss(wash.direction)}, ${color}, transparent)`;
}

interface BackgroundLayers {
  image: string;
  size: string;
  repeat: string;
}

/**
 * The background layers a layer's texture and wash draw, topmost first. They
 * are background images, so whatever `backgroundColor` the layer sets still
 * paints beneath them.
 */
export function backgroundLayers(
  texture: Texture | undefined,
  wash: Wash | undefined,
  index: TokenIndex,
): BackgroundLayers | undefined {
  const images: string[] = [];
  const sizes: string[] = [];
  const repeats: string[] = [];

  if (texture) {
    const image = textureImage(texture, index);
    if (image) {
      const spacing = index.ref(texture.spacing) ?? texture.spacing;
      images.push(image);
      sizes.push(`${spacing} ${spacing}`);
      repeats.push("repeat");
    }
  }
  if (wash) {
    images.push(washImage(wash, index));
    sizes.push("100% 100%");
    repeats.push("no-repeat");
  }
  if (images.length === 0) return undefined;
  return {
    image: images.join(", "),
    size: sizes.join(", "),
    repeat: repeats.join(", "),
  };
}

export interface LayerEffects {
  texture?: Texture;
  wash?: Wash;
  floating?: Floating;
  scrollMask?: ScrollMask;
}

export function layerEffects(store: ChangeStore, layer: string): LayerEffects {
  return {
    texture: parseTexture(store.toggle(layer, "texture")),
    wash: parseWash(store.toggle(layer, "wash")),
    floating: parseFloating(store.toggle(layer, "floating")),
    scrollMask: parseScrollMask(store.toggle(layer, "scrollMask")),
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
 * The stylesheet the canvas needs for the toggles that are pure CSS. The
 * floating and scroll-mask blurs are drawn as overlays instead, because a
 * progressive blur takes five stacked elements.
 */
export function effectsStylesheet(
  effects: Record<string, LayerEffects>,
  index: TokenIndex,
): string {
  const rules: string[] = [];
  for (const [layer, layerEffect] of Object.entries(effects)) {
    const selector = `.pg-cell-body [data-layer=${JSON.stringify(layer)}]`;
    const background = backgroundLayers(
      layerEffect.texture,
      layerEffect.wash,
      index,
    );
    if (background) {
      rules.push(
        `${selector} { background-image: ${background.image}; background-size: ${background.size}; background-repeat: ${background.repeat}; }`,
      );
    }
    // The blur belongs to the page behind the element, so the element has to
    // paint above the blur plane that sits over the rest of the cell.
    if (layerEffect.floating) {
      rules.push(`${selector} { position: relative; z-index: 1; }`);
    }
  }
  return rules.join("\n");
}
