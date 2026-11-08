"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useCopyToClipboard } from "#src/clipboard/use-copy-to-clipboard.ts";

type CopyLineProps = {
  text: string;
  /** A shell command or a file's content, set in the mono face. */
  isCode?: boolean;
};

/** A line to carry to the Mac: the text, which can be selected by hand, and a button that copies it. */
export function CopyLine({ text, isCode = false }: CopyLineProps) {
  const { isCopied, copy } = useCopyToClipboard(text);

  return (
    <div css={[corner.radius_2, styles.line]}>
      <pre
        css={[
          isCode ? typeRole.bodySmall : typeRole.body,
          styles.text,
          isCode && styles.code,
        ]}
      >
        {text}
      </pre>
      <Button
        size="sm"
        look="ghost"
        icon={
          isCopied ? (
            <CheckIcon weight="bold" aria-hidden />
          ) : (
            <CopyIcon weight="bold" aria-hidden />
          )
        }
        onClick={copy}
        css={styles.button}
      >
        {isCopied
          ? t({ en: "Copied", zh: "已复制" })
          : t({ en: "Copy", zh: "复制" })}
      </Button>
      <span role="status" css={a11y.srOnly}>
        {isCopied ? t({ en: "Copied", zh: "已复制" }) : ""}
      </span>
    </div>
  );
}

const styles = stylex.create({
  line: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: rhythm.tight,
    padding: space._3,
    backgroundColor: color.bgControlSunken,
  },
  text: {
    margin: 0,
    fontFamily: font.family,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  },
  code: {
    fontFamily: font.familyMono,
  },
  button: {
    alignSelf: "flex-end",
  },
});
