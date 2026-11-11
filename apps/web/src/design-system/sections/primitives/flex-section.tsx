import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex, grow } from "@tuja/ui/primitives/flex.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry, GenreChips } from "./api-grid.tsx";
import { primitivesSpecimen } from "./primitives-specimen.stylex.ts";

export function FlexSection() {
  const api: ApiEntry[] = [
    {
      token: "flex.row",
      meta: "display:flex · align:center",
      description: t({
        en: "Horizontal row, items vertically centred — the everyday default.",
        zh: "水平行，子项垂直居中——最常用的默认布局。",
      }),
    },
    {
      token: "flex.col",
      meta: "display:flex · direction:column",
      description: t({ en: "Vertical stack.", zh: "垂直堆叠。" }),
    },
    {
      token: "flex.center",
      meta: "align:center · justify:center",
      description: t({
        en: "Centred on both axes.",
        zh: "在两个轴向上都居中。",
      }),
    },
    {
      token: "flex.between",
      meta: "align:center · justify:space-between",
      description: t({
        en: "Toolbar pattern — ends pushed apart, centred.",
        zh: "工具栏模式——两端分开，垂直居中。",
      }),
    },
    {
      token: "flex.wrap",
      meta: "flex-wrap:wrap · align:center",
      description: t({
        en: "Wrapping row for buttons and badges.",
        zh: "用于按钮与徽章的换行行。",
      }),
    },
    {
      token: "flex.inlineCenter",
      meta: "display:inline-flex · center",
      description: t({
        en: "Inline centred box for icon-plus-label controls.",
        zh: "内联居中盒，用于图标加文字的控件。",
      }),
    },
    {
      token: "align / justify",
      meta: "start · center · end · …",
      description: t({
        en: "Single-property modifiers that override a flex primitive's defaults.",
        zh: "单属性修饰符，用于覆盖 flex 原语的默认对齐方式。",
      }),
    },
    {
      token: "grow / shrink",
      meta: "_0 · _1",
      description: t({
        en: "Toggle flex-grow / flex-shrink to fill or hold remaining space.",
        zh: "切换 flex-grow / flex-shrink，用于占满或保持剩余空间。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Flex", zh: "Flex 布局" })}>
      <ShowcaseHelper>
        {t({
          en: "Multi-property flex primitives. Drop to them when composing a bespoke layout the component library doesn't cover — they encode the alignment defaults so a callsite reads as intent, not CSS plumbing.",
          zh: "多属性 flex 原语。当组件库未覆盖某个自定义布局时下沉到它们——它们封装了对齐默认值，让调用处读起来是意图而非 CSS 细节。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "flex.between — toolbar",
            zh: "flex.between —— 工具栏",
          })}
        >
          <div css={[flex.between, corner.radius_2, styles.bar]}>
            <Text as="span" look="bodySmall" weight="semibold">
              {t({ en: "Library", zh: "媒体库" })}
            </Text>
            <div css={[flex.row, styles.barActions]}>
              <Text
                as="span"
                look="caption"
                tone="muted"
                weight="semibold"
                wrap="nowrap"
                css={[corner.radius_round, styles.pill]}
              >
                {t({ en: "Filter", zh: "筛选" })}
              </Text>
              <Text
                as="span"
                look="caption"
                tone="primary"
                weight="semibold"
                wrap="nowrap"
                css={[corner.radius_round, styles.pill, styles.pillAccent]}
              >
                {t({ en: "Sort", zh: "排序" })}
              </Text>
            </div>
          </div>
        </Specimen>
        <Specimen
          caption={t({ en: "flex.wrap — genres", zh: "flex.wrap —— 类型" })}
        >
          <GenreChips css={[flex.wrap, fill.inline, styles.chipRow]} />
        </Specimen>
        <Specimen caption="flex.row + grow._1">
          <div css={[flex.row, styles.growRow]}>
            <Text
              as="span"
              look="caption"
              tone="muted"
              wrap="nowrap"
              css={[grow._1, corner.radius_2, styles.growField]}
            >
              {t({ en: "Search titles", zh: "搜索标题" })}
            </Text>
            <Text
              as="span"
              look="caption"
              tone="primary"
              weight="semibold"
              wrap="nowrap"
              css={[corner.radius_round, styles.pill, styles.pillAccent]}
            >
              {t({ en: "Go", zh: "搜索" })}
            </Text>
          </div>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { flex, align, grow } from "@tuja/ui/primitives/flex.stylex";

<header css={flex.between}>…</header>
<div css={[flex.row, align.end]}>…</div>
<div css={[flex.row, grow._1]}>…</div>`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  // Flex specimens
  bar: {
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: color.card,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  barActions: {
    gap: rhythm.tight,
  },
  pill: {
    paddingBlock: space._00,
    paddingInline: space._2,
    backgroundColor: color.card,
  },
  pillAccent: {
    backgroundColor: color.primarySubtle,
  },
  chipRow: {
    gap: rhythm.tight,
  },
  growRow: {
    gap: rhythm.tight,
    inlineSize: "100%",
  },
  growField: {
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: color.muted,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
