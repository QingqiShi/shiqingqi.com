import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

export function SkeletonShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="line">
            <Skeleton width={160} height={12} />
          </Specimen>
          <Specimen caption="pill">
            <Skeleton width={200} height={32} />
          </Specimen>
          <Specimen caption="block">
            <Skeleton width={96} height={96} />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Fill", zh: "填充" })}>
        <div css={[flex.col, styles.fillStack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "With `fill`, the skeleton stretches to its container — hand it the shape of whatever it stands in for.",
              zh: "使用 `fill` 时，骨架会填满其容器——让它呈现所替代内容的形状。",
            })}
          </Text>
          <Specimen caption={t({ en: "box", zh: "容器" })}>
            <div css={[corner.radius_2, styles.fillBox]}>
              <Skeleton fill />
            </div>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Staggered", zh: "错峰" })}>
        <div css={[flex.col, styles.staggerStack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A rising `delay` offsets each pulse, so a group shimmers in sequence rather than in unison.",
              zh: "递增的 `delay` 会让每次脉动错开，使一组骨架依次闪烁，而非同步。",
            })}
          </Text>
          <Specimen caption="delay">
            <div css={styles.staggerRow}>
              {[0, 120, 240, 360, 480].map((delay) => (
                <Skeleton key={delay} height={56} delay={delay} />
              ))}
            </div>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Composition", zh: "组合" })}>
        <Specimen caption={t({ en: "card", zh: "卡片" })}>
          <div css={styles.cardRow}>
            {[0, 1, 2].map((index) => (
              <div key={index} css={[flex.col, corner.radius_3, styles.card]}>
                <Skeleton height={160} delay={index * 120} />
                <div css={[flex.col, styles.cardLines]}>
                  <Skeleton width={132} height={14} delay={index * 120} />
                  <Skeleton width={84} height={12} delay={index * 120} />
                </div>
              </div>
            ))}
          </div>
        </Specimen>
      </Showcase>

      <PropsTable component="skeleton" />

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
