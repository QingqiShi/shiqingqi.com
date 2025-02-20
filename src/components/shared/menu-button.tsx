import * as stylex from "@stylexjs/stylex";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useClickAway } from "@/hooks/use-click-away";
import { border, color, controlSize, layer, shadow } from "@/tokens.stylex";
import { Button } from "./button";
import { buttonTokens } from "./button.stylex";
import { FlipAnimation } from "./flip-animation";

interface MenuButtonProps {
  /** The button children */
  children: ReactNode;
  /** Button prop overrides */
  buttonProps: Partial<ComponentProps<typeof Button>>;
  /** The node to render into the expanded menu. */
  menuContent: ReactNode;
  /** Where to expand from. */
  position?: "topRight" | "topLeft" | "bottomLeft" | "bottomRight";
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
}: MenuButtonProps) {
  const [isMenuShown, setIsMenuShown] = useState(false);

  const outsideClicked = useRef(false);
  const containerRef = useClickAway<HTMLDivElement>(() => {
    if (isMenuShown) {
      setIsMenuShown(false);
      outsideClicked.current = true;
    }
  });
  useEffect(() => {
    if (isMenuShown) {
      outsideClicked.current = false;
    }
  }, [isMenuShown]);

  const targetId = useId();

  return (
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
      <Button
        {...buttonProps}
        onClick={() => setIsMenuShown(true)}
        disabled={disabled}
        id={targetId}
        labelId={`${targetId}-label`}
      >
        {children && <span>{children}</span>}
      </Button>
      <div
        css={[
          styles.menuContainer,
          !isMenuShown && styles.hidden,
          styles[position],
        ]}
      >
        <FlipAnimation
          css={[styles.menu]}
          animateToTarget={!isMenuShown}
          targetId={targetId}
        >
          <div>
            <div css={styles.menuTitle}>{children}</div>
            {menuContent}
          </div>
        </FlipAnimation>
      </div>
    </div>
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
    overflow: "hidden",
  },
  hidden: {
    pointerEvents: "none",
    // opacity: 0,
  },
  menu: {
    backgroundColor: color.controlTrack,
    boxShadow: shadow._4,
    borderRadius: border.radius_2,
    overflow: "hidden",
    [buttonTokens.backgroundColor]: {
      default: color.controlThumb,
    },
    [buttonTokens.color]: color.textOnControlThumb,
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
});
