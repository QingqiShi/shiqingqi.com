"use client";

import type { Icon } from "@phosphor-icons/react";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { NewspaperIcon } from "@phosphor-icons/react/dist/ssr/Newspaper";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { color, controlSize } from "@tuja/ui/tokens.stylex";
import { Link } from "#src/links/link.tsx";
import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "./settings-sections.ts";

const ICONS: Record<SettingsSection, Icon> = {
  report: NewspaperIcon,
  organise: SparkleIcon,
  mailboxes: EnvelopeSimpleIcon,
};

/**
 * The Settings sections. At `lg` and wider it is a list of links beside the
 * open section, with the open one marked. Below `lg` it is a page of its own:
 * one surface of rows.
 */
export function SettingsMenu({ current }: { current: SettingsSection | null }) {
  const locale = useLocale();
  const labels: Record<SettingsSection, string> = {
    report: t({ en: "Report and notifications", zh: "晨报与通知" }),
    organise: t({ en: "Organise", zh: "整理" }),
    mailboxes: t({ en: "Mailboxes", zh: "邮箱" }),
  };
  const items = SETTINGS_SECTIONS.map((section) => ({
    section,
    href: getLocalePath(`/settings/${section}`, locale),
    Icon: ICONS[section],
    label: labels[section],
  }));

  return (
    <>
      <NavList linkComponent={Link} css={styles.links}>
        {items.map(({ section, href, Icon, label }) => (
          <NavLink
            key={section}
            href={href}
            current={section === (current ?? "report")}
            icon={<Icon weight="bold" />}
          >
            {label}
          </NavLink>
        ))}
      </NavList>
      <div css={styles.rows}>
        <List>
          {items.map(({ section, href, Icon, label }) => (
            <ListRow
              key={section}
              href={href}
              linkComponent={Link}
              leading={
                <span aria-hidden css={styles.rowIcon}>
                  <Icon weight="bold" />
                </span>
              }
            >
              {label}
            </ListRow>
          ))}
        </List>
      </div>
    </>
  );
}

const styles = stylex.create({
  links: {
    display: { default: "none", [breakpoints.lg]: "flex" },
  },
  rows: {
    display: { default: "block", [breakpoints.lg]: "none" },
  },
  rowIcon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: controlSize._4,
    color: color.fgMuted,
  },
});
