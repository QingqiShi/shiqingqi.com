import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";

/**
 * Shared layout styles for the component specimens rendered under each overview
 * tile's copy. Each specimen module picks one of these and nothing more: `row`
 * for a small cluster, `stack` for a vertical sample, and `fill` for the
 * controls (fields, a callout, a card) that span the tile.
 *
 * Everything centres on the plate. The plate is a frame around the specimen
 * rather than a continuation of the copy above it, so the specimen sits in the
 * middle of it the way a thumbnail sits in the middle of its mount — and because
 * the plates are all one size while the specimens are not, centring is what
 * stops a row of them from looking like a ragged left column with empty space
 * trailing off to the right.
 *
 * It takes two levers, split by who owns the box. `styles.specimen` in
 * `overview-tile.tsx` centres the specimen box on the plate, which settles every
 * specimen narrower than its plate. Once a box is as wide as the plate — because
 * it asked to be, or because its content overran — that declaration has nothing
 * left to move, and placing the contents inside it falls to the styles here.
 *
 * `fill` sets width only, never `align-self: stretch` — stretching would pull a
 * callout or a field to the full height of its row and make it read as a panel
 * rather than as one specimen. Note it does not always produce a plate-wide
 * specimen. The `css` prop compiles to a `className` at the callsite, so where it
 * lands is the receiving component's decision: Callout, Card, Divider, Skeleton
 * and the Menu button stage put it on their rendered root, while Select, Text
 * field and Textarea put it on their inner control and leave the field root
 * content-sized. (Select declares a `css` prop of its own that would reach its
 * root, but the callsite's `css` never arrives as that prop.) So `fill` is not
 * evidence that a specimen fills its plate — check the rendered root — and the
 * wrapper's centring is load-bearing for those three callsites too.
 *
 * Anything beyond arrangement — a wireframe's chrome, a component-specific
 * width cap — stays local to the specimen that needs it.
 */
export const specimenLayout = stylex.create({
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    // Only matters once a cluster wraps. While it fits, the row shrinks to the
    // cluster and the specimen wrapper centres that box. Once it doesn't, the
    // row is as wide as the space it was given — a flex item shrinks to the
    // available width, not to its longest line — so without this every line,
    // the first included, would sit at the inline start of a plate-wide box.
    justifyContent: "center",
    gap: space._1,
  },
  // Both axes, because a stack hits the same wall the row does: the moment one
  // of its rows is wider than the plate the box stretches to the plate, and
  // wherever it lands short of that the rows are narrower than the box. So the
  // rows centre within the box (`align-items`) and a row's own lines centre
  // within it once it wraps (`text-align`) — otherwise a sample whose copy
  // overruns reads flush to the inline start, next to neighbours that don't.
  //
  // This does mean the prose samples show centred copy, which is not how Text
  // or Heading are used in place. At thumbnail scale, sitting in a grid of
  // centred specimens, agreeing with the grid beats agreeing with the callsite;
  // the component's own page is where it appears in real prose.
  //
  // The two are not symmetrical to opt out of: `align-items` reaches the direct
  // children only, `text-align` inherits all the way down. A specimen that wants
  // its own alignment — `checkbox-specimen.tsx` is the one so far — has to unset
  // both, or it gets rows that line up above copy that is still centred.
  stack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: space._0,
  },
  fill: {
    inlineSize: "100%",
  },
});

/**
 * Chrome for the four specimens whose subject is a whole page and so cannot be
 * rendered live inside a tile — Overlay (portals to a fixed, focus-trapping
 * layer), the two page shells (they own the viewport and the `<main>` landmark),
 * and the composed movie-details example (a whole screen is illegible at plate
 * size). Each is drawn as a miniature page instead, from the same tokens the
 * real components use, so the diagram tracks the system's surfaces and borders
 * even though it is not the component itself.
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
    cornerShape: "squircle",
    // Lighter than the sunken plate it sits on, in both themes, so the miniature
    // reads as a page lying on the specimen plate rather than dissolving into it.
    backgroundColor: color.bgSurface,
  },
});
