import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { border, font } from "@/tokens.stylex";
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
    fontWeight: font.weight_6,
    textDecorationThickness: { default: null, ":hover": border.size_2 },
  },
});
