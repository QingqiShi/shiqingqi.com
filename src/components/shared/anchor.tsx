import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { border } from "#src/tokens.stylex.ts";
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
    fontWeight: anchorTokens.fontWeight,
    textDecorationThickness: { default: null, ":hover": border.size_2 },
  },
});
