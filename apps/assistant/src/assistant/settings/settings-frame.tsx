"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Link, LinkStatus } from "@tuja/next-links/link";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { useSettingsSectionLabels } from "./settings-menu.tsx";
import { SettingsSectionSkeleton } from "./settings-section-skeleton.tsx";
import { isSettingsSection } from "./settings-sections.ts";

/**
 * Settings: the menu of sections is the first page, and each section opens
 * over it with a way back.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
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
      content={{
        label: current === null ? settingsLabel : labels[current],
        key: current ?? "menu",
        back:
          current === null
            ? null
            : { href: settingsHref, label: settingsLabel },
        node: <div css={stack.item}>{children}</div>,
      }}
    />
  );
}
