"use client";

import { SortAscendingIcon } from "@phosphor-icons/react/dist/ssr/SortAscending";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";

export function SurfacesFloatingMenu() {
  const orders = [
    t({ en: "Newest first", zh: "最新的在前" }),
    t({ en: "Highest rated", zh: "评分最高" }),
    t({ en: "A to Z", zh: "按名称" }),
  ];
  const [sortBy, setSortBy] = useState(1);

  return (
    <Specimen
      caption={t({
        en: "Open the menu, and the page around it blurs",
        zh: "打开菜单，周围的页面就会虚化",
      })}
    >
      <MenuButton
        buttonProps={{ icon: <SortAscendingIcon weight="bold" /> }}
        position="bottomLeft"
        menuContent={
          <div role="none" css={[stack.tight, styles.menu]}>
            {orders.map((order, index) => (
              <Button
                key={order}
                role="menuitem"
                look="ghost"
                aria-current={index === sortBy}
                css={[styles.item, selected.quiet]}
                onClick={() => {
                  setSortBy(index);
                }}
              >
                {order}
              </Button>
            ))}
          </div>
        }
      >
        {t({ en: "Sort", zh: "排序" })}
      </MenuButton>
    </Specimen>
  );
}

const styles = stylex.create({
  menu: {
    inlineSize: space._12,
    padding: space._0,
  },
  item: {
    justifyContent: "flex-start",
    color: color.fg,
  },
});
