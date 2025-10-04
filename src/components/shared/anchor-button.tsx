import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints.stylex";
import { color, controlSize } from "@/tokens.stylex";
import { Anchor } from "./anchor";
import { anchorTokens } from "./anchor.stylex";
import { buttonTokens } from "./button.stylex";

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
  return (
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
    boxShadow: buttonTokens.boxShadow,
    transition: "background 0.2s ease",
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
      ":disabled:hover": color.backgroundRaised,
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
