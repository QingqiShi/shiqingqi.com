import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

/** The list a Settings section shows its rows in. */
export function SettingsList({ children }: { children: ReactNode }) {
  return <ul css={styles.list}>{children}</ul>;
}

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
});
