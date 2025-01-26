import * as stylex from "@stylexjs/stylex";
import {
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useClickAway } from "@/hooks/use-click-away";
import { useCssId } from "@/hooks/use-css-id";
import { border, color, controlSize, layer, shadow } from "@/tokens.stylex";
import { startViewTransition } from "@/utils/start-view-transition";
import { Button } from "./button";

/*
 * When route changes (on selecting a different locale) the entire page will unmount, as a result states will
 * reset and the locale menu will be closed, to work around this we need a global state and hydrate it back when
 * the component mounts again. Note this assumes there's only a single instance of the locale selector.
 */
const listeners: Set<() => void> = new Set();
function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
let isMenuShownSingleton = false;
function setIsMenuShown(newState: boolean) {
  void startViewTransition(() => {
    isMenuShownSingleton = newState;
    listeners.forEach((listener) => {
      listener();
    });
  });
}

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
  const isMenuShown = useSyncExternalStore(
    subscribe,
    () => isMenuShownSingleton,
    () => isMenuShownSingleton
  );

  const containerRef = useClickAway<HTMLDivElement>(() => {
    if (isMenuShown) {
      setIsMenuShown(false);
    }
  });

  const id = useCssId();

  return (
    <>
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
