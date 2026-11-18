"use client";

import { CalendarIcon } from "@phosphor-icons/react/dist/ssr/Calendar";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { type ComponentProps, type MouseEvent, useState } from "react";
import navigationSplitViewDoc from "#src/_generated/props/navigation-split-view.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { markCurrent } from "./mark-current.ts";
import { NONE_SAMPLE } from "./none-sample.ts";
import { noop } from "./noop.ts";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

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

export function NavigationSplitViewLab() {
  const projects = t({ en: "Projects", zh: "项目" });
  const inbox = t({ en: "Inbox", zh: "收件箱" });
  const today = t({ en: "Today", zh: "今天" });
  const team = t({ en: "Team", zh: "团队" });
  const writeBrief = t({ en: "Write the brief", zh: "撰写简报" });
  const bookVenue = t({ en: "Book the venue", zh: "预订场地" });
  const sendInvites = t({ en: "Send the invites", zh: "发送邀请" });

  const sidebarSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "beside",
      label: { en: "Beside the content", zh: "在内容旁" },
      value: labSource({
        href: "#projects",
        label: projects,
        node: (
          <NavList>
            <NavLink href="#inbox" icon={<TrayIcon weight="bold" />} current>
              {inbox}
            </NavLink>
            <NavLink href="#today" icon={<CalendarIcon weight="bold" />}>
              {today}
            </NavLink>
            <NavLink href="#team" icon={<UsersIcon weight="bold" />}>
              {team}
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
        label: projects,
        toggleLabel: t({ en: "Sidebar", zh: "侧边栏" }),
        header: (
          <Text look="bodySmall" weight="semibold">
            {t({ en: "Tasks", zh: "任务" })}
          </Text>
        ),
        node: (
          <NavList>
            <NavLink href="#inbox" icon={<TrayIcon weight="bold" />} current>
              {inbox}
            </NavLink>
            <NavLink href="#today" icon={<CalendarIcon weight="bold" />}>
              {today}
            </NavLink>
            <NavLink href="#team" icon={<UsersIcon weight="bold" />}>
              {team}
            </NavLink>
          </NavList>
        ),
      }),
    },
  ];

  const contentSamples: LabSample[] = [
    {
      id: "list",
      label: { en: "A list", zh: "列表" },
      value: labSource({
        label: inbox,
        node: (
          <div css={stack.group}>
            <Heading level={2} look="h3">
              {inbox}
            </Heading>
            <div css={stack.item}>
              <Text>{writeBrief}</Text>
              <Text>{bookVenue}</Text>
              <Text>{sendInvites}</Text>
              <Text>{t({ en: "Order the badges", zh: "订购胸牌" })}</Text>
              <Text>{t({ en: "Plan the seating", zh: "安排座位" })}</Text>
              <Text>{t({ en: "Check the projector", zh: "检查投影仪" })}</Text>
            </div>
          </div>
        ),
      }),
    },
    {
      id: "accessory",
      label: { en: "With an accessory", zh: "带浮动操作" },
      value: labSource({
        label: inbox,
        node: (
          <div css={stack.group}>
            <Heading level={2} look="h3">
              {inbox}
            </Heading>
            <div css={stack.item}>
              <Text>{writeBrief}</Text>
              <Text>{bookVenue}</Text>
              <Text>{sendInvites}</Text>
            </div>
          </div>
        ),
        accessory: (
          <Button look="primary" icon={<PlusIcon weight="bold" />}>
            {t({ en: "Add task", zh: "添加任务" })}
          </Button>
        ),
      }),
    },
    {
      id: "back",
      label: { en: "With a back link", zh: "带返回链接" },
      value: labSource({
        label: today,
        back: { href: "#inbox", label: inbox },
        node: (
          <div css={stack.item}>
            <Text>{bookVenue}</Text>
            <Text>{sendInvites}</Text>
          </div>
        ),
      }),
    },
  ];

  const detailSamples: LabSample[] = [
    NONE_SAMPLE,
    {
      id: "task",
      label: { en: "A task", zh: "一个任务" },
      value: labSource({
        label: writeBrief,
        closeLabel: t({ en: "Close", zh: "关闭" }),
        back: { href: "#inbox", label: inbox },
        node: (
          <div css={stack.item}>
            <Text>{t({ en: "Due on Friday.", zh: "周五截止。" })}</Text>
            <Text tone="muted">
              {t({
                en: "One page on who the event is for, what it costs and when it happens.",
                zh: "用一页纸写清活动面向谁、花费多少、何时举行。",
              })}
            </Text>
          </div>
        ),
      }),
    },
  ];

  return (
    <LabCanvas
      config={{
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
            props: {
              ...BASE,
              sidebar: "beside",
              content: "list",
              detail: "task",
            },
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
          { prop: "sidebar", samples: sidebarSamples },
          { prop: "content", samples: contentSamples },
          { prop: "detail", samples: detailSamples },
        ],
      }}
    />
  );
}

const styles = stylex.create({
  contents: {
    display: "contents",
  },
});
