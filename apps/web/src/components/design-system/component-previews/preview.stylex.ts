import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";

/**
 * Shared layout recipes for the component previews rendered under each overview
 * tile's copy. A preview declares only how its own specimens sit relative to
 * each other: `row` for a small cluster, `stack` for a vertical sample, and
 * `fill` for the controls (fields, a callout, a card) that span the tile.
 *
 * Everything starts at the inline edge, on the same axis as the tile's title and
 * description. A centred specimen under left-aligned copy gives the card two
 * alignment axes, which is most of what makes a grid of them feel restless.
 *
 * `fill` sets width only, never `align-self: stretch` — stretching would pull a
 * callout or a field to the full height of its row and make it read as a panel
 * rather than as one specimen.
 *
 * Anything beyond arrangement — a wireframe's chrome, a component-specific
 * width cap — stays local to the preview that needs it.
 */
export const previewLayout = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._1,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space._0,
  },
  fill: {
    inlineSize: "100%",
  },
});

/**
 * Chrome for the three previews whose subject is a whole page and so cannot be
 * rendered live inside a tile — Overlay (portals to a fixed, focus-trapping
 * layer) and the two page shells (they own the viewport and the `<main>`
 * landmark). Each is drawn as a miniature page instead, from the same tokens
 * the real components use, so the diagram tracks the system's surfaces and
 * borders even though it is not the component itself.
 *
 * (Menu button is hand-composed too, but its subject is a control rather than a
 * page, so it stages its own popup instead of using this chrome.)
 */
export const wireframe = stylex.create({
  page: {
    position: "relative",
    display: "flex",
    // Column by default: two of the three shells stack their parts, and the
    // sidebar — the only one laid out across — says so at its own callsite.
    flexDirection: "column",
    overflow: "hidden",
    inlineSize: "100%",
    // Fills the plate: these are diagrams of a whole page, and the overview
    // marks them as plate-filling so the wrapper stretches and this percentage
    // has a definite height to resolve against.
    blockSize: "100%",
    // Floor in `rem`, tracking the `space` tokens the children are built from,
    // for the case where the row leaves the plate shorter than the contents
    // need. Pinned in `px` this stayed put while those children grew with the
    // root font size, and the header/footer miniature — which has almost no
    // slack — pushed its footer bar out through `overflow: hidden` and lost the
    // one element that distinguishes it from the sidebar shell.
    minBlockSize: "4.75rem",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_2,
    // Lighter than the sunken plate it sits on, in both themes, so the miniature
    // reads as a page lying on the specimen tray rather than dissolving into it.
    backgroundColor: color.bgSurface,
  },
});
