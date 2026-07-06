import * as stylex from "@stylexjs/stylex";
import { Divider } from "@tuja/ui/components/divider";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, controlSize, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function DividerShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Horizontal", zh: "水平" })}>
        <div css={[flex.col, styles.horizontalStack]}>
          <div css={[flex.col, styles.horizontalRow]}>
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Subtle dividers separate related content within a flow.",
                zh: "柔和分隔线用于分隔流式内容中的相关部分。",
              })}
            </Text>
            <Divider variant="subtle" />
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "They keep the rhythm without breaking visual continuity.",
                zh: "在不打断视觉连续性的同时保持内容节奏。",
              })}
            </Text>
          </div>
          <div css={[flex.col, styles.horizontalRow]}>
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Bold dividers signal stronger separation between groups.",
                zh: "强烈分隔线用于明确划分不同的组别。",
              })}
            </Text>
            <Divider variant="bold" />
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Use them sparingly to mark meaningful transitions.",
                zh: "克制使用，用于标记有意义的转换。",
              })}
            </Text>
          </div>
          <div css={[flex.col, styles.horizontalRow]}>
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Decorative dividers add accent for special moments.",
                zh: "装饰分隔线为特殊时刻增添亮点。",
              })}
            </Text>
            <Divider variant="decorative" />
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Reserve them for hero sections or feature highlights.",
                zh: "适用于英雄区域或重点特性等场景。",
              })}
            </Text>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Vertical", zh: "垂直" })}>
        <div css={[flex.col, styles.verticalStack]}>
          <div css={[flex.row, styles.verticalRow]}>
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Subtle", zh: "柔和" })}
            </Text>
            <Divider orientation="vertical" variant="subtle" />
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Inline", zh: "行内" })}
            </Text>
            <Divider orientation="vertical" variant="subtle" />
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Separator", zh: "分隔" })}
            </Text>
          </div>
          <div css={[flex.row, styles.verticalRow]}>
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Bold", zh: "强烈" })}
            </Text>
            <Divider orientation="vertical" variant="bold" />
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Inline", zh: "行内" })}
            </Text>
            <Divider orientation="vertical" variant="bold" />
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Separator", zh: "分隔" })}
            </Text>
          </div>
          <div css={[flex.row, styles.verticalRow]}>
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Decorative", zh: "装饰" })}
            </Text>
            <Divider orientation="vertical" variant="decorative" />
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Inline", zh: "行内" })}
            </Text>
            <Divider orientation="vertical" variant="decorative" />
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Separator", zh: "分隔" })}
            </Text>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Decorative", zh: "装饰" })}>
        <div css={[flex.col, styles.decorativeStack]}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "An accent stroke for marquee moments — wider and bolder for emphasis.",
              zh: "用于核心时刻的点睛笔触——更宽更明显以突出重点。",
            })}
          </Text>
          <Divider variant="decorative" css={styles.decorativeAccent} />
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "Pair with hero typography or section transitions for richest effect.",
              zh: "搭配英雄文字排版或区段转换，可获得最佳效果。",
            })}
          </Text>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Divider } from "@tuja/ui/components/divider";

<Divider variant="subtle" />`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "orientation",
              type: '"horizontal" | "vertical"',
              defaultValue: '"horizontal"',
              description: t({
                en: 'Line direction; renders a semantic <hr> horizontally and a role="separator" <div> vertically.',
                zh: '线条方向；水平时渲染语义化 <hr>，垂直时渲染 role="separator" 的 <div>。',
              }),
            },
            {
              name: "variant",
              type: '"subtle" | "bold" | "decorative"',
              defaultValue: '"subtle"',
              description: t({
                en: "Weight and treatment of the rule.",
                zh: "分隔线的粗细与样式处理。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides composed last so a caller can win over the defaults.",
                zh: "最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。",
              }),
            },
            {
              name: "className",
              type: "string",
              description: t({
                en: "Escape-hatch class applied to the rendered rule.",
                zh: "应用于渲染分隔线的逃生舱类名。",
              }),
            },
            {
              name: "style",
              type: "CSSProperties",
              description: t({
                en: "Inline style applied to the rendered rule.",
                zh: "应用于渲染分隔线的内联样式。",
              }),
            },
            {
              name: "ref",
              type: "Ref<HTMLElement>",
              description: t({
                en: "Ref to the rendered element (<hr> when horizontal, <div> when vertical).",
                zh: "指向渲染元素的 ref（水平为 <hr>，垂直为 <div>）。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <div css={[flex.col, styles.doStack]}>
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Overview", zh: "概览" })}
              </Text>
              <Divider variant="subtle" />
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Cast & crew", zh: "演职人员" })}
              </Text>
            </div>
          }
          doCaption={t({
            en: "Separate related content with a subtle rule; save bold or decorative for real transitions.",
            zh: "用柔和分隔线分隔相关内容；强烈或装饰样式留给真正的段落转换。",
          })}
          dont={
            <div css={styles.dontCard}>
              <Divider
                orientation="vertical"
                variant="decorative"
                css={styles.dontBar}
              />
              <div css={[flex.col, styles.dontCardBody]}>
                <Text variant="bodySmall" tone="muted">
                  {t({ en: "Action", zh: "动作" })}
                </Text>
              </div>
            </div>
          }
          dontCaption={t({
            en: "Don't run a vertical decorative divider down a card's leading edge as a category accent — see DESIGN.md.",
            zh: "不要在卡片前缘用垂直装饰分隔线作为分类色条——见 DESIGN.md。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  horizontalStack: {
    gap: space._5,
  },
  horizontalRow: {
    gap: space._3,
  },
  verticalStack: {
    gap: space._4,
  },
  verticalRow: {
    gap: space._4,
    alignItems: "center",
    blockSize: controlSize._9,
  },
  decorativeStack: {
    gap: space._3,
  },
  decorativeAccent: {
    blockSize: "3px",
    borderRadius: "2px",
  },
  doStack: {
    gap: space._2,
    inlineSize: "100%",
  },
  dontCard: {
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    gap: space._3,
    padding: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurface,
    minBlockSize: space._9,
  },
  dontCardBody: {
    gap: space._1,
    justifyContent: "center",
  },
  dontBar: {
    inlineSize: "4px",
    borderRadius: border.radius_1,
  },
});
