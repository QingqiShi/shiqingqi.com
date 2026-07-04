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
import {
  border,
  color,
  controlSize,
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
   * Where to expand from, or `"viewportWidth"` to span the viewport width.
   * Corner names are logical-direction-aware: `Right` anchors to the
   * inline-end edge and `Left` to the inline-start edge, so the menu mirrors
   * automatically in RTL locales.
   */
  position?:
    | "topRight"
    | "topLeft"
    | "bottomLeft"
    | "bottomRight"
    | "viewportWidth";
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
        css={styles.container}
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
            aria-haspopup={popupRole === "menu" ? "menu" : "true"}
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
          css={[
            styles.menuContainer,
            !isMenuShown && styles.hidden,
            styles[position],
          ]}
          inert={!isMenuShown}
        >
          <AnimateToTarget
            css={[styles.menu]}
            animateToTarget={!isMenuShown}
            targetId={targetId}
          >
            <div
              id={popupId}
              ref={popupRef}
              role={popupRole}
              aria-labelledby={`${targetId}-label`}
            >
              {children && <div css={styles.menuTitle}>{children}</div>}
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
  menuContainer: {
    position: "absolute",
    zIndex: layer.overlay,
    borderRadius: border.radius_2,
  },
  hidden: {
    pointerEvents: "none",
  },
  menu: {
    backgroundColor: color.bgOverlay,
    boxShadow: shadow._5,
    borderRadius: border.radius_2,
    overflow: "hidden",
  },
  menuTitle: {
    fontSize: controlSize._3,
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
  viewportWidth: {
    position: "fixed",
    insetInline: space._2,
    transform: `translate(0, calc(-1 * ${controlSize._9}))`,
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: layer.overlay,
  },
});
