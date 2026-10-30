"use client";

import { BooksIcon } from "@phosphor-icons/react/dist/ssr/Books";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import {
  TabBar,
  type TabBarItem,
  type TabBarLinkProps,
} from "@tuja/ui/components/tab-bar";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { createContext, use, useState, type ComponentProps } from "react";

const FollowContext = createContext<(href: string) => void>(() => undefined);

/**
 * The link Slot of the demo bars: it follows a tab by making it current, so
 * the page stays where it is, the way a client-side router keeps it.
 */
function DemoLink({ onClick, ...props }: TabBarLinkProps) {
  const follow = use(FollowContext);
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        follow(props.href);
      }}
    />
  );
}

type TabBarProps = ComponentProps<typeof TabBar>;

/**
 * A demo bar whose tabs are each current when followed — `TabBar` marks the
 * current page, so the demo holds it. The first tab starts current.
 */
function DemoBar({
  items,
  label,
  effect,
  narrow,
}: {
  items: readonly Omit<TabBarItem, "current">[];
  label: string;
  effect?: TabBarProps["effect"];
  narrow?: boolean;
}) {
  const [current, setCurrent] = useState(items[0]?.href);
  return (
    <FollowContext value={setCurrent}>
      <div css={[styles.frame, narrow && styles.narrow]}>
        <TabBar
          label={label}
          items={items.map((item) => ({
            ...item,
            current: item.href === current,
          }))}
          effect={effect}
          linkComponent={DemoLink}
        />
      </div>
    </FollowContext>
  );
}

/** Four destinations of a reading app. */
export function DemoTabBar({
  effect,
  badge,
  narrow,
}: {
  effect?: TabBarProps["effect"];
  /** Puts a dot and a status on Library. */
  badge?: boolean;
  /** Sets the bar in a phone-wide frame. */
  narrow?: boolean;
}) {
  const unread = t({ en: "3 new books", zh: "3本新书" });
  return (
    <DemoBar
      label={t({ en: "Demo app", zh: "示例应用" })}
      effect={effect}
      narrow={narrow}
      items={[
        {
          href: "#home",
          label: t({ en: "Home", zh: "首页" }),
          icon: HouseIcon,
        },
        {
          href: "#search",
          label: t({ en: "Search", zh: "搜索" }),
          icon: MagnifyingGlassIcon,
        },
        {
          href: "#library",
          label: t({ en: "Library", zh: "书库" }),
          icon: BooksIcon,
          ...(badge
            ? {
                badge: <span css={[corner.radius_round, styles.dot]} />,
                status: unread,
              }
            : {}),
        },
        {
          href: "#settings",
          label: t({ en: "Settings", zh: "设置" }),
          icon: GearSixIcon,
        },
      ]}
    />
  );
}

/** Four destinations, one with a label too long for its quarter of the bar. */
export function LongLabelTabBar() {
  return (
    <DemoBar
      label={t({ en: "Long label demo", zh: "长标签示例" })}
      narrow
      items={[
        {
          href: "#today",
          label: t({ en: "Today", zh: "今天" }),
          icon: HouseIcon,
        },
        {
          href: "#search",
          label: t({ en: "Search", zh: "搜索" }),
          icon: MagnifyingGlassIcon,
        },
        {
          href: "#collections",
          label: t({
            en: "Collections and reading lists",
            zh: "收藏夹与阅读清单合集",
          }),
          icon: BooksIcon,
        },
        {
          href: "#settings",
          label: t({ en: "Settings", zh: "设置" }),
          icon: GearSixIcon,
        },
      ]}
    />
  );
}

const styles = stylex.create({
  frame: {
    inlineSize: "100%",
    maxInlineSize: space._15,
  },
  // About the width a phone gives a bar, its gutters taken off.
  narrow: {
    maxInlineSize: "21rem",
  },
  dot: {
    display: "block",
    inlineSize: space._1,
    blockSize: space._1,
    backgroundColor: color.fgWarning,
  },
});
