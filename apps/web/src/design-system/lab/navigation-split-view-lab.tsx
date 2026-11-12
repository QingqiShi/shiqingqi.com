"use client";

import { CalendarIcon } from "@phosphor-icons/react/dist/ssr/Calendar";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { type ComponentProps, type MouseEvent, useState } from "react";
import navigationSplitViewDoc from "#src/_generated/props/navigation-split-view.json";
import { defineLab, NONE_SAMPLE, noop } from "./define-lab.tsx";
import { markCurrent } from "./mark-current.ts";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const SIDEBAR_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "beside",
    label: { en: "Beside the content", zh: "在内容旁" },
    value: labSource({
      href: "#projects",
      label: "Projects",
      node: (
        <NavList>
          <NavLink href="#inbox" icon={<TrayIcon weight="bold" />} current>
            Inbox
          </NavLink>
          <NavLink href="#today" icon={<CalendarIcon weight="bold" />}>
            Today
          </NavLink>
          <NavLink href="#team" icon={<UsersIcon weight="bold" />}>
            Team
          </NavLink>
        </NavList>
      ),
    }),
  },
  {
    id: "titled",
    label: { en: "With a header", zh: "带页眉" },
    value: labSource({
      href: "#projects",
      label: "Projects",
      toggleLabel: "Sidebar",
      header: (
        <Text look="bodySmall" weight="semibold">
          Tasks
        </Text>
      ),
      node: (
        <NavList>
          <NavLink href="#inbox" icon={<TrayIcon weight="bold" />} current>
            Inbox
          </NavLink>
          <NavLink href="#today" icon={<CalendarIcon weight="bold" />}>
            Today
          </NavLink>
          <NavLink href="#team" icon={<UsersIcon weight="bold" />}>
            Team
          </NavLink>
        </NavList>
      ),
    }),
  },
];

const CONTENT_SAMPLES: LabSample[] = [
  {
    id: "list",
    label: { en: "A list", zh: "列表" },
    value: labSource({
      label: "Inbox",
      node: (
        <div css={stack.group}>
          <Heading level={2} look="h3">
            Inbox
          </Heading>
          <div css={stack.item}>
            <Text>Write the brief</Text>
            <Text>Book the venue</Text>
            <Text>Send the invites</Text>
            <Text>Order the badges</Text>
            <Text>Plan the seating</Text>
            <Text>Check the projector</Text>
          </div>
        </div>
      ),
    }),
  },
  {
    id: "accessory",
    label: { en: "With an accessory", zh: "带浮动操作" },
    value: labSource({
      label: "Inbox",
      node: (
        <div css={stack.group}>
          <Heading level={2} look="h3">
            Inbox
          </Heading>
          <div css={stack.item}>
            <Text>Write the brief</Text>
            <Text>Book the venue</Text>
            <Text>Send the invites</Text>
          </div>
        </div>
      ),
      accessory: (
        <Button look="primary" icon={<PlusIcon weight="bold" />}>
          Add task
        </Button>
      ),
    }),
  },
  {
    id: "back",
    label: { en: "With a back link", zh: "带返回链接" },
    value: labSource({
      label: "Today",
      back: { href: "#inbox", label: "Inbox" },
      node: (
        <div css={stack.item}>
          <Text>Book the venue</Text>
          <Text>Send the invites</Text>
        </div>
      ),
    }),
  },
];

const DETAIL_SAMPLES: LabSample[] = [
  NONE_SAMPLE,
  {
    id: "task",
    label: { en: "A task", zh: "一个任务" },
    value: labSource({
      label: "Write the brief",
      closeLabel: "Close",
      back: { href: "#inbox", label: "Inbox" },
      node: (
        <div css={stack.item}>
          <Text>Due on Friday.</Text>
          <Text tone="muted">
            One page on who the event is for, what it costs and when it happens.
          </Text>
        </div>
      ),
    }),
  },
];

/**
 * A followed link marks its row current, as a router would, and the Lab
 * stays on its page. The box around the view takes the click of each link,
 * also of the plain anchors of the sidebar's `NavList`. A new sidebar starts
 * from its own current row.
 */
function FollowedSplitView(
  props: Extract<
    ComponentProps<typeof NavigationSplitView>,
    { linkStatus: null }
  >,
) {
  const [followed, setFollowed] = useState<{
    sidebar: unknown;
    href: string;
  } | null>(null);
  const { sidebar } = props;
  const href =
    followed !== null && followed.sidebar === sidebar ? followed.href : null;
  const followAnchor = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    const next = anchor?.getAttribute("href");
    if (next == null) return;
    event.preventDefault();
    setFollowed({ sidebar, href: next });
  };
  const shownSidebar =
    sidebar == null
      ? sidebar
      : { ...sidebar, node: markCurrent(sidebar.node, href) };
  return (
    <div onClickCapture={followAnchor} css={styles.contents}>
      <NavigationSplitView {...props} sidebar={shownSidebar} replace={noop} />
    </div>
  );
}

const BASE = { linkStatus: null } as const;

export const NavigationSplitViewLab = defineLab({
  doc: navigationSplitViewDoc,
  component: FollowedSplitView,
  scene: "frame",
  variants: [
    {
      id: "sidebar",
      label: { en: "Sidebar and content", zh: "侧栏与内容" },
      props: { ...BASE, sidebar: "beside", content: "list" },
    },
    {
      id: "detail",
      label: { en: "With a detail", zh: "带详情" },
      props: { ...BASE, sidebar: "beside", content: "list", detail: "task" },
    },
    {
      id: "titled",
      label: { en: "Sidebar that collapses", zh: "可收起的侧栏" },
      props: { ...BASE, sidebar: "titled", content: "list" },
    },
    {
      id: "accessory",
      label: { en: "With an accessory", zh: "带浮动操作" },
      props: { ...BASE, sidebar: "beside", content: "accessory" },
    },
  ],
  controls: [
    { prop: "sidebar", samples: SIDEBAR_SAMPLES },
    { prop: "content", samples: CONTENT_SAMPLES },
    { prop: "detail", samples: DETAIL_SAMPLES },
  ],
});

const styles = stylex.create({
  contents: {
    display: "contents",
  },
});
