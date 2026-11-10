import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/** The heading of the to-dos and, at the end of its line, their search. */
export function TodosHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header css={[flex.wrap, styles.header]}>
      <Heading level={1} look="h1">
        {title}
      </Heading>
      {children}
    </header>
  );
}

const styles = stylex.create({
  header: {
    alignItems: "flex-start",
    columnGap: rhythm.group,
    rowGap: rhythm.tight,
  },
});
