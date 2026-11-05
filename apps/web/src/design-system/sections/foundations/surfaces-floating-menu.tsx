"use client";

import { SortAscendingIcon } from "@phosphor-icons/react/dist/ssr/SortAscending";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
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
          <div role="none" css={[stack.tight, styles.menu]}>
            {orders.map((order, index) => (
              <Button
                key={order}
                role="menuitem"
                look="ghost"
                aria-current={index === sortBy}
                css={[quietSurface.interactive, a11y.focusRing, styles.item]}
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
  // A Button animates its press, and `quietSurface.interactive` replaces that
  // transition. So this is a copy of the transition of a Button.
  item: {
    justifyContent: "flex-start",
    color: color.fg,
    transition: {
      default: `background ${duration._200} ${easing.ease}, transform ${duration._500} ${easing.spring}, filter ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: `background ${duration._200} ${easing.ease}`,
    },
  },
});
