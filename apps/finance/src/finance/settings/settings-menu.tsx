"use client";

import type { Icon } from "@phosphor-icons/react";
import { BankIcon } from "@phosphor-icons/react/dist/ssr/Bank";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr/Coins";
import { DatabaseIcon } from "@phosphor-icons/react/dist/ssr/Database";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { RepeatIcon } from "@phosphor-icons/react/dist/ssr/Repeat";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { StackIcon } from "@phosphor-icons/react/dist/ssr/Stack";
import { StorefrontIcon } from "@phosphor-icons/react/dist/ssr/Storefront";
import { TagIcon } from "@phosphor-icons/react/dist/ssr/Tag";
import { TreeStructureIcon } from "@phosphor-icons/react/dist/ssr/TreeStructure";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import { StatusDot } from "@tuja/ui/components/status-dot";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import {
  SETTINGS_GROUPS,
  type SettingsGroup,
  type SettingsSection,
} from "./settings-sections.ts";
import { useHouseholdAccess } from "./use-household-access.ts";
import { useRecoveryEmail } from "./use-recovery-email.ts";

const ICONS: Record<SettingsSection, Icon> = {
  household: HouseIcon,
  members: UsersIcon,
  "exchange-rates": CoinsIcon,
  groups: StackIcon,
  categories: TreeStructureIcon,
  payees: StorefrontIcon,
  tags: TagIcon,
  rules: RepeatIcon,
  ai: SparkleIcon,
  connections: BankIcon,
  preferences: SlidersHorizontalIcon,
  data: DatabaseIcon,
};

export function useSettingsSectionLabels(): Record<SettingsSection, string> {
  return {
    household: t({ en: "Household", zh: "家庭" }),
    members: t({ en: "Members", zh: "成员" }),
    "exchange-rates": t({ en: "Exchange rates", zh: "汇率" }),
    groups: t({ en: "Groups", zh: "分组" }),
    categories: t({ en: "Categories", zh: "分类" }),
    payees: t({ en: "Payees", zh: "商家" }),
    tags: t({ en: "Tags", zh: "标签" }),
    rules: t({ en: "Recurring rules", zh: "周期规则" }),
    ai: t({ en: "AI labelling", zh: "智能标注" }),
    connections: t({ en: "Connections", zh: "银行连接" }),
    preferences: t({ en: "Preferences", zh: "偏好设置" }),
    data: t({ en: "Data", zh: "数据" }),
  };
}

/**
 * The Settings sections in their groups, each a row that opens its section
 * over the menu. A dot on Members says the signed-in user has no confirmed
 * Recovery email; it is stronger for the owner, whom nobody else can let back in.
 */
export function SettingsMenu() {
  const locale = useLocale();
  const isOwner = useHouseholdAccess() === "owner";
  const recoveryEmail = useRecoveryEmail();
  const labels = useSettingsSectionLabels();
  const groupLabels: Record<SettingsGroup, string> = {
    general: t({ en: "General", zh: "通用" }),
    organising: t({ en: "Organising", zh: "整理" }),
    automation: t({ en: "Automation", zh: "自动化" }),
    device: t({ en: "This device", zh: "本设备" }),
  };
  const noRecoveryEmail = t({
    en: "No confirmed recovery email",
    zh: "没有已确认的恢复邮箱",
  });
  const membersDot =
    recoveryEmail?.verified === false ? (
      <StatusDot
        intent={isOwner ? "warning" : "neutral"}
        label={` · ${noRecoveryEmail}`}
      />
    ) : null;

  return (
    <nav aria-label={t({ en: "Settings", zh: "设置" })} css={stack.item}>
      {SETTINGS_GROUPS.map((group) => (
        <section
          key={group.id}
          aria-label={groupLabels[group.id]}
          css={stack.tight}
        >
          <Text look="overline" tone="muted">
            {groupLabels[group.id]}
          </Text>
          <List>
            {group.sections.map((section) => {
              const SectionIcon = ICONS[section];
              return (
                <ListRow
                  key={section}
                  href={getLocalePath(`/settings/${section}`, locale)}
                  linkComponent={SplitViewLink}
                  leading={<SectionIcon weight="bold" aria-hidden />}
                  trailing={section === "members" ? membersDot : null}
                >
                  {labels[section]}
                </ListRow>
              );
            })}
          </List>
        </section>
      ))}
    </nav>
  );
}
