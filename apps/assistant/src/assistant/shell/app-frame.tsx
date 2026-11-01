import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Link } from "#src/links/link.tsx";
import { SignOutButton } from "./sign-out-button.tsx";

/** The column every signed-in page sits in, under a bar with the app name and sign-out. */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div css={[pageColumn.base, styles.page]}>
      <header css={styles.bar}>
        <Link
          href={getLocalePath("/", getLocale())}
          {...stylex.props(typeRole.label, styles.brand)}
        >
          {t({ en: "Mail Assistant", zh: "邮件助手" })}
        </Link>
        <SignOutButton />
      </header>
      <main css={[stack.section, styles.column]}>{children}</main>
    </div>
  );
}

const styles = stylex.create({
  page: {
    minBlockSize: "100dvh",
    paddingBlockStart: `calc(${space._5} + env(safe-area-inset-top))`,
    paddingBlockEnd: `calc(${space._8} + env(safe-area-inset-bottom))`,
  },
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxInlineSize: space._15,
    marginInline: "auto",
    paddingBlockEnd: {
      default: space._8,
      [breakpoints.md]: space._10,
    },
  },
  brand: {
    color: color.fgMuted,
    textDecoration: "none",
  },
  column: {
    maxInlineSize: space._15,
    marginInline: "auto",
  },
});
