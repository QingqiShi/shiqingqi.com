"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link, LinkStatus } from "@tuja/next-links/link";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "../shell/sign-out-button.tsx";
import { SettingsMenu, useSettingsSectionLabels } from "./settings-menu.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";
import {
  isSettingsSection,
  type SettingsSection,
} from "./settings-sections.ts";

/**
 * Settings: the section menu beside the open section where both fit. Where
 * they do not, the menu is the root page of the stack, and each section opens
 * over it with a way back.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const current: SettingsSection | null = isSettingsSection(segment)
    ? segment
    : null;
  const labels = useSettingsSectionLabels();
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
        href: getLocalePath("/settings", locale),
        label: settingsLabel,
        node: (
          <div css={stack.group}>
            <nav aria-label={settingsLabel} css={stack.group}>
              <Heading level={1} look="h3">
                {settingsLabel}
              </Heading>
              <SettingsMenu current={current} />
            </nav>
            <div>
              <SignOutButton />
            </div>
          </div>
        ),
      }}
      content={{
        label: labels[current ?? "report"],
        key: current ?? "report",
        back:
          current === null
            ? null
            : {
                href: getLocalePath("/settings", locale),
                label: settingsLabel,
              },
        node: <div css={stack.item}>{children}</div>,
      }}
    />
  );
}
