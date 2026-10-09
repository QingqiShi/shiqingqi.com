import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "#src/design-system/overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";

const CX = 262;
const HALF_W = 60;
const HALF_H = 23;

/** An isometric plate centred on `cy`, `scale` of the full size. */
function plate(cy: number, scale = 1) {
  const w = HALF_W * scale;
  const h = HALF_H * scale;
  return [
    [CX - w, cy],
    [CX, cy - h],
    [CX + w, cy],
    [CX, cy + h],
  ]
    .map((point) => point.join(","))
    .join(" ");
}

const CONFIG_Y = 94;
const SLOT_Y = 120;
const CUSTOM_Y = 146;

/**
 * Customisation foundation-card illustration: the three layers of a component
 * as stacked plates — config with one dial, slot with an open socket, custom
 * with the grid of parts underneath. Engaging the card pulls the plates apart
 * and lights the layer at the bottom.
 */
export function CustomizationIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-customization-orb" cx="50%" cy="50%" r="60%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.75"
          />
          <stop
            offset="55%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.18"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <pattern
          id="dsi-customization-parts-ink"
          x="0"
          y="0"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4.5" cy="4.5" r="1.1" fill="var(--ds-illo-ink)" />
        </pattern>
        <pattern
          id="dsi-customization-parts-hue"
          x="0"
          y="0"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4.5" cy="4.5" r="1.1" fill="var(--ds-illo-hue)" />
        </pattern>
      </defs>

      <ellipse
        css={styles.orb}
        cx={CX}
        cy={CUSTOM_Y}
        rx="80"
        ry="40"
        fill="url(#dsi-customization-orb)"
      />

      <g css={[styles.layer, styles.custom]}>
        <polygon css={styles.partsRest} points={plate(CUSTOM_Y, 0.82)} />
        <polygon css={styles.partsAlive} points={plate(CUSTOM_Y, 0.82)} />
        <polygon
          css={[styles.plate, styles.customPlate]}
          points={plate(CUSTOM_Y)}
        />
      </g>

      <g css={[styles.layer, styles.slot]}>
        <polygon
          css={[styles.plate, styles.slotPlate]}
          points={plate(SLOT_Y)}
        />
        <polygon css={styles.socket} points={plate(SLOT_Y, 0.46)} />
      </g>

      <g css={[styles.layer, styles.config]}>
        <polygon
          css={[styles.plate, styles.configPlate]}
          points={plate(CONFIG_Y)}
        />
        <ellipse
          css={styles.dial}
          cx={CX + 13}
          cy={CONFIG_Y}
          rx="7.5"
          ry="3.8"
        />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  orb: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.5,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.5,
      },
    },
    transformBox: "view-box",
    transformOrigin: "262px 146px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 20px), calc(var(--ds-illo-my) * 14px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 560ms cubic-bezier(0.32, 0.72, 0, 1), transform 420ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 560ms ease",
    },
  },
  layer: {
    transformBox: "view-box",
    transition: {
      default: "transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The plates nearer the viewer lean further, and the outer two part from the
  // middle one when the card is engaged.
  config: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 9px), calc(var(--ds-illo-my) * 7px))",
      [motionConstants.REDUCED_MOTION]: "none",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "translate(calc(var(--ds-illo-mx) * 9px), calc(var(--ds-illo-my) * 7px - 9px))",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]:
          "translate(calc(var(--ds-illo-mx) * 9px), calc(var(--ds-illo-my) * 7px - 9px))",
        [motionConstants.REDUCED_MOTION]: "none",
      },
    },
  },
  slot: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 5.5px), calc(var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  custom: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 2.5px), calc(var(--ds-illo-my) * 2px))",
      [motionConstants.REDUCED_MOTION]: "none",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "translate(calc(var(--ds-illo-mx) * 2.5px), calc(var(--ds-illo-my) * 2px + 8px))",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]:
          "translate(calc(var(--ds-illo-mx) * 2.5px), calc(var(--ds-illo-my) * 2px + 8px))",
        [motionConstants.REDUCED_MOTION]: "none",
      },
    },
  },
  plate: {
    strokeWidth: 1.4,
    strokeLinejoin: "round",
    transition: "stroke 500ms ease, fill 500ms ease, opacity 500ms ease",
  },
  configPlate: {
    fill: "var(--ds-illo-ink)",
    fillOpacity: 0.1,
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "var(--ds-illo-hue-soft)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "var(--ds-illo-hue-soft)",
      },
    },
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.55,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.55,
      },
    },
  },
  slotPlate: {
    fill: "var(--ds-illo-ink)",
    fillOpacity: 0.07,
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "var(--ds-illo-hue-soft)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "var(--ds-illo-hue-soft)",
      },
    },
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.7,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.7,
      },
    },
  },
  customPlate: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "var(--ds-illo-hue)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "var(--ds-illo-hue)",
      },
    },
    opacity: {
      default: 0.4,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
  },
  dial: {
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "var(--ds-illo-hue-soft)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "var(--ds-illo-hue-soft)",
      },
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.8,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.8,
      },
    },
    transition: "fill 500ms ease, opacity 500ms ease",
  },
  socket: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "var(--ds-illo-hue-soft)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "var(--ds-illo-hue-soft)",
      },
    },
    strokeWidth: 1.2,
    strokeDasharray: "4 4",
    strokeLinejoin: "round",
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.9,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.9,
      },
    },
    transition: "stroke 500ms ease, opacity 500ms ease",
  },
  partsRest: {
    fill: "url(#dsi-customization-parts-ink)",
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0,
      },
    },
    transition: "opacity 450ms ease",
  },
  partsAlive: {
    fill: "url(#dsi-customization-parts-hue)",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: "opacity 450ms ease",
  },
});
