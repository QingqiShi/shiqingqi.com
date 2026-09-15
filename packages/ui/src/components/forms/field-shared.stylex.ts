import * as stylex from "@stylexjs/stylex";
import {
  border,
  color,
  controlSize,
  font,
  opacity,
  space,
} from "../../tokens.stylex.ts";

/**
 * Shared form-field chrome that `TextField`, `Textarea`, and future choice
 * controls compose so their label / description / error / control box read
 * identically.
 *
 * Exported, like `button-shared.stylex`, so a consumer can tune the chrome
 * centrally — but `TextField` / `Textarea` stay the public entry point.
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
    color: color.fg,
  },
  // Decorative asterisk via `::after`, so it never enters the label's text or
  // the control's accessible name — semantics come from the native
  // `required` attribute.
  labelRequired: {
    "::after": {
      content: '"*"',
      marginInlineStart: space._00,
      color: color.fgDanger,
    },
  },
  description: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    color: color.fgMuted,
  },
  // Positioning context for the absolutely-placed affix slots. Also carries the
  // size variable so both the control and the affixes read the same padding.
  controlAffixRow: {
    position: "relative",
    display: "flex",
    minInlineSize: 0,
  },
  control: {
    appearance: "none",
    margin: 0,
    boxSizing: "border-box",
    inlineSize: "100%",
    minInlineSize: 0,
    fontFamily: font.family,
    fontSize: font.uiControl,
    lineHeight: font.lineHeight_4,
    color: color.fg,
    backgroundColor: {
      default: color.bgControl,
      ":disabled": color.bgControlDisabled,
    },
    borderStyle: "solid",
    borderWidth: border.size_1,
    // The keyboard-only ring layers on separately via `a11y.focusRing`.
    borderColor: { default: color.border, ":focus": color.borderAccent },
    borderRadius: border.radius_2,
    cornerShape: "squircle",
    paddingInline: fieldVars.paddingInline,
    cursor: { default: "text", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": opacity.disabled },
    "::placeholder": {
      color: color.fgMuted,
      opacity: 1,
    },
  },
  multiline: {
    resize: "vertical",
    blockSize: "auto",
  },
  // Disable manual resize + hide the scrollbar while a textarea auto-grows.
  noResize: {
    resize: "none",
    overflow: "hidden",
  },
  // Composed after `a11y.focusRing`, so its danger-coloured `:focus-visible`
  // outline and border win over the default accent ones.
  controlInvalid: {
    borderColor: {
      default: color.borderDanger,
      ":hover": color.borderDanger,
      ":focus": color.borderDanger,
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderDanger,
    },
  },
  hasLeadingAffix: {
    paddingInlineStart: `calc(${fieldVars.paddingInline} + ${AFFIX_SLOT})`,
  },
  hasTrailingAffix: {
    paddingInlineEnd: `calc(${fieldVars.paddingInline} + ${AFFIX_SLOT})`,
  },
  // `em` sizing keeps it aligned with the padding reserved above.
  affix: {
    position: "absolute",
    insetBlockStart: 0,
    insetBlockEnd: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: AFFIX_SLOT,
    fontSize: font.uiControl,
    color: color.fgMuted,
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
    color: color.fgDanger,
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
