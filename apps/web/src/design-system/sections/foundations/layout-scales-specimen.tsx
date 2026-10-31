import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { Specimen } from "#src/design-system/specimen.tsx";

/** One Card that takes a length from each of the three scales. */
export function LayoutScalesSpecimen() {
  return (
    <Specimen
      caption={t({
        en: "The Card pads with space._5, 24px, and stacks its parts at rhythm.item, 16px. Its Button takes its height from controlSize.",
        zh: "Card 以 space._5（24px）留内边距，以 rhythm.item（16px）堆叠各部分。里面的 Button 的高度取自 controlSize。",
      })}
    >
      <Card css={styles.card}>
        <div css={stack.text}>
          <Text weight="semibold">{t({ en: "Tonight", zh: "今晚" })}</Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Two films, under four hours together.",
              zh: "两部电影，加起来不到四个小时。",
            })}
          </Text>
        </div>
        <Button css={styles.action}>{t({ en: "Save", zh: "保存" })}</Button>
      </Card>
    </Specimen>
  );
}

const styles = stylex.create({
  card: {
    inlineSize: "100%",
    maxInlineSize: space._14,
  },
  action: {
    alignSelf: "flex-start",
  },
});
