import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/** A page outside the app frame, with its content in the centre: the offline, not-found and error screens. */
export function StandalonePage({ children }: { children: ReactNode }) {
  return <main css={styles.page}>{children}</main>;
}

const styles = stylex.create({
  page: {
    display: "grid",
    placeItems: "center",
    minBlockSize: "100dvh",
    padding: space._5,
  },
});
