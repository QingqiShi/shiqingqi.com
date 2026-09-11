import type { Catalogue, TokenEntry } from "@tuja/component-tinker";
import { ENUM_KEYWORDS, kindOf, type ValueKind } from "./properties.ts";

export interface PickerSource {
  id: string;
  label: string;
  tokens: TokenEntry[];
}

function group(catalogue: Catalogue, name: string): TokenEntry[] {
  return catalogue.groups[name]?.tokens ?? [];
}

function withRole(tokens: TokenEntry[], role: string): TokenEntry[] {
  return tokens.filter((token) => token.roles?.includes(role));
}

function byFontRole(catalogue: Catalogue, role: string): TokenEntry[] {
  return group(catalogue, "font").filter((token) => token.role === role);
}

function byBorderRole(catalogue: Catalogue, role: string): TokenEntry[] {
  return group(catalogue, "border").filter((token) => token.role === role);
}

/** The colour role a property wants offered first. */
function colorRoleFor(property: string): string | undefined {
  if (/^(background|fill|stroke)/.test(property)) return "background";
  if (/Color$/.test(property) && /border|outline/i.test(property)) {
    return "border";
  }
  if (property === "color" || property === "caretColor") return "text";
  return undefined;
}

function colorSources(catalogue: Catalogue, property: string): PickerSource[] {
  const all = group(catalogue, "color");
  const role = colorRoleFor(property);
  const preferred = role ? withRole(all, role) : [];
  const sources: PickerSource[] = [];
  if (role && preferred.length > 0) {
    sources.push({ id: role, label: `${role} colours`, tokens: preferred });
  }
  sources.push({ id: "all", label: "All colours", tokens: all });
  return sources;
}

function fontSizeSources(catalogue: Catalogue): PickerSource[] {
  const sizes = byFontRole(catalogue, "size");
  const scale = (name: string) => sizes.filter((token) => token.scale === name);
  return [
    { id: "ui", label: "UI sizes", tokens: scale("ui") },
    { id: "vp", label: "Viewport sizes", tokens: scale("vp") },
    { id: "cq", label: "Container sizes", tokens: scale("cq") },
  ].filter((source) => source.tokens.length > 0);
}

/**
 * The token groups a property's picker offers, most likely first. An empty
 * list means the property takes CSS keywords or nothing the system names.
 */
export function pickerSourcesFor(
  property: string,
  catalogue: Catalogue,
): PickerSource[] {
  const kind: ValueKind = kindOf(property);
  switch (kind) {
    case "color":
      return colorSources(catalogue, property);
    case "length":
      return [
        { id: "space", label: "Space", tokens: group(catalogue, "space") },
        {
          id: "controlSize",
          label: "Control size",
          tokens: group(catalogue, "controlSize"),
        },
        {
          id: "borderSize",
          label: "Border size",
          tokens: byBorderRole(catalogue, "size"),
        },
      ];
    case "borderWidth":
      return [
        {
          id: "borderSize",
          label: "Border size",
          tokens: byBorderRole(catalogue, "size"),
        },
      ];
    case "radius":
      return [
        {
          id: "radius",
          label: "Radius",
          tokens: byBorderRole(catalogue, "radius"),
        },
      ];
    case "fontSize":
      return fontSizeSources(catalogue);
    case "fontWeight":
      return [
        {
          id: "weight",
          label: "Weight",
          tokens: byFontRole(catalogue, "weight"),
        },
      ];
    case "lineHeight":
      return [
        {
          id: "lineHeight",
          label: "Line height",
          tokens: byFontRole(catalogue, "lineHeight"),
        },
      ];
    case "letterSpacing":
      return [
        {
          id: "tracking",
          label: "Tracking",
          tokens: byFontRole(catalogue, "tracking"),
        },
      ];
    case "fontFamily":
      return [
        {
          id: "family",
          label: "Family",
          tokens: byFontRole(catalogue, "family"),
        },
      ];
    case "zIndex":
      return [
        { id: "layer", label: "Layer", tokens: group(catalogue, "layer") },
      ];
    case "opacity":
      return [
        {
          id: "opacity",
          label: "Opacity",
          tokens: group(catalogue, "opacity"),
        },
      ];
    case "aspectRatio":
      return [
        { id: "ratio", label: "Ratio", tokens: group(catalogue, "ratio") },
      ];
    case "transition":
      return [
        {
          id: "transition",
          label: "Transition",
          tokens: group(catalogue, "transition"),
        },
      ];
    case "duration":
      return [
        {
          id: "duration",
          label: "Duration",
          tokens: group(catalogue, "duration"),
        },
      ];
    case "easing":
      return [
        { id: "easing", label: "Easing", tokens: group(catalogue, "easing") },
      ];
    default:
      return [];
  }
}

export function keywordsFor(property: string): string[] {
  return kindOf(property) === "enum" ? (ENUM_KEYWORDS[property] ?? []) : [];
}
