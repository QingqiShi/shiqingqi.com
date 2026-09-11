"use client";

import { createContext, use, type ReactNode } from "react";
import type { StyleProp } from "../../types.ts";
import { ControlGroupBlur } from "./control-group-blur.tsx";

// Whether the row is holding at its offset; every group reads it so they
// blur and melt together.
/** @internal */
export const StuckContext = createContext(false);

interface StickyControlGroupProps {
  /**
   * The controls in the group — a media type toggle, a sort picker, a
   * reset. They sit directly on the blur, in a row, with no surface of
   * their own.
   *
   * @zh 组内的控件——媒体类型切换、排序选择、重置。它们直接排成一行置于虚化之上，自身不带任何底色。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the group's own — where the group sits in the
   * row, such as `marginInlineStart: auto` for one at the inline end. The
   * group's own display, gap and alignment stay with the component.
   *
   * @zh 与控件组自身样式合并的 StyleX 样式——用于控制该组在行中的位置，例如 marginInlineStart: auto 使其靠行尾。组自身的 display、间距与对齐仍归组件所有。
   */
  css?: StyleProp;
}

/**
 * One group of a sticky row's controls, with the page blurred around it
 * while the row holds. The controls sit directly on the blur, in a row, with
 * no surface of their own.
 */
export function StickyControlGroup({ children, css }: StickyControlGroupProps) {
  const isStuck = use(StuckContext);

  return (
    <ControlGroupBlur isShown={isStuck} css={css}>
      {children}
    </ControlGroupBlur>
  );
}
