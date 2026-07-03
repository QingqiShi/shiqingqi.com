"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";

export function MenuShowcase() {
  return (
    <Showcase label={t({ en: "Menu button", zh: "菜单按钮" })}>
      <div css={styles.stage}>
        <MenuButton
          buttonProps={{ icon: <FunnelIcon weight="bold" /> }}
          position="topLeft"
          popupRole="group"
          menuContent={
            <div css={[flex.col, styles.menu]}>
              <MenuLabel>{t({ en: "Sort by", zh: "排序方式" })}</MenuLabel>
              <Button variant="primary">
                {t({ en: "Newest", zh: "最新" })}
              </Button>
              <Button>{t({ en: "Popular", zh: "热门" })}</Button>
              <Button>{t({ en: "Top rated", zh: "高分" })}</Button>
            </div>
          }
        >
          {t({ en: "Filters", zh: "筛选" })}
        </MenuButton>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  // Reserve room so the expanded popup stays inside the showcase card, and
  // keep the trigger at its natural height (don't let flex stretch it, or the
  // `topLeft`-anchored popup would be pushed to the bottom of the stage).
  stage: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    minBlockSize: space._16,
  },
  menu: {
    gap: space._1,
    padding: space._2,
    inlineSize: space._13,
  },
});
