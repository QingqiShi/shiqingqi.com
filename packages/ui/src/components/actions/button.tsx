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
import { corner } from "../../primitives/corner.stylex.ts";
import { opacity } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";
import { Spinner } from "../feedback/spinner.tsx";
import {
  lookStyles,
  sharedStyles,
  sizeStyles,
} from "./button-shared.stylex.ts";

interface ButtonBaseProps extends Omit<
  ComponentProps<"button">,
  "children" | "className" | "style"
> {
  /**
   * Lifts the button onto a bright surface, brightening further on hover.
   * Overrides `look`'s fill, so pairing it with `outline` or `ghost`
   * cancels their chrome.
   *
   * @zh 将按钮置于明亮表面，悬停时进一步提亮。它会覆盖 `look` 的填充，因此与 `outline` 或 `ghost` 同用会抵消二者的外框处理。
   */
  bright?: boolean;
  /**
   * Below the `md` breakpoint, collapses to a square icon-only button and
   * hides the label. Pass `aria-label` too, so the collapsed form keeps its
   * name.
   *
   * @zh 在 `md` 断点以下收起为纯图标的正方形按钮，并隐藏标签。同时提供 `aria-label`，使收起后的按钮仍保留名称。
   */
  hideLabelOnMobile?: boolean;
  /**
   * Decorative leading icon. Rendered `aria-hidden`; never the accessible
   * name. With no `children` the button is icon-only: a square of its own
   * height, named by `aria-label` or `aria-labelledby`.
   *
   * @zh 装饰性的前置图标。以 `aria-hidden` 渲染，绝不充当可访问名称。没有 `children` 时按钮为纯图标：一个与自身高度相等的正方形，由 `aria-label` 或 `aria-labelledby` 命名。
   */
  icon?: ReactNode;
  /**
   * Height scale via `controlSize`. Defaults to `"md"`.
   *
   * `"sm"` still falls short of the 44px WCAG 2.5.8 touch target, even though
   * every size grows on touch viewports.
   *
   * @zh 通过 `controlSize` 设定的高度阶梯。
   *
   * 即使每个尺寸在触摸视口下都会增大，`"sm"` 仍未达到 WCAG 2.5.8 要求的 44px 触摸目标。
   */
  size?: "sm" | "md" | "lg";
  /**
   * Toggles the active highlight and emits `aria-pressed` — use for toggle
   * buttons. For a non-toggle CTA that only wants the highlight, use
   * `look="primary"`.
   *
   * @zh 切换激活高亮并发出 `aria-pressed`——用于切换按钮。若某个 CTA 只需要高亮而不表示切换状态，改用 `look="primary"`。
   */
  isActive?: boolean;
  /**
   * Visual look. Omit for the default raised surface button.
   *
   * `"primary"` shares `isActive`'s highlight but does not emit
   * `aria-pressed` — reserve toggles for `isActive` instead. `"outline"` swaps
   * the fill for a border, `"ghost"` has no surface at all and holds its colour
   * back until hover, for an affordance inline over existing content, and
   * `"danger"` is for the action that destroys something.
   *
   * @zh 视觉外观。省略则为默认的凸起表面按钮。
   *
   * `"primary"` 与 `isActive` 共用同一种高亮，但不会发出 `aria-pressed`——切换状态一律交给 `isActive`。`"outline"` 以描边取代填充；`"ghost"` 完全没有表面，颜色在悬停前保持克制，适合置于已有内容之上的行内控件；`"danger"` 用于真正具有破坏性的操作。
   */
  look?: "primary" | "outline" | "ghost" | "danger";
  /**
   * Shows a spinner, sets `aria-busy`, and blocks activation. Uses `aria-disabled`,
   * not `disabled`, so the button keeps focus and the busy state is announced.
   *
   * The width holds either way: with an icon the spinner takes the icon's
   * place, without one it sits over the label, which keeps its space.
   *
   * @zh 显示加载指示器，设置 `aria-busy`，并阻止再次触发。它用 `aria-disabled` 而非 `disabled`，因此按钮保留焦点，忙碌状态也能被读出。
   *
   * 两种情况下宽度都保持不变：有图标时加载指示器取代图标，没有图标时它覆盖在标签之上，而标签仍占据原有空间。
   */
  loading?: boolean;
  /**
   * Id applied to the label span, e.g. to wire an external `aria-labelledby`.
   *
   * @zh 应用在标签 span 上的 id，例如用于关联外部的 `aria-labelledby`。
   */
  labelId?: string;
  /**
   * StyleX styles merged over the button's own — the config-layer escape hatch.
   *
   * @zh 合并在按钮自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A button needs an accessible name (WCAG 4.1.2). When there is no visible
 * `children` to name it, `aria-label` or `aria-labelledby` is required at the
 * type level so icon-only buttons cannot ship unlabelled.
 */
type ButtonProps = ButtonBaseProps &
  (
    | {
        /**
         * Visible label. Required unless `aria-label` or `aria-labelledby`
         * names an icon-only button.
         *
         * @zh 可见标签。除非用 `aria-label` 或 `aria-labelledby` 为纯图标按钮命名，否则必填。
         */
        children: ReactNode;
      }
    | ({ children?: undefined } & (
        | {
            /**
             * Accessible name for an icon-only button. With no `children`,
             * either this or `aria-labelledby` is required.
             *
             * @zh 纯图标按钮的可访问名称。没有 `children` 时，它与 `aria-labelledby` 必须二选一。
             */
            "aria-label": string;
            "aria-labelledby"?: undefined;
          }
        | {
            /**
             * Id of the element naming an icon-only button — the alternative
             * to `aria-label` when there are no `children`.
             *
             * @zh 为纯图标按钮命名的元素 id——没有 `children` 时，它是 `aria-label` 的替代。
             */
            "aria-labelledby": string;
            "aria-label"?: undefined;
          }
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
  look,
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
        corner.squircle_round,
        a11y.focusRing,
        styles.button,
        sizeStyles[size],
        look !== undefined && look !== "primary" && lookStyles[look],
        hasIcon &&
          !!children &&
          (hideLabelOnMobile
            ? sharedStyles.iconOnlyBelowMd
            : sharedStyles.hasIcon),
        hasIcon && !children && sharedStyles.iconOnly,
        bright && sharedStyles.bright,
        // `active` and `bright` set a literal `backgroundColor` that wins over
        // `lookStyles`. `danger` keeps its own fill instead, so a
        // destructive button doesn't repaint brand-accent when toggled on.
        (isActive === true || look === "primary") &&
          look !== "danger" &&
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
    cursor: { default: "pointer", ":disabled": "not-allowed" },
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
