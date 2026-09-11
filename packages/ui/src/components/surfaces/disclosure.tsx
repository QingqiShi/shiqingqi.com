"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { useDisclosure } from "../../hooks/use-disclosure.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner } from "../../primitives/corner.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import { buttonReset } from "../../primitives/reset.stylex.ts";
import { border, color, font, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { cardSurface } from "./card.stylex.ts";

interface DisclosureBaseProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style"
> {
  /**
   * Header content — the whole row is the trigger, so keep this text and
   * decoration only. Drop to the `useDisclosure` hook for a header that holds
   * its own link, which would nest a control inside a button.
   *
   * @zh 标题内容——整行都是触发器，因此这里应只放文本与装饰。若标题需要承载自己的链接，请改用 `useDisclosure` 钩子，否则会把控件嵌套进按钮里。
   */
  summary: ReactNode;
  /**
   * Panel content, revealed when open.
   *
   * @zh 展开时显示的面板内容。
   */
  children: ReactNode;
  /**
   * Decorative leading icon in the header, rendered `aria-hidden`.
   *
   * @zh 标题行的装饰性前置图标，以 `aria-hidden` 渲染。
   */
  icon?: ReactNode;
  /**
   * Content between the summary and the caret — a count, a status badge. It
   * stays in the accessibility tree, so it reads as part of the trigger's name
   * and must not be interactive.
   *
   * @zh 位于摘要与箭头之间的内容——计数或状态标记。它保留在无障碍树中，因此会作为触发器名称的一部分被朗读，且不得为可交互元素。
   */
  trailing?: ReactNode;
  /**
   * The open/closed indicator. Defaults to a caret that rotates on open; pass a
   * node to swap it, or `null` to drop it.
   *
   * @zh 展开／折叠指示符。默认渲染为展开时会旋转的箭头；传入节点可替换它，传入 `null` 可移除。
   */
  indicator?: ReactNode;
  /**
   * `"plain"` (the default) is chrome-free, for a disclosure that sits inside a
   * surface something else already owns. `"card"` wraps both parts in the shared
   * bordered card surface and rules the panel off from the header.
   *
   * @zh `"plain"`（默认）不带外框，适用于内部已有其他表面承载的折叠面板；`"card"` 将两部分一并包进共享的描边卡片表面，并用分隔线把面板与标题分开。
   */
  look?: "plain" | "card";
  /**
   * StyleX overrides merged over the root — composed last so a caller wins.
   * The trigger inherits the root's `font-size`, so one override resizes the
   * whole header.
   *
   * @zh 合并在根元素之上的 StyleX 覆盖样式——最后合成，因此调用方总能获胜。触发器继承根元素的 `font-size`，一次覆盖即可调整整个标题行。
   */
  css?: StyleProp;
}

/**
 * `useControlled` hands back a no-op setter while `open` is supplied, so a
 * controlled disclosure without `onOpenChange` is a dead control. The two
 * travel together at the type level so that cannot ship.
 */
type DisclosureStateProps =
  | {
      /**
       * Controlled open state. Omit to let the component own it. Passing it
       * requires `onOpenChange` — while controlled, the component cannot
       * change its own state, so a disclosure with no handler would look
       * right and never open.
       *
       * @zh 受控的展开状态。省略时由组件自行管理。传入时必须同时提供 `onOpenChange`——受控期间组件无法自行改变状态，缺少回调的折叠面板看起来正常却永远无法展开。
       */
      open: boolean;
      /**
       * Called with the next state whenever the trigger toggles. Optional
       * when uncontrolled, required alongside `open`.
       *
       * @zh 每次触发器切换时，以下一个状态调用。非受控时可选，与 `open` 同时使用时为必填。
       */
      onOpenChange: (open: boolean) => void;
      defaultOpen?: undefined;
    }
  | {
      open?: undefined;
      /**
       * Called with the next state whenever the trigger toggles. Optional
       * when uncontrolled, required alongside `open`.
       *
       * @zh 每次触发器切换时，以下一个状态调用。非受控时可选，与 `open` 同时使用时为必填。
       */
      onOpenChange?: (open: boolean) => void;
      /**
       * Initial open state when uncontrolled. Not accepted alongside `open`.
       *
       * @default false
       * @zh 非受控时的初始展开状态。不可与 `open` 同时使用。
       */
      defaultOpen?: boolean;
    };

type DisclosureProps = DisclosureBaseProps & DisclosureStateProps;

/**
 * An expand/collapse section: a header row that toggles a panel beneath it,
 * wired with `aria-expanded` and `aria-controls`. The panel stays mounted and
 * flips `hidden`, so render expensive contents conditionally yourself if you
 * need them deferred.
 */
export function Disclosure({
  summary,
  children,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  icon,
  trailing,
  indicator,
  look = "plain",
  css,
  ref,
  ...restProps
}: DisclosureProps) {
  const { open, triggerProps, panelProps } = useDisclosure({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
  });
  const resolvedIndicator =
    indicator === undefined ? <CaretDownIcon weight="bold" /> : indicator;

  return (
    <div
      {...restProps}
      ref={ref}
      css={[styles.root, look === "card" && cardSurface.base, css]}
    >
      <button
        {...triggerProps}
        css={[
          buttonReset.base,
          a11y.focusRingInset,
          corner.radius_2,
          styles.trigger,
          triggerLooks[look],
        ]}
      >
        {icon ? (
          <span css={styles.slot} aria-hidden>
            {icon}
          </span>
        ) : null}
        <span css={styles.summary}>{summary}</span>
        {trailing ? <span css={styles.trailing}>{trailing}</span> : null}
        {/* Truthiness, so `indicator={hasChildren && <Icon />}` drops the slot
            on a leaf row instead of leaving an empty box that misaligns the
            summary. */}
        {resolvedIndicator ? (
          <span
            css={[
              styles.slot,
              transition.transform,
              open && styles.indicatorOpen,
            ]}
            aria-hidden
          >
            {resolvedIndicator}
          </span>
        ) : null}
      </button>
      <div {...panelProps} css={panelLooks[look]}>
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    fontSize: font.uiBodySmall,
  },
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    inlineSize: "100%",
    // Inherited so the root's `fontSize` (and any `css` override of it) drives
    // the header, the slots, and the caret together.
    fontSize: "inherit",
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_3,
    color: color.textMain,
    textAlign: "start",
  },
  // `em` boxes so every icon tracks the header's font-size.
  slot: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "1em",
    blockSize: "1em",
    color: color.textMuted,
  },
  summary: {
    flexGrow: 1,
    // Let long summaries wrap instead of forcing the trigger wider.
    minInlineSize: 0,
  },
  trailing: {
    flexShrink: 0,
    color: color.textMuted,
  },
  indicatorOpen: {
    transform: "rotate(180deg)",
  },
});

const triggerLooks = stylex.create({
  plain: {
    paddingBlock: space._1,
  },
  card: {
    paddingBlock: space._2,
    paddingInline: space._3,
  },
});

// No `display` here: the panel leans on `[hidden]` to collapse, and any
// `display` value here would override that browser rule.
const panelLooks = stylex.create({
  plain: {
    paddingBlockEnd: space._1,
  },
  card: {
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
});
