"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePressHandlers } from "../hooks/use-press-handlers.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { border, color, controlSize, font, opacity } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { sharedStyles } from "./button-shared.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";
import { Spinner } from "./spinner.tsx";

type ButtonSize = "sm" | "md" | "lg";
type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

interface ButtonBaseProps extends Omit<
  ComponentProps<"button">,
  "children" | "className" | "style"
> {
  /**
   * Lifts the button onto a bright surface, brightening further on hover.
   *
   * It paints its own fill, so it overrides whatever `variant` set — pairing it
   * with `outline` or `ghost` cancels the very chrome those drop. Pick one.
   */
  bright?: boolean;
  /** Below the `md` breakpoint, collapses to the icon and hides the label. */
  hideLabelOnMobile?: boolean;
  /** Decorative leading icon. Rendered `aria-hidden`; never the accessible name. */
  icon?: ReactNode;
  /**
   * Height scale via `controlSize`. Defaults to `"md"` (the app's standard
   * control height). `"lg"` is for prominent CTAs; `"sm"` best suits
   * pointer-dense desktop toolbars — like the `controlSize` scale, every size
   * renders taller below the `md` breakpoint, but `"sm"` still falls short of
   * the 44px WCAG 2.5.8 touch target.
   */
  size?: ButtonSize;
  /**
   * Toggles the active highlight AND emits `aria-pressed` — use for toggle
   * buttons. For a non-toggle CTA that only wants the highlight, use
   * `variant="primary"`.
   */
  isActive?: boolean;
  /**
   * Visual variant. Omit for the default raised surface button.
   *
   * - `"primary"` applies the same active highlight style but does NOT emit
   *   `aria-pressed` — use it for one-shot CTAs, not toggles.
   * - `"outline"` drops the fill and shadow for a hairline border, for a
   *   secondary action sitting beside a primary one.
   * - `"ghost"` drops the chrome entirely, for dense toolbars and inline
   *   affordances where a full button would shout.
   * - `"danger"` fills with the danger intent, for destructive confirmations.
   *   Reserve it for the action that actually destroys something.
   */
  variant?: ButtonVariant;
  /**
   * Marks the button busy: swaps the icon for a spinner, announces `aria-busy`,
   * and blocks activation so the action can't be fired twice. The block is
   * `aria-disabled` plus a click guard rather than the native `disabled`
   * attribute — a natively disabled button drops out of the tab order, which
   * would throw focus to the document the instant the user activated it and
   * leave the `aria-busy` change unannounced.
   *
   * Keep the label as it is — a button that changes width mid-submit shifts
   * everything around it.
   */
  loading?: boolean;
  /** Id applied to the label span, e.g. to wire an external `aria-labelledby`. */
  labelId?: string;
  /** StyleX styles merged over the button's own — the config-layer escape hatch. */
  css?: StyleProp;
}

/**
 * A button needs an accessible name (WCAG 4.1.2). When there is no visible
 * `children` to name it, `aria-label` or `aria-labelledby` is required at the
 * type level so icon-only buttons cannot ship unlabelled.
 */
type ButtonProps = ButtonBaseProps &
  (
    | { children: ReactNode }
    | ({ children?: undefined } & (
        | { "aria-label": string; "aria-labelledby"?: undefined }
        | { "aria-labelledby": string; "aria-label"?: undefined }
      ))
  );

export function Button({
  bright,
  children,
  css,
  disabled,
  hideLabelOnMobile,
  icon,
  isActive,
  labelId,
  loading,
  onClick,
  onKeyDown,
  ref: forwardedRef,
  size = "md",
  type = "button",
  variant,
  "aria-busy": ariaBusy,
  "aria-disabled": ariaDisabled,
  ...restProps
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Keep the internal ref (used by the press-animation hook) and also forward
  // to a caller-supplied ref, which `extends ComponentProps<"button">` allows.
  const setButtonRef = mergeRefs(buttonRef, forwardedRef);

  const isLoading = loading === true;
  // Inert either way as far as the press animation goes — neither a disabled
  // nor a busy button should animate a press. Only `disabled` reaches the DOM
  // attribute; see the `loading` prop docs for why busy stays focusable.
  const isInert = disabled === true || isLoading;
  // Truthiness rather than a null check, so the `icon={count && <Icon />}` idiom
  // still renders nothing when `count` is `0` — `0` is a valid ReactNode and
  // would otherwise paint a stray icon.
  const hasIcon = !!icon;
  // Two ways to show the spinner, both of which leave the button exactly as wide
  // as it was. With an icon it takes the icon's place. Without one there is no
  // icon box to borrow, and adding one would widen the button by the box plus
  // its gap — so the spinner is laid over the label instead, and the label is
  // hidden with `visibility` so it goes on reserving its width.
  const swapsIconForSpinner = isLoading && hasIcon;
  const overlaysSpinner = isLoading && !hasIcon;

  // `aria-disabled` is advisory: it stops nothing on its own. Pointer events are
  // off while busy (see `styles.busy`), but a focused button still fires a click
  // from Enter or Space, so activation has to be blocked here as well — else a
  // busy submit button would still submit its form.
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  // Keyboard events reach a busy button too, and `pointerEvents` can't stop
  // them. A caller's handler must not run while the action is in flight.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isLoading) return;
    onKeyDown?.(event);
  }

  const { isPressed, releasedOutside, pressedCss, handlers } = usePressHandlers(
    {
      disabled: isInert,
      targetRef: buttonRef,
      ...restProps,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
    },
  );

  return (
    <button
      aria-pressed={isActive}
      {...restProps}
      ref={setButtonRef}
      type={type}
      disabled={disabled}
      // Both fall back to the caller's own value rather than `undefined`: these
      // are written after `{...restProps}`, so hard-coding `undefined` would
      // strip an `aria-busy` a caller set themselves.
      aria-disabled={isLoading ? true : ariaDisabled}
      aria-busy={isLoading ? true : ariaBusy}
      css={[
        sharedStyles.base,
        a11y.focusRing,
        styles.button,
        sizeStyles[size],
        variant !== undefined &&
          variant !== "primary" &&
          variantStyles[variant],
        hasIcon &&
          !!children &&
          (hideLabelOnMobile
            ? sharedStyles.hasIconHideLabelBelowMd
            : sharedStyles.hasIcon),
        bright && sharedStyles.bright,
        // `variantStyles` re-points tokens, but `active` and `bright` set a
        // literal `backgroundColor` that wins over them. `danger` is the one
        // clash that matters — a destructive button repainted brand-accent the
        // moment it toggles on stops reading as destructive — so it keeps its
        // own fill and `isActive` shows through `aria-pressed` alone.
        (isActive === true || variant === "primary") &&
          variant !== "danger" &&
          sharedStyles.active,
        isLoading && styles.busy,
        isPressed && !isInert && sharedStyles.pressed,
        isPressed && !isInert && bright && sharedStyles.pressedBright,
        releasedOutside && sharedStyles.releasedOutside,
        css,
        pressedCss,
      ]}
      {...handlers}
    >
      {hasIcon && (
        <span css={sharedStyles.icon} aria-hidden>
          {/* Decorative: `aria-busy` on the button already announces the state,
              so a labelled spinner would say it twice. `size="inline"` is the
              `1em` step, so the spinner occupies exactly the box the icon it
              replaces did and the button can't change width mid-submit. */}
          {swapsIconForSpinner ? <Spinner size="inline" aria-hidden /> : icon}
        </span>
      )}
      {children && (
        <span
          css={[
            sharedStyles.childrenContainer,
            hideLabelOnMobile && sharedStyles.hideLabelBelowMd,
            overlaysSpinner && styles.labelHidden,
          ]}
          id={labelId}
        >
          {children}
        </span>
      )}
      {overlaysSpinner && (
        <span css={styles.spinnerOverlay} aria-hidden>
          <Spinner size="inline" aria-hidden />
        </span>
      )}
    </button>
  );
}

const styles = stylex.create({
  button: {
    // Anchors the busy spinner overlay, which has to sit outside the flow so it
    // doesn't change the button's width.
    position: "relative",
    // Button-specific resets
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    fontSize: font.uiControl,
    fontWeight: font.weight_5,
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Button-specific styles. Height flows through the shared `buttonTokens`
    // knob, which the `size` variants below set (and a container such as
    // AnchorButtonGroup can likewise override to shrink grouped buttons).
    minHeight: buttonTokens.height,
    color: buttonTokens.color,
    backgroundColor: {
      default: buttonTokens.backgroundColor,
      ":hover": buttonTokens.backgroundColorHover,
      ":disabled:hover": buttonTokens.backgroundColorDisabledHover,
    },
    opacity: {
      default: null,
      ":disabled": opacity.disabled,
    },
  },
  // A busy button stays natively enabled so it can keep focus, which means none
  // of the `:disabled` rules above fire — the dimming has to be applied
  // directly, and `pointerEvents` stands in for what `disabled` did to the
  // pointer: no hover lift on a control that can't be used, and no click,
  // mousedown, dblclick or pointerdown reaching a caller's handler. Keyboard
  // events still arrive, so the component guards those in JS. There is no
  // `cursor: not-allowed` because a `pointer-events: none` element never gets
  // to set the cursor — the arrow it falls back to is what a natively disabled
  // button shows anyway.
  busy: {
    opacity: opacity.disabled,
    pointerEvents: "none",
  },
  // Keeps the label's box, and so the button's width, while the spinner sits on
  // top of it. `visibility` rather than `opacity` so the text is out of the
  // accessibility tree too — `aria-busy` is what should be announced.
  labelHidden: {
    visibility: "hidden",
  },
  spinnerOverlay: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    blockSize: "100%",
  },
});

// Each variant re-points the shared `buttonTokens` knobs rather than declaring
// its own colours, so the skin travels to anything else reading them (the app's
// anchor button, a grouped cluster) exactly as the defaults do.
//
// `"primary"` is deliberately absent: it reuses `sharedStyles.active`, the same
// highlight `isActive` paints, so a toggle in its on state and a primary CTA
// cannot drift apart.
const variantStyles = stylex.create({
  outline: {
    [buttonTokens.backgroundColor]: "transparent",
    [buttonTokens.backgroundColorHover]: color.bgInteractiveHover,
    [buttonTokens.backgroundColorDisabledHover]: "transparent",
    [buttonTokens.boxShadow]: "none",
    // Border-box so the hairline sits inside the height the size step set,
    // keeping an outline button the same height as its filled neighbour.
    boxSizing: "border-box",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
  },
  ghost: {
    [buttonTokens.backgroundColor]: "transparent",
    [buttonTokens.backgroundColorHover]: color.bgInteractiveHover,
    [buttonTokens.backgroundColorDisabledHover]: "transparent",
    [buttonTokens.boxShadow]: "none",
  },
  danger: {
    [buttonTokens.backgroundColor]: color.danger,
    [buttonTokens.backgroundColorHover]: color.dangerHover,
    [buttonTokens.backgroundColorDisabledHover]: color.danger,
    [buttonTokens.color]: color.dangerOn,
  },
});

// Each size drives the shared `buttonTokens.height` knob (read by
// `styles.button.minHeight`) and scales the label size and padding to match.
// `md` reproduces the historic default, so callsites that omit `size` are
// pixel-identical. Padding/gap here override the `sharedStyles.base` values.
const sizeStyles = stylex.create({
  sm: {
    [buttonTokens.height]: controlSize._8,
    fontSize: font.uiBodySmall,
    gap: controlSize._1,
    paddingBlock: controlSize._0,
    paddingInline: controlSize._2,
  },
  md: {
    [buttonTokens.height]: controlSize._9,
  },
  lg: {
    [buttonTokens.height]: controlSize._10,
    fontSize: font.uiHeading2,
    paddingBlock: controlSize._2,
    paddingInline: controlSize._4,
  },
});
