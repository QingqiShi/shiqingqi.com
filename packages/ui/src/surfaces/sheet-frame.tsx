"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { use, useId, useLayoutEffect, useRef, useState } from "react";
import { RemoveScroll } from "react-remove-scroll";
import { Button } from "../actions/button.tsx";
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
import { useFlowBlock } from "../motion/use-flow-block.tsx";
import { corner } from "../primitives/corner.stylex.ts";
import { lockPageScroll } from "./lock-page-scroll.ts";
import { SheetRecedeContext } from "./sheet-recede-context.ts";
import { styles } from "./sheet.stylex.ts";
import type { SheetProps } from "./sheet.tsx";
import { useSheetDrag } from "./use-sheet-drag.ts";
import { useSheetMotion } from "./use-sheet-motion.ts";

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
 *
 * @internal
 */
export function SheetFrame({
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
  const { ref: flowRef, skin } = useFlowBlock({ surface: true });
  const cardMergedRef = mergeRefs(cardRef, container, flowRef);

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
                  ref={cardMergedRef}
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
                    {skin}
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
