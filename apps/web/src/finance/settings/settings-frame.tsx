"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { Link } from "#src/links/link.tsx";
import {
  FinanceIsland,
  FinanceIslands,
} from "../shell/finance-page-column.tsx";
import { SettingsFinanceLogo } from "./settings-finance-logo.tsx";
import { SettingsMenu } from "./settings-menu.tsx";
import {
  isSettingsSection,
  type SettingsSection,
} from "./settings-sections.ts";
import { SettingsSignedInMember } from "./settings-signed-in-member.tsx";

/**
 * Settings: the section menu beside the open section at `lg` and wider,
 * each in its own island. Below `lg` the menu is its own page and each
 * section opens on its own with a way back. Below `md` the menu page also
 * shows the signed-in Member and the Finance mark.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const segment = useSelectedLayoutSegment();
  const current: SettingsSection | null = isSettingsSection(segment)
    ? segment
    : null;

  return (
    <FinanceIslands>
      <FinanceIsland
        css={[styles.menu, current !== null && styles.menuOnSection]}
      >
        <div css={[stack.group, styles.width]}>
          <nav aria-label={t({ en: "Settings", zh: "设置" })} css={stack.group}>
            <Heading level={1} look="h3">
              {t({ en: "Settings", zh: "设置" })}
            </Heading>
            <SettingsMenu current={current} />
          </nav>
          {current === null ? (
            <>
              <SettingsSignedInMember />
              <SettingsFinanceLogo />
            </>
          ) : null}
        </div>
      </FinanceIsland>
      {/* A new key opens each section at the top of its island. */}
      <FinanceIsland
        key={current ?? "household"}
        css={current === null && styles.sectionOnIndex}
      >
        <div css={[stack.item, styles.width, styles.content]}>
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
      </FinanceIsland>
    </FinanceIslands>
  );
}

const styles = stylex.create({
  // At `lg` the menu is as wide as its longest section.
  menu: {
    flexGrow: { default: 1, [breakpoints.lg]: 0 },
    flexShrink: { default: 1, [breakpoints.lg]: 0 },
    flexBasis: { default: 0, [breakpoints.lg]: "auto" },
    inlineSize: { default: null, [breakpoints.lg]: "16rem" },
  },
  menuOnSection: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  width: {
    maxInlineSize: "48rem",
  },
  content: {
    minInlineSize: 0,
  },
  sectionOnIndex: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  back: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
});
