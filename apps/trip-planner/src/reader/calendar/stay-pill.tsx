"use client";

import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import * as stylex from "@stylexjs/stylex";
import { blue } from "@tuja/ui/palette/blue.stylex";
import { green } from "@tuja/ui/palette/green.stylex";
import { indigo } from "@tuja/ui/palette/indigo.stylex";
import { orange } from "@tuja/ui/palette/orange.stylex";
import { pink } from "@tuja/ui/palette/pink.stylex";
import { purple } from "@tuja/ui/palette/purple.stylex";
import { teal } from "@tuja/ui/palette/teal.stylex";
import { yellow } from "@tuja/ui/palette/yellow.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { TripText } from "../trip-text.tsx";
import { Glyph } from "./glyph.tsx";
import type { TripStay } from "./trip-stays.ts";

/**
 * A stay as a pill in the colour of that stay. `text` is trip text. With no
 * `text` it shows the bed alone, and a screen reader gets `name`.
 */
export function StayPill({
  stay,
  text,
  css,
}: {
  stay: TripStay;
  text: string | null;
  css?: StyleProp;
}) {
  return (
    <span
      css={[
        row.inline,
        corner.radius_round,
        styles.pill,
        pillStyles[hueOf(stay)],
        css,
      ]}
    >
      <Glyph size="bodySmall">
        <BedIcon weight="bold" />
      </Glyph>
      {text === null ? (
        <span css={a11y.srOnly}>
          <TripText>{stay.name}</TripText>
        </span>
      ) : (
        <span css={[typeRole.caption, truncate.base, styles.pillText]}>
          <TripText>{text}</TripText>
        </span>
      )}
    </span>
  );
}

/** A length of the agenda's rail in the colour of a stay, or clear. */
export function StayRail({
  stay,
  grow = false,
}: {
  stay: TripStay | undefined;
  grow?: boolean;
}) {
  return (
    <span
      css={[
        styles.rail,
        grow && styles.railGrow,
        stay ? railStyles[hueOf(stay)] : null,
      ]}
    />
  );
}

// Neighbours in this order differ in hue, so two stays in a row tell apart.
const HUES = [
  "blue",
  "teal",
  "orange",
  "purple",
  "green",
  "pink",
  "indigo",
  "yellow",
] as const;

function hueOf(stay: TripStay) {
  return HUES[stay.order % HUES.length];
}

const pillStyles = stylex.create({
  blue: {
    backgroundColor: `light-dark(${blue._92}, ${blue._20})`,
    color: `light-dark(${blue._30}, ${blue._87})`,
    borderColor: `light-dark(${blue._80}, ${blue._30})`,
  },
  teal: {
    backgroundColor: `light-dark(${teal._92}, ${teal._20})`,
    color: `light-dark(${teal._30}, ${teal._87})`,
    borderColor: `light-dark(${teal._80}, ${teal._30})`,
  },
  orange: {
    backgroundColor: `light-dark(${orange._92}, ${orange._20})`,
    color: `light-dark(${orange._30}, ${orange._87})`,
    borderColor: `light-dark(${orange._80}, ${orange._30})`,
  },
  purple: {
    backgroundColor: `light-dark(${purple._92}, ${purple._20})`,
    color: `light-dark(${purple._30}, ${purple._87})`,
    borderColor: `light-dark(${purple._80}, ${purple._30})`,
  },
  green: {
    backgroundColor: `light-dark(${green._92}, ${green._20})`,
    color: `light-dark(${green._30}, ${green._87})`,
    borderColor: `light-dark(${green._80}, ${green._30})`,
  },
  pink: {
    backgroundColor: `light-dark(${pink._92}, ${pink._20})`,
    color: `light-dark(${pink._30}, ${pink._87})`,
    borderColor: `light-dark(${pink._80}, ${pink._30})`,
  },
  indigo: {
    backgroundColor: `light-dark(${indigo._92}, ${indigo._20})`,
    color: `light-dark(${indigo._30}, ${indigo._87})`,
    borderColor: `light-dark(${indigo._80}, ${indigo._30})`,
  },
  yellow: {
    backgroundColor: `light-dark(${yellow._92}, ${yellow._20})`,
    color: `light-dark(${yellow._30}, ${yellow._87})`,
    borderColor: `light-dark(${yellow._80}, ${yellow._30})`,
  },
});

const railStyles = stylex.create({
  blue: { backgroundColor: `light-dark(${blue._70}, ${blue._50})` },
  teal: { backgroundColor: `light-dark(${teal._70}, ${teal._50})` },
  orange: { backgroundColor: `light-dark(${orange._70}, ${orange._50})` },
  purple: { backgroundColor: `light-dark(${purple._70}, ${purple._50})` },
  green: { backgroundColor: `light-dark(${green._70}, ${green._50})` },
  pink: { backgroundColor: `light-dark(${pink._70}, ${pink._50})` },
  indigo: { backgroundColor: `light-dark(${indigo._70}, ${indigo._50})` },
  yellow: { backgroundColor: `light-dark(${yellow._70}, ${yellow._50})` },
});

const styles = stylex.create({
  pill: {
    minWidth: 0,
    height: space._6,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
  },
  // The text keeps the colour of the pill, which a `Text` would replace.
  pillText: { fontWeight: font.weight_6 },
  rail: {
    display: "block",
    flexShrink: 0,
    width: space._0,
    height: space._4,
  },
  railGrow: { flexGrow: 1 },
});
