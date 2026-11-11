"use client";

import { BooksIcon } from "@phosphor-icons/react/dist/ssr/Books";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Heading } from "@tuja/ui/components/heading";
import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { TabView, TabViewBrand } from "@tuja/ui/components/tab-view";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import { type ComponentProps, useState } from "react";
import tabViewDoc from "#src/_generated/props/tab-view.json";
import { defineLab, NONE_SAMPLE } from "./define-lab.tsx";
import { FollowContext, FollowLink } from "./follow-link.tsx";
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

const ITEMS = labSource([
  { href: "#home", label: "Home", icon: HouseIcon, current: true },
  { href: "#search", label: "Search", icon: MagnifyingGlassIcon },
  { href: "#library", label: "Library", icon: BooksIcon },
  { href: "#settings", label: "Settings", icon: GearSixIcon },
]);

const ITEMS_WITH_BADGE = labSource([
  { href: "#home", label: "Home", icon: HouseIcon, current: true },
  { href: "#search", label: "Search", icon: MagnifyingGlassIcon },
  {
    href: "#library",
    label: "Library",
    icon: BooksIcon,
    badge: <span css={[corner.radius_round, badge.dot]} />,
    status: "2 new books",
  },
  { href: "#settings", label: "Settings", icon: GearSixIcon },
]);

const ITEMS_WITH_COUNT = labSource([
  { href: "#home", label: "Home", icon: HouseIcon, current: true },
  { href: "#search", label: "Search", icon: MagnifyingGlassIcon },
  { href: "#library", label: "Library", icon: BooksIcon, count: 3 },
  { href: "#settings", label: "Settings", icon: GearSixIcon },
]);

const SCREEN = labSource(
  <div css={screen.base}>
    <div css={[stack.group, screen.content]}>
      <div css={stack.text}>
        <Heading level={3} look="h3">
          Good morning
        </Heading>
        <Text look="bodySmall" tone="muted">
          Two chapters are left in the book you are reading.
        </Text>
      </div>
      <div css={stack.item}>
        <Text>The Lighthouse Keeper</Text>
        <Text>A Year of Bread</Text>
        <Text>Rivers of the North</Text>
        <Text>Small Gardens</Text>
        <Text>The Quiet Hour</Text>
      </div>
    </div>
  </div>,
);

const HEADER_SAMPLES: LabSample[] = [
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
    value: labSource(<TabViewBrand name="Reader" detail="Mei Lin" />),
  },
];

const SECONDARY_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "shelves",
    label: { en: "Shelves", zh: "书单" },
    value: labSource(
      <nav aria-label="Shelves">
        <NavList>
          <NavGroup label="Shelves">
            <NavLink href="#">Want to read</NavLink>
            <NavLink href="#">Finished</NavLink>
          </NavGroup>
        </NavList>
      </nav>,
    ),
  },
];

const FOOTER_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "member",
    label: { en: "Member", zh: "成员" },
    value: labSource(<Avatar name="Mei Lin" size="sm" />),
  },
];

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

const BASE = {
  label: "Reading app",
  linkStatus: null,
  as: "div",
  children: SCREEN,
} as const;

export const TabViewLab = defineLab({
  doc: tabViewDoc,
  component: FollowedTabView,
  scene: "frame",
  variants: [
    {
      id: "destinations",
      label: { en: "Four destinations", zh: "四个目标页" },
      props: { ...BASE, items: ITEMS },
    },
    {
      id: "rail",
      label: { en: "Rail header and footer", zh: "侧轨页眉与页脚" },
      props: { ...BASE, items: ITEMS, header: "mark", footer: "member" },
    },
    {
      id: "sidebar",
      label: { en: "Labelled sidebar", zh: "带标签的侧边栏" },
      props: {
        ...BASE,
        items: ITEMS_WITH_COUNT,
        rail: "labels",
        header: "brand",
        footer: "member",
        secondary: "shelves",
      },
    },
    {
      id: "badge",
      label: { en: "With a badge", zh: "带标记" },
      props: { ...BASE, items: ITEMS_WITH_BADGE },
    },
    {
      id: "plain",
      label: { en: "Plain indicator", zh: "普通指示块" },
      props: { ...BASE, items: ITEMS, effect: "none" },
    },
  ],
  controls: [
    "label",
    "rail",
    { prop: "header", samples: HEADER_SAMPLES },
    { prop: "footer", samples: FOOTER_SAMPLES },
    { prop: "secondary", samples: SECONDARY_SAMPLES },
    "effect",
  ],
});
