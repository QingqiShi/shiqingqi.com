import * as stylex from "@stylexjs/stylex";
import { tokens } from "../app/tokens.stylex";

export function Anchor(props: React.ComponentProps<"a">) {
  return <a {...props} />;
}

const styles = stylex.create({
  a: {
    color: { default: tokens.textMain, ":hover": tokens.textMuted },
    fontWeight: 600,
    textDecorationThickness: "0.15rem",
  },
});
