import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";
import { Text } from "@tuja/ui/components/text";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { DesignSystemNav } from "#src/components/design-system/design-system-nav.tsx";
import {
  DesignSystemSidebarControls,
  DesignSystemSidebarHeader,
} from "#src/components/design-system/sidebar-chrome.tsx";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function SidebarLayoutShowcase() {
  const locale = getLocale();

  const usage = `import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";

<SidebarLayout
  sidebar={<LibraryNav />}
  sidebarHeader={<Wordmark />}
  sidebarFooter={<UtilityControls />}
  menuLabel={menuLabel}
  closeLabel={closeMenuLabel}
>
  <LibraryContent />
</SidebarLayout>`;

  return (
    <>
      <Showcase label={t({ en: "Page shell", zh: "页面骨架" })}>
        <ShowcaseHelper>
          {t({
            en: "A live miniature of the shell you're looking at: the slots hold this site's real sidebar chrome — the title with its home link, the design-system navigation, and the theme and language controls pinned at the bottom. Every control works. Below the md breakpoint the rail collapses into a floating bar whose menu button opens the same content as a drawer.",
            zh: "你正在使用的骨架的实时缩影：插槽中是本站真实的侧栏组件——带首页链接的标题、设计系统导航，以及固定在底部的主题与语言控件。所有控件都可交互。在 md 断点以下，侧栏收起为悬浮条，其菜单按钮会以抽屉形式打开相同内容。",
          })}
        </ShowcaseHelper>
        {/* The frame's transform creates a containing block, so the shell's
            fixed mobile chrome (pill bar, drawer, backdrop) anchors to the
            demo instead of the real viewport. */}
        <div css={styles.frame}>
          <div css={styles.viewport}>
            <SidebarLayout
              as="div"
              menuLabel={t({ en: "Demo menu", zh: "演示菜单" })}
              closeLabel={t({ en: "Close demo menu", zh: "关闭演示菜单" })}
              sidebarHeader={<DesignSystemSidebarHeader locale={locale} />}
              sidebarFooter={<DesignSystemSidebarControls locale={locale} />}
              sidebar={
                <DesignSystemNav
                  ariaLabel={t({
                    en: "Design system (demo)",
                    zh: "设计系统（演示）",
                  })}
                />
              }
            >
              <div css={styles.contentInner}>
                <div css={styles.contentHead}>
                  <Heading level={2}>
                    {t({ en: "Content column", zh: "内容列" })}
                  </Heading>
                  <Text variant="bodySmall" tone="muted">
                    {t({
                      en: "Your page renders here, capped to a readable width beside the rail.",
                      zh: "你的页面渲染在这里，在侧栏旁保持可读宽度。",
                    })}
                  </Text>
                </div>
                <div css={styles.cardGrid}>
                  <div css={styles.placeholder} aria-hidden="true" />
                  <div css={styles.placeholder} aria-hidden="true" />
                  <div css={styles.placeholder} aria-hidden="true" />
                  <div css={styles.placeholder} aria-hidden="true" />
                </div>
              </div>
            </SidebarLayout>
          </div>
        </div>
      </Showcase>

      <UsageSnippet code={usage} />

      <PropsTable
        rows={[
          {
            name: "sidebar",
            type: "ReactNode",
            required: true,
            description: t({
              en: "Navigation content. Renders inside the sticky rail on wider viewports and inside the drawer on mobile; scrolls independently when it outgrows the viewport.",
              zh: "导航内容。宽视口下渲染在粘性侧栏中，移动端渲染在抽屉里；超出视口时可独立滚动。",
            }),
          },
          {
            name: "sidebarHeader",
            type: "ReactNode",
            description: t({
              en: "Title region — shown at the top of the rail, in the collapsed mobile bar, and at the top of the drawer.",
              zh: "标题区域——显示在侧栏顶部、收起的移动端悬浮条中以及抽屉顶部。",
            }),
          },
          {
            name: "sidebarFooter",
            type: "ReactNode",
            description: t({
              en: "Utility region pinned to the bottom of the rail and the drawer — theme toggles, language pickers, and similar controls.",
              zh: "固定在侧栏与抽屉底部的实用区域——主题切换、语言选择等控件。",
            }),
          },
          {
            name: "menuLabel",
            type: "string",
            required: true,
            description: t({
              en: "Accessible name for the mobile menu button and the open drawer dialog. The package ships no i18n, so the consumer supplies the localized string.",
              zh: "移动端菜单按钮与打开的抽屉对话框的无障碍名称。组件库不内置 i18n，由调用方提供本地化文案。",
            }),
          },
          {
            name: "closeLabel",
            type: "string",
            required: true,
            description: t({
              en: "Accessible label for the drawer's close button.",
              zh: "抽屉关闭按钮的无障碍标签。",
            }),
          },
          {
            name: "children",
            type: "ReactNode",
            required: true,
            description: t({
              en: "Content column, capped to a readable width and centered beside the rail.",
              zh: "内容列，限制在可读宽度内并在侧栏旁居中。",
            }),
          },
          {
            name: "contentMaxInlineSize",
            type: "string",
            defaultValue: "layout.maxInlineSize",
            description: t({
              en: "Caps the centered content column; pass a narrower value for prose-heavy pages.",
              zh: "限制居中内容列的宽度；文字密集的页面可传入更窄的值。",
            }),
          },
          {
            name: "sidebarInlineSize",
            type: "string",
            defaultValue: '"200px"',
            description: t({
              en: "Inline size of the rail column on wider viewports.",
              zh: "宽视口下侧栏列的行内尺寸。",
            }),
          },
          {
            name: "stickyInsetBlockStart",
            type: "string",
            defaultValue: "calc(env(safe-area-inset-top) + 1.25rem)",
            description: t({
              en: "Logical block-start offset the sticky rail pins to. The shell owns the whole page, so the default is a compact offset below the top safe-area inset.",
              zh: "粘性侧栏吸附的逻辑起始偏移。骨架拥有整个页面，默认值为顶部安全区下方的紧凑偏移。",
            }),
          },
          {
            name: "as",
            type: '"main" | "div"',
            defaultValue: '"main"',
            description: t({
              en: "Landmark element for the content region. Use div when nested inside a shell that already owns the main landmark.",
              zh: "内容区域的地标元素。当嵌套在已拥有 main 地标的外壳内时使用 div。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <code css={styles.code}>{"sidebarFooter={<UtilityControls />}"}</code>
        }
        doCaption={t({
          en: "Put app-level utilities (theme, language) in sidebarFooter — they stay reachable on every viewport, pinned in the rail and inside the drawer.",
          zh: "将应用级实用控件（主题、语言）放在 sidebarFooter 中——它们固定在侧栏和抽屉内，任何视口都可触达。",
        })}
        dont={<code css={styles.code}>{'menuLabel="Menu"'}</code>}
        dontCaption={t({
          en: "Don't hard-code untranslated labels. menuLabel and closeLabel name the drawer dialog for assistive tech — supply localized strings.",
          zh: "不要硬编码未翻译的标签。menuLabel 与 closeLabel 是抽屉对话框的无障碍名称——请提供本地化文案。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  frame: {
    position: "relative",
    overflow: "hidden",
    borderRadius: border.radius_3,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    // Containing block for the shell's fixed mobile chrome (see comment at
    // the callsite).
    transform: "translateZ(0)",
  },
  // The real navigation is tall, so the demo scrolls inside its own viewport
  // — which also shows off the rail's sticky behaviour in miniature.
  viewport: {
    maxBlockSize: space._15,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  contentInner: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  contentHead: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: space._3,
  },
  placeholder: {
    aspectRatio: "4 / 3",
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    overflowWrap: "anywhere",
  },
});
