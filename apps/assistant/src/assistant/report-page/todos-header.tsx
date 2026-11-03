import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/** The heading of the to-dos and, beside it, their search box. */
export function TodosHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header css={[flex.wrap, styles.header]}>
      <Heading level={1} look="h3">
        {title}
      </Heading>
      <div css={styles.search}>{children}</div>
    </header>
  );
}

const styles = stylex.create({
  header: {
    alignItems: "baseline",
    columnGap: rhythm.group,
    rowGap: rhythm.tight,
  },
  search: {
    flexBasis: "10rem",
    flexGrow: 1,
    minInlineSize: 0,
  },
});
