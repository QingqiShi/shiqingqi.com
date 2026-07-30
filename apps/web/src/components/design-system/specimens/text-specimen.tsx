import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Two steps of the scale, each in the tone it usually carries. Not the overline:
 * a tracked all-caps label reads as a section eyebrow rather than as body copy,
 * which is the opposite of what this tile is naming.
 */
export function TextSpecimen() {
  return (
    <div css={specimenLayout.stack}>
      <Text variant="body">
        {t({ en: "Body copy sets the rhythm.", zh: "正文决定阅读节奏。" })}
      </Text>
      <Text variant="bodySmall" tone="muted">
        {t({ en: "Small copy supports it.", zh: "小号文字作为辅助。" })}
      </Text>
    </div>
  );
}
