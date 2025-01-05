import * as stylex from "@stylexjs/stylex";
import { border, color, font, shadow, size } from "@/tokens.stylex";
import { Anchor } from "./anchor";

interface AnchorButtonProps extends React.ComponentProps<typeof Anchor> {
  icon?: React.ReactNode;
}

export function AnchorButton({
  icon,
  children,
  style,
  className,
  ...props
}: AnchorButtonProps) {
  return (
    <Anchor
      {...props}
      className={className}
      style={style}
      css={[styles.button, !!icon && styles.hasIcon]}
    >
      {icon && <span css={styles.icon}>{icon}</span>}
      {children}
    </Anchor>
  );
}

const styles = stylex.create({
  button: {
    // Reset
    fontSize: font.size_0,
    fontWeight: font.weight_5,
    textDecoration: "none",
    cursor: "pointer",

    // Custom styles
    display: "inline-flex",
    alignItems: "center",
    gap: size._1,
    height: size._7,
    paddingBlock: size._0,
    paddingInline: size._3,
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
    paddingLeft: size._1,
  },
  icon: {
    display: "inline-flex",
  },
});
