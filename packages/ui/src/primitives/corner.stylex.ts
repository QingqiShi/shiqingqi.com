import * as stylex from "@stylexjs/stylex";
import { border } from "../tokens.stylex.ts";

// Rounded corners — radius paired with shape. Every fixed-radius corner in
// the system is a squircle: the radius token sizes it, this primitive supplies
// the shape, so a consumer composing one gets both without a global
// corner-shape rule. `radius_round` is the exception — a pill or a circle is
// round by identity, so it pins circular caps. Member names mirror
// `border.radius_*`. The radius tokens carry a .6 fallback value, so a browser
// without corner-shape draws a circular arc that reads the same.
export const corner = stylex.create({
  radius_1: { borderRadius: border.radius_1, cornerShape: "squircle" },
  radius_2: { borderRadius: border.radius_2, cornerShape: "squircle" },
  radius_3: { borderRadius: border.radius_3, cornerShape: "squircle" },
  radius_4: { borderRadius: border.radius_4, cornerShape: "squircle" },
  radius_5: { borderRadius: border.radius_5, cornerShape: "squircle" },
  radius_round: { borderRadius: border.radius_round, cornerShape: "round" },
});
