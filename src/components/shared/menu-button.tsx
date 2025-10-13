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
} from "@/tokens.stylex";
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
}

/** A button that expands into a menu. */
export function MenuButton({
  children,
  buttonProps,
  menuContent,
  position = "topRight",
  disabled,
}: PropsWithChildren<MenuButtonProps>) {
  const [isMenuShown, setIsMenuShown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const outsideClicked = useRef(false);
  useEffect(() => {
    if (isMenuShown) {
      outsideClicked.current = false;
    }
  }, [isMenuShown]);

  const targetId = useId();

  return (
    <>
      {isMenuShown && (
        <div
          css={styles.backdrop}
          onClick={() => {
            if (isMenuShown) {
              setIsMenuShown(false);
              outsideClicked.current = true;
            }
          }}
        />
      )}
      <div
        css={styles.container}
        ref={containerRef}
        onBlur={(e) => {
          if (
            isMenuShown &&
            !containerRef.current?.contains(e.currentTarget) &&
            !outsideClicked.current
          ) {
            setIsMenuShown(false);
          }
        }}
      >
        <FixedContainerContent>
          <Button
            {...buttonProps}
            onClick={() => setIsMenuShown(true)}
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
        >
          <AnimateToTarget
            css={[styles.menu]}
            animateToTarget={!isMenuShown}
            targetId={targetId}
          >
            <div>
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
