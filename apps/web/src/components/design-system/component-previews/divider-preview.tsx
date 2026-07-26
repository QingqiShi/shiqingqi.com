import * as stylex from "@stylexjs/stylex";
import { Divider } from "@tuja/ui/components/divider";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * A rule doing its job: two pieces of content, separated. All three variants and
 * both orientations would need five elements to say one word, and at this size
 * `bold` differs from `subtle` by a single pixel.
 */
export function DividerPreview() {
  return (
    <div css={[previewLayout.fill, styles.stack]}>
      <Text variant="bodySmall" tone="muted">
        {t({ en: "Details", zh: "详情" })}
      </Text>
      <Divider />
      <Text variant="bodySmall" tone="muted">
        {t({ en: "Cast & crew", zh: "演职人员" })}
      </Text>
    </div>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
});
