"use client";

import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { RemoveScroll } from "react-remove-scroll";
import {
  duration,
  easing,
  motionConstants,
} from "../../primitives/motion.stylex.ts";
import {
  border,
  color,
  controlSize,
  font,
  layer,
  space,
} from "../../tokens.stylex.ts";
import { FixedContainerContent } from "../surfaces/fixed-container-content.tsx";
import { popoverSurface } from "../surfaces/popover-surface.stylex.ts";
import { ProgressiveBlur } from "../surfaces/progressive-blur.tsx";
import { Button } from "./button.tsx";
import { useRovingFocus } from "./use-roving-focus.ts";
import { useSheetCap } from "./use-sheet-cap.ts";
import { useSurfaceMorph } from "./use-surface-morph.ts";

// Long reach, modest radius: the ramp is gradual, so the blur reads as the
// page losing focus, not a ring.
const BLUR_REACH_PX = 96;
const BLUR_RADIUS_PX = 12;

interface MenuButtonProps {
  /** Button prop overrides */
  buttonProps: Partial<ComponentProps<typeof Button>>;
  /** The node to render into the expanded menu. */
  menuContent: ReactNode;
  /**
   * Which of the trigger's logical corners the menu expands from, or
   * `"sheet"` to span the bar the trigger sits in. Pick a corner that grows
   * the menu back across the trigger, since one that overhangs the viewport
   * edge stays in the page's scrollable area even while the menu is closed.
   */
  position?: "topRight" | "topLeft" | "bottomLeft" | "bottomRight" | "sheet";
  /** Disable the menu trigger. */
  disabled?: boolean;
  /**
   * ARIA role for the popup content. Defaults to `"menu"`, which brings the menu
   * keyboard model and `aria-haspopup="menu"`; pass `"group"` when the popup
   * holds anything other than `role="menuitem"` children, so it isn't announced
   * as an empty menu.
   */
  popupRole?: "menu" | "group";
}

/** A button that expands into a menu. */
export function MenuButton({
  children,
  buttonProps,
  menuContent,
  position = "topRight",
  disabled,
  popupRole = "menu",
}: PropsWithChildren<MenuButtonProps>) {
  const [isMenuShown, setIsMenuShown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const isSheet = position === "sheet";

  const targetId = useId();
  const popupId = `${targetId}-popup`;

  useSheetCap({ frameRef, popupRef, isSheet, isMenuShown });
  // After the sheet cap, so that the morph measures the capped size.
  useSurfaceMorph({ frameRef, surfaceRef, targetId, isMenuShown });

  const onMenuKeyDown = useRovingFocus({
    popupRef,
    isMenuShown,
    enabled: popupRole === "menu",
  });

  const outsideClickedRef = useRef(false);
  useEffect(() => {
    if (isMenuShown) {
      outsideClickedRef.current = false;
    }
  }, [isMenuShown]);

  // Escape and backdrop click restore focus to the trigger. onBlur doesn't:
  // by then focus has already moved to wherever the user tabbed.
  // `preventScroll`, because the trigger is on screen under its own open menu,
  // yet a trigger in a scroller's sticky chrome sits inside that scroller's
  // scroll-padding — the default reveal scrolls the scroller and cannot ever
  // satisfy it.
  const closeAndRestoreFocus = () => {
    setIsMenuShown(false);
    document.getElementById(targetId)?.focus({ preventScroll: true });
  };

  return (
    <div
      css={[styles.container, isSheet && styles.staticContainer]}
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && isMenuShown) {
          e.stopPropagation();
          closeAndRestoreFocus();
          return;
        }
        onMenuKeyDown(e);
      }}
      onBlur={(e) => {
        if (
          isMenuShown &&
          !containerRef.current?.contains(e.relatedTarget) &&
          !outsideClickedRef.current
        ) {
          setIsMenuShown(false);
        }
      }}
    >
      {/* Must stay inside the container: a blur around the trigger's group
            measures the container's siblings. */}
      {isMenuShown && (
        <div
          css={styles.backdrop}
          aria-hidden="true"
          onClick={() => {
            outsideClickedRef.current = true;
            closeAndRestoreFocus();
          }}
        />
      )}
      <FixedContainerContent>
        <Button
          {...buttonProps}
          aria-expanded={isMenuShown}
          aria-haspopup={popupRole === "menu" ? "menu" : undefined}
          aria-controls={popupId}
          onClick={(event) => {
            buttonProps.onClick?.(event);
            setIsMenuShown(true);
          }}
          disabled={disabled ?? buttonProps.disabled}
          id={targetId}
          labelId={`${targetId}-label`}
        >
          {children && <span>{children}</span>}
        </Button>
      </FixedContainerContent>
      <div css={[styles.menuContainer, styles[position]]} inert={!isMenuShown}>
        {/* Wraps the frame, not the container, so corner insets anchor the
              popup's box, not the blur's. isOnPlane=false: a popup covers its
              surrounding chrome, so its blur must paint above that chrome,
              not on the shared Blur plane. */}
        <ProgressiveBlur
          reach={BLUR_REACH_PX}
          radius={BLUR_RADIUS_PX}
          isShown={isMenuShown}
          isOnPlane={false}
        >
          {/* The blur's slot hands pointer events back on, so the frame
                switches them off again while closed. */}
          <div
            ref={frameRef}
            css={[styles.frame, !isMenuShown && styles.hidden]}
          >
            <div ref={surfaceRef} css={[popoverSurface.base, styles.surface]} />
            {/* The blur's fixed box lags the compositor by a frame, so the
                  page must not scroll under an open menu. This RemoveScroll
                  also sets the CSS var `HeaderFooterLayout` reads for its own
                  scrollbar compensation. */}
            <RemoveScroll
              ref={popupRef}
              enabled={isMenuShown}
              allowPinchZoom
              forwardProps
            >
              <div
                id={popupId}
                role={popupRole}
                aria-labelledby={children ? `${targetId}-label` : targetId}
                css={[
                  popoverSurface.inner,
                  styles.content,
                  isMenuShown && styles.contentShown,
                  isSheet && styles.sheetScroller,
                ]}
              >
                {/* Hidden: aria-labelledby already names the popup, and a
                      bare node here would be invalid inside role="menu". */}
                {children && (
                  <div
                    css={[styles.menuTitle, isSheet && styles.stickyMenuTitle]}
                    aria-hidden
                  >
                    {children}
                  </div>
                )}
                {menuContent}
              </div>
            </RemoveScroll>
          </div>
        </ProgressiveBlur>
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: {
    position: "relative",
    display: "inline-block",
  },
  // `raised`, not `overlay`: the menu belongs to the page, so it lifts over the
  // content around it but still scrolls away under a fixed header.
  menuContainer: {
    position: "absolute",
    zIndex: layer.raised,
  },
  hidden: {
    pointerEvents: "none",
  },
  // This box is what the morph, the sheet cap, and the blur all measure.
  frame: {
    position: "relative",
  },
  // The only element that animates geometry. It has no children, so the
  // browser lays out and paints one box per frame.
  surface: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    opacity: 0,
  },
  // Sits at its final size from the start and only fades, so the type never
  // scales. The margin puts it inside the surface's hairline, so a sticky title
  // painting its own background never covers the edge.
  content: {
    position: "relative",
    margin: border.size_1,
    overflowX: "hidden",
    overflowY: "hidden",
    opacity: 0,
    filter: {
      default: "blur(5px)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transitionProperty: {
      default: "opacity, filter",
      [motionConstants.REDUCED_MOTION]: "opacity",
    },
    transitionTimingFunction: {
      default: easing.easeOut,
      [motionConstants.REDUCED_MOTION]: easing.easeInOut,
    },
    transitionDuration: {
      default: duration._100,
      [motionConstants.REDUCED_MOTION]: duration._150,
    },
  },
  contentShown: {
    opacity: 1,
    filter: {
      default: "blur(0px)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transitionDuration: {
      default: duration._200,
      [motionConstants.REDUCED_MOTION]: duration._150,
    },
    // The delay lets the surface grow first.
    transitionDelay: {
      default: duration._100,
      [motionConstants.REDUCED_MOTION]: "0s",
    },
  },
  menuTitle: {
    fontSize: font.uiControlCaption,
    paddingBlockStart: controlSize._2,
    paddingBlockEnd: controlSize._1,
    paddingInline: controlSize._3,
    color: color.textMuted,
  },
  topRight: {
    insetBlockStart: 0,
    insetInlineEnd: 0,
  },
  topLeft: {
    insetBlockStart: 0,
    insetInlineStart: 0,
  },
  bottomLeft: {
    insetBlockEnd: 0,
    insetInlineStart: 0,
  },
  bottomRight: {
    insetBlockEnd: 0,
    insetInlineEnd: 0,
  },
  // Sheet mode takes the trigger's wrapper out of the positioning chain so the
  // popup resolves against the bar the trigger sits in.
  staticContainer: {
    position: "static",
  },
  // Absolute, not fixed: a fixed box with auto block insets keeps its static
  // position, so on a sticky bar the sheet would render off-screen.
  sheet: {
    insetBlockStart: 0,
    insetInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    insetInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  // A sheet can outgrow the room under its bar, so it scrolls itself. `contain`
  // keeps a flick that reaches the end from scrolling the page behind.
  sheetScroller: {
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  // z-index required: `Button`'s resting `transform`/`filter` makes every
  // button its own stacking context, which would otherwise paint over this
  // heading while scrolling past.
  stickyMenuTitle: {
    position: "sticky",
    insetBlockStart: 0,
    backgroundColor: color.bgOverlay,
    zIndex: layer.content,
  },
  // Relies on `position: fixed` resolving to the viewport: a `transform`,
  // `filter`, `contain`, or `will-change: transform` on any ancestor silently
  // breaks outside-click dismissal. The same ancestor property also clips and
  // moves the blur's fixed box.
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: layer.raised,
  },
});
