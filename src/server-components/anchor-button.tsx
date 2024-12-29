import * as stylex from "@stylexjs/stylex";
import { tokens } from "@/tokens.stylex";
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
    boxSizing: "content-box",
    fontSize: "16px",
    fontWeight: 400,
    textDecoration: "none",
    cursor: "pointer",

    // Custom styles
    display: "inline-flex",
    alignItems: "center",
    blockSize: "36px",
    borderRadius: "36px",
    paddingBlock: "2px",
    paddingInline: "16px",
    color: tokens.textMain,
    backgroundColor: {
      default: tokens.backgroundRaised,
      ":hover": tokens.backgroundHover,
      ":disabled:hover": tokens.backgroundRaised,
    },
    opacity: {
      default: null,
      ":disabled": 0.7,
    },
    boxShadow: tokens.shadowControls,
    transition: "background 0.2s ease",
  },
  hasIcon: {
    paddingLeft: "8px",
  },
  icon: {
    display: "inline-flex",
    marginRight: "8px",
  },
});
