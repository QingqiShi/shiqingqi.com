import * as stylex from "@stylexjs/stylex";
import { border, color, controlSize, font, space } from "../tokens.stylex.ts";

/**
 * Shared form-field chrome. `TextField`, `Textarea`, and future choice controls
 * compose these objects so the label / description / error / control box read
 * identically across the system. Sizing flows through {@link fieldVars} so a
 * single set of size styles drives both the padding and the adornment offsets.
 *
 * This is an internal-but-themable module (mirroring `button-shared.stylex`):
 * it is exported so a consumer can tune the field chrome centrally, but the
 * public entry point is the `TextField` / `Textarea` components.
 */

/**
 * Horizontal padding of the control box, published as a CSS variable so
 * adornment-aware padding modifiers (`hasLeadingAffix` / `hasTrailingAffix`)
 * and the absolutely-positioned affix slots can extend it without hard-coding
 * the per-size value. Set it via {@link fieldSizeInline} on an ancestor of the
 * control (or on the control itself when there is no adornment wrapper).
 */
export const fieldVars = stylex.defineVars({
  paddingInline: controlSize._4,
});

// Width reserved for a leading/trailing icon slot, in `em` so it tracks the
// control's font size. Shared between the input padding and the affix box.
const AFFIX_SLOT = "1.75em";

export const fieldStyles = stylex.create({
  // Vertical stack: label, description, control, error.
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    minInlineSize: 0,
  },
  label: {
    display: "inline-flex",
    alignItems: "baseline",
    fontSize: font.uiControl,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    color: color.textMain,
  },
  // Decorative "required" asterisk rendered via `::after` so it never lands in
  // the label's text content or the control's accessible name — the semantics
  // come from the native `required` attribute on the control.
  labelRequired: {
    "::after": {
      content: '"*"',
      marginInlineStart: space._00,
      color: color.dangerText,
    },
  },
  description: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    color: color.textMuted,
  },
  // Positioning context for the absolutely-placed affix slots. Also carries the
  // size variable so both the control and the affixes read the same padding.
  controlAffixRow: {
    position: "relative",
    display: "flex",
    minInlineSize: 0,
  },
  // The control box itself — applied directly to `<input>` / `<textarea>`.
  control: {
    appearance: "none",
    margin: 0,
    boxSizing: "border-box",
    inlineSize: "100%",
    minInlineSize: 0,
    fontFamily: font.family,
    fontSize: font.uiControl,
    lineHeight: font.lineHeight_4,
    color: color.textMain,
    backgroundColor: {
      default: color.bgInteractiveRest,
      ":disabled": color.bgInteractiveDisabled,
    },
    borderStyle: "solid",
    borderWidth: border.size_1,
    // Neutral at rest, lifts on hover, accents on any focus (the "active field"
    // affordance); the keyboard-only ring is layered on via `a11y.focusRing`.
    // A disabled control keeps the resting border even under hover (`:hover`
    // still matches disabled elements), so the compound selector pins it.
    borderColor: {
      default: color.neutralBorder,
      ":hover": color.neutral,
      ":focus": color.accent,
      ":disabled:hover": color.neutralBorder,
    },
    borderRadius: border.radius_2,
    paddingInline: fieldVars.paddingInline,
    cursor: { default: "text", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": 0.6 },
    "::placeholder": {
      color: color.textSubtle,
      opacity: 1,
    },
  },
  // Multi-line control tweaks for `<textarea>`.
  multiline: {
    resize: "vertical",
    blockSize: "auto",
  },
  // Disable manual resize + hide the scrollbar while a textarea auto-grows.
  noResize: {
    resize: "none",
    overflow: "hidden",
  },
  // Invalid treatment. Composed after `a11y.focusRing`, so its danger-coloured
  // `:focus-visible` outline and border win over the default accent ones.
  controlInvalid: {
    borderColor: {
      default: color.dangerBorder,
      ":hover": color.danger,
      ":focus": color.danger,
    },
    outlineColor: { default: "transparent", ":focus-visible": color.danger },
  },
  hasLeadingAffix: {
    paddingInlineStart: `calc(${fieldVars.paddingInline} + ${AFFIX_SLOT})`,
  },
  hasTrailingAffix: {
    paddingInlineEnd: `calc(${fieldVars.paddingInline} + ${AFFIX_SLOT})`,
  },
  // Absolutely-positioned decorative icon slot, vertically centred over the
  // control's padding gutter. `em` sizing keeps it aligned with the reserved
  // padding above.
  affix: {
    position: "absolute",
    insetBlockStart: 0,
    insetBlockEnd: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: AFFIX_SLOT,
    fontSize: font.uiControl,
    color: color.textSubtle,
    pointerEvents: "none",
  },
  affixStart: {
    insetInlineStart: fieldVars.paddingInline,
  },
  affixEnd: {
    insetInlineEnd: fieldVars.paddingInline,
  },
  errorText: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    color: color.dangerText,
  },
});

// Per-size horizontal padding — sets the shared variable so both the control
// padding and the affix offsets scale together. Apply to the affix wrapper (or
// directly to the control when there is no wrapper).
export const fieldSizeInline = stylex.create({
  sm: { [fieldVars.paddingInline]: controlSize._3 },
  md: { [fieldVars.paddingInline]: controlSize._4 },
  lg: { [fieldVars.paddingInline]: controlSize._5 },
});

// Per-size vertical rhythm — applied directly to the control element.
export const fieldSizeBox = stylex.create({
  sm: { paddingBlock: controlSize._2, minBlockSize: controlSize._8 },
  md: { paddingBlock: controlSize._3, minBlockSize: controlSize._9 },
  lg: { paddingBlock: controlSize._4, minBlockSize: controlSize._9 },
});
