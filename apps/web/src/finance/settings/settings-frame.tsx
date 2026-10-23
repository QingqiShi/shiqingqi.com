"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { Heading } from "@tuja/ui/components/heading";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { FinancePageColumn } from "../shell/finance-page-column.tsx";
import { SettingsFinanceLogo } from "./settings-finance-logo.tsx";
import {
  isSettingsSection,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./settings-sections.ts";
import { SettingsSignedInMember } from "./settings-signed-in-member.tsx";
import { useIsOwner } from "./use-is-owner.ts";
import { useRecoveryEmail } from "./use-recovery-email.ts";

/**
 * Settings: the section menu beside the open section at `lg` and wider.
 * Below `lg` the menu is its own page and each section opens on its own
 * with a way back. Below `md` the menu page also shows the signed-in Member
 * and the Finance mark.
 * A dot on Members says the signed-in user has no confirmed Recovery email;
 * it is stronger for the owner, whom nobody else can let back in.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const segment = useSelectedLayoutSegment();
  const isOwner = useIsOwner();
  const recoveryEmail = useRecoveryEmail();
  const needsRecoveryEmail = recoveryEmail?.verified === false;
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  const noRecoveryEmail = t({
    en: "No confirmed recovery email",
    zh: "没有已确认的恢复邮箱",
  });
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
    ai: t({ en: "AI labelling", zh: "智能标注" }),
    connections: t({ en: "Connections", zh: "银行连接" }),
    data: t({ en: "Data", zh: "数据" }),
    preferences: t({ en: "Preferences", zh: "偏好设置" }),
  };

  return (
    <FinancePageColumn>
      <div css={styles.root}>
        <nav
          ref={ref}
          aria-label={t({ en: "Settings", zh: "设置" })}
          css={[styles.nav, current !== null && styles.navOnSection, css]}
        >
          <EffectCarrier value={sticky}>
            <Heading level={1} look="h3">
              {t({ en: "Settings", zh: "设置" })}
            </Heading>
            <NavList linkComponent={Link}>
              {SETTINGS_SECTIONS.map((section) => (
                <NavLink
                  key={section}
                  href={getLocalePath(`/finance/settings/${section}`, locale)}
                  current={section === (current ?? "household")}
                >
                  {labels[section]}
                  {section === "members" && needsRecoveryEmail ? (
                    <>
                      <span
                        css={[
                          corner.radius_round,
                          styles.dot,
                          isOwner && styles.dotOwner,
                        ]}
                      />
                      <span css={a11y.srOnly}>{` · ${noRecoveryEmail}`}</span>
                    </>
                  ) : null}
                </NavLink>
              ))}
            </NavList>
          </EffectCarrier>
        </nav>
        {current === null ? (
          <>
            <SettingsSignedInMember />
            <SettingsFinanceLogo />
          </>
        ) : null}
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
    </FinancePageColumn>
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
    display: { default: "none", [breakpoints.lg]: "block" },
  },
  dot: {
    display: "inline-block",
    inlineSize: space._1,
    blockSize: space._1,
    marginInlineStart: rhythm.inline,
    verticalAlign: "middle",
    backgroundColor: color.fgMuted,
  },
  dotOwner: {
    backgroundColor: color.fgWarning,
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
