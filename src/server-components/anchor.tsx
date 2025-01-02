import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { anchorTokens } from "./anchor.stylex";

export function Anchor({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Link>) {
  return <Link {...props} className={className} style={style} css={styles.a} />;
}

const styles = stylex.create({
  a: {
    color: anchorTokens.color,
    fontWeight: 600,
    textDecorationThickness: { default: null, ":hover": "0.15rem" },
  },
});
