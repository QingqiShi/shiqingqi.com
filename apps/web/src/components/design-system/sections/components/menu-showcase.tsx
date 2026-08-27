"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuLabel } from "@tuja/ui/components/menu-label";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { align, flex } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { color, controlSize, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

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

interface DemoMenuItemProps {
  /** Renders the accent treatment and `aria-current` for the chosen item. */
  isCurrent: boolean;
  label: string;
  onSelect: () => void;
}

/**
 * The whole of what `MenuButton`'s menu contract asks of a popup child:
 * `role="menuitem"` on something focusable. The site's real menu items are
 * navigating links; this one is a plain button so every key can be tried
 * without leaving the page.
 *
 * The chosen item also carries `data-menu-autofocus`, which is how a consumer
 * says "open on this one" — reopening the menu lands focus here rather than on
 * the first item.
 */
function DemoMenuItem({ isCurrent, label, onSelect }: DemoMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-current={isCurrent ? "true" : undefined}
      data-menu-autofocus={isCurrent ? "true" : undefined}
      css={[
        buttonReset.base,
        a11y.focusRing,
        transition.colors,
        corner.radius_1,
        styles.item,
        isCurrent && styles.itemCurrent,
      ]}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

/**
 * The primary demo: a real `role="menu"` popup, so arrow keys, Home/End,
 * Escape, and focus entry are all live on the page that documents them. The
 * readout beside the stage reports the last item activated, which doubles as
 * the marker for `data-menu-autofocus`.
 */
function MenuDemo() {
  const items = [
    { id: "details", label: t({ en: "Details", zh: "详情" }) },
    { id: "credits", label: t({ en: "Cast & crew", zh: "演职人员" }) },
    { id: "similar", label: t({ en: "Similar", zh: "相似作品" }) },
    { id: "ask", label: t({ en: "Ask the AI", zh: "询问 AI" }) },
  ];
  const [openedId, setOpenedId] = useState<string | null>(null);
  const opened = items.find((item) => item.id === openedId);

  return (
    <div css={styles.demoLayout}>
      <Specimen
        caption={t({ en: "arrow keys move focus", zh: "方向键移动焦点" })}
      >
        <div css={[flex.row, align.start, styles.menuStage]}>
          <MenuButton
            buttonProps={{ icon: <DotsThreeIcon weight="bold" /> }}
            position="topLeft"
            menuContent={
              // `role="none"` keeps the menuitems owned by the popup's
              // `role="menu"` despite the layout wrapper in between.
              <div role="none" css={[flex.col, styles.menu]}>
                {items.map((item) => (
                  <DemoMenuItem
                    key={item.id}
                    label={item.label}
                    isCurrent={item.id === openedId}
                    onSelect={() => {
                      setOpenedId(item.id);
                    }}
                  />
                ))}
              </div>
            }
          >
            {t({ en: "More", zh: "更多" })}
          </MenuButton>
        </div>
      </Specimen>
      <div css={[flex.col, styles.notes]}>
        <Text variant="bodySmall" tone="muted">
          {t({ en: "Opened →", zh: "已打开 →" })}{" "}
          <span css={[corner.radius_1, styles.stateValue]}>
            {opened ? opened.label : t({ en: "nothing yet", zh: "尚无" })}
          </span>
        </Text>
        <KeyTable />
        <ShowcaseHelper>
          {t({
            en: "Opening the menu moves focus inside it — onto the item marked data-menu-autofocus=\"true\", otherwise the first menuitem. Activation is the item's own business: the site's real menu items navigate, and the route change ends the popup.",
            zh: '打开菜单会把焦点移入弹层——优先落在标记了 data-menu-autofocus="true" 的项，否则落在第一个 menuitem。激活做什么由该项自己决定：站点里真正的菜单项会跳转，路由切换随之结束弹层。',
          })}
        </ShowcaseHelper>
        <ShowcaseHelper>
          {t({
            en: "While the popup is open, the page blurs around it — a Progressive blur, strongest against the popup's edge and sharp again a short way out. The popup itself keeps a crisp hairline edge.",
            zh: "弹层打开时，页面在它周围渐进虚化：紧贴弹层边缘处最强，稍远即恢复清晰。弹层本身保持一道清晰的细边。",
          })}
        </ShowcaseHelper>
      </div>
    </div>
  );
}

/**
 * The menu keyboard model spelled out next to the demo that performs it, so the
 * two can be read against each other key by key.
 */
function KeyTable() {
  const rows = [
    {
      keys: "ArrowDown / ArrowUp",
      effect: t({
        en: "Next or previous item, wrapping at both ends.",
        zh: "移到下一项或上一项，并在两端回绕。",
      }),
    },
    {
      keys: "Home / End",
      effect: t({
        en: "First or last item.",
        zh: "移到首项或末项。",
      }),
    },
    {
      keys: "Enter / Space",
      effect: t({
        en: "Activate the focused item.",
        zh: "激活当前聚焦的项。",
      }),
    },
    {
      keys: "Escape",
      effect: t({
        en: "Close, and return focus to the trigger.",
        zh: "关闭，并把焦点交还触发按钮。",
      }),
    },
    {
      keys: "Tab",
      effect: t({
        en: "Leave the popup, which closes it where focus lands outside.",
        zh: "离开弹层；当焦点落到弹层之外时随即关闭。",
      }),
    },
  ];
  return (
    <dl css={[flex.col, styles.keyTable]}>
      {rows.map((row) => (
        <div key={row.keys} css={styles.keyRow}>
          <dt css={styles.keyName}>{row.keys}</dt>
          <dd css={styles.keyEffect}>{row.effect}</dd>
        </div>
      ))}
    </dl>
  );
}

/** No Progressive blur: a plate has nothing behind the popup to blur. */
function SortPopup() {
  return (
    <div css={[popoverSurface.base, styles.popupSample]}>
      <MenuLabel>{t({ en: "Sort by", zh: "排序方式" })}</MenuLabel>
      <Button variant="primary">{t({ en: "Newest", zh: "最新" })}</Button>
      <Button>{t({ en: "Popular", zh: "热门" })}</Button>
    </div>
  );
}

export function MenuShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Menu popup", zh: "菜单弹层" })}>
        <MenuDemo />
      </Showcase>

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
                    <Button variant="primary">
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
              type: '"topRight" | "topLeft" | "bottomLeft" | "bottomRight" | "sheet"',
              defaultValue: '"topRight"',
              description: t({
                en: 'Which corner the menu expands from (logical-direction-aware), or "sheet" to span the bar the trigger sits in.',
                zh: '菜单从哪个角展开（感知逻辑方向），或使用 "sheet" 横跨触发按钮所在的工具栏。',
              }),
            },
            {
              name: "popupRole",
              type: '"menu" | "group"',
              defaultValue: '"menu"',
              description: t({
                en: 'ARIA role for the popup. "menu" moves focus into the popup on open and roves its role="menuitem" children; "group" leaves focus on the trigger and the arrow keys to the browser — use it when the popup holds controls rather than commands.',
                zh: '弹层的 ARIA 角色。"menu" 在打开时把焦点移入弹层，并在其 role="menuitem" 子元素间移动焦点；"group" 让焦点留在触发按钮上、方向键交还浏览器——弹层装的是控件而非命令时使用。',
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
  // Rows sit tighter from `md` up, where each is a single line; stacked below it
  // the key and its effect need the extra breathing room between pairs.
  keyTable: {
    gap: { default: space._1, [breakpoints.md]: space._0 },
    margin: 0,
    minInlineSize: 0,
  },
  keyRow: {
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoints.md]: "11rem 1fr" },
    gap: { default: 0, [breakpoints.md]: space._3 },
    minInlineSize: 0,
  },
  keyName: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.textMain,
    overflowWrap: "anywhere",
  },
  keyEffect: {
    margin: 0,
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_4,
    color: color.textSubtle,
    minInlineSize: 0,
  },
  // A popup is out of flow, so each stage reserves the height of its own open
  // popup — and not a pixel more — to keep the popup inside the showcase card.
  // The four values are measured, not derived: open each popup and read its
  // height off the popup element at 1440px and at 390px. Two per stage because
  // `controlSize` is larger on touch, which makes every popup taller below `md`.
  // Re-measure whenever either popup gains or loses an item.
  //
  // The reservation stands at both widths deliberately. Leaning on the stacked
  // copy below `md` to hold the card open would tie containment to how long that
  // copy runs in a given locale — the shorter Chinese wording let the group
  // popup out of the bottom of its card.
  //
  // The stages pair this with `align.start`, which keeps the trigger at its
  // natural height: let flex stretch it and the `topLeft`-anchored popup is
  // pushed to the bottom of the stage.
  //
  // A `Specimen` lays its stage out with flex, so each stage states its own
  // width. Without it the stage shrinks to the trigger.
  menuStage: {
    inlineSize: "100%",
    minBlockSize: { default: "16rem", [breakpoints.md]: "13.25rem" },
  },
  groupStage: {
    inlineSize: "100%",
    minBlockSize: { default: "12.5rem", [breakpoints.md]: "10.75rem" },
  },
  menu: {
    gap: controlSize._1,
    padding: controlSize._1,
    inlineSize: space._13,
  },
  item: {
    color: { default: color.textMain, ":hover": color.textMuted },
    // Spelled out rather than left `null`: this declaration replaces
    // `buttonReset`'s, and a null default would let the UA's `buttonface` grey
    // paint the item at rest.
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
    fontSize: controlSize._4,
    fontWeight: font.weight_6,
    blockSize: controlSize._9,
    paddingInline: controlSize._3,
    textAlign: "start",
  },
  // Flat values, so they replace `item`'s hover variants too and the accent
  // treatment holds steady under the pointer.
  itemCurrent: {
    color: color.accentOn,
    backgroundColor: color.accent,
  },
  groupMenu: {
    gap: space._1,
    padding: space._2,
    inlineSize: space._13,
  },
  stateValue: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.textMain,
    paddingInline: space._1,
    paddingBlock: space._00,
    backgroundColor: color.bgInteractiveRest,
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
