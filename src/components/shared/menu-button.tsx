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
} from "#src/tokens.stylex.ts";
import { AnimateToTarget } from "./animate-to-target";
import { Button } from "./button";
import { FixedContainerContent } from "./fixed-container-content";

interface MenuButtonProps {
  /** Button prop overrides */
  buttonProps: Partial<ComponentProps<typeof Button>>;
  /** The node to render into the expanded menu. */
  menuContent: ReactNode;
  /** Where to expand from. */
  position?:
    | "topRight"
    | "topLeft"
    | "bottomLeft"
    | "bottomRight"
    | "viewportWidth";
  /** Disable the menu trigger. */
  disabled?: boolean;
  /**
   * Set the ARIA role for the popup content. Defaults to `"menu"` for menus
   * that contain `menuitem` children. Set to `"group"` or `undefined` when
   * the popup contains other interactive controls (e.g. toggle buttons).
   */
  popupRole?: "menu" | "group" | undefined;
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

  return (
    <>
      {isMenuShown && (
        <div
          css={styles.backdrop}
          aria-hidden="true"
          onClick={() => {
            setIsMenuShown(false);
            outsideClickedRef.current = true;
          }}
        />
      )}
      <div
        css={styles.container}
        ref={containerRef}
        onKeyDown={(e) => {
          if (e.key === "Escape" && isMenuShown) {
            e.stopPropagation();
            setIsMenuShown(false);
            document.getElementById(targetId)?.focus();
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
            onClick={() => {
              setIsMenuShown(true);
            }}
            disabled={disabled}
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
    backgroundColor: color.controlTrack,
    boxShadow: shadow._5,
    borderRadius: border.radius_2,
    overflow: "hidden",
  },
  menuTitle: {
    fontSize: controlSize._3,
    padding: `${controlSize._2} ${controlSize._3} ${controlSize._1}`,
    color: color.textMuted,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  viewportWidth: {
    position: "fixed",
    left: space._2,
    right: space._2,
    transform: `translate(0, calc(-1 * ${controlSize._9}))`,
  },
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: layer.overlay,
  },
});
