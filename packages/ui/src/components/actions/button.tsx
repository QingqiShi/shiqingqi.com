"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePressHandlers } from "../../hooks/use-press-handlers.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import {
  border,
  color,
  controlSize,
  font,
  opacity,
} from "../../tokens.stylex.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";
import { Spinner } from "../feedback/spinner.tsx";
import { sharedStyles } from "./button-shared.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";

interface ButtonBaseProps extends Omit<
  ComponentProps<"button">,
  "children" | "className" | "style"
> {
  /**
   * Lifts the button onto a bright surface, brightening further on hover.
   * Overrides `variant`'s fill, so pairing it with `outline` or `ghost`
   * cancels their chrome.
   */
  bright?: boolean;
  /**
   * Below the `md` breakpoint, collapses to a square icon-only button and
   * hides the label. Pass `aria-label` too, so the collapsed form keeps its
   * name.
   */
  hideLabelOnMobile?: boolean;
  /**
   * Decorative leading icon. Rendered `aria-hidden`; never the accessible
   * name. With no `children` the button is icon-only: a square of its own
   * height, named by `aria-label` or `aria-labelledby`.
   */
  icon?: ReactNode;
  /**
   * Height scale via `controlSize`. Defaults to `"md"`.
   *
   * `"sm"` still falls short of the 44px WCAG 2.5.8 touch target, even though
   * every size grows on touch viewports.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Toggles the active highlight and emits `aria-pressed` — use for toggle
   * buttons. For a non-toggle CTA that only wants the highlight, use
   * `variant="primary"`.
   */
  isActive?: boolean;
  /**
   * Visual variant. Omit for the default raised surface button.
   *
   * `"primary"` shares `isActive`'s highlight but does not emit
   * `aria-pressed` — reserve toggles for `isActive` instead. `"ghost"` has no
   * surface and holds its colour back until hover, for an affordance inline
   * over existing content.
   */
  variant?: "primary" | "outline" | "ghost" | "danger";
  /**
   * Shows a spinner, sets `aria-busy`, and blocks activation. Uses `aria-disabled`,
   * not `disabled`, so the button keeps focus and the busy state is announced.
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
  const setButtonRef = mergeRefs(buttonRef, forwardedRef);

  const isLoading = loading === true;
  // Only `disabled` reaches the DOM attribute; a busy button stays focusable,
  // so the press animation treats both as inert.
  const isInert = disabled === true || isLoading;
  // Truthiness, not a null check, so `icon={count && <Icon />}` renders
  // nothing when `count` is `0` instead of a stray icon.
  const hasIcon = !!icon;
  // With an icon, the spinner takes its place. Without one, it overlays the
  // label (kept in the layout via `visibility`) so the button's width holds.
  const swapsIconForSpinner = isLoading && hasIcon;
  const overlaysSpinner = isLoading && !hasIcon;

  // `aria-disabled` alone stops nothing: pointer events are off while busy,
  // but Enter/Space still fires a click on a focused button. This blocks
  // activation here too.
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  }

  // Keyboard events reach a busy button too, and `pointerEvents` can't stop them.
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
      // Falls back to the caller's value, not `undefined`, since these are
      // set after `{...restProps}` and would otherwise strip a caller-set
      // `aria-busy`/`aria-disabled`.
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
            ? sharedStyles.iconOnlyBelowMd
            : sharedStyles.hasIcon),
        hasIcon && !children && sharedStyles.iconOnly,
        bright && sharedStyles.bright,
        // `active` and `bright` set a literal `backgroundColor` that wins over
        // `variantStyles`. `danger` keeps its own fill instead, so a
        // destructive button doesn't repaint brand-accent when toggled on.
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
          {/* `aria-busy` on the button already announces the state, so a
              labelled spinner would say it twice. `size="inline"` matches the
              icon box it replaces, keeping the button's width fixed. */}
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
    // Anchors the busy spinner overlay outside the flow, so it doesn't change
    // the button's width.
    position: "relative",
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    fontSize: font.uiControl,
    fontWeight: font.weight_5,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    // Height flows through `buttonTokens.height`, which `size` below sets.
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
  // A busy button stays enabled, so the `:disabled` rules above never fire.
  // `pointerEvents: none` blocks the pointer instead, and happens to match
  // its cursor; `handleClick`/`handleKeyDown` guard keyboard activation.
  busy: {
    opacity: opacity.disabled,
    pointerEvents: "none",
  },
  // `visibility`, not `opacity`, so the label also leaves the accessibility
  // tree — `aria-busy` is what should be announced.
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

// Each variant re-points the shared `buttonTokens` knobs instead of declaring
// its own colours, so the skin travels to anything else reading them.
// `"primary"` is absent because it reuses `sharedStyles.active`, the same
// highlight `isActive` paints.
const variantStyles = stylex.create({
  outline: {
    [buttonTokens.backgroundColor]: "transparent",
    [buttonTokens.backgroundColorHover]: color.bgInteractiveHover,
    [buttonTokens.backgroundColorDisabledHover]: "transparent",
    [buttonTokens.boxShadow]: "none",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
  },
  // The quietest variant: no surface, and the label drains to muted until the
  // pointer arrives. `:disabled:hover` keeps it drained, matching the fill.
  ghost: {
    [buttonTokens.backgroundColor]: "transparent",
    [buttonTokens.backgroundColorHover]: color.bgInteractiveHover,
    [buttonTokens.backgroundColorDisabledHover]: "transparent",
    [buttonTokens.boxShadow]: "none",
    [buttonTokens.color]: {
      default: color.textMuted,
      ":hover": color.textMain,
      ":disabled:hover": color.textMuted,
    },
  },
  danger: {
    [buttonTokens.backgroundColor]: color.danger,
    [buttonTokens.backgroundColorHover]: color.dangerHover,
    [buttonTokens.backgroundColorDisabledHover]: color.danger,
    [buttonTokens.color]: color.dangerOn,
  },
});

// Each size drives `buttonTokens.height` and scales label size and padding to
// match. `md` reproduces the historic default, so callers that omit `size`
// are unaffected.
const sizeStyles = stylex.create({
  sm: {
    [buttonTokens.height]: controlSize._8,
    [buttonTokens.paddingInline]: controlSize._2,
    fontSize: font.uiBodySmall,
    gap: controlSize._1,
    paddingBlock: controlSize._0,
  },
  md: {
    [buttonTokens.height]: controlSize._9,
  },
  lg: {
    [buttonTokens.height]: controlSize._10,
    [buttonTokens.paddingInline]: controlSize._4,
    fontSize: font.uiHeading2,
    paddingBlock: controlSize._2,
  },
});
