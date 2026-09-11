"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import {
  usePopover,
  type PopoverPlacement,
  type PopoverTriggerProps,
} from "../../hooks/use-popover.ts";
import { color, layer, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";
import { popoverSurface } from "./popover-surface.stylex.ts";

interface PopoverBaseProps {
  /**
   * Renders the trigger: spread the supplied props onto whatever element
   * opens the popover (a `Button`, a `Chip`, a bare `<button>`) to wire up
   * the anchor ref, open state, and ARIA. A callback, not a node, since
   * cloning can't type an injected ref and `aria-*` without `any`.
   *
   * @zh 渲染打开浮层的元素。把传入的属性展开到该元素上——它们带着锚点 ref、打开状态和 ARIA 连线。
   */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /**
   * Popover content. Anything — this is not a menu.
   *
   * @zh 面板的内容。任何东西都可以——它不是菜单。
   */
  children: ReactNode;
  /**
   * Preferred side and alignment: `"top"`, `"right"`, `"bottom"` or `"left"`,
   * each also available as `-start` and `-end`. The side flips and both axes
   * shift when the viewport would clip the popover.
   *
   * @zh 偏好的边与对齐方式："top"、"right"、"bottom"、"left"，每个还有 -start 与 -end 两种形式。当窗口会裁切面板时，边会翻转，两个轴向都会平移。
   */
  placement?: PopoverPlacement;
  /**
   * Gap between trigger and popover, in pixels.
   *
   * @zh 触发元素与面板之间的间隙，单位为像素。
   */
  offset?: number;
  /**
   * Where to render the portal, which is what keeps the popover out of a
   * clipping or transformed ancestor. Defaults to `document.body`; pass `null`
   * to defer rendering until a target is available.
   *
   * @zh 面板 portal 到哪里。传入 null 可延迟渲染，直到目标可用。
   */
  portalTarget?: Element | DocumentFragment | null;
  /**
   * Accessible name for the popover. Defaults to naming it by its trigger,
   * which is right whenever the trigger says what the popover is about.
   *
   * @zh 为面板命名。省略时改由触发元素命名——只要触发元素说清了面板的内容，这就是对的。
   */
  "aria-label"?: string;
  /**
   * Id of a visible element that names the popover, instead of the trigger.
   * Ignored when `aria-label` is set.
   *
   * @zh 用来命名面板的可见元素 id，替代触发元素。设置了 aria-label 时会被忽略。
   */
  "aria-labelledby"?: string;
  /**
   * StyleX styles merged over the surface — the config-layer escape hatch.
   *
   * @zh 合并到面板表面之上的 StyleX 样式——配置层的逃生舱。
   */
  css?: StyleProp;
  /**
   * Ref to the popover element, merged with the one placement needs.
   *
   * @zh 指向面板元素的 ref，会与定位所需的 ref 合并。
   */
  ref?: Ref<HTMLDivElement>;
}

/**
 * A controlled popover whose parent never hears about the toggle is a dead
 * control: `useControlled` hands back a no-op setter while `open` is supplied,
 * so without `onOpenChange` nothing can ever close it.
 */
type PopoverStateProps =
  | {
      /**
       * Controlled open state. Requires `onOpenChange`.
       *
       * @zh 受控的打开状态。类型要求同时提供 onOpenChange，因为父组件收不到通知的受控浮层永远无法关闭。
       */
      open: boolean;
      /**
       * Called with the next state on every open or close.
       *
       * @zh 每次打开和关闭时以下一状态调用，无论由什么触发。
       */
      onOpenChange: (open: boolean) => void;
      defaultOpen?: undefined;
    }
  | {
      open?: undefined;
      /**
       * Called with the next state on every open or close.
       *
       * @zh 每次打开和关闭时以下一状态调用，无论由什么触发。
       */
      onOpenChange?: (open: boolean) => void;
      /**
       * Initial open state when uncontrolled; ignored once `open` is
       * supplied. Defaults to `false`.
       *
       * @zh 非受控时的初始状态；一旦提供了 open 便被忽略。
       */
      defaultOpen?: boolean;
    };

type PopoverProps = PopoverBaseProps & PopoverStateProps;

/**
 * Arbitrary content hung off a trigger, placed against the viewport so it
 * always lands on screen; it closes on Escape, an outside pointer, or lost
 * focus, but does not trap focus or lock scroll — for a modal use `Overlay`,
 * for a menu of commands `MenuButton`. It unmounts when closed and remounts
 * on every open, so lift any state a consumer needs to keep.
 */
export function Popover({
  trigger,
  children,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  placement = "bottom-start",
  offset = 8,
  portalTarget,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  css,
  ref,
}: PopoverProps) {
  const { open, triggerProps, contentProps } = usePopover({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    placement,
    offset,
  });

  const {
    ref: contentRef,
    "aria-labelledby": labelledByTrigger,
    ...restContentProps
  } = contentProps;

  // `undefined` means "use the default target"; `null` means the caller is
  // still resolving one, so hold rendering.
  const resolvedTarget =
    portalTarget === undefined
      ? typeof document === "undefined"
        ? null
        : document.body
      : portalTarget;

  return (
    <>
      {trigger(triggerProps)}
      {open && resolvedTarget
        ? createPortal(
            <div
              {...restContentProps}
              ref={mergeRefs(ref, contentRef)}
              aria-label={ariaLabel}
              aria-labelledby={
                ariaLabel === undefined
                  ? (ariaLabelledBy ?? labelledByTrigger)
                  : undefined
              }
              css={[
                styles.content,
                popoverSurface.base,
                popoverSurface.enter,
                css,
              ]}
            >
              {children}
            </div>,
            resolvedTarget,
          )
        : null}
    </>
  );
}

const styles = stylex.create({
  // No `inset` here: `usePopover` writes `top`/`left` directly, and a leftover
  // logical inset would over-constrain it in RTL.
  content: {
    position: "fixed",
    zIndex: layer.tooltip,
    boxSizing: "border-box",
    paddingBlock: space._2,
    paddingInline: space._3,
    // Portalled content inherits from `<body>`, not from the trigger's context.
    color: color.textMain,
    // Caps the box just inside the gutter `usePopover`'s placement maths keeps,
    // so a tall panel scrolls itself rather than running off screen. `contain`
    // stops a flick that reaches the end scrolling the page behind it.
    maxBlockSize: `calc(100dvh - ${space._1} * 2)`,
    maxInlineSize: `calc(100dvw - ${space._1} * 2)`,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
});
