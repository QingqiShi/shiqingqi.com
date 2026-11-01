import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, measure, space } from "@tuja/ui/tokens.stylex";

/** Real text at each Measure cap. */
export function LayoutMeasureSpecimen() {
  return (
    <div css={stack.group}>
      <div css={stack.tight}>
        <code css={[typeRole.caption, styles.token]}>measure.prose · 41em</code>
        <Text css={styles.edge}>
          {t({
            en: "Running prose, such as a paragraph, a lead or a note, stops at this width: 41 Chinese characters at any size, around 88 Latin.",
            zh: "连续的正文，比如段落、导语或说明，到这个宽度换行：任何字号下都是 41 个汉字，约 88 个拉丁字符。",
          })}
        </Text>
      </div>
      <div css={stack.tight}>
        <code css={[typeRole.caption, styles.token]}>measure.short · 24em</code>
        <Text css={[styles.edge, styles.short]}>
          {t({
            en: "A short block that stands alone, such as an empty state or a hint, stops at this width.",
            zh: "独立存在的短文本块，比如空状态、加载提示或一句简短的说明，到这个宽度就会换行。",
          })}
        </Text>
      </div>
    </div>
  );
}

const styles = stylex.create({
  token: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  // The rule under the text shows how far the cap lets a line run.
  edge: {
    paddingBlockEnd: space._1,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  short: {
    maxInlineSize: measure.short,
  },
});
