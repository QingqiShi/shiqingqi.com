import * as stylex from "@stylexjs/stylex";
import { backdropEffects, border, color } from "@/tokens.stylex";
import { glassSurfaceTokens } from "./glass-surface.stylex";

interface GlassSurfaceProps {
  inline?: boolean;
  pressed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassSurface({
  inline,
  pressed,
  children,
  ...rest
}: React.PropsWithChildren<GlassSurfaceProps>) {
  return (
    <div
      {...rest}
      css={[styles.container, inline && styles.inline, styles.borderRadius]}
    >
      <div css={styles.content}>{children}</div>
      <div css={[styles.border, styles.borderRadius]} role="presentation" />
      <div css={styles.shineContainer} role="presentation">
        <div
          css={[
            styles.shine,
            styles.lightShine,
            pressed && styles.lightShinePressed,
            styles.borderRadius,
          ]}
          role="presentation"
        />
        <div
          css={[
            styles.shine,
            styles.darkShine,
            pressed && styles.darkShinePressed,
            styles.borderRadius,
          ]}
          role="presentation"
        />
      </div>
    </div>
  );
}

const styles = stylex.create({
  container: {
    position: "relative",
    boxShadow: color.shadowGlass,
    padding: border.size_2,
  },
  inline: {
    display: "inline-block",
  },
  content: {
    [glassSurfaceTokens.backdropFilter]: "none",
  },
  border: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(-20deg, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.3))",
    backdropFilter: backdropEffects.border,
    pointerEvents: "none",

    // Center cutout
    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    maskComposite: "exclude",
    padding: border.size_2,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.2,
    transition: "clip-path 0.2s ease",
  },
  lightShine: {
    // only top half is visible
    clipPath: "inset(0 0 70% 0)",
    background: "#fff",
  },
  lightShinePressed: {
    clipPath: "inset(70% 0 0 0)",
  },
  darkShine: {
    // only bottom half is visible
    clipPath: "inset(70% 0 0 0)",
    background: "#000",
  },
  darkShinePressed: {
    clipPath: "inset(0 0 70% 0)",
  },
  shineContainer: {
    position: "absolute",
    top: border.size_3,
    left: border.size_3,
    right: border.size_3,
    bottom: border.size_3,
    filter: "blur(8px)",
    pointerEvents: "none",
  },
  borderRadius: {
    borderRadius: glassSurfaceTokens.borderRadius,
  },
});
