import Link from "next/link";
import * as x from "@stylexjs/stylex";
import { tokens } from "../app/tokens.stylex";
import type { StyleProp } from "../types";

interface AnchorProps
  extends Omit<React.ComponentProps<typeof Link>, "className" | "style"> {
  style?: StyleProp;
}

export function Anchor({ style, ...props }: AnchorProps) {
  return <Link {...props} {...x.props(styles.a, style)} />;
}

const styles = x.create({
  a: {
    color: { default: tokens.textMain, ":hover": tokens.textMuted },
    fontWeight: 600,
    textDecorationThickness: "0.15rem",
  },
});
