import * as stylex from "@stylexjs/stylex";

/**
 * Marks an overview tile so its art can key off the tile's own hover / focus
 * state via `stylex.when.ancestor(...)` — the reason neither the foundation
 * illustrations nor the component previews need a shared signal variable or an
 * `@property` registration.
 *
 * It lives here rather than beside the illustrations because both kinds of art
 * read it: the foundations scenes bloom grey -> gold, and the components
 * specimen tray lifts to full opacity.
 *
 * Consumers match `:is(:hover, :focus-within)`, not `:focus-visible` — the tile
 * is a plain element that never takes focus itself, so the state has to be read
 * from the link inside it. (`:has(:focus-visible)` would be the exact
 * equivalent, but `:has()` shipped in Firefox 121, above this project's Firefox
 * 120 floor; see `packages/ui/README.md`.)
 *
 * The two are equivalent for keyboard focus but not for the pointer:
 * `:focus-within` also matches plain `:focus`, which browsers put on an anchor
 * on mousedown. Press on a tile and release outside it and the tile stays
 * engaged until the next click lands elsewhere. Accepted — it needs a cancelled
 * click to reach, and it clears itself — but it is the reason not to describe
 * this as keyboard-only. Raising the Firefox floor by one version would let
 * `:has(:focus-visible)` close it.
 */
export const tileMarker = stylex.defineMarker();
