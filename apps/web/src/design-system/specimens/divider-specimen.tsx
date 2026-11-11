import { t } from "@tuja/i18n";
import { Divider } from "@tuja/ui/components/divider";
import { Text } from "@tuja/ui/components/text";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";

/**
 * A rule doing its job: two pieces of content, separated. All three looks and
 * both orientations would need five elements to say one word, and at this size
 * `bold` differs from `subtle` by a single pixel.
 */
export function DividerSpecimen() {
  return (
    <div css={[fill.inline, stack.tight]}>
      <Text look="bodySmall" tone="muted">
        {t({ en: "Details", zh: "详情" })}
      </Text>
      <Divider />
      <Text look="bodySmall" tone="muted">
        {t({ en: "Cast & crew", zh: "演职人员" })}
      </Text>
    </div>
  );
}
