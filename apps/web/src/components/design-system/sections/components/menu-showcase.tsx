import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { align, flex } from "@tuja/ui/primitives/flex.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import { MenuPopupShowcase } from "./menu-specimens.tsx";

const MENU_USAGE = `import { MenuButton } from "@tuja/ui/components/menu-button";

// Anything focusable that carries role="menuitem" joins the keyboard model.
<MenuButton
  buttonProps={{ icon: <DotsThreeIcon weight="bold" /> }}
  menuContent={
    <div role="none">
      <a role="menuitem" href={detailsHref} data-menu-autofocus="true">
        Details
      </a>
      <a role="menuitem" href={creditsHref}>
        Cast & crew
      </a>
    </div>
  }
>
  More
</MenuButton>`;

/** No Progressive blur: a plate has nothing behind the popup to blur. */
function SortPopup() {
  return (
    <div css={[popoverSurface.base, styles.popupSample]}>
      <MenuLabel>{t({ en: "Sort by", zh: "排序方式" })}</MenuLabel>
      <Button look="primary">{t({ en: "Newest", zh: "最新" })}</Button>
      <Button>{t({ en: "Popular", zh: "热门" })}</Button>
    </div>
  );
}

export function MenuShowcase() {
  return (
    <>
      <MenuPopupShowcase />

      <Showcase
        label={t({ en: "Contrast: group popup", zh: "对照：分组弹层" })}
      >
        <div css={styles.demoLayout}>
          <Specimen caption={t({ en: "Tab moves focus", zh: "Tab 移动焦点" })}>
            <div css={[flex.row, align.start, styles.groupStage]}>
              <MenuButton
                buttonProps={{ icon: <FunnelIcon weight="bold" /> }}
                position="topLeft"
                popupRole="group"
                menuContent={
                  <div css={[flex.col, styles.groupMenu]}>
                    <MenuLabel>
                      {t({ en: "Sort by", zh: "排序方式" })}
                    </MenuLabel>
                    <Button look="primary">
                      {t({ en: "Newest", zh: "最新" })}
                    </Button>
                    <Button>{t({ en: "Popular", zh: "热门" })}</Button>
                  </div>
                }
              >
                {t({ en: "Filters", zh: "筛选" })}
              </MenuButton>
            </div>
          </Specimen>
          <div css={[flex.col, styles.notes]}>
            <ShowcaseHelper>
              {t({
                en: 'The same component with popupRole="group". This popup holds controls, not commands, so it is announced as a group, focus stays on the trigger when it opens, and the arrow keys are left to the browser — Tab moves between the controls and Escape still closes. That is the group contract, not a menu that stopped working.',
                zh: '同一个组件改用 popupRole="group"。这个弹层装的是控件而非命令，因此会被宣读为分组，打开时焦点留在触发按钮上，方向键交还浏览器——用 Tab 在控件间移动，Escape 依然可关闭。这是分组契约，而非菜单失灵。',
              })}
            </ShowcaseHelper>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={MENU_USAGE}
          label={t({ en: "Menu popup", zh: "菜单弹层" })}
        />
      </Showcase>

      <PropsTable component="menu-button" />
      <Showcase>
        <ShowcaseHelper>
          {t({
            en: 'Two conventions live inside menuContent rather than on a prop: caption a group of controls with MenuLabel, and mark one role="menuitem" child with data-menu-autofocus="true" to choose where focus lands when a menu opens.',
            zh: 'menuContent 内部有两项约定，而非通过属性表达：用 MenuLabel 为一组控件添加标题；给某个 role="menuitem" 子元素标上 data-menu-autofocus="true"，以决定菜单打开时焦点落在哪里。',
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <div css={[flex.col, styles.guideExample]}>
              <SortPopup />
              <code css={[corner.radius_1, styles.roleTag]}>
                {'popupRole="group"'}
              </code>
            </div>
          }
          doCaption={t({
            en: 'A popup of toggle buttons is a group — set popupRole="group" so it is not announced as a menuitem list.',
            zh: '一组切换按钮属于 group——设置 popupRole="group"，避免被宣读为菜单项列表。',
          })}
          dont={
            <div css={[flex.col, styles.guideExample]}>
              <SortPopup />
              <code css={[corner.radius_1, styles.roleTag]}>
                {'popupRole="menu"'}
              </code>
            </div>
          }
          dontCaption={t({
            en: 'Don\'t leave the default "menu" role around buttons — the popup promises arrow-key menuitem navigation that has no menuitems to move between.',
            zh: '不要在按钮周围保留默认的 "menu" 角色——弹层承诺了方向键菜单项导航，却没有可供移动的菜单项。',
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  // A stage is only as wide as the popup it holds, so from `md` up the section's
  // copy takes the column beside it instead of sitting under a band of empty
  // card. The stage column is that popup width — `space._13`, the same token the
  // popups below set as their own `inlineSize`. Stacked below `md`, where the
  // popup is nearly the full page width.
  demoLayout: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: `${space._13} 1fr`,
    },
    gap: { default: space._3, [breakpoints.md]: space._5 },
    alignItems: "start",
  },
  // The copy gets an explicit cell. A `Specimen` adds its open code panel to the
  // grid as a second item that spans both tracks, which would push the copy down
  // a row.
  notes: {
    gap: space._2,
    minInlineSize: 0,
    gridColumn: { default: "auto", [breakpoints.md]: "2" },
    gridRow: { default: "auto", [breakpoints.md]: "1" },
  },
  groupStage: {
    inlineSize: "100%",
    minBlockSize: { default: "12.5rem", [breakpoints.md]: "10.75rem" },
  },
  groupMenu: {
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
  },
});
