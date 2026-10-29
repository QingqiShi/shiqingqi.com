"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { Button } from "../actions/button.tsx";
import { breakpoints } from "../breakpoints.stylex.ts";
import { Heading } from "../content/heading.tsx";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { EffectContainer } from "../effect-layer/effect-container.tsx";
import { useEffectContainer } from "../effect-layer/use-effect-container.ts";
import { useEffectCover } from "../effect-layer/use-effect-cover.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { useVisualViewport } from "../hooks/use-visual-viewport.ts";
import { mergeRefs } from "../merge-refs.ts";
import { movingMarker } from "../motion/moving-marker.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { color, controlSize, layer, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { lockPageScroll } from "./lock-page-scroll.ts";
import { Portal } from "./portal.tsx";
import { SheetRecedeContext } from "./sheet-recede-context.ts";
import { useSheetDrag } from "./use-sheet-drag.ts";
import { useSheetMotion } from "./use-sheet-motion.ts";

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

type SheetProps = SheetBaseProps & SheetLabelProps;

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

type SheetFrameProps = SheetProps & {
  /** Whether the card is in, or comes in. False while it leaves. */
  isShown: boolean;
  /** Whether the sheet opens in a `SheetBoundary`. */
  isContained: boolean;
  onDismiss: () => void;
  /** The card has left the screen. */
  onLeft: () => void;
};

/**
 * The box that dims the page, and the card. It renders inside the `Portal`, so its effect hooks
 * read the viewport carrier that the Portal gives, and not the carrier around
 * the Sheet.
 */
function SheetFrame({
  children,
  isOpen,
  isShown,
  isContained,
  onDismiss,
  onLeft,
  closeLabel,
  closeIcon,
  initialFocusRef,
  liftFrom,
  onProgress,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SheetFrameProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const outerClipRef = useRef<HTMLDivElement>(null);
  const middleClipRef = useRef<HTMLDivElement>(null);
  const innerClipRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const grabberRef = useRef<HTMLDivElement>(null);
  const closeCornerRef = useRef<HTMLDivElement>(null);
  const area = useVisualViewport();
  const recede = use(SheetRecedeContext);
  // The page scrolls again as soon as it shows with no dim, also while the
  // card still settles into its row.
  const [isUndimmed, setIsUndimmed] = useState(false);
  if (isShown && isUndimmed) setIsUndimmed(false);
  const isLocked = !isContained && !isUndimmed;
  // Before the motion measures the card, so one layout takes both.
  useLayoutEffect(() => {
    if (!isLocked) return;
    const unlock = lockPageScroll();
    // The dim goes one screen past the end of the page, so the browser does
    // not pull the scroll back where the page gets shorter, as where a split
    // view stops scrolling the page on a wider screen. Then the page shows
    // above the screen.
    const keepPageOnScreen = () => {
      if (window.scrollY === 0) return;
      const end = Math.max(0, document.body.offsetHeight - window.innerHeight);
      if (window.scrollY > end) {
        window.scrollTo({ top: end, behavior: "instant" });
      }
    };
    window.addEventListener("resize", keepPageOnScreen);
    return () => {
      window.removeEventListener("resize", keepPageOnScreen);
      unlock();
    };
  }, [isLocked]);
  const motionRef = useSheetMotion(
    {
      cardRef,
      moverRef,
      clipRefs: [outerClipRef, middleClipRef, innerClipRef],
      dimRef,
      recede: isContained ? null : recede,
    },
    {
      isShown,
      onLeft,
      onProgress: (progress) => {
        onProgress?.(progress);
        if (!isShown && progress === 0) setIsUndimmed(true);
      },
      lift:
        liftFrom === undefined
          ? null
          : {
              from: liftFrom,
              contentRefs: [grabberRef, closeCornerRef, scrollerRef],
            },
    },
  );
  const dragHandlers = useSheetDrag({
    cardRef,
    motionRef,
    scrollerRef,
    grabberRef,
    closeCornerRef,
    isEnabled: isShown,
    onDismiss,
  });
  useDialogFocus({
    isOpen,
    dialogRef: cardRef,
    onClose: onDismiss,
    initialFocusRef,
  });
  const coverRef = useEffectCover({ modal: true });
  const container = useEffectContainer();
  const region = useScrollRegion();
  const { scroller, content } = region;

  // The page scroll lock makes the body positioned, with no top margin,
  // while the sheet is open. So the body is the containing block of the dim
  // and the anchor. The top of the body is the top of the document. The area
  // places the anchor as it is.
  const visibleBottom = area ? `${String(area.top + area.height)}px` : "100dvh";
  const visibleHeight = area ? `${String(area.height)}px` : "100dvh";

  return (
    <>
      <div
        ref={dimRef}
        css={[
          styles.dim,
          isContained && styles.dimContained,
          !isShown && styles.dimLeaving,
        ]}
        onClick={onDismiss}
        aria-hidden="true"
      />
      <div
        css={
          isContained
            ? styles.anchorContained
            : [styles.anchor, styles.anchorAt(visibleBottom, visibleHeight)]
        }
      >
        {/* The anchor is in the document and not fixed. But the modal cover
            locks the page, and the anchor follows the visual viewport. Thus
            the card stays on the viewport carrier that the Portal gives. */}
        {/* The mover is what the motion moves and fades. The canvases of the
            Scroll region are inside it, so the effects of the content move
            and fade with the card. */}
        <div
          ref={mergeRefs(moverRef, coverRef)}
          css={[
            isContained ? styles.moverContained : styles.mover,
            movingMarker,
          ]}
        >
          {/* A lift clips the card to a window with these boxes. */}
          <div ref={outerClipRef} css={styles.clip}>
            <div ref={middleClipRef} css={styles.clip}>
              <div ref={innerClipRef} css={styles.clip}>
                {/* forwardProps makes RemoveScroll clone its child and
                    inject its own ref, which would clobber a ref placed
                    directly on the card. Passing the ref through RemoveScroll
                    keeps `cardRef` working for focus and the Tab trap. */}
                <RemoveScroll
                  ref={mergeRefs(cardRef, container)}
                  allowPinchZoom
                  forwardProps
                  removeScrollBar={false}
                  enabled={isLocked}
                >
                  <div
                    css={[
                      corner.radius_4,
                      styles.card,
                      isContained
                        ? styles.cardContained
                        : styles.cardFit(visibleHeight),
                    ]}
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                    aria-labelledby={
                      title === undefined ? ariaLabelledBy : titleId
                    }
                    {...dragHandlers}
                  >
                    <EffectContainer value={container}>
                      <div
                        ref={grabberRef}
                        css={styles.grabber}
                        aria-hidden="true"
                      >
                        <span css={[corner.radius_round, styles.grabberBar]} />
                      </div>
                      {/* `Button` sets its own `position: relative` for its busy
                          spinner, which a caller's `position: absolute` can't
                          reliably outrank. Pin the corner from this wrapper
                          instead. */}
                      <div ref={closeCornerRef} css={styles.closeCorner}>
                        <Button
                          look="ghost"
                          icon={closeIcon ?? <XIcon weight="bold" />}
                          aria-label={closeLabel}
                          onClick={onDismiss}
                        />
                      </div>
                      <div
                        ref={mergeRefs(scrollerRef, scroller)}
                        css={[
                          styles.scroller,
                          title !== undefined && styles.scrollerTitled,
                        ]}
                      >
                        <div ref={content} css={styles.content}>
                          <EffectCarrier value={region}>
                            {title !== undefined ? (
                              <Heading
                                level={2}
                                look="h3"
                                id={titleId}
                                css={styles.title}
                              >
                                {title}
                              </Heading>
                            ) : null}
                            <SheetRecedeContext value={null}>
                              {children}
                            </SheetRecedeContext>
                          </EffectCarrier>
                        </div>
                      </div>
                    </EffectContainer>
                  </div>
                </RemoveScroll>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const EDGE_GAP = space._2;
const BOTTOM_GAP = `max(${EDGE_GAP}, env(safe-area-inset-bottom))`;
const TOP_GAP = `calc(${space._7} + env(safe-area-inset-top))`;
const CLOSE_INSET = space._2;
const CONTENT_INSET = space._3;
// The close button is an md Button, so it is as tall as the md step.
const CLOSE_SIZE = controlSize._9;
const BOUNDARY = "sheet-boundary";
const WIDE_BOUNDARY = `@container ${BOUNDARY} (width >= 768px)`;

const styles = stylex.create({
  boundary: {
    position: "relative",
    containerName: BOUNDARY,
    containerType: "inline-size",
  },
  dimContained: {
    insetBlockEnd: 0,
    blockSize: "100%",
  },
  anchorContained: {
    position: "absolute",
    inset: 0,
    overflowX: "clip",
    zIndex: layer.overlay,
    pointerEvents: "none",
  },
  // The mover is a flex column with a height cap, so the card shrinks to
  // the boundary and its scroller scrolls.
  moverContained: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    insetBlockStart: { default: "auto", [WIDE_BOUNDARY]: "50%" },
    insetBlockEnd: { default: EDGE_GAP, [WIDE_BOUNDARY]: "auto" },
    insetInlineStart: { default: EDGE_GAP, [WIDE_BOUNDARY]: "50%" },
    translate: { default: "none", [WIDE_BOUNDARY]: "-50% -50%" },
    inlineSize: {
      default: `calc(100% - 2 * ${EDGE_GAP})`,
      [WIDE_BOUNDARY]: `min(100% - 2 * ${space._7}, ${space._16})`,
    },
    maxBlockSize: {
      default: `calc(100% - ${space._7} - ${EDGE_GAP})`,
      [WIDE_BOUNDARY]: `calc(100% - 2 * ${space._8})`,
    },
    transformOrigin: "50% 100%",
  },
  cardContained: {
    minBlockSize: 0,
  },
  // A box that the layout goes through as if it is not there.
  clip: {
    display: "flex",
    flexDirection: "column",
    minBlockSize: 0,
  },
  // A box with no height in the document. Below `md` it is at the bottom of
  // the visible area, so it is on the keyboard while one is open. From `md`
  // up it is a point at the centre of the visible area.
  anchor: {
    position: "absolute",
    // Physical, so the centre is the same in either direction.
    left: { default: 0, [breakpoints.md]: "50%" },
    // As wide as the screen, so that a lift can clip the card sideways to
    // the screen.
    inlineSize: { default: "100vw", [breakpoints.md]: 0 },
    blockSize: 0,
    zIndex: layer.overlay,
    // Nothing in the anchor takes a click except the card itself.
    pointerEvents: "none",
  },
  anchorAt: (visibleBottom: string, visibleHeight: string) => ({
    insetBlockStart: {
      default: visibleBottom,
      [breakpoints.md]: `calc(${visibleBottom} - ${visibleHeight} / 2)`,
    },
  }),
  // Over the whole body and one screen below it, and one step under the
  // overlay plane, so the card, which is on that plane, stays over it. The
  // screen below the body gives Safari on iOS page to dim under its toolbar
  // at the end of the document, and where it scrolls past that end for the
  // keyboard. The card that moves below the screen stays in that screen, so
  // it does not make the document taller.
  dim: {
    position: "absolute",
    insetBlockStart: 0,
    // The body can be a fraction of a pixel shorter than the document. The
    // 1px makes sure that the dim goes a full screen past the end of the
    // document.
    insetBlockEnd: "calc(-100lvh - 1px)",
    insetInlineStart: 0,
    inlineSize: "100%",
    backgroundColor: color.bgScrim,
    zIndex: `calc(${layer.overlay} - 1)`,
  },
  // A tap on the page while the card leaves goes to the page.
  dimLeaving: {
    pointerEvents: "none",
  },
  // The mover takes its width from the viewport, not from the anchor.
  // The card fills it.
  mover: {
    position: "absolute",
    insetBlockStart: { default: "auto", [breakpoints.md]: 0 },
    insetBlockEnd: { default: BOTTOM_GAP, [breakpoints.md]: "auto" },
    left: {
      default: `calc(${EDGE_GAP} + env(safe-area-inset-left))`,
      [breakpoints.md]: 0,
    },
    translate: { default: "none", [breakpoints.md]: "-50% -50%" },
    inlineSize: {
      default: `calc(100vw - 2 * ${EDGE_GAP} - env(safe-area-inset-left) - env(safe-area-inset-right))`,
      [breakpoints.md]: `min(100vw - 2 * ${space._7}, ${space._16})`,
    },
    transformOrigin: "50% 100%",
  },
  card: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    inlineSize: "100%",
    overflow: "hidden",
    backgroundColor: color.bgSurface,
    pointerEvents: "auto",
  },
  cardFit: (visibleHeight: string) => ({
    maxBlockSize: {
      default: `calc(${visibleHeight} - ${TOP_GAP} - ${BOTTOM_GAP})`,
      [breakpoints.md]: `calc(${visibleHeight} - 2 * ${space._8})`,
    },
  }),
  grabber: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    display: { default: "flex", [breakpoints.md]: "none" },
    justifyContent: "center",
    paddingBlockStart: space._1,
    inlineSize: space._10,
    blockSize: space._5,
    marginInline: "auto",
    // The grabber moves the card for every pointer, so the browser must not
    // take its touches for a scroll or a zoom.
    touchAction: "none",
    userSelect: "none",
    // Over the canvases of the Scroll region.
    zIndex: layer.raised,
  },
  grabberBar: {
    inlineSize: space._7,
    blockSize: space._0,
    backgroundColor: color.bgNeutral,
  },
  scroller: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    touchAction: "pan-x pan-y",
    // The top clears the close button in the card's corner. A sticky box in
    // the content stops at this padding, so it stays on the scroller.
    paddingBlockStart: space._8,
    paddingBlockEnd: space._7,
  },
  // The content box of the Scroll region. The effect layer puts the canvases
  // of the region at its end, so they cover the inline padding too.
  content: {
    position: "relative",
    paddingInline: CONTENT_INSET,
  },
  // The title takes the close button's row, so the content starts level
  // with the button.
  scrollerTitled: {
    paddingBlockStart: CLOSE_INSET,
  },
  // As tall as the close button and centred on it. The inline end keeps
  // clear of the button.
  title: {
    display: "flex",
    alignItems: "center",
    minBlockSize: CLOSE_SIZE,
    paddingInlineEnd: `calc(${CLOSE_INSET} + ${CLOSE_SIZE} + ${rhythm.tight} - ${CONTENT_INSET})`,
    marginBlockEnd: rhythm.tight,
  },
  closeCorner: {
    position: "absolute",
    insetInlineEnd: CLOSE_INSET,
    insetBlockStart: CLOSE_INSET,
    // Above the consumer's content and the canvases of the Scroll region,
    // since the close affordance is the sheet's own chrome, not the
    // consumer's.
    zIndex: layer.raised,
  },
});
