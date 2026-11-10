import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { cornerTokens } from "../primitives/corner.stylex.ts";
import {
  border,
  controlHeight,
  controlSize,
  font,
  measure,
  opacity,
  rhythm,
} from "../tokens.stylex.ts";

/**
 * Shared form-field chrome that `TextField`, `Textarea`, and future choice
 * controls compose so their label / description / error / control box read
 * identically.
 *
 * Exported, like `button-shared.stylex`, so a consumer can tune the chrome
 * centrally — but `TextField` / `Textarea` stay the public entry point.
 *
 * The type comes from a `typeRole`, composed first beside each style:
 * `control` for the label, the control box and the affixes, `bodySmall` for
 * the description and the error text, the size of secondary text.
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

// A mask image: only its alpha matters. Percent-encode spaces and brackets
// so that the data URI survives CSS parsing.
const CLEAR_MASK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Cpath%20d='M4%204l8%208M12%204l-8%208'%20fill='none'%20stroke='black'%20stroke-width='2'%20stroke-linecap='round'/%3E%3C/svg%3E";

// Width reserved for a leading/trailing icon slot, in `em` so it tracks the
// control's font size. Shared between the input padding and the affix box.
const AFFIX_SLOT = "1.75em";

export const fieldStyles = stylex.create({
  root: {
    minInlineSize: 0,
  },
  label: {
    display: "inline-flex",
    alignItems: "baseline",
    fontWeight: font.weight_6,
    color: color.fg,
  },
  // Decorative asterisk via `::after`, so it never enters the label's text or
  // the control's accessible name — semantics come from the native
  // `required` attribute.
  labelRequired: {
    "::after": {
      content: '"*"',
      marginInlineStart: rhythm.inline,
      color: color.fgDanger,
    },
  },
  description: {
    color: color.fgMuted,
    maxInlineSize: measure.prose,
  },
  // A live region must be in the DOM before its text arrives, so the status
  // is never removed. While it is empty, it goes out of flow and takes no gap
  // in the field's stack.
  status: {
    position: { default: null, ":empty": "absolute" },
    color: color.fgMuted,
  },
  // Positioning context for the absolutely-placed affix slots and the dust
  // frame. Also carries the size variable so both the control and the affixes
  // read the same padding.
  controlAffixRow: {
    position: "relative",
    display: "flex",
    minInlineSize: 0,
  },
  box: {
    boxSizing: "border-box",
    borderStyle: "solid",
    borderWidth: border.size_1,
    borderColor: color.borderField,
    borderRadius: border.radius_3,
    cornerShape: "squircle",
    backgroundColor: color.bgSurface,
  },
  control: {
    appearance: "none",
    margin: 0,
    inlineSize: "100%",
    minInlineSize: 0,
    fontFamily: font.family,
    fontWeight: font.weight_4,
    lineHeight: font.lineHeight_4,
    color: color.fg,
    // A field with focus looks like a selected OptionCard. Hover gives no
    // fill while the field has focus, so the fill stays still under typing.
    backgroundColor: {
      default: color.bgSurface,
      ":focus": {
        default: color.bgSurfaceSelected,
        [pointer.canHover]: color.bgSurfaceSelected,
      },
      ":disabled": color.bgControlDisabled,
      [pointer.canHover]: {
        default: null,
        ":hover:not(:disabled, :focus)": color.bgSurfaceHover,
      },
    },
    // The keyboard-only ring layers on separately via `a11y.focusRing`.
    borderColor: {
      default: color.borderField,
      ":focus": color.borderSurfaceSelected,
    },
    paddingInline: fieldVars.paddingInline,
    cursor: { default: "text", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": opacity.disabled },
    "::placeholder": {
      color: color.fgMuted,
      opacity: 1,
    },
    // The clear button of a search field, which only WebKit and Blink draw.
    // The UA glyph has a fixed colour, so this paints a glyph that follows
    // the palette and the theme. Blink shows the button only on hover or
    // focus of a field that can change. WebKit shows it whenever the field
    // has a value, so a field that cannot change hides it here.
    "::-webkit-search-cancel-button": {
      appearance: "none",
      flexShrink: 0,
      inlineSize: controlSize._4,
      blockSize: controlSize._4,
      marginInlineStart: controlSize._2,
      backgroundColor: color.fgMuted,
      maskImage: `url("${CLEAR_MASK}")`,
      maskRepeat: "no-repeat",
      maskPosition: "center",
      maskSize: "100% 100%",
      cursor: "pointer",
      visibility: { default: null, ":is(:disabled, :read-only)": "hidden" },
    },
  },
  // Text that recedes, such as a done step of a checklist. It is at full
  // contrast while it has focus, so that the text a person edits is legible.
  controlMuted: {
    color: { default: color.fgMuted, ":focus": color.fg },
  },
  // A field that sits in a row of text, such as a step of a checklist: no
  // frame or fill until the pointer is over it or it has focus. Its text then
  // lines up with the text around it.
  ghost: {
    [fieldVars.paddingInline]: controlSize._2,
    backgroundColor: {
      default: "transparent",
      ":focus": color.bgSurfaceSelected,
      ":disabled": color.bgControlDisabled,
    },
    borderColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.borderField },
      ":focus": {
        default: color.borderSurfaceSelected,
        [pointer.canHover]: color.borderSurfaceSelected,
      },
      [pointer.canHover]: { default: null, ":disabled:hover": "transparent" },
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
  // Composed after `a11y.focusRing`. A text field matches `:focus-visible`
  // also when a pointer gives it focus, and its selected look already shows
  // that focus. Thus the ring shows only when the keyboard moves focus to it,
  // as on every other control. `pointerFocus` marks a pointer focus.
  keyboardRing: {
    outlineColor: {
      default: "transparent",
      ":focus-visible:not([data-pointer-focus])": color.borderAccent,
    },
  },
  // Composed after `a11y.focusRing` and `keyboardRing`, so its
  // danger-coloured outline and border win over the default accent ones.
  controlInvalid: {
    borderColor: {
      default: color.borderDanger,
      ":focus": color.borderDanger,
    },
    outlineColor: {
      default: "transparent",
      ":focus-visible:not([data-pointer-focus])": color.borderDanger,
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
    color: color.fgDanger,
  },
  // The frame that sheds dust while the visitor types. The dust takes its
  // fill, which is the colour of the border of a field with focus. It does
  // not show: `filter` hides it from the page but not from the effect layer.
  dust: {
    position: "absolute",
    inset: 0,
    borderRadius: border.radius_3,
    cornerShape: "squircle",
    backgroundColor: color.borderSurfaceSelected,
    filter: "opacity(0)",
    pointerEvents: "none",
  },
});

// Per-size horizontal padding — sets the shared variable so both the control
// padding and the affix offsets scale together. Also gives
// `corner.squircle_round` the height that its corners close at. Apply to the affix wrapper (or
// directly to the control when there is no wrapper).
export const fieldSizeInline = stylex.create({
  sm: {
    [fieldVars.paddingInline]: controlSize._3,
    [cornerTokens.height]: controlHeight.sm,
  },
  md: {
    [fieldVars.paddingInline]: controlSize._4,
    [cornerTokens.height]: controlHeight.md,
  },
  lg: {
    [fieldVars.paddingInline]: controlSize._5,
    [cornerTokens.height]: controlHeight.lg,
  },
});

// Per-size height of a single-line control. A minimum, so text that the
// visitor enlarges can still grow the box.
export const fieldSizeLine = stylex.create({
  sm: { paddingBlock: controlSize._0, minBlockSize: controlHeight.sm },
  md: { paddingBlock: controlSize._0, minBlockSize: controlHeight.md },
  lg: { paddingBlock: controlSize._0, minBlockSize: controlHeight.lg },
});

// Per-size vertical padding of a multiline control, set so that its first line
// is as tall as a single-line control of the same size.
export const fieldSizeBox = stylex.create({
  sm: {
    paddingBlock: `max(${controlSize._0}, calc((${controlHeight.sm} - 1lh) / 2 - ${border.size_1}))`,
  },
  md: {
    paddingBlock: `max(${controlSize._0}, calc((${controlHeight.md} - 1lh) / 2 - ${border.size_1}))`,
  },
  lg: {
    paddingBlock: `max(${controlSize._0}, calc((${controlHeight.lg} - 1lh) / 2 - ${border.size_1}))`,
  },
});
