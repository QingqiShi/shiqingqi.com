"use client";

import * as stylex from "@stylexjs/stylex";
import { createContext, use, type DetailedHTMLProps } from "react";
import { border, color } from "@/tokens.stylex";
import { glassSurfaceTokens } from "./glass-surface.stylex";

const GlassContext = createContext<boolean>(false);

type ElementType = "a" | "button" | "div";

type ElementProps<T extends ElementType> = T extends "a"
  ? DetailedHTMLProps<
      React.AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >
  : T extends "button"
    ? DetailedHTMLProps<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        HTMLButtonElement
      >
    : DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

type GlassSurfaceProps<T extends ElementType = "div"> = ElementProps<T> & {
  inline?: boolean;
  pressed?: boolean;
  interactive?: boolean;
  radius?: "1" | "2" | "3" | "4" | "5" | "round";
  disableBlur?: boolean;
  as?: T;
};

export function GlassSurface<T extends ElementType = "div">({
  inline,
  pressed,
  interactive,
  disableBlur,
  radius = "round",
  children,
  className,
  style,
  as,
  ...rest
}: React.PropsWithChildren<GlassSurfaceProps<T>>) {
  // Nested elements cannot have backdrop effects
  const isWithinGlass = use(GlassContext);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Element: any = as ?? "div";

  return (
    <GlassContext value={true}>
      <Element
        {...rest}
        className={className}
        style={style}
        css={[
          borders[radius],
          styles.container,
          styles.outerBorderRadius,
          inline && styles.inline,
          interactive && !pressed && styles.containerInteractive,
          pressed && styles.containerPressed,
        ]}
      >
        <div
          css={[
            styles.content,
            styles.innerBorderRadius,
            !isWithinGlass && !disableBlur && styles.contentBlur,
          ]}
        >
          {children}
        </div>
        <div
          css={[
            styles.border,
            styles.outerBorderRadius,
            !isWithinGlass && !disableBlur && styles.borderBlur,
            pressed && styles.borderPressed,
          ]}
          role="presentation"
        />
      </Element>
    </GlassContext>
  );
}

const borders = stylex.create({
  none: {
    [glassSurfaceTokens.borderRadius]: "0",
  },
  "1": {
    [glassSurfaceTokens.borderRadius]: border.radius_1,
  },
  "2": {
    [glassSurfaceTokens.borderRadius]: border.radius_2,
  },
  "3": {
    [glassSurfaceTokens.borderRadius]: border.radius_3,
  },
  "4": {
    [glassSurfaceTokens.borderRadius]: border.radius_4,
  },
  "5": {
    [glassSurfaceTokens.borderRadius]: border.radius_5,
  },
  round: {
    [glassSurfaceTokens.borderRadius]: border.radius_round,
  },
});

const styles = stylex.create({
  outerBorderRadius: {
    borderRadius: `calc(${glassSurfaceTokens.borderRadius} + ${border.size_2})`,
  },
  innerBorderRadius: {
    borderRadius: glassSurfaceTokens.borderRadius,
  },
  container: {
    // Reset
    border: "none",
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    background: "transparent",

    position: "relative",
    boxShadow: color.shadowGlass,
    padding: `calc(${border.size_2} - 0.5px)`,
    transition: "transform 0.2s ease",
  },
  containerInteractive: {
    [glassSurfaceTokens.contentTransparency]: {
      ":hover": "0.7",
    },
  },
  containerPressed: {
    [glassSurfaceTokens.contentTransparency]: "0.3",
  },
  inline: {
    display: "inline-block",
  },
  content: {
    width: "100%",
    height: "100%",
    background: `radial-gradient(rgba(${color.backgroundGlassChannel1} / ${glassSurfaceTokens.contentTransparency}), rgba(${color.backgroundGlassChannel2} / calc(${glassSurfaceTokens.contentTransparency} + 0.2)))`,
    boxShadow: color.shadowGlassShine,
    transition: "background 0.2s ease",
  },
  contentBlur: {
    backdropFilter: "saturate(180%) blur(16px)",
  },
  border: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(-20deg, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.3))`,
    pointerEvents: "none",

    // Center cutout
    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    maskComposite: "exclude",
    padding: border.size_2,
    transition: "padding 0.2s ease",
  },
  borderBlur: {
    backdropFilter: "saturate(80%) brightness(1.2) blur(6px)",
  },
  borderPressed: {
    padding: `calc(${border.size_2} + 1px)`,
  },
});
