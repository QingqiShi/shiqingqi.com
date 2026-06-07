import * as stylex from "@stylexjs/stylex";
import { Divider } from "@tuja/ui/components/divider";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";

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
              zh: "搭配英雄排版或区段转换，可获得最佳效果。",
            })}
          </Text>
        </div>
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
});
