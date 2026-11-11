import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { AssistantLogo } from "../pwa/assistant-logo.tsx";

/**
 * The narrow column a page outside the shell sits in, under the app's mark
 * and name: the public home, sign-in, the legal pages, and the not-found and
 * error screens.
 */
export function AssistantFrame({
  brand,
  children,
}: {
  /** The app name, translated by the caller. */
  brand: string;
  children: ReactNode;
}) {
  return (
    <main css={[pageColumn.base, styles.main]}>
      <div css={[stack.section, styles.column]}>
        <div css={row.tight}>
          <AssistantLogo css={styles.logo} />
          <span css={[typeRole.control, styles.brand]}>{brand}</span>
        </div>
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
  logo: {
    flexShrink: 0,
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
  },
  brand: {
    color: color.foreground,
    fontWeight: font.weight_6,
  },
});
