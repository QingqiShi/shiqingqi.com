"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { RemoveScroll } from "react-remove-scroll";
import { Button } from "../actions/button.tsx";
import { breakpoints } from "../breakpoints.stylex.ts";
import { Heading } from "../content/heading.tsx";
import { publishSheetPose } from "../effect-layer/publish-sheet-pose.ts";
import { useEffectCover } from "../effect-layer/use-effect-cover.ts";
import { useEffectStage } from "../effect-layer/use-effect-stage.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { useIsHydrated } from "../hooks/use-is-hydrated.ts";
import { useVisibleArea } from "../hooks/use-visible-area.ts";
import { mergeRefs } from "../merge-refs.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { color, controlSize, layer, rhythm, space } from "../tokens.stylex.ts";
import {
  createSheetController,
  type SheetController,
} from "./create-sheet-controller.ts";
import {
  createThickCard,
  THICK_CARD_DEFAULTS,
  type ThickCardDials,
} from "./create-thick-card.ts";
import { Portal } from "./portal.tsx";

interface SheetBaseProps {
  /**
   * The sheet's content. The card pads it, fits its height up to the
   * viewport and scrolls it beyond that. With a `title`, the content starts
   * under the title; without one, it starts under the close button. A sticky
   * box in the content sticks inside that padding. The content unmounts after
   * the sheet closes and remounts on every open, so lift any state that has
   * to survive the round trip.
   *
   * @zh 面板的内容。卡片为内容加上内边距，高度随内容而定，最高到视口，超出后在卡片内滚动。有 `title` 时内容从标题下方开始；没有时从关闭按钮下方开始。内容中的 sticky 盒子会停在这层内边距之内。面板关闭后内容卸载，每次打开都会重新挂载，需要跨越开合保留的状态请提升到外部。
   */
  children?: ReactNode;
  /**
   * Whether the sheet is shown; the consumer owns this state.
   *
   * @zh 面板是否显示；该状态由使用方掌控。
   */
  isOpen: boolean;
  /**
   * Called when the user asks to close the sheet: Escape, a click on the dim,
   * the close button, or a drag down. The sheet starts to leave at once and
   * finishes leaving when `isOpen` turns false.
   *
   * @zh 用户请求关闭面板时调用：Escape、点击暗化层、关闭按钮或向下拖动。面板会立即开始离场，并在 `isOpen` 变为 false 后完成离场。
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
   * How the card comes and goes. `plain` slides or rises it flat. `thick`
   * tilts it as it moves, so that its top edge comes towards the viewer and
   * shows the card as a slab with a thick, rounded edge; it settles flat,
   * and at rest it is the plain card. Without WebGPU, with effects off,
   * under forced colours or reduced motion, `thick` is `plain`.
   *
   * @default "plain"
   * @zh 卡片出现与消失的方式。`plain` 为平移或平稳升起。`thick` 在移动时让卡片倾斜，顶边朝向观看者，使卡片显出带圆润厚边的板状；最后平稳落定，静止时与普通卡片相同。没有 WebGPU、效果关闭、强制颜色或减少动态时，`thick` 等同于 `plain`。
   */
  motion?: "plain" | "thick";
  /**
   * Lab-only dials for the `thick` motion.
   *
   * @internal
   */
  thickDials?: ThickCardDials;
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
 * an on-screen keyboard. It owns the focus trap, the scroll lock, Escape, the
 * dim and the close button; the consumer supplies the content and the
 * localized close label. It portals to `document.body`.
 */
export function Sheet({
  children,
  isOpen,
  onClose,
  closeLabel,
  closeIcon,
  initialFocusRef,
  motion = "plain",
  thickDials = THICK_CARD_DEFAULTS,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SheetProps) {
  const [isMounted, setIsMounted] = useState(isOpen);
  if (isOpen && !isMounted) setIsMounted(true);

  const isHydrated = useIsHydrated();
  const titleId = useId();
  const hasTitle = title !== undefined;
  const cardRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const grabberRef = useRef<HTMLDivElement>(null);
  const closeCornerRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SheetController | null>(null);
  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  const coverRef = useEffectCover();
  const { ref: stageRef, overRef } = useEffectStage(true, STAGE_REACH);
  const [thick] = useState(createThickCard);
  const motionRef = useRef({ motion, dials: thickDials });
  const visibleAreaRef = useVisibleArea();
  const moverRefs = mergeRefs(moverRef, coverRef, stageRef);

  useLayoutEffect(() => {
    isOpenRef.current = isOpen;
    onCloseRef.current = onClose;
    motionRef.current = { motion, dials: thickDials };
  });

  const requestClose = () => {
    controllerRef.current?.hide();
    onCloseRef.current();
  };

  useEffect(() => {
    if (motion === "thick") thick.warm();
  }, [motion, thick]);

  useDialogFocus({
    isOpen: isOpen && isHydrated,
    dialogRef: cardRef,
    onClose: requestClose,
    initialFocusRef,
  });

  useLayoutEffect(() => {
    const card = cardRef.current;
    const mover = moverRef.current;
    if (!isMounted || !card || !mover) return;
    const controller = createSheetController({
      card,
      mover,
      onPose: (pose) => {
        publishSheetPose(card, pose);
      },
      thick: () =>
        motionRef.current.motion === "thick"
          ? { card: thick, dials: motionRef.current.dials }
          : null,
      scroller: () => scrollerRef.current,
      grabber: () => grabberRef.current,
      closeCorner: () => closeCornerRef.current,
      dim: () => dimRef.current,
      onDismiss: () => {
        onCloseRef.current();
      },
      onExited: () => {
        if (isOpenRef.current) {
          controller.show();
        } else {
          setIsMounted(false);
        }
      },
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [isMounted, isHydrated, thick]);

  useLayoutEffect(() => {
    if (isOpen) {
      controllerRef.current?.show();
    } else {
      controllerRef.current?.hide();
    }
  }, [isOpen, isMounted, isHydrated]);

  if (!isMounted) return null;

  // Safari on iOS paints no fixed box below the top of its bottom toolbar,
  // so the dim and the card are in the document. Then nothing of the sheet
  // is in the boxes that Safari samples for the colour of its chrome.
  return (
    <>
      <Portal target={undefined}>
        <div
          ref={dimRef}
          css={styles.dim}
          onClick={requestClose}
          aria-hidden="true"
        />
        <div ref={visibleAreaRef} css={styles.anchor}>
          {/* The mover is what the controller moves and fades. It is an
            Effect stage: it carries the effect layer's canvas over the
            card, so effects move with the card on the compositor and never
            lag it. */}
          <div ref={moverRefs} css={styles.mover}>
            {/* forwardProps makes RemoveScroll clone its child and inject its
              own ref, which would clobber a ref placed directly on the card.
              Passing the ref through RemoveScroll keeps `cardRef` working for
              focus and the Tab trap. */}
            <RemoveScroll ref={cardRef} allowPinchZoom forwardProps>
              <div
                css={[corner.radius_4, styles.card]}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={hasTitle ? titleId : ariaLabelledBy}
              >
                <div ref={grabberRef} css={styles.grabber} aria-hidden="true">
                  <span css={[corner.radius_round, styles.grabberBar]} />
                </div>
                {/* `Button` sets its own `position: relative` for its busy
                  spinner, which a caller's `position: absolute` can't
                  reliably outrank. Pin the corner from this wrapper instead. */}
                <div ref={closeCornerRef} css={styles.closeCorner}>
                  <Button
                    look="ghost"
                    icon={closeIcon ?? <XIcon weight="bold" />}
                    aria-label={closeLabel}
                    onClick={requestClose}
                  />
                </div>
                <div
                  ref={scrollerRef}
                  css={[styles.scroller, hasTitle && styles.scrollerTitled]}
                >
                  {hasTitle ? (
                    <Heading
                      level={2}
                      look="h3"
                      id={titleId}
                      css={styles.title}
                    >
                      {title}
                    </Heading>
                  ) : null}
                  {children}
                </div>
              </div>
            </RemoveScroll>
            <canvas
              ref={overRef}
              css={styles.overCanvas}
              aria-hidden="true"
              width={0}
              height={0}
            />
          </div>
        </div>
      </Portal>
    </>
  );
}

// The properties `useVisibleArea` writes on the anchor.
const VISIBLE_BOTTOM = "var(--visible-bottom, 100dvh)";
const VISIBLE_HEIGHT = "var(--visible-height, 100dvh)";
const EDGE_GAP = space._2;
const BOTTOM_GAP = `max(${EDGE_GAP}, env(safe-area-inset-bottom))`;
const TOP_GAP = `calc(${space._7} + env(safe-area-inset-top))`;
const CLOSE_INSET = space._2;
const CONTENT_INSET = space._3;
// The close button is an md Button, so it is as tall as the md step.
const CLOSE_SIZE = controlSize._9;
const STAGE_REACH = { rise: 16, spill: 8, fall: 200 };
const STAGE_RISE = "16px";
const STAGE_SPILL = "8px";

const styles = stylex.create({
  // A 0 x 0 box in the document. Below `md` it is at the bottom of the
  // visible area, so it is on the keyboard while one is open. From `md` up
  // it is at the centre of the visible area.
  anchor: {
    position: "absolute",
    insetBlockStart: {
      default: VISIBLE_BOTTOM,
      [breakpoints.md]: `calc(${VISIBLE_BOTTOM} - ${VISIBLE_HEIGHT} / 2)`,
    },
    // Physical, so the centre is the same in either direction.
    left: { default: 0, [breakpoints.md]: "50%" },
    inlineSize: 0,
    blockSize: 0,
    zIndex: layer.overlay,
    // Nothing in the anchor takes a click except the card itself.
    pointerEvents: "none",
  },
  // Over the whole document, and one step under the overlay plane, so the
  // card, which is on that plane, stays over it. The sheet's controller sets
  // its height when the sheet opens.
  dim: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: "100%",
    blockSize: "calc(100% + 100lvh)",
    backgroundColor: color.bgDim,
    zIndex: `calc(${layer.overlay} - 1)`,
  },
  // The anchor has no size, so the mover takes its width from the viewport.
  // It is the box the controller moves, and the card fills it.
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
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    inlineSize: "100%",
    maxBlockSize: {
      default: `calc(${VISIBLE_HEIGHT} - ${TOP_GAP} - ${BOTTOM_GAP})`,
      [breakpoints.md]: `calc(${VISIBLE_HEIGHT} - 2 * ${space._8})`,
    },
    overflow: "hidden",
    backgroundColor: color.bgSurface,
    pointerEvents: "auto",
  },
  // The effect layer sizes the canvas to the mover and its reach above.
  // Physical offsets, since the layer places it in page coordinates.
  overCanvas: {
    position: "absolute",
    top: `calc(-1 * ${STAGE_RISE})`,
    left: `calc(-1 * ${STAGE_SPILL})`,
    display: "block",
    pointerEvents: "none",
  },
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
    zIndex: layer.content,
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
    // The top clears the close button in the card's corner.
    paddingBlockStart: space._8,
    paddingBlockEnd: space._7,
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
    // Above the consumer's content, since the close affordance is the
    // sheet's own chrome, not the consumer's.
    zIndex: layer.content,
  },
});
