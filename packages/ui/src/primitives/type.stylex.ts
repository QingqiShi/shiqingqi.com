import * as stylex from "@stylexjs/stylex";
import { font } from "../tokens.stylex.ts";

/**
 * Type roles: each one names a job for a piece of text and sets the four
 * properties that job needs together — size, line height, weight and
 * tracking. Compose one through the `css` prop, first, so a later style can
 * still change the weight: `css={[typeRole.label, styles.navItem]}`.
 *
 * - `display` … `h4` — headings, from the largest to an item's title.
 * - `body`, `bodySmall` — running text; `bodySmall` for secondary text.
 * - `label` — a short line that names something: a field, a group, a meta row.
 * - `caption`, `overline` — the smallest text; `overline` is uppercase.
 * - `control`, `controlCaption` — text inside a control. They step down at
 *   `md` together with `controlSize`.
 * - `fluid*` — headings and the lead of a landing page, which grow with the
 *   viewport.
 * - `cardTitle` — the title of a card that appears at many widths. It grows
 *   with the nearest `inline-size` container.
 */
export const typeRole = stylex.create({
  display: {
    fontSize: font.uiDisplay,
    lineHeight: font.lineHeight_1,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
  },
  subDisplay: {
    fontSize: font.uiSubDisplay,
    lineHeight: font.lineHeight_1,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
  },
  h1: {
    fontSize: font.uiHeading1,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingSnug,
  },
  h2: {
    fontSize: font.uiHeading2,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingNormal,
  },
  h3: {
    fontSize: font.uiHeading3,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingNormal,
  },
  h4: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingNormal,
  },
  body: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
    fontWeight: font.weight_4,
    letterSpacing: font.trackingNormal,
  },
  bodySmall: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    fontWeight: font.weight_4,
    letterSpacing: font.trackingNormal,
  },
  label: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_5,
    letterSpacing: font.trackingNormal,
  },
  caption: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_4,
    letterSpacing: font.trackingNormal,
  },
  overline: {
    fontSize: font.uiOverline,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
  },
  control: {
    fontSize: font.uiControl,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_5,
    letterSpacing: font.trackingNormal,
  },
  controlCaption: {
    fontSize: font.uiControlCaption,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_4,
    letterSpacing: font.trackingNormal,
  },
  fluidDisplay: {
    fontSize: font.vpDisplay,
    lineHeight: font.lineHeight_1,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
  },
  fluidH1: {
    fontSize: font.vpHeading1,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingNormal,
  },
  fluidH2: {
    fontSize: font.vpHeading2,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingNormal,
  },
  fluidH3: {
    fontSize: font.vpHeading3,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingNormal,
  },
  fluidLead: {
    fontSize: font.vpSubDisplay,
    lineHeight: font.lineHeight_4,
    fontWeight: font.weight_4,
    letterSpacing: font.trackingNormal,
  },
  cardTitle: {
    fontSize: font.cqTitle,
    lineHeight: font.lineHeight_2,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingNormal,
  },
});

/**
 * Changes that go on top of any type role.
 *
 * - `numeric` — figures of one width, so numbers line up in a column and a
 *   value that changes does not move. Inter already uses lining figures, so
 *   only `tabular-nums` is set.
 */
export const typeModifier = stylex.create({
  numeric: {
    fontVariantNumeric: "tabular-nums",
  },
});
