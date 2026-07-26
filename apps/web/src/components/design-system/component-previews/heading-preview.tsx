import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * A heading doing its job: leading a piece of copy.
 *
 * Not the ramp — `h4` is the only variant that fits under the tile's own title
 * (1.1rem at weight 700) without outranking it, and no two variants sit a useful
 * ratio apart below that ceiling. The relationship to the body copy beneath is
 * the more honest thing to show anyway: it is what a heading is for, and why
 * `level` and `variant` are separate props.
 */
export function HeadingPreview() {
  return (
    <div css={previewLayout.stack}>
      <Heading level={3} variant="h4">
        {t({ en: "Section title", zh: "章节标题" })}
      </Heading>
      <Text variant="bodySmall" tone="muted">
        {t({
          en: "And the copy it introduces.",
          zh: "以及它所引导的正文。",
        })}
      </Text>
    </div>
  );
}
