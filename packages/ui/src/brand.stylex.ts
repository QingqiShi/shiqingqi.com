import * as stylex from "@stylexjs/stylex";

// What a brand is allowed to move. Nine dials and nothing else — the visual
// language holds still while a brand varies its expression.
//
// These are the raw settings, overridden with `stylex.createTheme`. Nothing
// consumes them directly: components read `brandDerived` below, which is where
// the clamping happens. Three of the nine stop working as dials at the ends, so
// a brand that sets a raw value out of range gets the end of the range rather
// than a broken control.
export const brand = stylex.defineVars({
  // Multiplier on the radius scale.
  radius: stylex.types.number(1),
  // Multiplier on the space scale.
  density: stylex.types.number(1),
  // How far a border sits from what it borders, as a mix percentage.
  borderTint: "10%",
  // Alpha of a translucent surface.
  translucency: stylex.types.number(0.8),
  // Spacing between texture marks.
  textureGap: "6px",
  // Direction a wash drifts.
  washAngle: "165deg",
  // One of `easing.springQuiet` / `easing.spring` / `easing.springLively`.
  spring:
    "linear(0,0.094,0.302,0.539,0.752,0.914,1.02,1.076,1.094,1.089,1.07,1.048,1.027,1.011,1,0.993,1)",
  fontFamily: "Inter,Inter-fallback,sans-serif",
  // Source colour the accent ramp is generated from. Changing it is a codegen
  // run, not a runtime swap, so it is here to be named rather than to be read.
  accentSource: "#7b61ff",
});

// The dials after clamping, which is what a component consumes.
//
// `radiusScale` and `densityScale` clamp the multiplier; a radius additionally
// needs `min(…, 50%)` at the callsite, because half a control's height is where
// a radius stops being more of the same look and becomes a pill, and only the
// callsite knows the height. Density stops where the gap would fall below about
// 4px, which on the smallest step of the space scale is a 0.75 multiplier.
// `borderTint` is clamped at both ends: too close to what it borders and there
// is no edge at all, far enough to notice and it reads as a heavy line.
export const brandDerived = stylex.defineVars({
  radiusScale: `clamp(0, ${brand.radius}, 1.5)`,
  densityScale: `clamp(0.75, ${brand.density}, 1.5)`,
  borderTint: `clamp(4%, ${brand.borderTint}, 18%)`,
  translucency: `clamp(0.5, ${brand.translucency}, 1)`,
});
