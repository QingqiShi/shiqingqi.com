"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { CodeBlock, type CodeToken } from "@tuja/ui/components/code-block";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";

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
      <Text
        as="span"
        look="caption"
        tone="muted"
        css={[typeRole.overline, styles.label]}
      >
        {resolvedLabel}
      </Text>
      <CodeBlock
        source={runs}
        label={t({ en: "Code", zh: "代码" })}
        css={styles.code}
        contentCss={styles.codeInset}
      />
    </div>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    paddingBlockStart: `calc(${space._3} - ${border.size_1})`,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurfaceRaised,
    minInlineSize: 0,
  },
  label: {
    paddingInline: `calc(${space._3} - ${border.size_1})`,
  },
  code: {
    borderStartStartRadius: 0,
    borderStartEndRadius: 0,
    borderEndStartRadius: `calc(${border.radius_2} - ${border.size_1})`,
    borderEndEndRadius: `calc(${border.radius_2} - ${border.size_1})`,
    cornerShape: "squircle",
  },
  codeInset: {
    paddingInline: `calc(${space._3} - ${border.size_1})`,
    paddingBlockEnd: `calc(${space._3} - ${border.size_1})`,
  },
});
