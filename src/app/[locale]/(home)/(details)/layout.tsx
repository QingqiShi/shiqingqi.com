import * as stylex from "@stylexjs/stylex";
import { space } from "#src/tokens.stylex.ts";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <div>
      <article css={styles.container}>{children}</article>
    </div>
  );
}

const styles = stylex.create({
  container: {
    paddingBlockStart: `clamp(${space._10}, 20dvh, ${space._12})`,
  },
});
