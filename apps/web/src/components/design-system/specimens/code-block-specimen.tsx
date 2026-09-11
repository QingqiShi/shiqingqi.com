import { CodeBlock, type CodeToken } from "@tuja/ui/components/code-block";
import { importLine } from "../lab/build-lab-snippet.ts";
import { specimenLayout } from "./specimen.stylex.ts";

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
  return <CodeBlock source={SOURCE} css={specimenLayout.fill} />;
}
