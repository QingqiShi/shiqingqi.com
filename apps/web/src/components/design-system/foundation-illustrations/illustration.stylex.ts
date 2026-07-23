import * as stylex from "@stylexjs/stylex";

/**
 * Marks the interactive tile so each illustration's descendants can react to the
 * tile's own `:hover` / `:focus-visible` state via `stylex.when.ancestor(...)` —
 * the StyleX-native way to drive descendant styling from an ancestor's state.
 * This replaces the earlier hand-rolled `--ds-illo` signal (a registered,
 * transitioned custom property): elements now switch between their rest and
 * alive values directly, so no `@property` registration is needed.
 */
export const illoMarker = stylex.defineMarker();

/**
 * Shared base for the eight foundation-card illustrations. Every scene sets the
 * same theme-aware palette tokens on its root `<svg>` so the SVG descendants can
 * read them (custom properties inherit): `--ds-illo-ink` for the dim rest state,
 * the `--ds-illo-hue` / `--ds-illo-hue-soft` gold pair for the alive state, and
 * a shared follow-ease for pointer-reactive transforms. Compose it first, e.g.
 * `css={[illoBase.svg, styles.svg]}`, so a card can override a token afterwards
 * (color re-declares the hue pair to purple — later writes win per property).
 *
 * These tokens stay as literal custom properties (not `defineVars`) because they
 * are consumed as `var(--ds-illo-*)` names inside `color-mix()` / `calc()` string
 * values across the scenes, and the sibling `--ds-illo-px/py` names are written
 * imperatively by the IlloLayer client component — hashed `defineVars` names
 * would break both. Plain custom properties inherit down to the SVG descendants
 * on their own, so no `@property` registration is needed.
 */
export const illoBase = stylex.create({
  svg: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
    "--ds-illo-ink": "light-dark(#6f6f6c, #a9a8a4)",
    "--ds-illo-hue": "light-dark(#9a7b32, #d8b269)",
    "--ds-illo-hue-soft": "light-dark(#bd9a4e, #f0d29a)",
    // Snappy, decisive follow for foreground layers; scenes lengthen it on the
    // glow so the layers separate in depth as the pointer moves.
    "--ds-illo-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
  },
});
