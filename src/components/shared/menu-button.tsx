import * as stylex from "@stylexjs/stylex";
import { useState, type ComponentProps, type ReactNode } from "react";
import { useClickAway } from "@/hooks/use-click-away";
import { useCssId } from "@/hooks/use-css-id";
import { border, color, controlSize, layer, shadow } from "@/tokens.stylex";
import { startViewTransition } from "@/utils/start-view-transition";
import { Button } from "./button";

interface MenuButtonProps {
  /** The button children */
  children: ReactNode;
  /** Button prop overrides */
  buttonProps: Partial<ComponentProps<typeof Button>>;
  /** The node to render into the expanded menu. */
  menuContent: ReactNode;
  /** Where to expand from. */
  position?: "topRight" | "topLeft" | "bottomLeft" | "bottomRight";
}

/** A button that expands into a menu. */
export function MenuButton({
  children,
  buttonProps,
  menuContent,
  position = "topRight",
}: MenuButtonProps) {
  const [isMenuShown, _setIsMenuShown] = useState(false);
  const setIsMenuShown = (...args: Parameters<typeof _setIsMenuShown>) => {
    void startViewTransition(() => {
      _setIsMenuShown(...args);
    });
  };

  const containerRef = useClickAway<HTMLDivElement>(() => {
    if (isMenuShown) {
      setIsMenuShown(false);
    }
  });

  const id = useCssId();

  return (
    <>
      {/* Using inline style until the new viewTransitionClass API is ready https://github.com/facebook/stylex/issues/866 */}
      <style>
        {`
          ::view-transition-old(${id}-background),
          ::view-transition-new(${id}-background) {
            height: 100%;
          }

          ::view-transition-new(${id}-menu-content):only-child {
            animation-name: ${fadeIn}, ${expand};
          }
          ::view-transition-old(${id}-menu-content):only-child {
            animation-name: ${fadeOut}, ${collapse};
          }

          ::view-transition-new(${id}-label):only-child {
            animation-name: ${fadeIn}, ${slideIn};
          }
          ::view-transition-old(${id}-label):only-child {
            animation-name: ${fadeOut}, ${slideOut};
          }
      `}
      </style>
      <div css={styles.container} ref={containerRef}>
        <Button
          {...buttonProps}
          onClick={() => setIsMenuShown(true)}
          style={{
            viewTransitionName: !isMenuShown ? `${id}-background` : undefined,
          }}
          css={isMenuShown && styles.disabled}
          hideIcon={isMenuShown}
        >
          {children && (
            <span
              style={{
                viewTransitionName: !isMenuShown ? `${id}-label` : undefined,
              }}
            >
              {children}
            </span>
          )}
        </Button>
        {isMenuShown && (
          <div
            css={[styles.menu, styles[position]]}
            style={{ viewTransitionName: `${id}-background` }}
          >
            <div style={{ viewTransitionName: `${id}-menu-content` }}>
              <div css={styles.menuTitle}>
                <span style={{ viewTransitionName: `${id}-label` }}>
                  {children}
                </span>
              </div>
              {menuContent}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const fadeIn = stylex.keyframes({
  from: {
    opacity: 0,
  },
});

const fadeOut = stylex.keyframes({
  to: {
    opacity: 0,
  },
});

const expand = stylex.keyframes({
  from: {
    clipPath: "inset(0 0 100% 0)",
  },
  to: {
    clipPath: "inset(0 0 0 0)",
  },
});

const collapse = stylex.keyframes({
  from: {
    clipPath: "inset(0 0 0 0)",
  },
  to: {
    clipPath: "inset(0 0 100% 0)",
  },
});

const slideIn = stylex.keyframes({
  from: {
    transform: "translateX(30px)",
  },
});

const slideOut = stylex.keyframes({
  to: {
    transform: "translateX(30px)",
  },
});

const styles = stylex.create({
  container: {
    position: "relative",
  },
  menu: {
    position: "absolute",
    zIndex: layer.overlay,
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_2,
    boxShadow: shadow._4,
    overflow: "hidden",
    width: "max-content",
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
  disabled: {
    opacity: 0,
    pointerEvents: "none",
  },
});
