"use client";

import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { space } from "@tuja/ui/tokens.stylex";
import { type ComponentProps, type ReactNode, useState } from "react";
import navListDoc from "#src/_generated/props/nav-list.json";
import { FollowContext, FollowLink } from "./follow-link.tsx";
import { LabCanvas } from "./lab-canvas.tsx";
import { markCurrent } from "./mark-current.ts";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

/**
 * A NavList sits in the consumer's own `<nav>`, which names the landmark, and
 * its rows fill the width it gets. The Lab gives both, and makes a followed
 * link current.
 */
function FollowedNavList({
  children,
  ...props
}: ComponentProps<typeof NavList>) {
  const [followed, setFollowed] = useState<{
    content: ReactNode;
    href: string;
  } | null>(null);
  // A new sample starts from the link it marks itself.
  const href =
    followed !== null && followed.content === children ? followed.href : null;
  return (
    <FollowContext
      value={(next) => {
        setFollowed({ content: children, href: next });
      }}
    >
      <nav aria-label={t({ en: "Docs", zh: "文档" })} css={styles.frame}>
        <NavList {...props} linkComponent={FollowLink}>
          {markCurrent(children, href)}
        </NavList>
      </nav>
    </FollowContext>
  );
}

export function NavListLab() {
  const contentSamples: LabSample[] = [
    {
      id: "links",
      label: { en: "Links with icons", zh: "带图标的链接" },
      value: labSource(
        <>
          <NavLink href="#home" icon={<HouseIcon weight="bold" />} current>
            {t({ en: "Home", zh: "首页" })}
          </NavLink>
          <NavLink href="#reports" icon={<ChartBarIcon weight="bold" />}>
            {t({ en: "Reports", zh: "报告" })}
          </NavLink>
          <NavLink href="#settings" icon={<GearSixIcon weight="bold" />}>
            {t({ en: "Settings", zh: "设置" })}
          </NavLink>
        </>,
      ),
    },
    {
      id: "plain",
      label: { en: "Links", zh: "链接" },
      value: labSource(
        <>
          <NavLink href="#profile" current>
            {t({ en: "Profile", zh: "个人资料" })}
          </NavLink>
          <NavLink href="#security">
            {t({ en: "Security", zh: "安全" })}
          </NavLink>
          <NavLink href="#billing">{t({ en: "Billing", zh: "账单" })}</NavLink>
          <NavLink href="#notifications">
            {t({ en: "Notifications", zh: "通知" })}
          </NavLink>
        </>,
      ),
    },
    {
      id: "groups",
      label: { en: "Groups", zh: "分组" },
      value: labSource(
        <>
          <NavGroup>
            <NavLink href="#overview" icon={<SquaresFourIcon weight="bold" />}>
              {t({ en: "Overview", zh: "概览" })}
            </NavLink>
          </NavGroup>
          <NavGroup label={t({ en: "Guides", zh: "指南" })}>
            <NavGroup
              label={t({ en: "Basics", zh: "入门" })}
              icon={<BookOpenIcon weight="bold" />}
              current
            >
              <NavLink href="#install" current>
                {t({ en: "Install", zh: "安装" })}
              </NavLink>
              <NavLink href="#first-page">
                {t({ en: "First page", zh: "第一个页面" })}
              </NavLink>
            </NavGroup>
            <NavGroup
              label={t({ en: "Styling", zh: "样式" })}
              icon={<PaletteIcon weight="bold" />}
            >
              <NavLink href="#tokens">
                {t({ en: "Tokens", zh: "令牌" })}
              </NavLink>
              <NavLink href="#themes">
                {t({ en: "Themes", zh: "主题" })}
              </NavLink>
            </NavGroup>
          </NavGroup>
        </>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: navListDoc,
        component: FollowedNavList,
        variants: [
          {
            id: "links",
            label: { en: "Links with icons", zh: "带图标的链接" },
            props: { children: "links" },
          },
          {
            id: "plain",
            label: { en: "Links", zh: "链接" },
            props: { children: "plain" },
          },
          {
            id: "groups",
            label: { en: "Groups", zh: "分组" },
            props: { children: "groups" },
          },
        ],
        controls: [{ prop: "children", samples: contentSamples }],
      }}
    />
  );
}

const styles = stylex.create({
  frame: {
    inlineSize: space._13,
    maxInlineSize: "100%",
  },
});
