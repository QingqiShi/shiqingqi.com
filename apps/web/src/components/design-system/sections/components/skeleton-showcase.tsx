import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function SkeletonShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="line">
            <Skeleton width={160} height={12} />
          </ShowcaseItem>
          <ShowcaseItem label="pill">
            <Skeleton width={200} height={32} />
          </ShowcaseItem>
          <ShowcaseItem label="block">
            <Skeleton width={96} height={96} />
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Fill", zh: "填充" })}>
        <div css={[flex.col, styles.fillStack]}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "With `fill`, the skeleton stretches to its container — hand it the shape of whatever it stands in for.",
              zh: "使用 `fill` 时，骨架会填满其容器——让它呈现所替代内容的形状。",
            })}
          </Text>
          <div css={styles.fillBox}>
            <Skeleton fill />
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Staggered", zh: "错峰" })}>
        <div css={[flex.col, styles.staggerStack]}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "A rising `delay` offsets each pulse, so a group shimmers in sequence rather than in unison.",
              zh: "递增的 `delay` 会让每次脉动错开，使一组骨架依次闪烁，而非同步。",
            })}
          </Text>
          <div css={styles.staggerRow}>
            {[0, 120, 240, 360, 480].map((delay) => (
              <Skeleton key={delay} height={56} delay={delay} />
            ))}
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Composition", zh: "组合" })}>
        <div css={styles.cardRow}>
          {[0, 1, 2].map((index) => (
            <div key={index} css={[flex.col, styles.card]}>
              <Skeleton height={160} delay={index * 120} />
              <div css={[flex.col, styles.cardLines]}>
                <Skeleton width={132} height={14} delay={index * 120} />
                <Skeleton width={84} height={12} delay={index * 120} />
              </div>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Skeleton } from "@tuja/ui/components/skeleton";

<Skeleton width="100%" height={160} />`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "width",
              type: "string | number",
              description: t({
                en: 'Inline size; a number is treated as pixels, a string passes through (e.g. "100%").',
                zh: '内联尺寸；数字按像素处理，字符串原样传入（例如 "100%"）。',
              }),
            },
            {
              name: "height",
              type: "string | number",
              description: t({
                en: "Block size; a number is treated as pixels, a string passes through.",
                zh: "块级尺寸；数字按像素处理，字符串原样传入。",
              }),
            },
            {
              name: "fill",
              type: "boolean",
              description: t({
                en: "Stretch to fill the parent's inline and block size.",
                zh: "拉伸以填满父元素的内联与块级尺寸。",
              }),
            },
            {
              name: "delay",
              type: "number",
              description: t({
                en: "Staggers the pulse start by N milliseconds — useful for lists of rows.",
                zh: "将脉动起点错开 N 毫秒——适用于多行列表。",
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
                en: "Escape-hatch class applied to the rendered element.",
                zh: "应用于渲染元素的逃生舱类名。",
              }),
            },
            {
              name: "style",
              type: "CSSProperties",
              description: t({
                en: "Inline style applied to the rendered element.",
                zh: "应用于渲染元素的内联样式。",
              }),
            },
            {
              name: "ref",
              type: "Ref<HTMLDivElement>",
              description: t({
                en: "Ref to the rendered element.",
                zh: "指向渲染元素的 ref。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <div css={[flex.col, styles.guideCard]}>
              <Skeleton height={80} />
              <div css={[flex.col, styles.guideLines]}>
                <Skeleton width={120} height={12} />
                <Skeleton width={80} height={10} />
              </div>
            </div>
          }
          doCaption={t({
            en: "Mirror the shape and size of the content the skeleton stands in for.",
            zh: "让骨架屏还原其所替代内容的形状与尺寸。",
          })}
          dont={<Skeleton width={200} height={96} />}
          dontCaption={t({
            en: "Don't mask a rich layout with one generic block — the swap-in jumps and previews nothing.",
            zh: "不要用一整块通用骨架遮盖复杂布局——内容载入时会跳动，也无法预览结构。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  fillStack: {
    gap: space._3,
  },
  fillBox: {
    inlineSize: "100%",
    blockSize: space._13,
    borderRadius: border.radius_2,
    overflow: "hidden",
  },
  staggerStack: {
    gap: space._3,
  },
  staggerRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: space._2,
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: space._3,
  },
  card: {
    gap: space._2,
    padding: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_3,
  },
  cardLines: {
    gap: space._1,
  },
  guideCard: {
    gap: space._2,
    inlineSize: space._11,
  },
  guideLines: {
    gap: space._1,
  },
});
