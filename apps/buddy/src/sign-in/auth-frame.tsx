import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Link } from "@tuja/next-links/link";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/** The narrow column that the owner's pages sit in, under the wordmark that leads home: sign-in, sign-up, recovery, connect and the Macs list. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main css={[pageColumn.base, styles.main]}>
      <div css={[stack.section, styles.column]}>
        <Link
          href={getLocalePath("/", getLocale())}
          {...stylex.props(a11y.focusRing, typeRole.label, styles.brand)}
        >
          {t({ en: "Buddy", zh: "搭子" })}
        </Link>
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
    alignSelf: "flex-start",
    color: color.mutedForeground,
    fontWeight: font.weight_6,
    textDecoration: "none",
  },
});
