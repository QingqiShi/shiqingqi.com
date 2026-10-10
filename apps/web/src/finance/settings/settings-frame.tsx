"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Heading } from "@tuja/ui/components/heading";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useFreshPrefetch } from "../shell/use-fresh-prefetch.ts";
import {
  isSettingsSection,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./settings-sections.ts";

/**
 * Settings: the section menu beside the open section at `lg` and wider.
 * Below `lg` the menu is its own page and each section opens on its own
 * with a way back.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const prefetch = useFreshPrefetch();
  const segment = useSelectedLayoutSegment();
  const current: SettingsSection | null = isSettingsSection(segment)
    ? segment
    : null;
  const labels: Record<SettingsSection, string> = {
    household: t({ en: "Household", zh: "家庭" }),
    "exchange-rates": t({ en: "Exchange rates", zh: "汇率" }),
    members: t({ en: "Members", zh: "成员" }),
    groups: t({ en: "Groups", zh: "分组" }),
    categories: t({ en: "Categories", zh: "分类" }),
    payees: t({ en: "Payees", zh: "商家" }),
    tags: t({ en: "Tags", zh: "标签" }),
    rules: t({ en: "Recurring rules", zh: "周期规则" }),
    connections: t({ en: "Connections", zh: "银行连接" }),
    data: t({ en: "Data", zh: "数据" }),
  };

  return (
    <div css={styles.root}>
      <nav
        aria-label={t({ en: "Settings", zh: "设置" })}
        css={[stack.item, styles.nav, current !== null && styles.navOnSection]}
      >
        <Heading level={1} look="h3">
          {t({ en: "Settings", zh: "设置" })}
        </Heading>
        <ul css={styles.list}>
          {SETTINGS_SECTIONS.map((section) => (
            <li key={section}>
              <Link
                href={getLocalePath(`/finance/settings/${section}`, locale)}
                prefetch={prefetch}
                aria-current={
                  section === (current ?? "household") ? "page" : undefined
                }
                {...stylex.props(
                  typeRole.label,
                  corner.radius_2,
                  transition.colors,
                  selected.quiet,
                  a11y.focusRingInset,
                  styles.link,
                  current === null && styles.linkOnIndex,
                )}
              >
                {labels[section]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div
        css={[
          stack.item,
          styles.content,
          current === null && styles.contentOnIndex,
        ]}
      >
        {current === null ? null : (
          <div css={styles.back}>
            <AnchorButton
              href={getLocalePath("/finance/settings", locale)}
              linkComponent={Link}
              look="ghost"
              size="sm"
              icon={<ArrowLeftIcon weight="bold" />}
            >
              {t({ en: "Settings", zh: "设置" })}
            </AnchorButton>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "12rem minmax(0, 1fr)",
    },
    gap: rhythm.section,
    alignItems: "start",
  },
  nav: {
    position: { default: "static", [breakpoints.lg]: "sticky" },
    insetBlockStart: space._4,
  },
  navOnSection: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  link: {
    display: "block",
    paddingBlock: space._1,
    paddingInline: space._2,
    color: color.fg,
    textDecoration: "none",
  },
  linkOnIndex: {
    paddingBlock: { default: space._2, [breakpoints.lg]: space._1 },
  },
  content: {
    minInlineSize: 0,
    maxInlineSize: "48rem",
  },
  contentOnIndex: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  back: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
});
