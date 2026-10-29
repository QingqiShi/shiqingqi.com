import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/**
 * The narrow column a page outside the shell sits in, under the Finance name:
 * sign-in, invites, and the not-found and error screens.
 */
export function FinanceFrame({
  brand,
  children,
}: {
  /** The Finance name, translated by the caller. */
  brand: string;
  children: ReactNode;
}) {
  return (
    <main css={[pageColumn.base, styles.main]}>
      <div css={[stack.section, styles.column]}>
        <span css={[typeRole.label, styles.brand]}>{brand}</span>
        {children}
      </div>
    </main>
  );
}

const styles = stylex.create({
  main: {
    minBlockSize: "100dvh",
    paddingBlockStart: {
      default: `calc(${space._9} + env(safe-area-inset-top))`,
      [breakpoints.md]: space._11,
    },
    paddingBlockEnd: `calc(${space._8} + env(safe-area-inset-bottom))`,
  },
  column: {
    maxInlineSize: space._15,
    marginInline: "auto",
  },
  brand: {
    color: color.fgMuted,
  },
});
