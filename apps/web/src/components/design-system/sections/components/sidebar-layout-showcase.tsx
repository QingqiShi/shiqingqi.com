import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";
import { Text } from "@tuja/ui/components/text";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function SidebarLayoutShowcase() {
  const navItems = [
    { label: t({ en: "For you", zh: "为你推荐" }), active: true },
    { label: t({ en: "Popular", zh: "热门" }), active: false },
    { label: t({ en: "New releases", zh: "最新上映" }), active: false },
    { label: t({ en: "Watchlist", zh: "待看清单" }), active: false },
    { label: t({ en: "Settings", zh: "设置" }), active: false },
  ];

  const movies = [
    {
      title: t({ en: "Neon Harbour", zh: "霓虹港湾" }),
      meta: t({ en: "2024 · Thriller", zh: "2024 · 惊悚" }),
    },
    {
      title: t({ en: "The Long Quiet", zh: "长夜静默" }),
      meta: t({ en: "2023 · Drama", zh: "2023 · 剧情" }),
    },
    {
      title: t({ en: "Paper Moons", zh: "纸月亮" }),
      meta: t({ en: "2024 · Comedy", zh: "2024 · 喜剧" }),
    },
    {
      title: t({ en: "Afterglow", zh: "余晖" }),
      meta: t({ en: "2022 · Sci-fi", zh: "2022 · 科幻" }),
    },
  ];

  const railLabel = t({ en: "Library sections", zh: "资料库分区" });
  const railHeading = t({ en: "Library", zh: "资料库" });

  const usage = `import { SidebarLayout } from "@tuja/ui/components/sidebar-layout";

<SidebarLayout sidebar={<LibraryNav />}>
  <LibraryContent />
</SidebarLayout>`;

  return (
    <>
      <Showcase label={t({ en: "Page shell", zh: "页面骨架" })}>
        <ShowcaseHelper>
          {t({
            en: "A full-bleed shell: the rail hugs the start edge and, on wide viewports, becomes a sticky column pinned just below the fixed header. On mobile it collapses to a bar above the content. Resize to watch the columns swap.",
            zh: "全出血骨架：侧栏贴住起始边缘，在宽视口下成为固定在页头下方的粘性列；在移动端则收起为内容上方的横条。缩放窗口即可看到列的切换。",
          })}
        </ShowcaseHelper>
        <div css={styles.frame}>
          <div css={styles.appBar} aria-hidden="true">
            <span css={styles.brand}>TUJA</span>
            <span css={styles.appBarMeta}>
              {t({ en: "Fixed header", zh: "固定页头" })}
            </span>
          </div>
          <SidebarLayout
            as="div"
            sidebar={
              <nav css={styles.rail} aria-label={railLabel}>
                <span css={styles.railHeading}>{railHeading}</span>
                {navItems.map((item) => (
                  <span
                    key={item.label}
                    css={[styles.navItem, item.active && styles.navItemActive]}
                  >
                    {item.label}
                  </span>
                ))}
              </nav>
            }
          >
            <div css={styles.contentInner}>
              <div css={styles.contentHead}>
                <Heading level={2}>
                  {t({ en: "Popular this week", zh: "本周热门" })}
                </Heading>
                <Text variant="bodySmall" tone="muted">
                  {t({
                    en: "Fresh picks, refreshed every Friday.",
                    zh: "精选片单，每周五更新。",
                  })}
                </Text>
              </div>
              <div css={styles.cardGrid}>
                {movies.map((movie) => (
                  <article key={movie.title} css={styles.card}>
                    <div css={styles.poster} aria-hidden="true" />
                    <Text as="span" variant="bodySmall" weight="medium">
                      {movie.title}
                    </Text>
                    <Text as="span" variant="caption" tone="subtle">
                      {movie.meta}
                    </Text>
                  </article>
                ))}
              </div>
            </div>
          </SidebarLayout>
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
              en: "Navigation rail. Renders as a sticky column beside the content and collapses above it on mobile; the slot owns its own surface treatment.",
              zh: "导航侧栏。渲染为内容旁的粘性列，在移动端收起到内容上方；该插槽自行负责表面样式。",
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
            defaultValue: "calc(env(safe-area-inset-top) + 5.5rem)",
            description: t({
              en: "Logical block-start offset the sticky rail pins to. The default clears the fixed header plus the top safe-area inset.",
              zh: "粘性侧栏吸附的逻辑起始偏移。默认值可避开固定页头与顶部安全区。",
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
        do={<code css={styles.code}>{'<SidebarLayout as="div">'}</code>}
        doCaption={t({
          en: 'Nesting inside a page that already renders <main>? Pass as="div" so the document keeps a single main landmark.',
          zh: '嵌套在已渲染 <main> 的页面里？传入 as="div"，让文档只保留一个 main 地标。',
        })}
        dont={<code css={styles.code}>{'stickyInsetBlockStart="112px"'}</code>}
        dontCaption={t({
          en: "Don't hard-code the sticky offset. The default clears the header and safe-area — override only with a token-based calc when the header height changes.",
          zh: "不要硬编码粘性偏移。默认值已避开页头与安全区——仅当页头高度改变时才用基于令牌的 calc 覆盖。",
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
  },
  // Faux fixed header: gives the shell's top padding and the rail's sticky
  // offset something real to clear, so the demo tells the whole story.
  appBar: {
    position: "absolute",
    insetBlockStart: 0,
    insetInline: 0,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    blockSize: space._9,
    paddingInline: space._4,
    backgroundColor: color.bgSurface,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.neutralBorder,
  },
  brand: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingWider,
    color: color.textMain,
  },
  appBarMeta: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  rail: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    paddingBlock: space._2,
    paddingInline: space._2,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  railHeading: {
    paddingBlock: space._1,
    paddingInline: space._2,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
    color: color.textSubtle,
  },
  navItem: {
    paddingBlock: space._1,
    paddingInline: space._2,
    borderRadius: border.radius_1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  navItemActive: {
    backgroundColor: color.bgSurfaceSunken,
    color: color.textMain,
    fontWeight: font.weight_6,
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
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    padding: space._2,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  poster: {
    aspectRatio: "2 / 3",
    marginBlockEnd: space._1,
    borderRadius: border.radius_1,
    backgroundColor: color.bgSurfaceSunken,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    overflowWrap: "anywhere",
  },
});
