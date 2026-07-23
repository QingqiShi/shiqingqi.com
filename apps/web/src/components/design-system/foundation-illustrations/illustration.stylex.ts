import * as stylex from "@stylexjs/stylex";

/**
 * Marks the interactive tile so each illustration's descendants can key off its
 * `:hover` / `:focus-visible` state via `stylex.when.ancestor(...)` — the reason
 * the scenes need no shared signal variable or `@property` registration.
 */
export const illoMarker = stylex.defineMarker();

/**
 * Shared base for the eight illustrations: theme-aware palette tokens set on the
 * root `<svg>` and inherited by its descendants (`--ds-illo-ink` for the rest
 * state, the `--ds-illo-hue` / `-hue-soft` gold pair for the alive state, plus a
 * follow-ease). Compose first — `css={[illoBase.svg, styles.svg]}` — so a card
 * can override a token (color re-declares the hue pair to purple).
 *
 * These stay literal custom properties rather than `defineVars` because they are
 * read as `var(--ds-illo-*)` names inside `color-mix()` / `calc()` strings, and
 * `--ds-illo-px/py` are written imperatively by IlloLayer; hashed names would
 * break both.
 */
export const illoBase = stylex.create({
  svg: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
    "--ds-illo-ink": "light-dark(#6f6f6c, #a9a8a4)",
    "--ds-illo-hue": "light-dark(#9a7b32, #d8b269)",
    "--ds-illo-hue-soft": "light-dark(#bd9a4e, #f0d29a)",
    "--ds-illo-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
  },
});
