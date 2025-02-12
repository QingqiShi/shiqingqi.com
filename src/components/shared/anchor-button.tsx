import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { border, color, controlSize, font, shadow } from "@/tokens.stylex";
import { Anchor } from "./anchor";

interface AnchorButtonProps extends React.ComponentProps<typeof Anchor> {
  icon?: React.ReactNode;
  hideLabelOnMobile?: boolean;
  isActive?: boolean;
}

export function AnchorButton({
  icon,
  children,
  style,
  className,
  hideLabelOnMobile,
  isActive,
  ...props
}: AnchorButtonProps) {
  return (
    <Anchor
      {...props}
      className={className}
      style={style}
      css={[
        styles.button,
        !!icon && !hideLabelOnMobile && styles.hasIcon,
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
    fontWeight: font.weight_5,
    textDecoration: "none",
    cursor: "pointer",

    // Custom styles
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    height: controlSize._9,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    borderRadius: border.radius_round,
    color: color.textMain,
    boxShadow: shadow._2,
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
  },
  hasIcon: {
    paddingLeft: controlSize._2,
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
    color: { default: color.textOnActive, ":hover": color.textOnActive },
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":disabled:hover": color.controlActive,
    },
  },
});
