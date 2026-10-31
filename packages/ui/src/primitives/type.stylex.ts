import * as stylex from "@stylexjs/stylex";
import { font, latinType } from "../tokens.stylex.ts";

/**
 * Type roles: each one names a job for a piece of text and sets the four
 * properties that job needs together — size, line height, weight and
 * tracking. Compose one through the `css` prop, first, so a later style can
 * still change the weight: `css={[typeRole.label, styles.navItem]}`.
 *
 * Every heading role also balances its lines, on any element, so a two-line
 * title does not leave one word on its last line.
 *
 * - `display` … `h4` — headings, from the largest to an item's title.
 * - `body`, `bodySmall` — running text; `bodySmall` for secondary text.
 * - `label` — a short line that names something: a field, a group, a meta row.
 * - `caption`, `overline` — the smallest text; `overline` sits above a title
 *   or a group, in sentence case.
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
    lineHeight: latinType.lineHeightDisplay,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingDisplay,
    textWrap: "balance",
  },
  subDisplay: {
    fontSize: font.uiSubDisplay,
    lineHeight: latinType.lineHeightDisplay,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingDisplay,
    textWrap: "balance",
  },
  h1: {
    fontSize: font.uiHeading1,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
  h2: {
    fontSize: font.uiHeading2,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
  h3: {
    fontSize: font.uiHeading3,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
  h4: {
    fontSize: font.uiBody,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
  body: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeightBody,
    fontWeight: font.weight_4,
    letterSpacing: latinType.trackingBody,
  },
  bodySmall: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeightBody,
    fontWeight: font.weight_4,
    letterSpacing: latinType.trackingBody,
  },
  label: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_4,
    letterSpacing: latinType.trackingBody,
  },
  caption: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_4,
    letterSpacing: latinType.trackingBody,
  },
  overline: {
    fontSize: font.uiOverline,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_4,
    letterSpacing: font.trackingNormal,
  },
  control: {
    fontSize: font.uiControl,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_4,
    letterSpacing: latinType.trackingBody,
  },
  controlCaption: {
    fontSize: font.uiControlCaption,
    lineHeight: font.lineHeight_3,
    fontWeight: font.weight_4,
    letterSpacing: latinType.trackingBody,
  },
  fluidDisplay: {
    fontSize: font.vpDisplay,
    lineHeight: latinType.lineHeightDisplay,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingDisplay,
    textWrap: "balance",
  },
  fluidH1: {
    fontSize: font.vpHeading1,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
  fluidH2: {
    fontSize: font.vpHeading2,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
  fluidH3: {
    fontSize: font.vpHeading3,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
  fluidLead: {
    fontSize: font.vpSubDisplay,
    lineHeight: font.lineHeightBody,
    fontWeight: font.weight_4,
    letterSpacing: latinType.trackingBody,
  },
  cardTitle: {
    fontSize: font.cqTitle,
    lineHeight: latinType.lineHeightHeading,
    fontWeight: font.weight_6,
    letterSpacing: latinType.trackingHeading,
    textWrap: "balance",
  },
});

/**
 * Changes that go on top of any type role.
 *
 * - `numeric` — figures of one width, so numbers line up in a column and a
 *   value that changes does not move. Haffer already uses lining figures, so
 *   only `tabular-nums` is set.
 */
export const typeModifier = stylex.create({
  numeric: {
    fontVariantNumeric: "tabular-nums",
  },
});
