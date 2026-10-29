"use client";

import { BooksIcon } from "@phosphor-icons/react/dist/ssr/Books";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import type { TabBarLinkProps } from "@tuja/ui/components/tab-bar";
import { TabView } from "@tuja/ui/components/tab-view";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, space } from "@tuja/ui/tokens.stylex";
import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "#src/links/link.tsx";
import { DeviceFrame, DeviceFramePlaceholder } from "./device-frame.tsx";

/** The search param the demo reads, named so it clashes with nothing else on the page. */
const PARAM = "demo-destination";

const FRAME_BLOCK_SIZE = "32rem";

/** A link that keeps the page where it is, so a tab does not scroll the doc page. */
function DemoLink(props: TabBarLinkProps) {
  return <Link {...props} scroll={false} />;
}

/**
 * A small reading app in a frame of a width the reader picks: four
 * destinations in the rail where the frame is wide, and in the tab bar where
 * it is as narrow as a phone. Each one shows a screen of its own.
 */
export function TabViewDemo() {
  return (
    <DeviceFrame
      label={t({ en: "Width of the frame", zh: "框的宽度" })}
      sizes={[
        {
          value: "wide",
          label: t({ en: "Wide", zh: "宽" }),
          inlineSize: "100%",
          blockSize: FRAME_BLOCK_SIZE,
        },
        {
          value: "phone",
          label: t({ en: "Phone", zh: "手机" }),
          inlineSize: "24.375rem",
          blockSize: FRAME_BLOCK_SIZE,
        },
      ]}
    >
      <ReadingApp />
    </DeviceFrame>
  );
}

/** The frame of `TabViewDemo`, empty, while the page reads its URL. */
export function TabViewDemoPlaceholder() {
  return <DeviceFramePlaceholder blockSize={FRAME_BLOCK_SIZE} />;
}

function ReadingApp() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hrefOf = (id: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (id === null) params.delete(PARAM);
    else params.set(PARAM, id);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  const destinations = [
    {
      id: null,
      label: t({ en: "Home", zh: "首页" }),
      icon: HouseIcon,
      title: t({ en: "Good morning", zh: "早上好" }),
      text: t({
        en: "Two chapters are left in the book you are reading.",
        zh: "你正在读的书还剩两章。",
      }),
      section: t({ en: "Continue reading", zh: "继续阅读" }),
      rows: [
        {
          title: t({ en: "The Lighthouse Keeper", zh: "守灯人" }),
          detail: t({ en: "Chapter 11 of 13", zh: "第 11 章，共 13 章" }),
        },
        {
          title: t({ en: "A Year of Bread", zh: "面包的一年" }),
          detail: t({ en: "Chapter 4 of 20", zh: "第 4 章，共 20 章" }),
        },
        {
          title: t({ en: "Rivers of the North", zh: "北方的河" }),
          detail: t({ en: "Chapter 2 of 9", zh: "第 2 章，共 9 章" }),
        },
        {
          title: t({ en: "Small Gardens", zh: "小花园" }),
          detail: t({ en: "Not started", zh: "还没开始" }),
        },
        {
          title: t({ en: "The Quiet Hour", zh: "安静的时刻" }),
          detail: t({ en: "Not started", zh: "还没开始" }),
        },
      ],
    },
    {
      id: "search",
      label: t({ en: "Search", zh: "搜索" }),
      icon: MagnifyingGlassIcon,
      title: t({ en: "Search", zh: "搜索" }),
      text: t({
        en: "Find a book by its title, its author or a line from it.",
        zh: "按书名、作者或书中的一句话找书。",
      }),
      section: t({ en: "Recent searches", zh: "最近的搜索" }),
      rows: [
        {
          title: t({ en: "Lighthouses", zh: "灯塔" }),
          detail: t({ en: "4 books", zh: "4 本书" }),
        },
        {
          title: t({ en: "Sourdough", zh: "酸面包" }),
          detail: t({ en: "2 books", zh: "2 本书" }),
        },
        {
          title: t({ en: "Mary Oliver", zh: "玛丽·奥利弗" }),
          detail: t({ en: "Author", zh: "作者" }),
        },
      ],
    },
    {
      id: "library",
      label: t({ en: "Library", zh: "书架" }),
      icon: BooksIcon,
      title: t({ en: "Library", zh: "书架" }),
      text: t({
        en: "Twelve books, three of them unread.",
        zh: "十二本书，其中三本还没读。",
      }),
      section: t({ en: "Recently added", zh: "最近添加" }),
      rows: [
        {
          title: t({ en: "Small Gardens", zh: "小花园" }),
          detail: t({ en: "Added today", zh: "今天添加" }),
        },
        {
          title: t({ en: "The Quiet Hour", zh: "安静的时刻" }),
          detail: t({ en: "Added yesterday", zh: "昨天添加" }),
        },
        {
          title: t({ en: "Rivers of the North", zh: "北方的河" }),
          detail: t({ en: "Added on Monday", zh: "周一添加" }),
        },
        {
          title: t({ en: "A Year of Bread", zh: "面包的一年" }),
          detail: t({ en: "Added last week", zh: "上周添加" }),
        },
      ],
    },
    {
      id: "settings",
      label: t({ en: "Settings", zh: "设置" }),
      icon: GearSixIcon,
      title: t({ en: "Settings", zh: "设置" }),
      text: t({
        en: "The size of the text, and when to sync.",
        zh: "文字大小，以及何时同步。",
      }),
      section: t({ en: "Reading", zh: "阅读" }),
      rows: [
        {
          title: t({ en: "Text size", zh: "文字大小" }),
          detail: t({ en: "Medium", zh: "中" }),
        },
        {
          title: t({ en: "Theme", zh: "主题" }),
          detail: t({ en: "Match the system", zh: "跟随系统" }),
        },
        {
          title: t({ en: "Sync", zh: "同步" }),
          detail: t({ en: "On Wi-Fi only", zh: "仅限 Wi-Fi" }),
        },
      ],
    },
  ];
  const id = searchParams.get(PARAM);
  const current =
    destinations.find((destination) => destination.id === id) ??
    destinations[0];

  return (
    <TabView
      as="div"
      label={t({ en: "Demo app", zh: "演示应用" })}
      linkComponent={DemoLink}
      header={
        <span css={[corner.radius_2, styles.mark]} aria-hidden>
          <SquaresFourIcon weight="fill" />
        </span>
      }
      footer={<Avatar name="Mei Lin" size="sm" />}
      items={destinations.map((destination) => ({
        href: hrefOf(destination.id),
        label: destination.label,
        icon: destination.icon,
        current: destination === current,
      }))}
    >
      <div css={styles.screen}>
        <div css={[stack.group, styles.screenContent]}>
          <div css={stack.text}>
            <Heading level={3} look="h3">
              {current.title}
            </Heading>
            <Text look="bodySmall" tone="muted">
              {current.text}
            </Text>
          </div>
          <section css={stack.tight}>
            <Heading level={4} look="h4">
              {current.section}
            </Heading>
            <List>
              {current.rows.map((row) => (
                <li key={row.title} css={listSurface.item}>
                  <div css={[listSurface.row, styles.row]}>
                    <span css={typeRole.body}>{row.title}</span>
                    <span css={[typeRole.bodySmall, styles.detail]}>
                      {row.detail}
                    </span>
                  </div>
                </li>
              ))}
            </List>
          </section>
        </div>
      </div>
    </TabView>
  );
}

const styles = stylex.create({
  mark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontSize: controlSize._5,
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
  },
  // The frame does not scroll the page, so the screen scrolls itself. As
  // on a phone, its end scrolls clear of the floating tab bar.
  screen: {
    blockSize: "100%",
    overflowY: "auto",
  },
  screenContent: {
    paddingBlockStart: space._5,
    paddingBlockEnd: `calc(${space._5} + ${tabViewTokens.barClearance})`,
    paddingInline: space._5,
  },
  row: {
    justifyContent: "space-between",
  },
  detail: {
    flexShrink: 0,
    whiteSpace: "nowrap",
    color: color.fgMuted,
  },
});
