import { createContext, use } from "react";
import { addSplitViewMark } from "../split-view-motion/create-shared-flights.ts";
import type {
  SplitViewMarkElement,
  SplitViewMarks,
} from "../split-view-motion/types.ts";

/**
 * The elements of each Shared element of the view around, `null` outside a
 * view.
 *
 * @internal
 */
export const SplitViewMarksContext = createContext<SplitViewMarks | null>(null);

/**
 * Marks an element as one form of the Shared element `name`, such as an
 * account's avatar in the sidebar, its tile in the Collapsed sidebar, or a
 * chart in the content and its compact form in the sidebar. Attach the
 * returned ref. When a navigation hides the form that showed and shows
 * another, the view flies one into the other. When a navigation moves the
 * one form, such as a list that a new chart above it pushes down, the view
 * moves it there. A form can be a part of an SVG drawing, such as the line
 * of a chart, which stretches as it flies. A Shared element can hold
 * others, such as a chart that holds its line and its labels: they fly on
 * their own, the form it leaves stays, and the rest of the form it goes to
 * shows as they land. Give each form a box of its own, and give one name to
 * at most one form that shows at a time. Outside a `NavigationSplitView`,
 * and for a `null` name, the ref does nothing.
 *
 * @internal
 */
export function useSplitViewShared(
  name: string | null,
  { fade = "cross" }: SplitViewSharedOptions = {},
) {
  const marks = use(SplitViewMarksContext);
  return (element: SplitViewMarkElement | null) => {
    if (element === null || marks === null || name === null) return undefined;
    return addSplitViewMark(marks, name, element, { fade });
  };
}

/** @internal */
export interface SplitViewSharedOptions {
  /**
   * How the two forms of the Shared element change over while it flies:
   * `"cross"` cross-fades them, and `"dip"` fades it out most of the way at
   * the middle of its flight and back in as it lands. Use `"dip"` for a
   * label that rides along with a part that changes shape, such as the
   * value at the top of a chart.
   *
   * @default "cross"
   * @zh 共享元素飞行时两种形态如何交替：`"cross"` 交叉淡化；`"dip"` 在飞行中途淡出大半，落地时再淡入。用于随一个改变形状的部分一起移动的标签，例如图表顶端的数值。
   */
  fade?: "cross" | "dip";
}
