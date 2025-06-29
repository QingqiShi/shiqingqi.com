import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { breakpoints } from "@/breakpoints";
import { backdropEffects, color, controlSize } from "@/tokens.stylex";
import { Anchor } from "./anchor";
import { anchorTokens } from "./anchor.stylex";
import { buttonTokens } from "./button.stylex";
import { GlassSurface } from "./glass-surface";

interface AnchorButtonProps extends React.ComponentProps<typeof Anchor> {
  bright?: boolean;
  hideLabelOnMobile?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export function AnchorButton({
  bright,
  children,
  className,
  hideLabelOnMobile,
  icon,
  isActive,
  style,
  ...props
}: AnchorButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <GlassSurface inline pressed={pressed}>
      <Anchor
        {...props}
        className={className}
        style={style}
        css={[
          styles.button,
          !!icon &&
            !!children &&
            (hideLabelOnMobile ? styles.hasIconHideLabel : styles.hasIcon),
          bright && styles.bright,
          isActive && styles.active,
        ]}
        onPointerDown={(e) => {
          if (e.button === 0) {
            setPressed(true);
            document.body.addEventListener(
              "pointerup",
              () => setPressed(false),
              {
                once: true,
              }
            );
          }
          props.onPointerDown?.(e);
        }}
      >
        {icon && <span css={styles.icon}>{icon}</span>}
        {children && (
          <span
            css={[
              styles.childrenContainer,
              hideLabelOnMobile && styles.hideLabelOnMobile,
            ]}
          >
            {children}
          </span>
        )}
      </Anchor>
    </GlassSurface>
  );
}

const styles = stylex.create({
  button: {
    // Reset
    fontSize: controlSize._4,
    textDecoration: "none",
    cursor: "pointer",

    // Custom styles
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    height: buttonTokens.height,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    borderRadius: buttonTokens.borderRadius,
    transition: "background 0.2s ease",
    backdropFilter: backdropEffects.controls,
    backgroundColor: color.backgroundGlass,
    filter: {
      default: "brightness(1)",
      ":hover": "brightness(1.2)",
      ":disabled:hover": "brightness(1)",
    },
    opacity: {
      default: null,
      ":disabled": 0.7,
    },
    [anchorTokens.color]: buttonTokens.color,
  },
  hasIcon: {
    paddingLeft: controlSize._2,
  },
  hasIconHideLabel: {
    paddingLeft: { default: controlSize._3, [breakpoints.md]: controlSize._2 },
  },
  icon: {
    display: "inline-flex",
  },
  childrenContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
  },
  hideLabelOnMobile: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  active: {
    [anchorTokens.color]: {
      default: color.textOnActive,
      ":hover": color.textOnActive,
    },
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":disabled:hover": color.controlActive,
    },
  },
  bright: {
    backgroundColor: color.controlThumb,
    [buttonTokens.color]: color.textOnControlThumb,
    filter: {
      ":hover": "brightness(1.2)",
    },
  },
});
