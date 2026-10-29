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
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useId } from "react";
import { Link } from "#src/links/link.tsx";
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

/**
 * The Settings sections in their groups. At `lg` and wider it is a list of
 * links beside the open section, with the open one marked. Below `lg` it is
 * a page of its own: one surface of rows for each group.
 * A dot on Members says the signed-in user has no confirmed Recovery email;
 * it is stronger for the owner, whom nobody else can let back in.
 */
export function SettingsMenu({ current }: { current: SettingsSection | null }) {
  const locale = useLocale();
  const id = useId();
  const isOwner = useHouseholdAccess() === "owner";
  const recoveryEmail = useRecoveryEmail();
  const groupLabels: Record<SettingsGroup, string> = {
    general: t({ en: "General", zh: "通用" }),
    organising: t({ en: "Organising", zh: "整理" }),
    automation: t({ en: "Automation", zh: "自动化" }),
    device: t({ en: "This device", zh: "本设备" }),
  };
  const labels: Record<SettingsSection, string> = {
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
  const noRecoveryEmail = t({
    en: "No confirmed recovery email",
    zh: "没有已确认的恢复邮箱",
  });
  const membersDot =
    recoveryEmail?.verified === false ? (
      <>
        <span
          css={[corner.radius_round, styles.dot, isOwner && styles.dotOwner]}
        />
        <span css={a11y.srOnly}>{` · ${noRecoveryEmail}`}</span>
      </>
    ) : null;
  const menu = SETTINGS_GROUPS.map((group) => ({
    id: group.id,
    label: groupLabels[group.id],
    items: group.sections.map((section) => ({
      section,
      href: getLocalePath(`/settings/${section}`, locale),
      Icon: ICONS[section],
      label: labels[section],
      badge: section === "members" ? membersDot : null,
    })),
  }));

  return (
    <>
      <NavList linkComponent={Link} css={styles.links}>
        {menu.map((group) => (
          <NavGroup key={group.id} label={group.label}>
            {group.items.map(({ section, href, Icon, label, badge }) => (
              <NavLink
                key={section}
                href={href}
                current={section === (current ?? "household")}
                leading={<Icon weight="bold" />}
              >
                {label}
                {badge}
              </NavLink>
            ))}
          </NavGroup>
        ))}
      </NavList>
      <div css={[stack.group, styles.rows]}>
        {menu.map((group) => {
          const labelId = `${id}-${group.id}`;
          return (
            <div key={group.id} css={stack.tight}>
              <Text
                as="span"
                look="overline"
                tone="muted"
                id={labelId}
                css={styles.groupLabel}
              >
                {group.label}
              </Text>
              <List aria-labelledby={labelId}>
                {group.items.map(({ section, href, Icon, label, badge }) => (
                  <ListRow
                    key={section}
                    href={href}
                    linkComponent={Link}
                    leading={
                      <span aria-hidden css={styles.rowIcon}>
                        <Icon weight="bold" />
                      </span>
                    }
                    trailing={badge}
                  >
                    {label}
                  </ListRow>
                ))}
              </List>
            </div>
          );
        })}
      </div>
    </>
  );
}

const styles = stylex.create({
  links: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  rows: {
    display: { default: "flex", [breakpoints.lg]: "none" },
  },
  groupLabel: {
    paddingInline: space._3,
  },
  rowIcon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: controlSize._4,
    color: color.fgMuted,
  },
  dot: {
    display: "inline-block",
    flexShrink: 0,
    inlineSize: space._1,
    blockSize: space._1,
    marginInlineStart: rhythm.inline,
    verticalAlign: "middle",
    backgroundColor: color.fgMuted,
  },
  dotOwner: {
    backgroundColor: color.fgWarning,
  },
});
