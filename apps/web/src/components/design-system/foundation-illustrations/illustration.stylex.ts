import * as stylex from "@stylexjs/stylex";

/**
 * Shared base for the eight foundation-card illustrations. Every scene sets the
 * same theme-aware palette tokens on its root `<svg>` so the SVG descendants can
 * read them (custom properties inherit): `--ds-illo-ink` for the dim rest state,
 * the `--ds-illo-hue` / `--ds-illo-hue-soft` gold pair for the alive state, and
 * a shared follow-ease for pointer-reactive transforms. Compose it first, e.g.
 * `css={[illoBase.svg, styles.svg]}`, so a card can override a token afterwards
 * (color re-declares the hue pair to purple — later writes win per property).
 *
 * These tokens live here rather than in `defineVars` because they are consumed
 * as literal `var(--ds-illo-*)` names inside `color-mix()` / `calc()` string
 * values across the scenes, and the same `--ds-illo` family is written by the
 * IlloLayer client component and registered via `@property` in global.css. One
 * hashed-name source of truth is not worth splitting that contract across two
 * mechanisms.
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
