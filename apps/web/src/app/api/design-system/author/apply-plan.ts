import { nearestPaletteTone, parseColor } from "@tuja/ui/author/palette-match";
import type { ColorEdit, ScalarEdit } from "./changeset-schema.ts";

// Pure helpers that turn a changeset edit into a concrete plan for editing
// `packages/ui/src/tokens.stylex.ts`. They encode (and let us test) the
// palette-snap rule so the apply is deterministic and the behaviour is
// documented and stable. The drift threshold is a redmean distance: beyond it,
// the picked color isn't close to any palette tone and we flag it.

export const PALETTE_DRIFT_THRESHOLD = 12;

export function paletteRefFor(hue: string, tone: number): string {
  return `${hue}._${String(tone)}`;
}

/** The `_rgb` channel reference, for rgba recipe tokens like `accentBorder`. */
export function paletteChannelRefFor(hue: string, tone: number): string {
  return `${hue}_rgb._${String(tone)}`;
}

function formatAlpha(alpha: number): string {
  return String(Number(alpha.toFixed(3)));
}

export interface ColorSourcePlan {
  /** Which plain object in tokens.stylex.ts to edit. */
  targetObject: "light" | "dark";
  /** Source expression to write, e.g. `gray._20` or a raw `"…"` literal. */
  expression: string;
  /**
   * Palette const the expression references (`gray`, or `purple_rgb` for a
   * recipe), so the writer can add its `import` if the file doesn't have one
   * yet. Null for a raw literal that needs no import.
   */
  paletteImport: string | null;
  /** Non-null when the pick is far from any palette tone. */
  drift: string | null;
}

export function planColorEdit(edit: ColorEdit): ColorSourcePlan {
  const match = edit.paletteSuggestion ?? nearestPaletteTone(edit.newValue);
  if (!match) {
    return {
      targetObject: edit.theme,
      expression: `"${edit.newValue}"`,
      paletteImport: null,
      drift: `Could not parse ${edit.newValue}; wrote a raw value for ${edit.path} (${edit.theme}).`,
    };
  }
  // Recipe tokens (e.g. `accentBorder: rgba(${purple_rgb._30}, 0.4)`) keep their
  // shape: snap the hue to the `_rgb` channel and preserve the alpha. Prefer an
  // explicit alpha in the new value, else inherit the token's existing alpha.
  const newAlpha = parseColor(edit.newValue)?.a ?? 1;
  const oldAlpha = parseColor(edit.oldValue)?.a ?? 1;
  const alpha = newAlpha < 1 ? newAlpha : oldAlpha;
  const recipe = alpha < 1;
  const expression = recipe
    ? `\`rgba(\${${paletteChannelRefFor(match.hue, match.tone)}}, ${formatAlpha(alpha)})\``
    : paletteRefFor(match.hue, match.tone);
  const paletteImport = recipe ? `${match.hue}_rgb` : match.hue;
  const drift =
    match.distance > PALETTE_DRIFT_THRESHOLD
      ? `${edit.path} (${edit.theme}) → ${edit.newValue} snapped to ${expression} (distance ${match.distance.toFixed(1)}). Off-palette — consider extending the palette via \`pnpm codegen:palette\`.`
      : null;
  return { targetObject: edit.theme, expression, paletteImport, drift };
}

export interface ScalarSourcePlan {
  group: string;
  member: string;
  /** Literal value to write (the source editor preserves any stylex.types wrapper). */
  value: string;
}

export function planScalarEdit(edit: ScalarEdit): ScalarSourcePlan {
  const dot = edit.path.indexOf(".");
  const group = dot === -1 ? "" : edit.path.slice(0, dot);
  const member = dot === -1 ? edit.path : edit.path.slice(dot + 1);
  return { group, member, value: edit.newValue };
}
