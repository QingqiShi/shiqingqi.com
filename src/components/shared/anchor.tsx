import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { border, color, font } from "@/tokens.stylex";

export function Anchor({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Link>) {
  return <Link {...props} className={className} style={style} css={styles.a} />;
}

const styles = stylex.create({
  a: {
    color: { default: color.textMain, ":hover": color.textMuted },
    fontWeight: font.weight_6,
    textDecorationThickness: { default: null, ":hover": border.size_2 },
  },
});
