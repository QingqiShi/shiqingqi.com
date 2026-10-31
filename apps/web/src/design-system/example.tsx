import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { CodeBlock, type CodeToken } from "@tuja/ui/components/code-block";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface ExampleProps {
  /**
   * The source of the preview, in the reader's locale. The Babel plugin puts
   * this in. Never write it by hand.
   */
  source?: readonly CodeToken[];
  /** The live preview. */
  children: ReactNode;
}

/**
 * A live preview and the code that makes it, in one card: the preview on top,
 * the code under it behind a hairline. The shared frame and the order say that
 * this code makes this preview. The code is the source of the preview, so the
 * two cannot drift apart. The `CodeBlock` renders where the `Example` renders,
 * so a server page keeps the colouring on the server.
 */
export function Example({ source, children }: ExampleProps) {
  return (
    <div css={[corner.radius_3, styles.card]}>
      <div css={[flex.center, styles.preview]}>{children}</div>
      {source ? (
        <CodeBlock
          source={source}
          label={t({ en: "Code", zh: "代码" })}
          css={styles.code}
          contentCss={styles.codeInset}
        />
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  card: {
    minInlineSize: 0,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  preview: {
    flexWrap: "wrap",
    gap: rhythm.item,
    paddingBlock: { default: space._8, [breakpoints.md]: space._9 },
    paddingInline: space._5,
  },
  // The card does not clip its content, because a clip would also cut the
  // effects of the preview. Thus the code area sets its own lower corners,
  // inside the card's border.
  code: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    borderStartStartRadius: 0,
    borderStartEndRadius: 0,
    borderEndStartRadius: `calc(${border.radius_3} - ${border.size_1})`,
    borderEndEndRadius: `calc(${border.radius_3} - ${border.size_1})`,
    cornerShape: "squircle",
    backgroundColor: color.bgSurfaceSunken,
  },
  codeInset: {
    paddingBlock: space._4,
    paddingInline: space._5,
  },
});
