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
  color,
  controlSize,
  font,
  layer,
  shadow,
  space,
} from "../tokens.stylex.ts";
import { AnimateToTarget } from "./animate-to-target.tsx";
import { Button } from "./button.tsx";
import { FixedContainerContent } from "./fixed-container-content.tsx";

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

  const isSheet = position === "sheet";

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

  const targetId = useId();
  const popupId = `${targetId}-popup`;

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
            corner.radius_2,
            styles.menuContainer,
            !isMenuShown && styles.hidden,
            styles[position],
          ]}
          inert={!isMenuShown}
        >
          <AnimateToTarget
            css={[corner.radius_2, styles.menu]}
            animateToTarget={!isMenuShown}
            targetId={targetId}
          >
            <div
              id={popupId}
              ref={popupRef}
              role={popupRole}
              // Name the popup by the trigger's visible label when there is one,
              // otherwise fall back to the trigger button itself (an icon-only
              // trigger renders no label span, so its name comes from
              // `aria-label`). Keeps existing labelled triggers unchanged.
              aria-labelledby={children ? `${targetId}-label` : targetId}
              css={isSheet && styles.sheetScroller}
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
          </AnimateToTarget>
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
  menu: {
    backgroundColor: color.bgOverlay,
    boxShadow: shadow._5,
    overflow: "hidden",
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
