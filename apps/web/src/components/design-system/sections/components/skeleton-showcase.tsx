import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";

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
});
