"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import {
  CodeBlock,
  type CodePart,
  type CodeToken,
} from "@tuja/ui/components/code-block";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { importLine } from "#src/design-system/lab/import-parts.ts";
import { textOf } from "#src/design-system/lab/print-lab-value.ts";
import { showcaseBleed } from "#src/design-system/showcase-bleed.stylex.ts";

/**
 * One import line, one comment, and one lowercase tag around a component
 * with an attribute, a string, a number, and a property access: every kind
 * `TOKEN_KINDS` names, in one snippet.
 */
export const CODE_RUNS: readonly CodeToken[] = [
  ...importLine("Progress", "@tuja/ui/components/progress"),
  ["plain", "\n\n"],
  ["comment", "// Reports how far the upload has got."],
  ["plain", "\n"],
  ["punct", "<"],
  ["tag", "div"],
  ["plain", " "],
  ["attr", "className"],
  ["punct", "="],
  ["string", '"upload"'],
  ["punct", ">"],
  ["plain", "\n  "],
  ["punct", "<"],
  ["component", "Progress"],
  ["plain", " "],
  ["attr", "value"],
  ["punct", "="],
  ["punct", "{"],
  ["number", "42"],
  ["punct", "}"],
  ["plain", " "],
  ["attr", "label"],
  ["punct", "="],
  ["punct", "{"],
  ["plain", "upload"],
  ["punct", "."],
  ["property", "name"],
  ["punct", "}"],
  ["plain", " "],
  ["punct", "/>"],
  ["plain", "\n"],
  ["punct", "</"],
  ["tag", "div"],
  ["punct", ">"],
];

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
export const BUTTON_SNIPPET_STATES = {
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

type StateId = keyof typeof BUTTON_SNIPPET_STATES;

/** Holds which of the three states is on show — `CodeBlock` is controlled by contract. */
export function CodeBlockPartsControl() {
  const [stateId, setStateId] = useState<StateId>("default");

  return (
    <div css={[stack.item, styles.shrink]}>
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
      <CodeBlock
        parts={BUTTON_SNIPPET_STATES[stateId]}
        label={t({ en: "Code", zh: "代码" })}
        css={showcaseBleed.region}
        contentCss={showcaseBleed.content}
      />
    </div>
  );
}

const styles = stylex.create({
  shrink: {
    minInlineSize: 0,
  },
});
