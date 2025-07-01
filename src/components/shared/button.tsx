"use client";

import * as stylex from "@stylexjs/stylex";
import { useState, type ComponentProps } from "react";
import { breakpoints } from "@/breakpoints";
import { color, controlSize, font } from "@/tokens.stylex";
import { buttonTokens } from "./button.stylex";
import { GlassSurface } from "./glass-surface";

interface ButtonProps extends ComponentProps<"button"> {
  bright?: boolean;
  hideLabelOnMobile?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  labelId?: string;
}

export function Button({
  bright,
  children,
  className,
  hideLabelOnMobile,
  icon,
  isActive,
  labelId,
  style,
  ...props
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <GlassSurface
      {...props}
      as="button"
      inline
      interactive
      pressed={pressed}
      disableBlur={isActive}
      className={className}
      style={style}
      css={[styles.button, bright && styles.bright, isActive && styles.active]}
      onPointerDown={(e) => {
        if (e.button === 0) {
          setPressed(true);
          document.body.addEventListener("pointerup", () => setPressed(false), {
            once: true,
          });
        }
        props.onPointerDown?.(e);
      }}
    >
      <div
        css={[
          styles.content,
          !!icon &&
            !!children &&
            (hideLabelOnMobile ? styles.hasIconHideLabel : styles.hasIcon),
        ]}
      >
        {icon && <span css={styles.icon}>{icon}</span>}
        {children && (
          <span
            css={[
              styles.childrenContainer,
              hideLabelOnMobile && styles.hideLabelOnMobile,
            ]}
            id={labelId}
          >
            {children}
          </span>
        )}
      </div>
    </GlassSurface>
  );
}

const styles = stylex.create({
  button: {
    // Reset
    fontSize: controlSize._4,
    fontWeight: font.weight_5,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },

    // Custom styles
    position: "relative",
    color: buttonTokens.color,
    opacity: {
      default: null,
      ":disabled": 0.7,
    },
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: controlSize._2,
    minHeight: controlSize._9,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    transition: "filter 0.2s ease",
    filter: {
      // default: "brightness(1)",
      ":hover": "brightness(1.2)",
      ":disabled:hover": "brightness(1)",
    },
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
    [buttonTokens.color]: {
      default: color.textOnActive,
      ":hover": color.textOnActive,
    },
    background: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":disabled:hover": color.controlActive,
    },
  },
  bright: {
    backgroundColor: color.controlThumb,
    [buttonTokens.color]: color.textOnControlThumb,
    filter: {
      ":hover": "brightness(1.1)",
    },
  },
});
