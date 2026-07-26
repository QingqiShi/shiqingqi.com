import * as stylex from "@stylexjs/stylex";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * One card. This tile is the only one whose subject is itself a bordered
 * surface, so a nested border is unavoidable here — which is exactly why it gets
 * one and not two. A second card would stack three surfaces inside each other
 * and make this the busiest tile in the grid to name the simplest component.
 *
 * The `css` override tightens the padding to specimen scale, using the same
 * escape hatch the component documents.
 */
export function CardPreview() {
  return (
    <Card css={[previewLayout.fill, styles.card]}>
      <Text variant="bodySmall" weight="semibold">
        {t({ en: "Blade Runner 2049", zh: "银翼杀手 2049" })}
      </Text>
      <Text variant="caption" tone="muted">
        {t({ en: "2017 · Science fiction", zh: "2017 · 科幻" })}
      </Text>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    paddingBlock: space._2,
    paddingInline: space._2,
  },
});
