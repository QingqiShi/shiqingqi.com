"use client";

import { BooksIcon } from "@phosphor-icons/react/dist/ssr/Books";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Heading } from "@tuja/ui/components/heading";
import { TabView, TabViewBrand } from "@tuja/ui/components/tab-view";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import { type ComponentProps, useState } from "react";
import tabViewDoc from "#src/_generated/props/tab-view.json";
import { FollowContext, FollowLink } from "./follow-link.tsx";
import { LabCanvas } from "./lab-canvas.tsx";
import { NONE_SAMPLE } from "./none-sample.ts";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const screen = stylex.create({
  base: {
    blockSize: "100%",
    overflowY: "auto",
  },
  content: {
    paddingBlockStart: space._5,
    paddingBlockEnd: `calc(${space._5} + ${tabViewTokens.barClearance})`,
    paddingInline: space._5,
  },
});

const mark = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontSize: controlSize._5,
    color: color.foreground,
    backgroundColor: color.muted,
  },
});

const badge = stylex.create({
  dot: {
    display: "block",
    inlineSize: space._1,
    blockSize: space._1,
    backgroundColor: color.foreground,
  },
});

/**
 * A followed destination becomes current, as a router would make it, so the
 * Lab stays on its page. A new set of items starts from its own current item.
 */
function FollowedTabView(
  props: Extract<ComponentProps<typeof TabView>, { linkStatus?: null }>,
) {
  const [followed, setFollowed] = useState<{
    items: unknown;
    href: string;
  } | null>(null);
  const href =
    followed !== null && followed.items === props.items ? followed.href : null;
  const items =
    href === null
      ? props.items
      : props.items.map((item) => ({ ...item, current: item.href === href }));
  return (
    <FollowContext
      value={(next) => {
        setFollowed({ items: props.items, href: next });
      }}
    >
      <TabView {...props} items={items} linkComponent={FollowLink} />
    </FollowContext>
  );
}

export function TabViewLab() {
  const home = t({ en: "Home", zh: "首页" });
  const search = t({ en: "Search", zh: "搜索" });
  const library = t({ en: "Library", zh: "书架" });
  const settings = t({ en: "Settings", zh: "设置" });
  const meiLin = t({ en: "Mei Lin", zh: "林美" });

  const items = labSource([
    { href: "#home", label: home, icon: HouseIcon, current: true },
    { href: "#search", label: search, icon: MagnifyingGlassIcon },
    { href: "#library", label: library, icon: BooksIcon },
    { href: "#settings", label: settings, icon: GearSixIcon },
  ]);

  const itemsWithBadge = labSource([
    { href: "#home", label: home, icon: HouseIcon, current: true },
    { href: "#search", label: search, icon: MagnifyingGlassIcon },
    {
      href: "#library",
      label: library,
      icon: BooksIcon,
      badge: <span css={[corner.radius_round, badge.dot]} />,
      status: t({ en: "2 new books", zh: "2 本新书" }),
    },
    { href: "#settings", label: settings, icon: GearSixIcon },
  ]);

  const itemsWithCount = labSource([
    { href: "#home", label: home, icon: HouseIcon, current: true },
    { href: "#search", label: search, icon: MagnifyingGlassIcon },
    { href: "#library", label: library, icon: BooksIcon, count: 3 },
    { href: "#settings", label: settings, icon: GearSixIcon },
  ]);

  const screenNode = labSource(
    <div css={screen.base}>
      <div css={[stack.group, screen.content]}>
        <div css={stack.text}>
          <Heading level={3} look="h3">
            {t({ en: "Good morning", zh: "早上好" })}
          </Heading>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Two chapters are left in the book you are reading.",
              zh: "你正在读的书还剩两章。",
            })}
          </Text>
        </div>
        <div css={stack.item}>
          <Text>{t({ en: "The Lighthouse Keeper", zh: "守灯人" })}</Text>
          <Text>{t({ en: "A Year of Bread", zh: "面包的一年" })}</Text>
          <Text>{t({ en: "Rivers of the North", zh: "北方的河" })}</Text>
          <Text>{t({ en: "Small Gardens", zh: "小花园" })}</Text>
          <Text>{t({ en: "The Quiet Hour", zh: "安静的时刻" })}</Text>
        </div>
      </div>
    </div>,
  );

  const headerSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "mark",
      label: { en: "App mark", zh: "应用标志" },
      value: labSource(
        <span css={[corner.radius_2, mark.base]} aria-hidden>
          <SquaresFourIcon weight="fill" />
        </span>,
      ),
    },
    {
      id: "brand",
      label: { en: "Brand", zh: "品牌" },
      value: labSource(
        <TabViewBrand name={t({ en: "Reader", zh: "阅读" })} detail={meiLin} />,
      ),
    },
  ];

  const footerSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "member",
      label: { en: "Member", zh: "成员" },
      value: labSource(<Avatar name={meiLin} size="sm" />),
    },
  ];

  const base = {
    label: t({ en: "Reading app", zh: "阅读应用" }),
    sidebarToggleLabel: t({ en: "Sidebar", zh: "侧边栏" }),
    linkStatus: null,
    as: "div",
    children: screenNode,
  } as const;

  return (
    <LabCanvas
      config={{
        doc: tabViewDoc,
        component: FollowedTabView,
        scene: "frame",
        variants: [
          {
            id: "destinations",
            label: { en: "Four destinations", zh: "四个目标页" },
            props: { ...base, items },
          },
          {
            id: "rail",
            label: { en: "Rail header and footer", zh: "侧轨页眉与页脚" },
            props: { ...base, items, header: "mark", footer: "member" },
          },
          {
            id: "sidebar",
            label: { en: "Labelled sidebar", zh: "带标签的侧边栏" },
            props: {
              ...base,
              items: itemsWithCount,
              header: "brand",
              footer: "member",
            },
          },
          {
            id: "badge",
            label: { en: "With a badge", zh: "带标记" },
            props: { ...base, items: itemsWithBadge },
          },
          {
            id: "plain",
            label: { en: "Plain indicator", zh: "普通指示块" },
            props: { ...base, items, effect: "none" },
          },
        ],
        controls: [
          "label",
          { prop: "header", samples: headerSamples },
          { prop: "footer", samples: footerSamples },
          "effect",
        ],
      }}
    />
  );
}
