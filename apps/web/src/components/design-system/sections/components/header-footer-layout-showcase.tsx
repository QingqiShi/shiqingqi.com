import * as stylex from "@stylexjs/stylex";
import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { Footer } from "#src/components/home/footer.tsx";
import { BackButton } from "#src/components/shared/back-button.tsx";
import { LocaleSelector } from "#src/components/shared/locale-selector.tsx";
import { ThemeSwitch } from "#src/components/shared/theme-switch.tsx";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";

export function HeaderFooterLayoutShowcase() {
  const locale = getLocale();

  return (
    <>
      <Showcase label={t({ en: "Page shell", zh: "页面骨架" })}>
        <ShowcaseHelper>
          {t({
            en: "The shell the site's header/footer pages are built on, composed from this site's real chrome. Two floating groups hold the back button and the theme toggle with the language picker; a full-bleed background layer sits beneath the content; the content flows up past the groups (text pages add their own clearance); and the footer pins to the bottom of the same measure. Once the page is scrolled away from the top, the page blurs around each group — strongest against the controls, sharp again a little way out. At rest the blur melts away. The footer carries none, because nothing floats over it. Everything is live — flip the theme from inside it.",
            zh: "本站页头页脚页面所基于的骨架，此处用本站真实组件组装。两组悬浮控件分别是返回按钮，以及主题切换与语言选择；内容下方是一层满幅背景；内容向上延伸至控件之下（文字页自行留出间距）；页脚固定在同一版心的底部。页面一旦离开顶部，就会在每组控件周围渐进虚化：紧贴控件处最强，稍往外即恢复清晰。页面静止在顶部时，虚化逐渐消退。页脚没有虚化，因为其上方没有悬浮元素。一切均可交互——可直接在其中切换主题。",
          })}
        </ShowcaseHelper>
        {/* The frame's transform creates a containing block, so the shell's
            fixed control groups anchor to the specimen frame — and stay
            outside the inner viewport's clip, which owns the scrolling that
            shows them staying pinned. */}
        <Specimen caption={t({ en: "every slot filled", zh: "填满全部插槽" })}>
          <div css={[corner.radius_3, styles.frame]}>
            <div css={styles.viewport}>
              <HeaderFooterLayout
                as="div"
                readingColumn
                headerStart={
                  <BackButton
                    locale={locale}
                    label={t({ en: "Back", zh: "返回" })}
                  />
                }
                headerEnd={
                  <>
                    <ThemeSwitch
                      labels={[
                        t({
                          en: "Switch to light theme",
                          zh: "切换至浅色模式",
                        }),
                        t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
                        t({
                          en: "Switch to system theme",
                          zh: "切换至系统颜色模式",
                        }),
                      ]}
                    />
                    <LocaleSelector
                      label={t({ en: "Language", zh: "语言" })}
                      ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
                      locale={locale}
                    />
                  </>
                }
                background={
                  <div css={styles.specimenBackground} aria-hidden="true" />
                }
                footer={<Footer locale={locale} />}
              >
                <article css={styles.article}>
                  <Heading level={2}>
                    {t({ en: "The quiet harbour", zh: "静谧的港湾" })}
                  </Heading>
                  <Text tone="muted">
                    {t({
                      en: "Reading surfaces get one centred measure and generous breathing room. The chrome recedes: a back affordance on the left, utilities on the right, and nothing else competing with the text.",
                      zh: "阅读型页面拥有单一居中的版心与充裕的留白。界面装饰退居其次：左侧是返回入口，右侧是实用控件，没有其他元素与正文争夺注意力。",
                    })}
                  </Text>
                  <Text tone="muted">
                    {t({
                      en: "The background layer bleeds edge to edge beneath the content, and each floating group is pointer-transparent outside its own controls — text remains selectable right up to the top edge.",
                      zh: "背景层在内容下方满幅延展，每组悬浮控件在控件本身之外不拦截指针事件——文字直到顶部边缘都可以选中。",
                    })}
                  </Text>
                  <Text tone="muted">
                    {t({
                      en: "The footer shares the column's width and gutters, so the page reads as one continuous measure from headline to colophon.",
                      zh: "页脚与内容列共享宽度和边距，从标题到版权信息整页保持同一版心。",
                    })}
                  </Text>
                </article>
              </HeaderFooterLayout>
            </div>
          </div>
        </Specimen>
      </Showcase>

      <PropsTable
        rows={[
          {
            name: "headerStart",
            type: "ReactNode",
            description: t({
              en: "Start (leading) floating group at the top of the page — typically a back or home affordance.",
              zh: "页面顶部的起始悬浮控件组——通常是返回或首页入口。",
            }),
          },
          {
            name: "headerEnd",
            type: "ReactNode",
            description: t({
              en: "End (trailing) floating group at the top of the page — typically utility controls such as a theme toggle or language picker.",
              zh: "页面顶部的结尾悬浮控件组——通常是主题切换、语言选择等实用控件。",
            }),
          },
          {
            name: "background",
            type: "ReactNode",
            description: t({
              en: "Full-bleed decoration rendered behind the content and beneath the header controls — gradients, glows, texture. Pointer-transparent and clipped to the page.",
              zh: "渲染在内容下方、页头控件之下的满幅装饰——渐变、光晕、纹理。不拦截指针事件并裁剪到页面内。",
            }),
          },
          {
            name: "footer",
            type: "ReactNode",
            description: t({
              en: "Footer element at the bottom of the centred measure. Pass a <footer> (e.g. the site footer); the shell adds no landmark of its own, so the element you pass owns the contentinfo role.",
              zh: "居中版心底部的页脚元素。传入一个 <footer>（如站点页脚）；骨架不添加自己的地标，你传入的元素拥有 contentinfo 角色。",
            }),
          },
          {
            name: "children",
            type: "ReactNode",
            required: true,
            description: t({
              en: "Page content. Flows up past the header controls by default (heroes and backdrops bleed to the top edge); text-first pages add their own top clearance.",
              zh: "页面内容。默认向上延伸至页头控件之下（主视觉与背景铺到顶部边缘）；以文字为主的页面自行留出顶部间距。",
            }),
          },
          {
            name: "readingColumn",
            type: "boolean",
            description: t({
              en: "Caps the content into the site's centred reading column with gutters. Left off, the content is full-bleed and manages its own width (media heroes, app canvases).",
              zh: "将内容限制在本站居中的阅读列内并带边距。不启用时内容为满幅并自行管理宽度（媒体主视觉、应用画布）。",
            }),
          },
          {
            name: "contentMaxInlineSize",
            type: "string",
            defaultValue: "layout.maxInlineSize",
            description: t({
              en: "Narrows the reading column below the site default for prose-heavy pages. Implies readingColumn.",
              zh: "为文字密集的页面将阅读列收窄至低于站点默认值。隐含启用 readingColumn。",
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
        do={<code css={styles.code}>{"background={<FlowGradient />}"}</code>}
        doCaption={t({
          en: "Put page decoration in the background slot — it bleeds full-bleed beneath the header controls and content, exactly where a hero gradient belongs.",
          zh: "把页面装饰放进 background 插槽——它会在页头控件与内容下方满幅铺开，正是主视觉渐变该在的位置。",
        })}
        dont={
          <code css={styles.code}>
            {"<HeaderFooterLayout> <DenseAppGrid />"}
          </code>
        }
        dontCaption={t({
          en: "Don't reach for it on dense, app-like surfaces with their own navigation — that's SidebarLayout's job, and a page should use one shell or the other, never both.",
          zh: "不要在拥有自身导航的高密度应用型页面上使用——那是 SidebarLayout 的职责，且一个页面只应使用一种骨架，绝不能同时使用两种。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  // Rounded, and clipping nothing: the control groups it anchors carry their
  // own Progressive blur, and a squircle-cornered clip above those layers would
  // strip their masks. A background and a border round by border-radius alone,
  // which is the whole of the frame's look.
  frame: {
    position: "relative",
    inlineSize: "100%",
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    // Containing block for the shell's fixed control groups (see comment at
    // the callsite).
    transform: "translateZ(0)",
  },
  // The scroller, so the groups can be watched staying pinned while the content
  // moves under them. It rounds its own clip to the frame's corners, which the
  // shell's full-bleed background layer would otherwise square off. Safe above
  // the blur layers, which are not clipped here: the groups are fixed to the
  // frame, so this element is nowhere in their containing-block chain.
  viewport: {
    maxBlockSize: space._15,
    overflowY: "auto",
    overscrollBehavior: "contain",
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // Stand-in for a page's decoration layer — a soft wash beneath the content.
  specimenBackground: {
    position: "absolute",
    insetInlineStart: 0,
    insetInlineEnd: 0,
    insetBlockStart: 0,
    blockSize: space._13,
    backgroundImage: `linear-gradient(${color.surfaceAccentSubtle}, transparent)`,
  },
  article: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    maxInlineSize: "60ch",
    // Text-first content clears the header controls itself; heroes bleed under
    // them.
    paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top))`,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    overflowWrap: "anywhere",
  },
});
