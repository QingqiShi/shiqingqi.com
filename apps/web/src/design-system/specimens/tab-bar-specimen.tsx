"use client";

import { BooksIcon } from "@phosphor-icons/react/dist/ssr/Books";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { TabBar } from "@tuja/ui/components/tab-bar";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Three tabs of equal width, the first one current under the indicator —
 * the shape that tells a tab bar from a row of buttons.
 *
 * A client component, unlike most specimens: each icon is a component, and a
 * function can't cross the server boundary. The tile is `inert`, so the
 * placeholder `href`s are never followed; each differs, because the bar
 * keys its tabs by `href`.
 */
export function TabBarSpecimen() {
  return (
    <div css={specimenLayout.fill}>
      <TabBar
        label={t({ en: "Tab bar", zh: "标签栏" })}
        items={[
          {
            href: "#home",
            label: t({ en: "Home", zh: "首页" }),
            icon: HouseIcon,
            current: true,
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
          },
        ]}
      />
    </div>
  );
}
