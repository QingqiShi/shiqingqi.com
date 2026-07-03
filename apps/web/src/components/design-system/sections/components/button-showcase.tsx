"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { AnchorButtonGroup } from "@tuja/ui/components/anchor-button-group";
import { Button } from "@tuja/ui/components/button";
import { AnchorButton } from "#src/components/shared/anchor-button.tsx";
import { t } from "#src/i18n.ts";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";

export function ButtonShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Variants", zh: "风格" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="default">
            <Button>{t({ en: "Default", zh: "默认" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="primary">
            <Button variant="primary">
              {t({ en: "Primary", zh: "主要" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="active">
            <Button isActive>{t({ en: "Active", zh: "激活" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="bright">
            <Button bright>{t({ en: "Bright", zh: "明亮" })}</Button>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="leading icon">
            <Button icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add", zh: "添加" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="primary + icon">
            <Button variant="primary" icon={<ArrowRightIcon weight="bold" />}>
              {t({ en: "Continue", zh: "继续" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="icon only">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={t({ en: "Delete", zh: "删除" })}
            />
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Disabled", zh: "禁用" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="default">
            <Button disabled>{t({ en: "Default", zh: "默认" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="primary">
            <Button variant="primary" disabled>
              {t({ en: "Primary", zh: "主要" })}
            </Button>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Button group", zh: "按钮组" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="segmented">
            <AnchorButtonGroup>
              <AnchorButton href="#newest" isActive>
                {t({ en: "Newest", zh: "最新" })}
              </AnchorButton>
              <AnchorButton href="#popular">
                {t({ en: "Popular", zh: "热门" })}
              </AnchorButton>
              <AnchorButton href="#top">
                {t({ en: "Top rated", zh: "高分" })}
              </AnchorButton>
            </AnchorButtonGroup>
          </ShowcaseItem>
          <ShowcaseItem label="with icon">
            <AnchorButtonGroup>
              <AnchorButton
                href="#all"
                icon={<SlidersHorizontalIcon weight="bold" />}
                isActive
              >
                {t({ en: "All", zh: "全部" })}
              </AnchorButton>
              <AnchorButton href="#movies">
                {t({ en: "Movies", zh: "电影" })}
              </AnchorButton>
              <AnchorButton href="#shows">
                {t({ en: "Shows", zh: "剧集" })}
              </AnchorButton>
            </AnchorButtonGroup>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>
    </>
  );
}
