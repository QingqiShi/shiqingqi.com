"use client";

import { SortAscendingIcon } from "@phosphor-icons/react/dist/ssr/SortAscending";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
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
          <div role="none" css={[flex.col, styles.menu]}>
            {orders.map((order, index) => (
              <MenuItem
                key={order}
                current={index === sortBy}
                onClick={() => {
                  setSortBy(index);
                }}
              >
                {order}
              </MenuItem>
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
});
