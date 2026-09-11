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
import { useControlled } from "../../hooks/use-controlled.ts";
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

interface MenuButtonBaseProps {
  /**
   * The trigger's visible label, repeated at the top of the popup as its
   * title. It names the popup through `aria-labelledby`, so the repeat is
   * `aria-hidden`. With no label the popup is named by the trigger itself.
   *
   * @zh 触发按钮的可见标签，并在弹层顶部重复一次作为标题。它通过 `aria-labelledby` 为弹层命名，因此重复的那份标记为 `aria-hidden`。没有标签时，弹层由触发按钮本身命名。
   */
  children?: ReactNode;
  /**
   * Props forwarded to the trigger `Button` (e.g. `icon`, `look`, `disabled`).
   *
   * @zh 转发给触发 `Button` 的属性（例如 `icon`、`look`、`disabled`）。
   */
  buttonProps: Partial<ComponentProps<typeof Button>>;
  /**
   * Content rendered into the expanded popup.
   *
   * @zh 渲染进展开弹层的内容。
   */
  menuContent: ReactNode;
  /**
   * Which of the trigger's logical corners the menu expands from, or
   * `"sheet"` to span the bar the trigger sits in. Pick a corner that grows
   * the menu back across the trigger, since one that overhangs the viewport
   * edge stays in the page's scrollable area even while the menu is closed.
   *
   * @zh 菜单从触发元素的哪个逻辑角展开，或使用 `"sheet"` 横跨触发按钮所在的工具栏。请选择朝触发按钮方向展开的角——若某个角会让菜单探出视口边缘，菜单即便处于关闭状态，也会一直占据页面的可滚动区域。
   */
  position?: "topRight" | "topLeft" | "bottomLeft" | "bottomRight" | "sheet";
  /**
   * Disable the menu trigger.
   *
   * @zh 禁用触发按钮。
   */
  disabled?: boolean;
  /**
   * ARIA role for the popup content. `"menu"` moves focus into the popup on
   * open and roves its `role="menuitem"` children; `"group"` leaves focus on
   * the trigger and the arrow keys to the browser — use it when the popup
   * holds controls rather than commands, so it isn't announced as an empty
   * menu.
   *
   * @zh 弹层内容的 ARIA 角色。`"menu"` 会在打开时把焦点移入弹层，并在其 `role="menuitem"` 子元素间移动焦点；`"group"` 让焦点留在触发按钮上，方向键交还浏览器——弹层装的是控件而非命令时使用，避免被宣读为空菜单。
   */
  popupRole?: "menu" | "group";
}

/**
 * A controlled menu whose parent never hears about the toggle is a dead
 * control: `useControlled` hands back a no-op setter while `open` is supplied,
 * so without `onOpenChange` nothing can ever close it.
 */
type MenuButtonStateProps =
  | {
      /**
       * Controlled open state. Requires `onOpenChange`.
       *
       * @zh 受控的展开状态。类型要求同时提供 onOpenChange，因为父组件收不到通知的受控菜单永远无法关闭。
       */
      open: boolean;
      /**
       * Called with the next state on every open or close.
       *
       * @zh 每次展开和关闭时以下一状态调用，无论由什么触发。
       */
      onOpenChange: (open: boolean) => void;
    }
  | {
      open?: undefined;
      /**
       * Called with the next state on every open or close.
       *
       * @zh 每次展开和关闭时以下一状态调用，无论由什么触发。
       */
      onOpenChange?: (open: boolean) => void;
    };

type MenuButtonProps = MenuButtonBaseProps & MenuButtonStateProps;

/** The least share of the viewport a Sheet needs under its bar to open down. */
const SHEET_ROOM_BELOW = 1 / 3;

/**
 * A Sheet spans its bar and grows into the room beside it, so it opens away
 * from the nearer viewport edge: down from a bar at the top, up from a bar at
 * the foot. The share above is generous on purpose — a bar in mid-page has
 * room either way, and it keeps opening down.
 */
function opensUpwardFrom(trigger: HTMLElement) {
  const roomBelow = window.innerHeight - trigger.getBoundingClientRect().top;
  return roomBelow < window.innerHeight * SHEET_ROOM_BELOW;
}

/** A button that expands into a menu. */
export function MenuButton({
  children,
  buttonProps,
  menuContent,
  position = "topRight",
  disabled,
  popupRole = "menu",
  open: controlledOpen,
  onOpenChange,
}: PropsWithChildren<MenuButtonProps>) {
  const [isMenuShown, setInternalMenuShown] = useControlled({
    controlled: controlledOpen,
    defaultValue: false,
  });
  const setIsMenuShown = (next: boolean) => {
    setInternalMenuShown(next);
    onOpenChange?.(next);
  };
  const [opensUpward, setOpensUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const isSheet = position === "sheet";

  const targetId = useId();
  const popupId = `${targetId}-popup`;

  useSheetCap({ frameRef, popupRef, isSheet, isMenuShown, opensUpward });
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

  // A parent that closes the menu leaves focus in a box that is about to go
  // inert, so the trigger takes it back. Focus that has already landed on an
  // element outside the menu is the visitor's own move — usually a Tab out —
  // and must stay where it is.
  const wasMenuShownRef = useRef(isMenuShown);
  useEffect(() => {
    const wasMenuShown = wasMenuShownRef.current;
    wasMenuShownRef.current = isMenuShown;
    if (!wasMenuShown || isMenuShown) return;
    const focused = document.activeElement;
    if (focused !== document.body && !containerRef.current?.contains(focused)) {
      return;
    }
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }, [isMenuShown, targetId]);

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
            if (isSheet) {
              setOpensUpward(opensUpwardFrom(event.currentTarget));
            }
            setIsMenuShown(true);
          }}
          disabled={disabled ?? buttonProps.disabled}
          id={targetId}
          labelId={`${targetId}-label`}
        >
          {children && <span>{children}</span>}
        </Button>
      </FixedContainerContent>
      <div
        css={[
          styles.menuContainer,
          styles[position],
          isSheet && opensUpward && styles.sheetAbove,
        ]}
        inert={!isMenuShown}
      >
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
  // A Sheet opens away from the nearer viewport edge, so one on a bar at the
  // foot of the viewport grows up over the bar instead of down off the screen.
  sheetAbove: {
    insetBlockStart: "auto",
    insetBlockEnd: 0,
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
