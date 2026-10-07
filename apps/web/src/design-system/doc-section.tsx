import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";

interface DocSectionProps {
  /** The h2. Without one, or with an empty one, the section is its examples alone. */
  title?: ReactNode;
  /** The h2's type and column. Its spacing stays here. */
  titleCss?: StyleProp;
  /** The section's surface and width. */
  css?: StyleProp;
  children: ReactNode;
}

/**
 * One h2 section of a doc page, and the one place its spacing is set. The page
 * stacks sections `rhythm.section` apart; the heading binds to its content at
 * `rhythm.tight`; the examples under it stand `rhythm.item` apart.
 */
export function DocSection({
  title,
  titleCss,
  css,
  children,
}: DocSectionProps) {
  if (title == null || title === "") {
    return <section css={[stack.item, css]}>{children}</section>;
  }
  return (
    <section css={[stack.tight, css]}>
      <Heading level={2} css={titleCss}>
        {title}
      </Heading>
      <div css={stack.item}>{children}</div>
    </section>
  );
}
