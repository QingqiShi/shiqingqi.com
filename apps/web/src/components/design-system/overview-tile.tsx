import * as stylex from "@stylexjs/stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import {
  duration,
  easing,
  motionTokens,
  transition,
} from "@tuja/ui/primitives/motion.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { IlloLayer } from "./foundation-illustrations/illo-layer.tsx";
import { getFoundationIllustration } from "./foundation-illustrations/index.tsx";
import { tileMarker } from "./overview-tile.stylex.ts";
import type { DesignSystemPath } from "./routes/types.ts";
import { getComponentSpecimen } from "./specimens/index.tsx";

interface OverviewTileProps {
  /** Which route this tile leads to; also selects its illustration or specimen. */
  path: DesignSystemPath;
  href: string;
  label: string;
  description: string;
}

/**
 * One card in the design-system overview grid: copy, a stretched link, and
 * either an abstract illustration for a foundation route or a live specimen for
 * a component route — nothing for the rest.
 *
 * It owns the whole tile rather than leaving the markup inline on the overview
 * page because the pieces are load-bearing on each other: the z-index ladder
 * below spans the illustration or specimen, copy, plate and link, and the
 * `::after` focus ring only works
 * while the link stays unpositioned. Those invariants are enforceable here and
 * not in a `.map()` on a page that is otherwise localised copy.
 */
export function OverviewTile({
  path,
  href,
  label,
  description,
}: OverviewTileProps) {
  const illustration = getFoundationIllustration(path);
  const specimen = getComponentSpecimen(path);

  return (
    // A plain element wrapping a stretched link, not a link wrapping
    // everything: the component specimens render real buttons, inputs and
    // selects, and interactive content nested inside an `<a>` is invalid — an
    // anchor inside one is even reparented by the HTML parser. `styles.link`
    // casts a pseudo-element over the whole surface instead, so the entire tile
    // still activates the link.
    <div
      // IlloLayer locates its tile by this attribute, not by tag.
      data-illo-tile={illustration ? "" : undefined}
      css={[
        cardSurface.base,
        cardSurface.interactive,
        styles.tile,
        transition.colors,
        illustration ? styles.tileIllustrated : null,
        tileMarker,
      ]}
    >
      {illustration ? <IlloLayer>{illustration}</IlloLayer> : null}
      <Link href={href} {...stylex.props(styles.link)}>
        {label}
      </Link>
      <span css={styles.description}>{description}</span>
      {specimen ? (
        // `inert` keeps the specimens out of the tab order and the
        // accessibility tree: they are an illustration of the component, not a
        // working copy of it.
        //
        // Two elements, because the plate and the specimen behave differently:
        // the plate is structure and holds still, while only its contents drain
        // of colour at rest. Putting the treatment on the plate would fade the
        // plate too, so the tile's shape would change on hover.
        <div css={[corner.radius_2, styles.plate]} inert>
          <div
            css={[
              styles.specimen,
              specimen.fillsPlate ? styles.specimenFillsPlate : null,
            ]}
          >
            {specimen.element}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  tile: {
    // Positioning context for the stretched link's overlay and for the
    // illustration or specimen; `isolation` keeps their z-indexes local.
    //
    // No clip: some specimens are a Scroll mask or a Progressive blur, and a
    // squircle-cornered clip anywhere above their layers makes Chrome drop the
    // masks and render one flat blur. The three things the clip held in cut
    // themselves instead — the overlay's `::after` names the card's radius
    // below, the illustration layer inherits it in `IlloLayer`, and the
    // specimen wrapper cuts an oversized specimen with a radius-free clip of
    // its own, which the masks are indifferent to.
    position: "relative",
    isolation: "isolate",
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._3,
    paddingInline: space._4,
  },
  // Taller than the plain tiles (~3:2) so the bottom-anchored illustration has room.
  tileIllustrated: {
    minBlockSize: "184px",
    justifyContent: "flex-start",
  },
  // The stretched link: `::after` covers the tile so a click anywhere on it
  // navigates, and carries the focus ring the surface can no longer draw for
  // itself (`cardSurface.interactive`'s ring keys off `:focus-visible` on the
  // focused element, which is now this link rather than the tile).
  //
  // Stacking, all inside the tile's `isolation: isolate`: the illustration or specimen sits at 0, the
  // copy and the plate at 1, and the link above both at 3 — otherwise its
  // `::after` would paint under the later-in-DOM plate and the specimens would
  // carve dead zones out of the tile. The link must stay unpositioned so
  // `::after` resolves against the tile; a flex item honours `z-index` without
  // it. Every layer therefore needs an explicit `z-index`, because one
  // positioned or z-indexed sibling would otherwise paint over the rest.
  link: {
    zIndex: 3,
    fontSize: font.uiHeading3,
    fontWeight: font.weight_7,
    color: color.textMain,
    textDecoration: "none",
    // The element's own outline is declared solid-and-transparent purely to
    // suppress the UA focus ring, the same way `cardSurface.interactive` and
    // `a11y.focusRing` do it. Without it the browser draws its default ring
    // tight around the title row while `::after` draws the intended one around
    // the whole card — two mismatched indicators per tile. The tile used to be
    // the link and inherited this suppression from `cardSurface.interactive`;
    // moving focus to an inner anchor left it behind.
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    "::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: border.radius_3,
      cornerShape: "squircle",
      outlineWidth: border.size_2,
      outlineStyle: "solid",
      outlineOffset: `calc(-1 * ${border.size_2})`,
      outlineColor: "transparent",
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": { "::after": color.accent },
    },
  },
  description: {
    zIndex: 1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
  },
  // A sunken plate, inset within the card's padding: a fill and a radius, no
  // border. That is the difference between this and a card inside a card —
  // nineteen bordered wells add nineteen edges to the grid, whereas an unbordered
  // plate reads as a recess in the surface it already sits on. The radius steps
  // down from the card's own (`radius_3` outer, `radius_2` inner) so the two
  // curves nest rather than compete.
  //
  // `flexGrow` makes the plate absorb whatever height the row's tallest tile
  // leaves over, so every plate in a row is exactly the same size regardless of
  // how long its copy runs or how small its specimen is.
  plate: {
    zIndex: 1,
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    flexGrow: 1,
    marginBlockStart: space._3,
    padding: space._3,
    backgroundColor: color.bgSurfaceSunken,
  },
  // At rest the specimen is drained of colour and held back, then returns to
  // full strength when the tile is engaged — the same move the foundation
  // illustrations make going grey -> gold, so both halves of the overview behave
  // alike. It is what lets the copy lead: nineteen live components each carrying
  // their own hue, at full strength all at once, is a field of competing colour
  // that no amount of per-tile restraint fixes.
  //
  // Greyscale is what keeps this from reading as "disabled". A disabled control
  // is faded but still coloured; fully desaturated reads as a specimen at rest,
  // and the true colour is one hover away.
  //
  // Held below life size, the way a gallery thumbnail is. It costs the one thing
  // live specimens were for — you can no longer read a control's true size off
  // the tile — but that reading was already unreliable next to nineteen
  // different components, and the detail page is where sizing is actually
  // documented. What it buys is that a specimen can never be mistaken for a
  // working control, which matters more here than a pixel-accurate button.
  //
  // Centred on the plate, and scaled from that centre so the thumbnail shrinks
  // in place. The plate is a frame around the specimen rather than a
  // continuation of the copy above it — and since every plate in a row is the
  // same size while the specimens inside them are not, pinning them to the
  // inline edge left each one trailing a different amount of empty plate.
  //
  // This centres the specimen box, which is the whole mechanism for every
  // specimen narrower than its plate. Because the element is `inline-size: 100%`
  // the same `justify-content` on `styles.plate` would be inert, so it cannot be
  // consolidated upward. Its counterpart lives in
  // `specimens/specimen.stylex.ts`: once a box is plate-wide there is
  // nothing here left to move, and those styles place the contents inside it.
  //
  // The whole resting treatment is gated behind `(hover: hover)`. Its only exit
  // is engaging the tile, and a touch device cannot hover — the plate is `inert`
  // so it never takes focus, and tapping the link navigates away. Ungated, a
  // phone would show nineteen permanently grey specimens with the Spinner and
  // Skeleton frozen, which is the exact opposite of what they document. Where
  // there is no way in, there is no resting state: touch gets the specimens
  // live.
  specimen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    // Cuts a specimen wider than its plate, which the tile can no longer clip.
    // Radius-free, so it is not the kind of clip that strips a mask, and
    // `clip` rather than `hidden` so the wrapper never becomes a scroll
    // container. The margin is what an Avatar's badge and a focus ring paint
    // outside their own box: cutting at the box edge would slice those off.
    overflow: "clip",
    overflowClipMargin: space._1,
    transform: "scale(0.85)",
    transformOrigin: "center",
    filter: {
      default: "none",
      "@media (hover: hover)": {
        default: "grayscale(1)",
        [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
          "grayscale(0)",
      },
    },
    // 0.9, not the deeper fade this started at: the specimens render real text,
    // and compositing `textMuted` at 0.62 over the sunken plate lands at 2.71:1
    // in the light theme, well under the 4.5:1 floor. At 0.9 it clears (4.89:1)
    // and greyscale carries the recession, which it was doing most of anyway.
    // Anything lower here has to be checked against light-theme muted text on
    // `bgSurfaceSunken`, which is the binding case.
    opacity: {
      default: 1,
      "@media (hover: hover)": {
        default: 0.9,
        [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
      },
    },
    // A crossfade, which is the reduced-motion-safe form already, so it needs no
    // separate reduced-motion branch.
    transition: `opacity ${duration._300} ${easing.easeOut}, filter ${duration._300} ${easing.easeOut}`,
    // Spinner and Skeleton are the only two components whose whole point is
    // motion, and a grid where two of nineteen tiles never stop moving reads as
    // two tiles asking to be looked at. `motionTokens.playState` inherits, so
    // this one declaration reaches both — the Spinner's inner ring and every
    // Skeleton bar — without either specimen knowing it is inside a tile.
    //
    // Under reduced motion it is a no-op for Skeleton, which sets
    // `animation-name: none` and so has no animation left to hold; Spinner keeps
    // turning at the slower easing. The Skeleton tile is simply still in both
    // states, which is the right outcome for someone who asked not to see
    // movement.
    [motionTokens.playState]: {
      default: "running",
      "@media (hover: hover)": {
        default: "paused",
        [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
          "running",
      },
    },
  },
  // The page miniatures fill the plate instead of sitting on it. Stretched so
  // the wireframe's `block-size: 100%` has a definite height to resolve
  // against, and un-scaled: the thumbnail scale left them at 85% of the plate
  // with a margin of plate showing on every side, so a diagram of a whole page
  // read as a small card adrift inside a much larger one.
  specimenFillsPlate: {
    alignSelf: "stretch",
    transform: "none",
  },
});
