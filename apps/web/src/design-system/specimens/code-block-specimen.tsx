import { t } from "@tuja/i18n";
import { CodeBlock, type CodeToken } from "@tuja/ui/components/code-block";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { importLine } from "#src/design-system/lab/import-parts.ts";

const SOURCE: readonly CodeToken[] = [
  ...importLine("Button", "@tuja/ui/components/button"),
  ["plain", "\n"],
  ["punct", "<"],
  ["component", "Button"],
  ["plain", " "],
  ["punct", "/>"],
];

/** An import line and a self-closing element — the smallest real snippet. */
export function CodeBlockSpecimen() {
  return (
    <CodeBlock
      source={SOURCE}
      label={t({ en: "Code", zh: "代码" })}
      css={fill.inline}
    />
  );
}
