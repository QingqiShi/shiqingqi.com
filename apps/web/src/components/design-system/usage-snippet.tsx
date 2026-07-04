"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";

interface UsageSnippetProps {
  /**
   * Pre-formatted source shown verbatim — typically an import line plus a
   * minimal JSX example. Multiline is expected; indentation is preserved.
   */
  code: string;
  /** Caption above the code block. Defaults to a localized "Usage". */
  label?: string;
}

/**
 * A read-only code sample framed like a {@link SpecCard}: a raised surface with
 * a hairline ring, a small caption, and the source in a monospace block that
 * owns its own horizontal scroll so long lines never widen the page.
 */
export function UsageSnippet({ code, label }: UsageSnippetProps) {
  const resolvedLabel = label ?? t({ en: "Usage", zh: "用法" });
  return (
    <div css={styles.card}>
      <Text as="span" variant="caption" tone="subtle" css={styles.label}>
        {resolvedLabel}
      </Text>
      <div css={styles.scroller}>
        <pre css={styles.pre}>
          <code css={styles.code}>{code}</code>
        </pre>
      </div>
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
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: font.trackingWider,
    fontWeight: font.weight_6,
  },
  // Owns the horizontal overflow so a wide line scrolls inside the card rather
  // than stretching the doc column.
  scroller: {
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    minInlineSize: 0,
  },
  pre: {
    margin: 0,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMain,
    whiteSpace: "pre",
  },
});
