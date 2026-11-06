"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import * as stylex from "@stylexjs/stylex";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { useDisclosure } from "../hooks/use-disclosure.ts";
import { mergeRefs } from "../merge-refs.ts";
import { useBinding } from "../motion/use-binding.ts";
import { useFlowBlock } from "../motion/use-flow-block.tsx";
import { useFlowPanel } from "../motion/use-flow-panel.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";
import { border } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { styles as cellStyles } from "./table-cell.stylex.ts";
import { TableDisclosureContext } from "./table-disclosure-context.ts";
import { tableTokens } from "./table.stylex.ts";

interface TableDisclosureBaseProps extends Omit<
  ComponentProps<"tr">,
  "children" | "className" | "style"
> {
  /**
   * The cells of the row that opens and closes the panel, each one a
   * `TableHeaderCell` or a `TableCell`. A press anywhere on the row toggles
   * it, except on a link or a control in it. Put one `TableDisclosureTrigger`
   * in a cell for the keyboard and for a screen reader. The row ends with a
   * cell of its own for the caret, so give the head one more column.
   *
   * @zh 用于展开和收起面板的那一行的各个单元格，每个都是 `TableHeaderCell` 或 `TableCell`。按下这一行的任意位置都会切换面板，行内的链接或控件除外。请在某个单元格中放一个 `TableDisclosureTrigger`，供键盘和读屏软件使用。这一行末尾有一个放箭头的单元格，因此请为表头多留一列。
   */
  summary: ReactNode;
  /**
   * Panel content. The panel spans the row under the summary, and stays as
   * wide as the visible part of a table that scrolls sideways.
   *
   * @zh 面板内容。面板横跨摘要行下方的整行；表格横向滚动时，面板保持与表格可见部分同宽。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the summary row's own. Other props go on that
   * row too, such as an `id` that a link can point at.
   *
   * @zh 合并在摘要行自身样式之上的 StyleX 样式。其他 props 同样落在这一行上，例如供链接指向的 `id`。
   */
  css?: StyleProp;
  /**
   * StyleX styles merged over the panel's box: its padding and the layout of
   * its content.
   *
   * @zh 合并在面板盒子之上的 StyleX 样式：内边距及内容的布局。
   */
  panelCss?: StyleProp;
}

/**
 * `useControlled` hands back a no-op setter while `open` is supplied, so a
 * controlled disclosure without `onOpenChange` is a dead control. The two
 * travel together at the type level so that cannot ship.
 */
type TableDisclosureStateProps =
  | {
      /**
       * Controlled open state. Omit to let the component own it. Passing it
       * requires `onOpenChange`.
       *
       * @zh 受控的展开状态。省略时由组件自行管理。传入时必须同时提供 `onOpenChange`。
       */
      open: boolean;
      /**
       * Called with the next state whenever the row toggles. Optional when
       * uncontrolled, required alongside `open`.
       *
       * @zh 每次这一行切换时，以下一个状态调用。非受控时可选，与 `open` 同时使用时为必填。
       */
      onOpenChange: (open: boolean) => void;
      defaultOpen?: undefined;
    }
  | {
      open?: undefined;
      /**
       * Called with the next state whenever the row toggles. Optional when
       * uncontrolled, required alongside `open`.
       *
       * @zh 每次这一行切换时，以下一个状态调用。非受控时可选，与 `open` 同时使用时为必填。
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

type TableDisclosureProps = TableDisclosureBaseProps &
  TableDisclosureStateProps;

const CONTROLS =
  "a, button, input, select, textarea, label, summary, [role=button], [contenteditable]";

/**
 * A row of a `Table` that opens a panel under it, as a row group of its own:
 * use it in place of `TableBody`, one for each row. The panel grows from the
 * row on a spring, the rows below trail it by a moment with no layout during
 * the motion, and the caret at the row's end turns on the same spring. A press
 * during the motion turns it from where it is. Under reduced motion, the panel
 * fades in place. The open row and its panel share one fill.
 */
export function TableDisclosure({
  summary,
  children,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  css,
  panelCss,
  onClick,
  ref,
  ...restProps
}: TableDisclosureProps) {
  const { open, toggle, triggerProps, panelProps } = useDisclosure({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
  });
  const { panel, contentRef, progress } = useFlowPanel(open);
  const { ref: flowRef } = useFlowBlock();
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [columns, setColumns] = useState(1);
  useLayoutEffect(() => {
    setColumns(rowRef.current?.cells.length ?? 1);
  }, [summary]);
  useBinding(indicatorRef, progress, {
    pose: (at) => ({ rotate: `${(at * 180).toFixed(2)}deg` }),
    reducedPose: () => ({}),
    rest: "clear",
  });

  const onRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const control = event.target.closest(CONTROLS);
    if (control !== null && event.currentTarget.contains(control)) return;
    // A drag that selects text in the row is not a press.
    if (window.getSelection()?.isCollapsed === false) return;
    toggle();
  };

  return (
    <tbody ref={flowRef} css={styles.group}>
      <tr
        {...restProps}
        ref={mergeRefs(ref, rowRef)}
        onClick={onRowClick}
        css={[styles.row, open ? fills.open : fills.closed, css]}
      >
        <TableDisclosureContext value={triggerProps}>
          {summary}
        </TableDisclosureContext>
        <td aria-hidden css={[cellStyles.cell, styles.indicatorCell]}>
          <span
            ref={indicatorRef}
            css={[styles.indicator, open && styles.indicatorOpen]}
          >
            <CaretDownIcon weight="bold" />
          </span>
        </td>
      </tr>
      <tr>
        <td colSpan={columns} css={styles.panelCell}>
          <div {...panelProps} {...panel}>
            <div ref={contentRef} css={styles.content}>
              <div css={[styles.panelBox, panelCss]}>{children}</div>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

const NO_SHADOW = "0 0 transparent";
const RULE = `inset 0 ${border.size_1} 0 ${color.border}`;

const styles = stylex.create({
  // The rule is on the cells, because a collapsed border stays where the
  // layout put it while the group moves. `forced-colors` drops shadows, so
  // the border returns there.
  group: {
    [tableTokens.cellRule]: { default: RULE, ":first-of-type": NO_SHADOW },
    borderBlockStartWidth: {
      default: null,
      "@media (forced-colors: active)": border.size_1,
    },
    borderBlockStartStyle: {
      default: null,
      "@media (forced-colors: active)": "solid",
    },
    borderBlockStartColor: {
      default: null,
      "@media (forced-colors: active)": color.border,
    },
  },
  row: {
    cursor: "pointer",
    transition: `background-color ${duration._200} ${easing.ease}`,
  },
  indicatorCell: {
    verticalAlign: "middle",
    textAlign: "end",
    color: color.fgMuted,
  },
  // An `em` box, so the caret follows the row's font size.
  indicator: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "1em",
    blockSize: "1em",
    verticalAlign: "middle",
  },
  indicatorOpen: {
    rotate: "180deg",
  },
  panelCell: {
    padding: 0,
    [tableTokens.cellRule]: NO_SHADOW,
  },
  // A margin on the first child must stay in this box. If it collapses through
  // the box, the clip cannot move it, and it stays until the panel is hidden.
  content: {
    display: "flow-root",
  },
  // Pinned to the visible part of a table that scrolls sideways, so the text
  // reads without a scroll.
  panelBox: {
    position: "sticky",
    insetInlineStart: 0,
    boxSizing: "border-box",
    inlineSize: tableTokens.scrollport,
    backgroundColor: color.bgSurfaceSunken,
    whiteSpace: "normal",
  },
});

// One object for each state: a custom property with a plain value in one
// style and a conditional value in another loses the conditional value.
const fills = stylex.create({
  closed: {
    backgroundColor: {
      default: null,
      ":hover": { default: null, [pointer.canHover]: color.bgCanvas },
    },
    [tableTokens.stickyFill]: {
      default: null,
      ":hover": { default: null, [pointer.canHover]: color.bgCanvas },
    },
  },
  open: {
    backgroundColor: {
      default: color.bgSurfaceSunken,
      ":hover": {
        default: color.bgSurfaceSunken,
        [pointer.canHover]: color.bgCanvas,
      },
    },
    [tableTokens.stickyFill]: {
      default: color.bgSurfaceSunken,
      ":hover": {
        default: color.bgSurfaceSunken,
        [pointer.canHover]: color.bgCanvas,
      },
    },
  },
});
