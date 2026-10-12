"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "../actions/button.tsx";
import { useEffectCover } from "../effect-layer/use-effect-cover.ts";
import { useRingLight } from "../effect-layer/use-ring-light.ts";
import { mergeRefs } from "../merge-refs.ts";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
} from "../primitives/motion.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { glassSurface } from "../surfaces/glass-surface.stylex.ts";
import { color, controlSize, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

/**
 * An action a toast can offer, such as Undo.
 */
export interface ToastAction {
  /** The button's label — the package ships no i18n. */
  label: string;
  onAction: () => void;
}

interface ToastBaseProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style" | "role"
> {
  /**
   * What happened, in a short sentence. It is the toast's whole meaning:
   * keep it readable on its own, without the action.
   *
   * @zh 发生了什么，用一句短句说明。它承载提示的全部含义：即使没有操作按钮也应能独立读懂。
   */
  message: ReactNode;
  /**
   * One action that follows from the message, such as Undo. It shows as a
   * button after the message.
   *
   * @zh 紧随消息的一个操作，例如撤销。它以按钮形式显示在消息之后。
   */
  action?: ToastAction;
  /**
   * A second action after `action`, such as "Teach the AI" after Undo.
   *
   * @zh 位于 `action` 之后的第二个操作，例如撤销之后的“教 AI”。
   */
  secondAction?: ToastAction;
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh StyleX 覆盖样式，最后合成，使调用方可以覆盖默认值。
   */
  css?: StyleProp;
}

/**
 * A close button needs an accessible name, so `dismissLabel` is required
 * whenever `onDismiss` is set, and forbidden otherwise.
 */
type ToastDismissProps =
  | {
      /**
       * Called when the visitor activates the close button, or presses
       * Escape inside the toast.
       *
       * @zh 当访客激活关闭按钮，或在提示内按下 Escape 时调用。
       */
      onDismiss: () => void;
      /**
       * Accessible name for the close button — the package ships no i18n.
       *
       * @zh 关闭按钮的无障碍名称——本包不内置 i18n。
       */
      dismissLabel: string;
    }
  | { onDismiss?: undefined; dismissLabel?: undefined };

type ToastProps = ToastBaseProps & ToastDismissProps;

/**
 * A short message about what an action did, on a capsule of
 * Glass, with up to two actions and a close button. It springs up as it
 * arrives (a fade under reduced motion), and when it has arrived a Ring
 * light runs once round its edge, where the effect layer is on.
 *
 * This is the surface alone. `ToastProvider` shows one at a time at the
 * bottom of the screen, announces it, and takes it away after a while.
 */
export function Toast({
  message,
  action,
  secondAction,
  onDismiss,
  dismissLabel,
  css,
  onKeyDown,
  ref,
  ...restProps
}: ToastProps) {
  const [arrived, setArrived] = useState(false);
  const ringLightRef = useRingLight();
  const coverRef = useEffectCover();
  const rootRefs = useMemo(() => mergeRefs(ref, coverRef), [ref, coverRef]);
  const actions = [action, secondAction].filter((item) => item !== undefined);
  const hasButtons = actions.length > 0 || onDismiss !== undefined;

  return (
    <div
      {...restProps}
      ref={rootRefs}
      css={[styles.root, css]}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === "Escape" && onDismiss && !event.defaultPrevented) {
          event.preventDefault();
          onDismiss();
        }
      }}
    >
      {arrived ? (
        <span ref={ringLightRef} aria-hidden css={[styles.rim, styles.light]} />
      ) : null}
      <div
        css={[
          glassSurface.base,
          styles.rim,
          styles.surface,
          hasButtons && styles.withButtons,
        ]}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) {
            setArrived(true);
          }
        }}
      >
        <span css={[typeRole.bodySmall, styles.message]}>{message}</span>
        {hasButtons ? (
          <span css={styles.actions}>
            {actions.map((item) => (
              <Button
                key={item.label}
                size="sm"
                look="ghost"
                onClick={item.onAction}
              >
                {item.label}
              </Button>
            ))}
            {onDismiss ? (
              <Button
                size="sm"
                look="ghost"
                icon={<XIcon weight="bold" />}
                aria-label={dismissLabel}
                onClick={onDismiss}
              />
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const INSET = controlSize._1;
/** The height of a one-line toast: a small button and its inset round it. */
const LINE_HEIGHT = `calc(${controlSize._8} + 2 * ${INSET})`;

const arrive = stylex.keyframes({
  from: {
    opacity: 0,
    transform: `translateY(${space._7}) scale(0.92)`,
  },
});

const styles = stylex.create({
  root: {
    position: "relative",
    inlineSize: "max-content",
    maxInlineSize: `min(calc(100vw - 2 * ${space._4}), ${space._15})`,
  },
  // A one-line toast is a capsule. A message that wraps keeps the capsule's
  // corners, so it does not swell into an oval.
  rim: {
    borderRadius: `calc(${LINE_HEIGHT} / 2)`,
    cornerShape: "round",
  },
  // The box the Ring light runs round. It does not move, so the light runs
  // round the place the toast arrives at, not the place it comes from.
  light: {
    position: "absolute",
    inset: 0,
    color: color.bgAccent,
    pointerEvents: "none",
  },
  surface: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: controlSize._2,
    boxSizing: "border-box",
    minBlockSize: LINE_HEIGHT,
    paddingBlock: INSET,
    paddingInline: controlSize._5,
    color: color.fg,
    // Forced colours drop the shadow and the rim, and paint the fill as the
    // canvas, so an outline the system colours draws the edge instead.
    outlineWidth: "1px",
    outlineStyle: "solid",
    outlineColor: "transparent",
    animationName: {
      default: arrive,
      [motionConstants.REDUCED_MOTION]: motionKeyframes.fadeIn,
    },
    animationDuration: {
      default: duration._500,
      [motionConstants.REDUCED_MOTION]: duration._200,
    },
    animationTimingFunction: {
      default: easing.springFallback,
      "@supports (animation-timing-function: linear(0, 1))": {
        default: easing.spring,
        [motionConstants.REDUCED_MOTION]: easing.ease,
      },
      [motionConstants.REDUCED_MOTION]: easing.ease,
    },
  },
  withButtons: {
    paddingInlineEnd: INSET,
  },
  message: {
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: controlSize._1,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: controlSize._2,
  },
});
