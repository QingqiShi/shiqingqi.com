"use client";

import * as stylex from "@stylexjs/stylex";
import {
  CodeBlock,
  type CodePart,
  type CodeToken,
} from "@tuja/ui/components/code-block";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { importLine, textOf } from "../../lab/build-lab-snippet.ts";

const IMPORT: CodePart = {
  id: "import",
  lead: "",
  tokens: importLine("Button", "@tuja/ui/components/button"),
};
const OPEN: CodePart = {
  id: "open",
  lead: "\n\n",
  tokens: [
    ["punct", "<"],
    ["component", "Button"],
  ],
};
const CLOSE: CodePart = { id: "close", lead: "", tokens: [["punct", ">"]] };
const CHILDREN: CodePart = {
  id: "children",
  lead: "",
  tokens: [["plain", "Save changes"]],
};
const END: CodePart = {
  id: "end",
  lead: "",
  tokens: [
    ["punct", "</"],
    ["component", "Button"],
    ["punct", ">"],
  ],
};

/** An attribute as two parts: its name, then a value part keyed by its text. */
function attribute(name: string, value: readonly CodeToken[]): CodePart[] {
  const text = textOf(value);
  return [
    {
      id: `attr-${name}`,
      lead: " ",
      tokens: [
        ["attr", name],
        ["punct", "="],
      ],
    },
    { id: `attr-${name}:${text}`, lead: "", tokens: value },
  ];
}

const ICON_VALUE: readonly CodeToken[] = [
  ["punct", "{"],
  ["punct", "<"],
  ["component", "PlusIcon"],
  ["plain", " "],
  ["punct", "/>"],
  ["punct", "}"],
];

/**
 * Three hand-written states of the same `<Button>` snippet. `look="primary"`
 * keeps the same id — and so the same box — across the last two states,
 * because its value never changes between them.
 */
const STATES = {
  default: [IMPORT, OPEN, CLOSE, CHILDREN, END],
  primary: [
    IMPORT,
    OPEN,
    ...attribute("look", [["string", '"primary"']]),
    CLOSE,
    CHILDREN,
    END,
  ],
  primaryLarge: [
    IMPORT,
    OPEN,
    ...attribute("look", [["string", '"primary"']]),
    ...attribute("size", [["string", '"lg"']]),
    ...attribute("icon", ICON_VALUE),
    CLOSE,
    CHILDREN,
    END,
  ],
} satisfies Record<string, readonly CodePart[]>;

type StateId = keyof typeof STATES;

/** Holds which of the three states is on show — `CodeBlock` is controlled by contract. */
export function CodeBlockPartsControl() {
  const [stateId, setStateId] = useState<StateId>("default");

  return (
    <div css={styles.stack}>
      <SegmentedControl
        aria-label={t({ en: "Button snippet", zh: "按钮代码片段" })}
        value={stateId}
        onChange={setStateId}
        options={[
          { value: "default", label: t({ en: "Default", zh: "默认" }) },
          { value: "primary", label: t({ en: "Primary", zh: "主要" }) },
          {
            value: "primaryLarge",
            label: t({ en: "Primary, lg, icon", zh: "主要、大号、带图标" }),
          },
        ]}
      />
      <CodeBlock parts={STATES[stateId]} />
    </div>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    minInlineSize: 0,
  },
});
