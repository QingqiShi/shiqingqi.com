"use client";

import type { Icon } from "@phosphor-icons/react";
import { DeviceMobileIcon } from "@phosphor-icons/react/dist/ssr/DeviceMobile";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { NewspaperIcon } from "@phosphor-icons/react/dist/ssr/Newspaper";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import { StatusDot } from "@tuja/ui/components/status-dot";
import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./settings-sections.ts";

const ICONS: Record<SettingsSection, Icon> = {
  report: NewspaperIcon,
  organise: SparkleIcon,
  mailboxes: EnvelopeSimpleIcon,
  capture: DeviceMobileIcon,
  preferences: SlidersHorizontalIcon,
};

export function useSettingsSectionLabels(): Record<SettingsSection, string> {
  return {
    report: t({ en: "Report and notifications", zh: "晨报与通知" }),
    organise: t({ en: "Organise", zh: "整理" }),
    mailboxes: t({ en: "Mailboxes", zh: "邮箱" }),
    capture: t({ en: "Add from your phone", zh: "从手机添加" }),
    preferences: t({ en: "Preferences", zh: "偏好设置" }),
  };
}

/**
 * The Settings sections, with the open one marked where the menu shows beside
 * it. The sidebar of the view marks none where it is a page of its own.
 */
export function SettingsMenu({
  current,
  mailboxNeedsYou,
}: {
  current: SettingsSection | null;
  mailboxNeedsYou: boolean;
}) {
  const locale = useLocale();
  const labels = useSettingsSectionLabels();
  const reconnectNote = t({
    en: "(needs connecting again)",
    zh: "（需要重新连接）",
  });

  return (
    <NavList linkComponent={SplitViewLink}>
      {SETTINGS_SECTIONS.map((section) => {
        const SectionIcon = ICONS[section];
        return (
          <NavLink
            key={section}
            href={getLocalePath(`/settings/${section}`, locale)}
            current={section === (current ?? "report")}
            icon={<SectionIcon weight="bold" />}
          >
            {labels[section]}
            {section === "mailboxes" && mailboxNeedsYou ? (
              <StatusDot intent="warning" label={reconnectNote} />
            ) : null}
          </NavLink>
        );
      })}
    </NavList>
  );
}
