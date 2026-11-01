import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Link } from "#src/links/link.tsx";

/** The column every signed-in page sits in, under a bar with the app name, the report, the to-dos and settings. */
export function AppFrame({ children }: { children: ReactNode }) {
  const locale = getLocale();
  const links = [
    { path: "/", label: t({ en: "Report", zh: "晨报" }) },
    { path: "/todos", label: t({ en: "To-dos", zh: "待办" }) },
    { path: "/settings", label: t({ en: "Settings", zh: "设置" }) },
  ];
  return (
    <div css={[pageColumn.base, styles.page]}>
      <header css={styles.bar}>
        <Link
          href={getLocalePath("/", locale)}
          prefetchOnIntent
          {...stylex.props(typeRole.label, a11y.focusRing, styles.brand)}
        >
          {t({ en: "Mail Assistant", zh: "邮件助手" })}
        </Link>
        <nav css={styles.nav}>
          {links.map(({ path, label }) => (
            <Link
              key={path}
              href={getLocalePath(path, locale)}
              prefetchOnIntent
              {...stylex.props(
                typeRole.label,
                a11y.focusRing,
                a11y.touchTarget,
                styles.navLink,
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
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
  nav: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
  },
  navLink: {
    color: color.fgMuted,
    textDecoration: "none",
  },
  column: {
    maxInlineSize: space._15,
    marginInline: "auto",
  },
});
