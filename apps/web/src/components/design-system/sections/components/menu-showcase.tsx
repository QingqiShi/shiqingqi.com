"use client";

import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

function SortPopup() {
  return (
    <div css={styles.popupSample}>
      <MenuLabel>{t({ en: "Sort by", zh: "排序方式" })}</MenuLabel>
      <Button variant="primary">{t({ en: "Newest", zh: "最新" })}</Button>
      <Button>{t({ en: "Popular", zh: "热门" })}</Button>
    </div>
  );
}

export function MenuShowcase() {
  return (
    <>
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

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuLabel } from "@tuja/ui/components/menu-label";

<MenuButton
  buttonProps={{ icon: <FunnelIcon weight="bold" /> }}
  popupRole="group"
  menuContent={
    <>
      <MenuLabel>Sort by</MenuLabel>
      <Button variant="primary">Newest</Button>
      <Button>Popular</Button>
    </>
  }
>
  Filters
</MenuButton>`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "buttonProps",
              type: "Partial<ComponentProps<typeof Button>>",
              required: true,
              description: t({
                en: "Props forwarded to the trigger Button (e.g. icon, variant, disabled).",
                zh: "转发给触发 Button 的属性（例如 icon、variant、disabled）。",
              }),
            },
            {
              name: "menuContent",
              type: "ReactNode",
              required: true,
              description: t({
                en: "Content rendered into the expanded popup.",
                zh: "渲染进展开弹层的内容。",
              }),
            },
            {
              name: "children",
              type: "ReactNode",
              description: t({
                en: "Trigger label; also shown as the popup's title.",
                zh: "触发按钮的标签；同时作为弹层标题显示。",
              }),
            },
            {
              name: "position",
              type: '"topRight" | "topLeft" | "bottomLeft" | "bottomRight" | "viewportWidth"',
              defaultValue: '"topRight"',
              description: t({
                en: "Which corner the menu expands from (logical-direction-aware), or span the viewport width.",
                zh: "菜单从哪个角展开（感知逻辑方向），或横跨视口宽度。",
              }),
            },
            {
              name: "popupRole",
              type: '"menu" | "group"',
              defaultValue: '"menu"',
              description: t({
                en: 'ARIA role for the popup; use "group" when it holds toggle buttons rather than menuitems.',
                zh: '弹层的 ARIA 角色；当其包含切换按钮而非菜单项时使用 "group"。',
              }),
            },
            {
              name: "disabled",
              type: "boolean",
              description: t({
                en: "Disables the trigger.",
                zh: "禁用触发按钮。",
              }),
            },
          ]}
        />
        <ShowcaseHelper>
          {t({
            en: "Caption a group of controls inside menuContent with MenuLabel.",
            zh: "在 menuContent 中用 MenuLabel 为一组控件添加标题。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <div css={[flex.col, styles.guideExample]}>
              <SortPopup />
              <code css={styles.roleTag}>{'popupRole="group"'}</code>
            </div>
          }
          doCaption={t({
            en: 'A popup of toggle buttons is a group — set popupRole="group" so it is not announced as a menuitem list.',
            zh: '一组切换按钮属于 group——设置 popupRole="group"，避免被宣读为菜单项列表。',
          })}
          dont={
            <div css={[flex.col, styles.guideExample]}>
              <SortPopup />
              <code css={styles.roleTag}>{'popupRole="menu"'}</code>
            </div>
          }
          dontCaption={t({
            en: "Don't leave the default \"menu\" role around buttons — arrow-key menuitem semantics won't match the content.",
            zh: '不要在按钮周围保留默认的 "menu" 角色——方向键菜单项语义与内容不符。',
          })}
        />
      </Showcase>
    </>
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
  popupSample: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    padding: space._2,
    inlineSize: "100%",
    maxInlineSize: space._13,
    backgroundColor: color.bgOverlay,
    boxShadow: shadow._3,
    borderRadius: border.radius_2,
  },
  guideExample: {
    gap: space._2,
    alignItems: "flex-start",
    inlineSize: "100%",
  },
  roleTag: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
    backgroundColor: color.surfaceNeutralSubtle,
    paddingInline: space._1,
    paddingBlock: space._00,
    borderRadius: border.radius_1,
  },
});
