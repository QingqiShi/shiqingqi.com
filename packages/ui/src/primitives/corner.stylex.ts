import * as stylex from "@stylexjs/stylex";
import { border, constants, controlSize } from "../tokens.stylex.ts";

/** The height `corner.squircle_round` closes its corners at. */
export const cornerTokens = stylex.defineVars({
  height: controlSize._9,
});

// Rounded corners — radius paired with shape. Every fixed-radius corner in
// the system is a squircle: the radius token sizes it, this primitive supplies
// the shape, so a consumer composing one gets both without a global
// corner-shape rule. `radius_round` is the exception — a pill or a circle is
// round by identity, so it pins circular caps; `squircle_round` takes the same
// full-round radius as a squircle, which closes at half `cornerTokens.height`.
// Member names mirror `border.radius_*`. The radius tokens carry a .6 fallback
// value, so a browser without corner-shape draws a circular arc that reads the
// same. At the full-round radius that arc would make a pill, so
// `squircle_round` falls back to .3 of the height and stays a rounded box.
export const corner = stylex.create({
  radius_1: { borderRadius: border.radius_1, cornerShape: "squircle" },
  radius_2: { borderRadius: border.radius_2, cornerShape: "squircle" },
  radius_3: { borderRadius: border.radius_3, cornerShape: "squircle" },
  radius_4: { borderRadius: border.radius_4, cornerShape: "squircle" },
  radius_5: { borderRadius: border.radius_5, cornerShape: "squircle" },
  radius_round: { borderRadius: border.radius_round, cornerShape: "round" },
  squircle_round: {
    borderRadius: {
      default: border.radius_round,
      [constants.NO_CORNER_SHAPE]: `min(${border.radius_round}, calc(${cornerTokens.height} * .3))`,
    },
    cornerShape: "squircle",
  },
});
