import { t } from "@tuja/i18n";
import { CodeBlock, type CodeToken } from "@tuja/ui/components/code-block";
import { fill } from "@tuja/ui/primitives/layout.stylex";

/**
 * An element with one prop and its text: a real snippet whose longest line
 * fits the narrowest tile, so no line is cut at the edge.
 */
export function CodeBlockSpecimen() {
  const source: readonly CodeToken[] = [
    ["punct", "<"],
    ["component", "Button"],
    ["plain", " "],
    ["attr", "look"],
    ["punct", "="],
    ["string", '"ghost"'],
    ["punct", ">"],
    ["plain", `\n  ${t({ en: "Save", zh: "保存" })}\n`],
    ["punct", "</"],
    ["component", "Button"],
    ["punct", ">"],
  ];
  return (
    <CodeBlock
      source={source}
      label={t({ en: "Code", zh: "代码" })}
      css={fill.inline}
    />
  );
}
