/**
 * The selector of the selected state that `selected.quiet` and
 * `selected.marked` read, for code that cannot import a StyleX module, such
 * as a check that runs in the page.
 */
export const selectedSelector =
  ":is([aria-pressed=true], [aria-checked=true], [aria-selected=true], [aria-current]:not([aria-current=false], [aria-current='']))";
