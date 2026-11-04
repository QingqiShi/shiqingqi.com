"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { Link, LinkStatus } from "#src/links/link.tsx";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import { NewTransactionSheet } from "../shell/new-transaction-sheet.tsx";
import { SettingsFinanceLogo } from "./settings-finance-logo.tsx";
import { SettingsMenu, useSettingsSectionLabels } from "./settings-menu.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";
import { isSettingsSection } from "./settings-sections.ts";
import { SettingsSignedInMember } from "./settings-signed-in-member.tsx";

/**
 * Settings: the section menu beside the open section where both fit. Where
 * they do not, the menu is the root page of the stack, and each section opens
 * over it with a way back. Below `md` the menu page also shows the signed-in
 * Member and the Finance mark. A new Transaction opens in a sheet over Settings.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <SettingsColumns>{children}</SettingsColumns>
      <NewTransactionSheet />
    </>
  );
}

/** The columns of Settings, without the sheet, so that the skeleton can show them. */
export function SettingsColumns({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const current = isSettingsSection(segment) ? segment : null;
  const labels = useSettingsSectionLabels();
  const settingsHref = getLocalePath("/settings", locale);
  const settingsLabel = t({ en: "Settings", zh: "设置" });

  return (
    <NavigationSplitView
      linkComponent={Link}
      linkStatus={LinkStatus}
      skeleton={<SettingsSectionSkeleton />}
      css={pageColumn.settings}
      replace={(href) => {
        router.replace(href);
      }}
      sidebar={{
        stacked: "page",
        href: settingsHref,
        label: settingsLabel,
        accessory: <FinanceAddButton />,
        node: (
          <div css={stack.group}>
            <nav aria-label={settingsLabel} css={stack.group}>
              <Heading level={1} look="h3">
                {settingsLabel}
              </Heading>
              <SettingsMenu current={current} />
            </nav>
            <SettingsSignedInMember />
            <SettingsFinanceLogo />
          </div>
        ),
      }}
      content={{
        label: labels[current ?? "household"],
        key: current ?? "household",
        back:
          current === null
            ? null
            : { href: settingsHref, label: settingsLabel },
        accessory: <FinanceAddButton />,
        node: <div css={stack.item}>{children}</div>,
      }}
    />
  );
}
