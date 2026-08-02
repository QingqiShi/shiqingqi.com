import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { tileMarker } from "../overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";

/**
 * Iconography foundation-card illustration: one Phosphor icon on the drafting
 * board it was cut on — the 1em box scaled off in sixteenths, corner brackets, and
 * the construction star the shape is built from. A grid of nine finished icons
 * used to sit here; a single icon with its construction showing says what the
 * page is about (how an icon is sized and weighted) instead of listing what
 * Phosphor ships.
 *
 * Every line is a real proportion off Phosphor's grid rather than texture. It
 * draws on 256 units with a 16-unit regular stroke and 24 for bold, so at this
 * size (a 84-unit box, `DIVISION` = 84/16) the lens sits exactly on grid
 * intersection 7,7 with a radius of five divisions, the regular stroke is exactly
 * one division wide, and the handle ends on intersection 14,14. All four
 * construction lines pass through the lens centre and land on grid points at the
 * bounds — which is what puts the handle on the box diagonal.
 *
 * The icon is the only curve on the board, deliberately: a guide circle offset
 * around the lens cannot clear both the lens and the box edge at this size, and
 * two curves that nearly touch read as one blurred line rather than two drawn
 * ones.
 *
 * At rest it is a dim grey drawing. Engage the card and it is drafted: the frame
 * strokes itself round from the top-left corner, the icon thickens from regular
 * to bold weight, and its vector anchors pop in around the path.
 */

// Phosphor's grid unit, and the width of a regular stroke. The box and its
// perimeter derive from it rather than restating 84 and 336, so the doc comment's
// arithmetic above is the code's. The drawing itself stays in absolute
// coordinates — it is a drawing, and `grid(7)` at every vertex reads worse than
// the number it resolves to.
const DIVISION = 5.25;
const SIZE = 16 * DIVISION;
const PERIMETER = 4 * SIZE;
const ORIGIN_X = 219;
const ORIGIN_Y = 77;

// Every fourth tick runs a full division long, the way a rule marks its quarters.
const DIVISIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

// Narrower than the bold stroke the anchors are knocked out of; see `ANCHORS` at
// the foot of the file for where they sit.
const ANCHOR_SIZE = 4.5;

export function IconographyIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-iconography-ico-glow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.8"
          />
          <stop offset="45%" stopColor="var(--ds-illo-hue)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <filter
          id="dsi-iconography-ico-blur"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        {/* The icon, drawn once and referenced twice below — a blurred halo and
            the stroke itself. Two copies of the same path have to agree exactly,
            so they share one definition; the shapes fix their own fill and cap
            and inherit stroke and width from each `use`. This is Phosphor's
            MagnifyingGlass scaled onto the box: lens 112,112 r80 of 256, handle
            leaving the lens at 45° and ending at 224,224. */}
        <g id="dsi-iconography-ico-icon" fill="none" strokeLinecap="round">
          <circle cx="255.75" cy="113.75" r="26.25" />
          <line x1="274.3" y1="132.3" x2="292.5" y2="150.5" />
        </g>
      </defs>

      <circle
        css={styles.bloom}
        cx="266"
        cy="124"
        r="68"
        fill="url(#dsi-iconography-ico-glow)"
      />

      <g css={styles.board}>
        {/* Two copies of the 1em bounds: a resting whisper, and the gold frame
            that strokes itself round the perimeter (336 = 4 · 84) from the
            top-left corner as the card engages. */}
        <rect
          css={[styles.keyline, styles.box]}
          x={ORIGIN_X}
          y={ORIGIN_Y}
          width={SIZE}
          height={SIZE}
        />
        <rect
          css={styles.boxDraw}
          x={ORIGIN_X}
          y={ORIGIN_Y}
          width={SIZE}
          height={SIZE}
        />

        {/* Corner brackets two divisions long, rather than a heavier outline:
            they mark the 1em bounds crisply while the box stays a whisper. */}
        <g css={[styles.keyline, styles.brackets]}>
          <path d="M 219 87.5 L 219 77 L 229.5 77" />
          <path d="M 292.5 77 L 303 77 L 303 87.5" />
          <path d="M 303 150.5 L 303 161 L 292.5 161" />
          <path d="M 229.5 161 L 219 161 L 219 150.5" />
        </g>

        {/* The scale, along the top edge only: the left edge already carries the
            1em rail, and graduating both turns two edges into hatching. */}
        <g css={[styles.keyline, styles.ticks]}>
          {DIVISIONS.map((division) => (
            <line
              key={division}
              x1={ORIGIN_X + division * DIVISION}
              y1={ORIGIN_Y}
              x2={ORIGIN_X + division * DIVISION}
              y2={ORIGIN_Y + (division % 4 === 0 ? DIVISION : 3)}
            />
          ))}
        </g>

        {/* The construction star: four lines through the lens centre at 45°
            steps, run out to the bounds. The first diagonal lands on opposite
            corners and the rest on grid points, so the handle sits on a line the
            board already had. */}
        <g css={[styles.keyline, styles.axes]}>
          <line x1="255.75" y1="77" x2="255.75" y2="161" />
          <line x1="219" y1="113.75" x2="303" y2="113.75" />
          <line x1="219" y1="77" x2="303" y2="161" />
          <line x1="292.5" y1="77" x2="219" y2="150.5" />
        </g>

        {/* The height rail: these icons size with font-size, so the box is one
            em tall and the label reads the Icon default. */}
        <g css={[styles.keyline, styles.rail]}>
          <line x1="210" y1="77" x2="210" y2="161" />
          <line x1="206" y1="77" x2="214" y2="77" />
          <line x1="206" y1="161" x2="214" y2="161" />
        </g>
        <text css={styles.railLabel} x="202" y="119">
          1em
        </text>
      </g>

      <g css={styles.icon}>
        <use
          css={styles.iconHalo}
          href="#dsi-iconography-ico-icon"
          strokeWidth="7.875"
          filter="url(#dsi-iconography-ico-blur)"
        />
        <use css={styles.iconStroke} href="#dsi-iconography-ico-icon" />

        {ANCHORS.map((anchor) => (
          <rect
            key={anchor.point}
            css={[styles.anchor, anchor.stagger]}
            x={anchor.cx - ANCHOR_SIZE / 2}
            y={anchor.cy - ANCHOR_SIZE / 2}
            width={ANCHOR_SIZE}
            height={ANCHOR_SIZE}
          />
        ))}
      </g>
    </svg>
  );
}

const styles = stylex.create({
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.72,
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "scale(0.82)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "scale(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 520ms cubic-bezier(0.32, 0.72, 0, 1), transform 520ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The board leans towards the cursor a little less far than the icon does, so
  // the icon reads as floating above its own construction rather than printed on
  // it. The two tiers stay close together on purpose: their difference is how far
  // the lens slides off the construction star that generated it, and hover is
  // exactly when those guides brighten. At 5/4 against 3.5/3 the worst case — the
  // pointer in a tile corner — is 1.5 units, under 6% of the lens radius.
  board: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 3.5px), calc(var(--ds-illo-my) * 3px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 320ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Shared keyline treatment — grey at rest, gold once the card is engaged. Each
  // guide below adds only its own weight and how far forward it sits.
  keyline: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeLinecap: "round",
    strokeLinejoin: "round",
    transition: "stroke 520ms ease, opacity 520ms ease",
  },
  // Fades out as the gold frame below draws in, so only one outline is ever lit.
  // That needs its own opacity timing: on `keyline`'s inherited 520ms it would
  // still be a third lit when the 200ms gold ramp finishes, and two coincident
  // outlines on the same rect read as one doubled stroke rather than a pen line.
  box: {
    strokeWidth: 1.1,
    opacity: {
      default: 0.24,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0,
    },
    transition: "stroke 520ms ease, opacity 180ms ease",
  },
  // One dash as long as the whole perimeter, wound off by the offset. A rect's
  // path starts at its top-left corner and runs clockwise, so the draw sweeps
  // along the graduated edge first. Linear, so it reads as a pen at constant
  // speed. Under reduced motion the offset lands at 0 in both states and the
  // frame simply fades in already drawn.
  boxDraw: {
    fill: "none",
    stroke: "var(--ds-illo-hue-soft)",
    strokeWidth: 1.3,
    strokeDasharray: PERIMETER,
    strokeDashoffset: {
      default: PERIMETER,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0,
      [motionConstants.REDUCED_MOTION]: 0,
    },
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.6,
    },
    transition: {
      default: "stroke-dashoffset 560ms linear, opacity 200ms ease",
      [motionConstants.REDUCED_MOTION]: "opacity 400ms ease",
    },
  },
  brackets: {
    strokeWidth: 1.5,
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.85,
    },
  },
  ticks: {
    strokeWidth: 1,
    strokeLinecap: "butt",
    opacity: {
      default: 0.3,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.58,
    },
  },
  axes: {
    strokeWidth: 1,
    strokeDasharray: "3 5",
    strokeLinecap: "butt",
    opacity: {
      default: 0.2,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.42,
    },
  },
  rail: {
    strokeWidth: 1.1,
    opacity: {
      default: 0.3,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.6,
    },
  },
  railLabel: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "11px",
    fontWeight: 500,
    textAnchor: "end",
    dominantBaseline: "middle",
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    opacity: {
      default: 0.4,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.8,
    },
    transition: "fill 520ms ease, opacity 520ms ease",
  },
  icon: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 5px), calc(var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  iconHalo: {
    stroke: "var(--ds-illo-hue-soft)",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.38,
    },
    transition: "opacity 520ms ease",
  },
  // One copy that thickens, not two weights cross-fading: `stroke-width`
  // interpolates, so regular -> bold happens in the stroke itself, which is the
  // property the page documents. 5.25 and 7.875 are Phosphor's 16 and 24 units
  // at this size.
  iconStroke: {
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: {
      default: 5.25,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 7.875,
    },
    opacity: {
      default: 0.62,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    // `stroke-width` is geometry, not colour: reduced motion drops it from the
    // transition so the weight change lands as an instant swap, the way the
    // scales elsewhere in the file null their transforms. Without this the
    // largest element in the illustration still swells 50% over 480ms on a decelerating
    // curve for a reader who asked not to see movement.
    transition: {
      default:
        "stroke 480ms ease, stroke-width 480ms cubic-bezier(0.32, 0.72, 0, 1), opacity 480ms ease",
      [motionConstants.REDUCED_MOTION]: "stroke 480ms ease, opacity 480ms ease",
    },
  },
  // Vector anchors, the way an editor marks a path's extremes: absent while the
  // card rests, then knocked out of the stroke one after another.
  //
  // Held narrower than the stroke they sit on (4.5 against the bold 7.875) and
  // filled in the card's own surface colour, so each one reads as a point punched
  // through the gold rather than a block sitting over it. They were once as wide
  // as the stroke and hardcoded `#ffffff`: that lands on the light card exactly,
  // but the dark card is `#10110F`, so six white squares at 0.95 came out around
  // 20:1 against it — brighter than anything else in the illustration — while eating the
  // lens ring into four arcs in both themes.
  anchor: {
    fill: color.bgSurface,
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.95,
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "scale(0.3)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "scale(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "opacity 220ms ease, transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 220ms ease",
    },
  },
  // The stagger belongs to the hover branch alone. A bare `transitionDelay` also
  // delays the way back: an anchor caught part-lit when the pointer left would
  // hold that opacity for up to 580ms before starting its 220ms fade, so sweeping
  // across the overview grid left half-lit squares sitting on tiles behind the
  // cursor. Declared per state, the entrance staggers and the exit is immediate.
  // The last two steps tighten to 80 and 60ms because the handle is one stroke
  // arriving after the lens, not two more points around it.
  anchorStagger1: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: "110ms",
    },
  },
  anchorStagger2: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: "220ms",
    },
  },
  anchorStagger3: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: "330ms",
    },
  },
  anchorStagger4: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: "440ms",
    },
  },
  anchorStagger5: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: "520ms",
    },
  },
  anchorStagger6: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: "580ms",
    },
  },
});

// Anchor centres in draw order: the four lens extremes clockwise from the top,
// then the joint where the handle leaves the lens and the handle's far end. Kept
// as centres rather than rect corners so each entry is recognisably a point on the
// icon — `255.75, 87.5` is the lens top, where `252.05, 83.8` was arithmetic
// nobody could check — and the half-size shift happens once, in the render.
//
// Declared here rather than beside the other constants because the stagger styles
// it pairs each point with do not exist until `styles` above is evaluated.
const ANCHORS = [
  { point: "lens-top", cx: 255.75, cy: 87.5, stagger: styles.anchorStagger1 },
  { point: "lens-right", cx: 282, cy: 113.75, stagger: styles.anchorStagger2 },
  { point: "lens-bottom", cx: 255.75, cy: 140, stagger: styles.anchorStagger3 },
  { point: "lens-left", cx: 229.5, cy: 113.75, stagger: styles.anchorStagger4 },
  {
    point: "handle-joint",
    cx: 274.3,
    cy: 132.3,
    stagger: styles.anchorStagger5,
  },
  { point: "handle-end", cx: 292.5, cy: 150.5, stagger: styles.anchorStagger6 },
];
