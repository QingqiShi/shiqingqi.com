import * as stylex from "@stylexjs/stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <div>
      <article data-prose css={styles.container}>
        {children}
      </article>
    </div>
  );
}

const styles = stylex.create({
  container: {
    paddingBlockStart: `clamp(${space._10}, 20dvh, ${space._12})`,
    // The prose flow removes the end margin of the last paragraph or list,
    // which is 1rem. The article gives the same space below it.
    marginBlockEnd: rhythm.item,
  },
});
