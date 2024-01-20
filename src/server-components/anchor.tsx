import Link from "next/link";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../tokens.stylex";
import type { StyleProp } from "../types";

interface AnchorProps
  extends Omit<React.ComponentProps<typeof Link>, "className" | "style"> {
  style?: StyleProp;
}

export function Anchor({ style, ...props }: AnchorProps) {
  return <Link {...props} {...stylex.props(styles.a, style)} />;
}

const styles = stylex.create({
  a: {
    color: { default: tokens.textMain, ":hover": tokens.textMuted },
    fontWeight: 600,
    textDecorationThickness: { default: null, ":hover": "0.15rem" },
  },
});
