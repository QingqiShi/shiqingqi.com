import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { DesignSystemNav } from "#src/components/design-system/design-system-nav.tsx";
import { DesignSystemSidebarControls } from "#src/components/design-system/design-system-sidebar-controls.tsx";
import { DesignSystemSidebarHeader } from "#src/components/design-system/design-system-sidebar-header.tsx";
import { getDesignSystemGroupLabels } from "#src/components/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteLabels } from "#src/components/design-system/route-copy/get-design-system-route-labels.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
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
        <Specimen caption={t({ en: "rail and content", zh: "侧栏与内容列" })}>
          {/* The viewport's transform creates a containing block, so the
              shell's fixed mobile chrome (pill bar, drawer, backdrop) anchors
              to the specimen instead of the real viewport, and the viewport's
              clip is what keeps that chrome inside the frame. */}
          <div css={[corner.radius_3, styles.frame]}>
            <div css={styles.viewport}>
              <SidebarLayout
                as="div"
                menuLabel={t({ en: "Demo menu", zh: "演示菜单" })}
                closeLabel={t({ en: "Close demo menu", zh: "关闭演示菜单" })}
                sidebarHeader={<DesignSystemSidebarHeader locale={locale} />}
                sidebarFooter={<DesignSystemSidebarControls locale={locale} />}
                sidebar={
                  <DesignSystemNav
                    routeLabels={getDesignSystemRouteLabels()}
                    groupLabels={getDesignSystemGroupLabels()}
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
                    <Text look="bodySmall" tone="muted">
                      {t({
                        en: "Your page renders in the content column, capped to a readable width beside the rail.",
                        zh: "你的页面渲染在这里，在侧栏旁保持可读宽度。",
                      })}
                    </Text>
                  </div>
                  <div css={styles.cardGrid}>
                    <div
                      css={[corner.radius_2, styles.placeholder]}
                      aria-hidden="true"
                    />
                    <div
                      css={[corner.radius_2, styles.placeholder]}
                      aria-hidden="true"
                    />
                    <div
                      css={[corner.radius_2, styles.placeholder]}
                      aria-hidden="true"
                    />
                    <div
                      css={[corner.radius_2, styles.placeholder]}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </SidebarLayout>
            </div>
          </div>
        </Specimen>
      </Showcase>

      <UsageSnippet code={usage} />

      <PropsTable component="sidebar-layout" />

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
          en: "Don't hard-code untranslated labels. menuLabel and closeLabel name the drawer dialog for assistive tech — supply localised strings.",
          zh: "不要硬编码未翻译的标签。menuLabel 与 closeLabel 是抽屉对话框的无障碍名称——请提供本地化文案。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  // Rounded, and clipping nothing: the rail inside holds a Scroll mask, and a
  // squircle-cornered clip above its bands would strip their masks. A
  // background and a border round by border-radius alone, which is the whole
  // of the frame's look.
  frame: {
    position: "relative",
    inlineSize: "100%",
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  // Fixed-height box; the shell fills it, so the rail bounds here and its footer
  // pins to the bottom without the specimen scrolling. It also holds the
  // containing block and the clip for the shell's fixed mobile chrome, which
  // the frame can no longer keep in. That clip has to stay radius-free,
  // because it sits above the rail's Scroll mask bands and a rounded one would
  // strip their masks. The cost is the open demo drawer below `md`: it reaches
  // the frame's edges, so it squares off the two corners it covers.
  viewport: {
    blockSize: space._15,
    overflow: "hidden",
    // Containing block for the shell's fixed mobile chrome (see comment at
    // the callsite).
    transform: "translateZ(0)",
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
