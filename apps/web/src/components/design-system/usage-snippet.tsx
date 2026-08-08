"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { CodeBlock } from "./code/code-block.tsx";
import type { CodeToken } from "./code/code-token.ts";

interface UsageSnippetProps {
  /**
   * Pre-formatted source shown verbatim — typically an import line plus a
   * minimal JSX example. Multiline is expected; indentation is preserved.
   */
  code: string;
  /** Caption above the code block. Defaults to a localised "Usage". */
  label?: string;
  /**
   * The coloured runs of `code`. The Babel plugin puts this in. Without it the
   * snippet draws as one plain run.
   */
  source?: readonly CodeToken[];
}

/**
 * A read-only code sample framed like a {@link SpecCard}: a raised surface with
 * a hairline ring, a small caption, and the source in a monospace block that
 * owns its own horizontal scroll so long lines never widen the page.
 */
export function UsageSnippet({ code, label, source }: UsageSnippetProps) {
  const resolvedLabel = label ?? t({ en: "Usage", zh: "用法" });
  const runs: readonly CodeToken[] = source ?? [["plain", code]];
  return (
    <div css={[corner.radius_2, styles.card]}>
      <Text as="span" variant="caption" tone="subtle" css={styles.label}>
        {resolvedLabel}
      </Text>
      <CodeBlock source={runs} />
    </div>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: font.trackingWider,
    fontWeight: font.weight_6,
  },
});
