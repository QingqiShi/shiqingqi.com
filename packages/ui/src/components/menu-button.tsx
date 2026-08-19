"use client";

import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { corner } from "../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import {
  color,
  controlSize,
  font,
  layer,
  shadow,
  space,
} from "../tokens.stylex.ts";
import { Button } from "./button.tsx";
import { FixedContainerContent } from "./fixed-container-content.tsx";

// Derived from the StyleX const rather than restated, so the JS-side check
// cannot drift from the style-side one — `matchMedia` takes the bare condition,
// while the StyleX const carries the `@media ` prefix.
const REDUCED_MOTION_QUERY = motionConstants.REDUCED_MOTION.replace(
  "@media ",
  "",
);

// An empty value drops the inline override, so the surface goes back to the
// stylesheet: the full box of its container. It then keeps that box if the
// popup changes size while it is open.
const FULL_BOX = {
  top: "",
  left: "",
  width: "",
  height: "",
  borderRadius: "",
  cornerShape: "",
};

function morphTransition(time: string, timingFunction: string) {
  // Physical properties, not logical: the morph writes measured viewport
  // coordinates into them, which do not flip in RTL.
  return ["top", "left", "width", "height", "border-radius"]
    .map((property) => `${property} ${time} ${timingFunction}`)
    .join(", ");
}

function setSurfaceBox(surface: HTMLElement, box: typeof FULL_BOX) {
  Object.assign(surface.style, box);
}

// A bare `void element.offsetHeight` in a component does not survive React
// Compiler: it takes property reads as pure and removes the unused read, so
// the surface never commits its start box. A call is opaque to it, and this
// module-level function is outside what it compiles.
function forceReflow(element: HTMLElement) {
  void element.offsetHeight;
}

const OPEN_TRANSITION = morphTransition(duration._500, easing.spring);
const OPEN_TRANSITION_FALLBACK = morphTransition(
  duration._500,
  easing.springFallback,
);
// The fade comes at the tail, so the surface stays visible until it is back
// over the trigger.
const CLOSE_TRANSITION = `${morphTransition(duration._300, easing.entrance)}, opacity ${duration._100} ${easing.linear} ${duration._200}`;
const REDUCED_FADE = `opacity ${duration._150} ${easing.easeInOut}`;

interface MenuButtonProps {
  /** Button prop overrides */
  buttonProps: Partial<ComponentProps<typeof Button>>;
  /** The node to render into the expanded menu. */
  menuContent: ReactNode;
  /**
   * Which of the trigger's corners the menu expands from, or `"sheet"` to span
   * the bar the trigger sits in. Corner names are logical-direction-aware:
   * `Right` anchors to the inline-end edge and `Left` to the inline-start edge,
   * so the menu mirrors automatically in RTL locales.
   *
   * Pick the corner that grows the menu back across the trigger, not out past
   * the nearest viewport edge: a closed menu is hidden rather than unmounted, so
   * a menu wider than the room on that side adds its overhang to the page's
   * scrollable area whether or not anyone ever opens it.
   *
   * `"sheet"` is for popups too wide to sit beside a trigger that isn't at the
   * end of its row: it spans the trigger's nearest positioned ancestor instead
   * of the trigger itself, so use it only for a trigger inside a full-bleed bar
   * or toolbar.
   */
  position?: "topRight" | "topLeft" | "bottomLeft" | "bottomRight" | "sheet";
  /** Disable the menu trigger. */
  disabled?: boolean;
  /**
   * ARIA role for the popup content. Defaults to `"menu"` — use it (or omit the
   * prop) only when the popup contains `role="menuitem"` children; the menu
   * keyboard model (roving focus, arrow/Home/End) and `aria-haspopup="menu"`
   * apply. Pass `"group"` when the popup holds other content or controls
   * (toggle buttons, informational text) so it isn't announced as an empty menu.
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
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const isSheet = position === "sheet";

  const targetId = useId();
  const popupId = `${targetId}-popup`;

  // A sheet hangs from a bar that may not be where it finally settles: a sticky
  // bar sits further down the viewport until it reaches its stuck offset, so the
  // room left underneath is only knowable at runtime. Measure it on open and
  // again while the bar slides, so the sheet always ends inside the viewport
  // instead of running off the bottom. Written straight to the node rather than
  // kept in state: nothing else reads it, and a scroll gesture would otherwise
  // re-render the popup every frame. The cap deliberately survives closing —
  // dropping it would let the panel snap to full height mid-close-animation.
  useLayoutEffect(() => {
    const sheet = menuContainerRef.current;
    const popup = popupRef.current;
    if (!isSheet || !isMenuShown || !sheet || !popup) return;

    const measure = () => {
      const { top } = sheet.getBoundingClientRect();
      popup.style.maxBlockSize = `calc(100dvh - ${String(top)}px - ${space._3} - env(safe-area-inset-bottom))`;
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [isMenuShown, isSheet]);

  // The popup opens with a surface morph: a childless box grows from the
  // trigger to the popup, while the content stays at its final size and only
  // fades. A frame therefore costs the layout and the paint of one box.
  //
  // This effect must stay after the sheet cap above, so that it measures the
  // capped size.
  const wasMenuShownRef = useRef(isMenuShown);
  useLayoutEffect(() => {
    if (wasMenuShownRef.current === isMenuShown) return;
    wasMenuShownRef.current = isMenuShown;

    const surface = surfaceRef.current;
    const container = menuContainerRef.current;
    const trigger = document.getElementById(targetId);
    if (!surface || !container || !trigger) return;

    // Reduced motion drops the geometry: the surface cross-fades in place.
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      surface.style.transition = "none";
      setSurfaceBox(surface, FULL_BOX);
      forceReflow(surface);
      surface.style.transition = REDUCED_FADE;
      surface.style.opacity = isMenuShown ? "1" : "0";
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const triggerBox = {
      top: `${String(triggerRect.top - containerRect.top)}px`,
      left: `${String(triggerRect.left - containerRect.left)}px`,
      width: `${String(triggerRect.width)}px`,
      height: `${String(triggerRect.height)}px`,
      // A pill or a circle carries `corner.radius_round`, the `1e5px` sentinel
      // of `border.radius_round`. Cap it, or the spring swings that number
      // through zero and the corners go square in the middle of the morph.
      borderRadius: `min(${getComputedStyle(trigger).borderTopLeftRadius}, ${String(Math.min(triggerRect.width, triggerRect.height) / 2)}px)`,
      // The radius alone. The surface keeps the squircle shape that
      // `corner.radius_2` gives it, even when it starts from a capped pill.
      cornerShape: "",
    };

    if (isMenuShown) {
      surface.style.transition = "none";
      setSurfaceBox(surface, triggerBox);
      surface.style.opacity = "1";
      // Commit the trigger's box, so that the morph below starts from it.
      forceReflow(surface);

      // A browser without `linear()` rejects the second assignment, and the
      // CSSOM keeps the bezier written by the first.
      surface.style.transition = OPEN_TRANSITION_FALLBACK;
      surface.style.transition = OPEN_TRANSITION;
      setSurfaceBox(surface, FULL_BOX);
      return;
    }

    surface.style.transition = CLOSE_TRANSITION;
    setSurfaceBox(surface, triggerBox);
    surface.style.opacity = "0";
  }, [isMenuShown, targetId]);

  const outsideClickedRef = useRef(false);
  useEffect(() => {
    if (isMenuShown) {
      outsideClickedRef.current = false;
    }
  }, [isMenuShown]);

  // When a menu opens, move focus into it per WAI-ARIA Authoring Practices.
  // Prefer the item flagged with `data-menu-autofocus="true"` (e.g. "start
  // on the choice I'd switch to"), otherwise the first menu item.
  useEffect(() => {
    if (!isMenuShown || popupRole !== "menu") return;
    const popup = popupRef.current;
    if (!popup) return;
    const target =
      popup.querySelector<HTMLElement>('[data-menu-autofocus="true"]') ??
      popup.querySelector<HTMLElement>('[role="menuitem"]');
    target?.focus();
  }, [isMenuShown, popupRole]);

  // Both intentional close paths (Escape, backdrop click) restore focus to
  // the trigger per the WAI-ARIA Menu Button pattern. The onBlur close path
  // deliberately doesn't call this — focus has already moved to wherever
  // the user tabbed, and snapping it back would fight their intent.
  const closeAndRestoreFocus = () => {
    setIsMenuShown(false);
    document.getElementById(targetId)?.focus();
  };

  return (
    <>
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
      <div
        css={[styles.container, isSheet && styles.staticContainer]}
        ref={containerRef}
        onKeyDown={(e) => {
          if (e.key === "Escape" && isMenuShown) {
            e.stopPropagation();
            closeAndRestoreFocus();
            return;
          }

          // Arrow / Home / End navigation only applies to the menu pattern.
          if (popupRole !== "menu" || !isMenuShown) return;
          if (
            e.key !== "ArrowDown" &&
            e.key !== "ArrowUp" &&
            e.key !== "Home" &&
            e.key !== "End"
          ) {
            return;
          }

          const popup = popupRef.current;
          if (!popup) return;
          const items = Array.from(
            popup.querySelectorAll<HTMLElement>('[role="menuitem"]'),
          );
          if (items.length === 0) return;

          e.preventDefault();
          e.stopPropagation();

          const currentIndex = items.findIndex(
            (item) => item === document.activeElement,
          );

          if (e.key === "ArrowDown") {
            const next =
              currentIndex === -1
                ? items[0]
                : items[(currentIndex + 1) % items.length];
            next.focus();
          } else if (e.key === "ArrowUp") {
            const prev =
              currentIndex === -1
                ? items[items.length - 1]
                : items[(currentIndex - 1 + items.length) % items.length];
            prev.focus();
          } else if (e.key === "Home") {
            items[0].focus();
          } else {
            items[items.length - 1].focus();
          }
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
        <div
          ref={menuContainerRef}
          css={[
            styles.menuContainer,
            !isMenuShown && styles.hidden,
            styles[position],
          ]}
          inert={!isMenuShown}
        >
          <div ref={surfaceRef} css={[corner.radius_2, styles.surface]} />
          <div
            id={popupId}
            ref={popupRef}
            role={popupRole}
            // Name the popup by the trigger's visible label when there is one,
            // otherwise fall back to the trigger button itself (an icon-only
            // trigger renders no label span, so its name comes from
            // `aria-label`). Keeps existing labelled triggers unchanged.
            aria-labelledby={children ? `${targetId}-label` : targetId}
            css={[
              corner.radius_2,
              styles.content,
              isMenuShown && styles.contentShown,
              isSheet && styles.sheetScroller,
            ]}
          >
            {/* Visible heading only. The popup is already named by the
                trigger's label via `aria-labelledby`, so this duplicate is
                `aria-hidden` — which also keeps a bare non-menuitem node out
                of the `role="menu"` accessibility tree. */}
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
        </div>
      </div>
    </>
  );
}

const styles = stylex.create({
  container: {
    position: "relative",
    display: "inline-block",
  },
  // `raised`, not `overlay`: the menu is anchored to its trigger and belongs to
  // the page, so it lifts over the content around it but still scrolls away
  // under a fixed header rather than covering it.
  menuContainer: {
    position: "absolute",
    zIndex: layer.raised,
  },
  hidden: {
    pointerEvents: "none",
  },
  // The only element that animates geometry. It has no children, so the
  // browser lays out and paints one box per frame.
  surface: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    backgroundColor: color.bgOverlay,
    boxShadow: shadow._5,
  },
  // The content sits at its final size from the start and only fades in over
  // the surface, so the type never scales. It clips its own corners, because
  // the surface behind it is a separate element.
  content: {
    position: "relative",
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
  // Spans that bar, inset by the standard gutter, and sits level with its block
  // start. `position: fixed` would be the obvious way to reach the viewport
  // edges, but a fixed box with auto block insets takes its static position in
  // document space, so the sheet lands wherever the bar's unscrolled position
  // was — off-screen on a sticky bar. Staying absolute keeps it pinned to the
  // bar through both scrolling and the sticky shift.
  sheet: {
    insetBlockStart: 0,
    insetInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    insetInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  // A sheet can be taller than the room under its bar, so it scrolls itself
  // rather than asking every consumer to cap its own content. `contain` keeps a
  // flick that reaches the end from scrolling the page behind the backdrop.
  sheetScroller: {
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  // With the sheet itself scrolling, the heading would scroll away with the
  // content; pinning it keeps the sheet's subject in view while the body moves.
  // The z-index is not optional: `Button` carries a base `transform` and
  // `filter` at rest for its press animation, so every button scrolling past is
  // a stacking context that would otherwise paint over a pinned heading it
  // follows in the DOM.
  stickyMenuTitle: {
    position: "sticky",
    insetBlockStart: 0,
    backgroundColor: color.bgOverlay,
    zIndex: layer.content,
  },
  // The click-catcher that makes outside-click dismissal work. It relies on
  // `position: fixed` resolving against the viewport, so no ancestor of a
  // MenuButton may establish a containing block for fixed descendants —
  // `transform`, `will-change: transform`, `filter`, or `contain` on a wrapper
  // shrinks this to that wrapper's box and silently kills dismissal.
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: layer.raised,
  },
});
