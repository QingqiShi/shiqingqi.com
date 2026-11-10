"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { align, flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { definitionRows } from "#src/design-system/definition-rows.stylex.ts";
import { GuideNote } from "#src/design-system/guide/guide-section.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

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
    <dl css={[stack.item, definitionRows.list, styles.keyTable]}>
      {rows.map((row) => (
        <div key={row.keys} css={[definitionRows.row, styles.keyRow]}>
          <dt css={[typeRole.caption, styles.keyName]}>{row.keys}</dt>
          <dd
            css={[
              typeRole.caption,
              definitionRows.definition,
              styles.keyEffect,
            ]}
          >
            {row.effect}
          </dd>
        </div>
      ))}
    </dl>
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
                  <MenuItem
                    key={item.id}
                    current={item.id === openedId}
                    data-menu-autofocus={
                      item.id === openedId ? "true" : undefined
                    }
                    onClick={() => {
                      setOpenedId(item.id);
                    }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </div>
            }
          >
            {t({ en: "More", zh: "更多" })}
          </MenuButton>
        </div>
      </Specimen>
      <div css={[stack.item, styles.notes]}>
        <Text look="bodySmall" tone="muted">
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

export function MenuPopupShowcase() {
  return (
    <Showcase label={t({ en: "Menu popup", zh: "菜单弹层" })}>
      <MenuDemo />
    </Showcase>
  );
}

export function MenuItemShowcase() {
  return (
    <Showcase
      label={t({
        en: "Make each command a MenuItem",
        zh: "每条命令都是一个 MenuItem",
      })}
      leadsWithText
    >
      <ShowcaseHelper>
        {t({
          en: 'In a MenuButton menu, a MenuItem takes role="menuitem" and joins the arrow keys; in a Popover it stays a plain button. trailing adds muted text at the end of the row, and intent="danger" marks a command that destroys something.',
          zh: '在 MenuButton 菜单中，MenuItem 会带上 role="menuitem" 并响应方向键；在 Popover 中它仍是普通按钮。trailing 在行尾加上弱化文字，intent="danger" 标记会销毁内容的命令。',
        })}
      </ShowcaseHelper>
      <Specimen caption="MenuItem">
        <div css={[flex.col, styles.itemList]}>
          <MenuItem trailing={t({ en: "Wed 12 Nov", zh: "11月12日周三" })}>
            {t({ en: "Tomorrow", zh: "明天" })}
          </MenuItem>
          <MenuItem trailing={t({ en: "Mon 17 Nov", zh: "11月17日周一" })}>
            {t({ en: "Next week", zh: "下周" })}
          </MenuItem>
          <MenuItem intent="danger">{t({ en: "Delete", zh: "删除" })}</MenuItem>
        </div>
      </Specimen>
      <GuideNote>
        {t({
          en: 'size="sm" makes each row shorter, for a long menu of many commands. On touch each row stays at least 44px tall.',
          zh: 'size="sm" 让每行更矮，适用于命令很多的长菜单。在触屏上每行仍至少 44px 高。',
        })}
      </GuideNote>
    </Showcase>
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
    gap: rhythm.group,
    alignItems: "start",
  },
  // The copy gets an explicit cell. A `Specimen` adds its open code panel to the
  // grid as a second item that spans both tracks, which would push the copy down
  // a row.
  notes: {
    minInlineSize: 0,
    gridColumn: { default: "auto", [breakpoints.md]: "2" },
    gridRow: { default: "auto", [breakpoints.md]: "1" },
  },
  itemList: {
    inlineSize: space._13,
    maxInlineSize: "100%",
  },
  keyTable: {
    minInlineSize: 0,
  },
  keyRow: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "11rem minmax(0, 1fr)",
    },
    columnGap: rhythm.item,
  },
  keyName: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.fg,
    overflowWrap: "anywhere",
  },
  keyEffect: {
    color: color.fgMuted,
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
  menu: {
    padding: controlSize._1,
    inlineSize: space._13,
  },
  stateValue: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.fg,
    paddingInline: space._1,
    paddingBlock: space._00,
    backgroundColor: color.bgControl,
  },
});
