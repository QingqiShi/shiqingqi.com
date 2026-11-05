"use client";

import {
  createContext,
  use,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { StyleProp } from "../types.ts";
import { Portal } from "./portal.tsx";
import { SheetFrame } from "./sheet-frame.tsx";
import { styles } from "./sheet.stylex.ts";

interface SheetBaseProps {
  /**
   * The sheet's content. The card pads it, fits its height up to the
   * viewport and scrolls it beyond that. With a `title`, the content starts
   * under the title; without one, it starts under the close button. A sticky
   * box in the content sticks inside that padding. While the card leaves, it
   * keeps the content it had when it started to leave. The content unmounts
   * after the sheet closes and remounts on every open, so lift any state that
   * has to survive the round trip.
   *
   * @zh 面板的内容。卡片为内容加上内边距，高度随内容而定，最高到视口，超出后在卡片内滚动。有 `title` 时内容从标题下方开始；没有时从关闭按钮下方开始。内容中的 sticky 盒子会停在这层内边距之内。卡片离场时保留开始离场那一刻的内容。面板关闭后内容卸载，每次打开都会重新挂载，需要跨越开合保留的状态请提升到外部。
   */
  children?: ReactNode;
  /**
   * Whether the sheet is shown; the consumer owns this state.
   *
   * @zh 面板是否显示；该状态由使用方掌控。
   */
  isOpen: boolean;
  /**
   * Called when the user asks to close the sheet: Escape, a click on the dimmed
   * page, the close button, or a drag down. The sheet starts to leave at once and
   * finishes leaving when `isOpen` turns false.
   *
   * @zh 用户请求关闭面板时调用：Escape、点击压暗的页面、关闭按钮或向下拖动。面板会立即开始离场，并在 `isOpen` 变为 false 后完成离场。
   */
  onClose: () => void;
  /**
   * Accessible label for the close button. Required — the package ships no
   * i18n, so the consumer supplies the localized string.
   *
   * @zh 关闭按钮的可访问标签；该包不内置 i18n，由使用方提供。
   */
  closeLabel: string;
  /**
   * Icon rendered inside the close button. Defaults to a Phosphor X icon.
   *
   * @zh 关闭按钮内渲染的图标。默认为内置的 X 图标。
   */
  closeIcon?: ReactNode;
  /**
   * Element to focus when the sheet opens. Falls back to the first tabbable
   * element inside the sheet (the close button).
   *
   * @zh 面板打开时聚焦的元素；回退到面板内第一个可聚焦元素（关闭按钮）。
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Below `md`, the element the card lifts out of, such as the row that
   * opened it. The card grows out of it, and shrinks back into it to leave,
   * where it still shows. The sheet calls it each time the card comes or
   * goes. Without it, or where it gives `null`, the card slides.
   *
   * @zh 在 `md` 以下，卡片从中升起的元素，例如打开它的那一行。卡片从它长出，离场时缩回到它之中（若它仍可见）。每次卡片出现或离开时都会调用它。不传或返回 `null` 时，卡片滑入滑出。
   */
  liftFrom?: () => HTMLElement | null;
  /**
   * Called on each frame that the card or the dimmed page moves, with how
   * far the card is in: 0 away and 1 at rest. Use it to move the page
   * behind with the card.
   *
   * @zh 卡片或压暗的页面移动时每一帧调用，参数为卡片到位的程度：0 为离开，1 为静止到位。可用它让后方页面随卡片一起移动。
   */
  onProgress?: (progress: number) => void;
}

/**
 * A modal dialog must have an accessible name (WCAG 4.1.2), so exactly one of
 * `title` / `aria-label` / `aria-labelledby` is required at the type level.
 */
type SheetLabelProps =
  | {
      /**
       * The sheet's title. It shares the top row with the close button, which
       * it never runs under, and it names the dialog. It scrolls with the
       * content.
       *
       * @zh 面板的标题。它与关闭按钮共用顶部一行，且不会延伸到按钮下方；它同时为对话框命名。标题随内容一起滚动。
       */
      title: ReactNode;
      "aria-label"?: undefined;
      "aria-labelledby"?: undefined;
    }
  | {
      title?: undefined;
      /**
       * Accessible name for the dialog.
       *
       * @zh 对话框的可访问名称。
       */
      "aria-label": string;
      "aria-labelledby"?: undefined;
    }
  | {
      title?: undefined;
      "aria-label"?: undefined;
      /**
       * Id of a visible element that names the dialog.
       *
       * @zh 用来命名对话框的可见元素 id。
       */
      "aria-labelledby": string;
    };

export type SheetProps = SheetBaseProps & SheetLabelProps;

/**
 * A modal card over a dimmed page. Below `md` it floats at the bottom of the
 * screen, inset from the edges, and a drag down on its grabber, or on its
 * content scrolled to the top, puts it away. From `md` up it sits in the
 * centre. Its height fits the content up to the viewport, and it rises above
 * an on-screen keyboard. It owns the focus trap, the scroll lock, Escape and
 * the close button; the consumer supplies the content and the localized close
 * label. It portals to `document.body`.
 */
export function Sheet(props: SheetProps) {
  const { isOpen, onClose } = props;
  // The visitor asked to close. The card leaves before `isOpen` turns false.
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasLeft, setHasLeft] = useState(!isOpen);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    setIsDismissed(false);
  }
  const boundary = use(SheetBoundaryContext);
  const isShown = isOpen && !isDismissed;
  const [shownChildren, setShownChildren] = useState(props.children);
  if (isShown && shownChildren !== props.children) {
    setShownChildren(props.children);
  }
  if (isShown && hasLeft) setHasLeft(false);
  if (hasLeft) return null;

  const frame = (
    <SheetFrame
      {...props}
      isShown={isShown}
      isContained={boundary !== undefined}
      onDismiss={() => {
        setIsDismissed(true);
        onClose();
      }}
      onLeft={() => {
        setHasLeft(true);
        setIsDismissed(false);
      }}
    >
      {/* A consumer often renders no content once the sheet closes, but the
          card stays on the screen until it has left. */}
      {isShown ? props.children : shownChildren}
    </SheetFrame>
  );
  if (boundary === null) return null;
  // In a boundary, the sheet keeps the carrier of the boundary, so it moves
  // with the frame and not with the viewport.
  if (boundary !== undefined) return createPortal(frame, boundary);

  return (
    // Safari on iOS paints no fixed box below the top of its bottom toolbar,
    // so the box that dims the page and the card are in the document. Then nothing of the sheet
    // is in the boxes that Safari samples for the colour of its chrome.
    <Portal target={undefined}>{frame}</Portal>
  );
}

/**
 * The boundary each `Sheet` inside it opens in, or `undefined` outside one.
 * `null` while the boundary mounts.
 */
const SheetBoundaryContext = createContext<HTMLElement | null | undefined>(
  undefined,
);

/**
 * Whether a `SheetBoundary` is around the caller, so that it does not fill the
 * screen.
 *
 * @internal
 */
export function useIsInSheetBoundary() {
  return use(SheetBoundaryContext) !== undefined;
}

interface SheetBoundaryProps {
  /**
   * The content. Each `Sheet` in it opens over the boundary and not over the
   * screen.
   *
   * @zh 内容。其中的每个 `Sheet` 都在边界上方打开，而不是在屏幕上方打开。
   */
  children: ReactNode;
  /**
   * Styles for the boundary box. Give it a height: the card fits its height
   * to the boundary's.
   *
   * @zh 边界盒子的样式。请为它设定高度：卡片的高度随边界的高度而定。
   */
  css?: StyleProp;
}

/**
 * A box that holds each `Sheet` inside it, such as a phone-sized frame of a
 * live demo. The sheet dims the box and not the page, floats at the bottom
 * of the box while the box is narrower than `md` and sits in its centre from
 * `md` up, and does not lock the scroll of the page. Its motion still
 * follows the width of the screen.
 */
export function SheetBoundary({ children, css }: SheetBoundaryProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setElement} css={[styles.boundary, css]}>
      <SheetBoundaryContext value={element}>{children}</SheetBoundaryContext>
    </div>
  );
}
