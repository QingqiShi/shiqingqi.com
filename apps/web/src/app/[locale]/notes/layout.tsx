import * as stylex from "@stylexjs/stylex";
import { controlSize, layout, space } from "@tuja/ui/tokens.stylex";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notes",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div css={styles.container}>
      <main css={styles.main}>{children}</main>
    </div>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: layout.maxInlineSize,
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  main: {
    paddingTop: `calc(${space._10} + env(safe-area-inset-top) + ${controlSize._9} + ${space._3})`,
  },
});
