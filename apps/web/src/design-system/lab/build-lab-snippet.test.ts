import type { CodeToken } from "@tuja/ui/components/code-block";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { buildLabSnippet } from "./build-lab-snippet.ts";
import { labSource } from "./print-lab-value.ts";

/** A source as the Babel plugin gives it: the text in one plain run per line. */
function plain(text: string): CodeToken[] {
  return text
    .split("\n")
    .flatMap((line, index): CodeToken[] =>
      index === 0 ? [["plain", line]] : [["plain", `\n${line}`]],
    );
}

describe("buildLabSnippet", () => {
  it("prints a state binding as a useState line and the pair that reads it", () => {
    const { text } = buildLabSnippet({
      element: "Switch",
      importPath: "@tuja/ui/components/switch",
      props: { value: "on", onChange: () => undefined, "aria-label": "Alerts" },
      docs: [],
      controls: [],
      state: {
        prop: "value",
        handler: "onChange",
        type: {
          code: "SwitchState",
          imports: [
            {
              name: "SwitchState",
              from: "@tuja/ui/components/switch",
              isType: true,
            },
          ],
        },
      },
    });
    expect(text).toBe(
      [
        'import { Switch, type SwitchState } from "@tuja/ui/components/switch";',
        'import { useState } from "react";',
        "",
        'const [value, setValue] = useState<SwitchState>("on");',
        "",
        '<Switch value={value} onChange={setValue} aria-label="Alerts" />',
      ].join("\n"),
    );
  });

  it("types an empty array a state starts with, because TypeScript would infer never[]", () => {
    const { text } = buildLabSnippet({
      element: "OptionCardGroup",
      importPath: "@tuja/ui/components/option-card-group",
      props: { value: [], onChange: () => undefined },
      docs: [],
      controls: [],
      state: { prop: "value", handler: "onChange" },
    });
    expect(text).toContain("useState<string[]>([]);");
  });

  it("keeps a handler and an object a Variant sets, one attribute to a line when they break", () => {
    const { text } = buildLabSnippet({
      element: "Toast",
      importPath: "@tuja/ui/components/toast",
      props: {
        message: "Transaction deleted",
        action: { label: "Undo", onAction: () => undefined },
        onDismiss: () => undefined,
      },
      docs: [],
      controls: [],
    });
    expect(text).toBe(
      [
        'import { Toast } from "@tuja/ui/components/toast";',
        "",
        "<Toast",
        '  message="Transaction deleted"',
        '  action={{ label: "Undo", onAction: () => {} }}',
        "  onDismiss={() => {}}",
        "/>",
      ].join("\n"),
    );
  });

  it("prints a node's source of many lines inside the element, with its imports and styles", () => {
    const content = labSource(createElement("div"), {
      tokens: plain(
        [
          "<>",
          "  <CardHeader>",
          "    <CardTitle>Typography</CardTitle>",
          "  </CardHeader>",
          "  <CardContent css={panel.inset}>Body</CardContent>",
          "</>",
        ].join("\n"),
      ),
      imports: [
        { name: "CardHeader", from: "@tuja/ui/components/card" },
        { name: "stylex", from: "@stylexjs/stylex", isNamespace: true },
      ],
      definitions: [
        {
          name: "panel",
          tokens: plain(
            "const panel = stylex.create({ inset: { padding: 0 } });",
          ),
        },
      ],
    });
    const { text } = buildLabSnippet({
      element: "Card",
      importPath: "@tuja/ui/components/card",
      props: { interactive: true, children: content },
      docs: [],
      controls: [],
    });
    expect(text).toBe(
      [
        'import { Card, CardHeader } from "@tuja/ui/components/card";',
        'import * as stylex from "@stylexjs/stylex";',
        "",
        "const panel = stylex.create({ inset: { padding: 0 } });",
        "",
        "<Card interactive>",
        "  <CardHeader>",
        "    <CardTitle>Typography</CardTitle>",
        "  </CardHeader>",
        "  <CardContent css={panel.inset}>Body</CardContent>",
        "</Card>",
      ].join("\n"),
    );
  });

  it("puts a JSX attribute of many lines between braces, and hugs a function", () => {
    const menu = labSource(createElement("div"), {
      tokens: plain("<div>\n  <MenuLabel>Sort by</MenuLabel>\n</div>"),
      imports: [],
    });
    const trigger = labSource(() => null, {
      tokens: plain("(triggerProps) => (\n  <Button {...triggerProps} />\n)"),
      imports: [],
    });
    const { text } = buildLabSnippet({
      element: "Popover",
      importPath: "@tuja/ui/components/popover",
      props: { trigger, menuContent: menu },
      docs: [],
      controls: [],
    });
    expect(text).toBe(
      [
        'import { Popover } from "@tuja/ui/components/popover";',
        "",
        "<Popover",
        "  trigger={(triggerProps) => (",
        "    <Button {...triggerProps} />",
        "  )}",
        "  menuContent={",
        "    <div>",
        "      <MenuLabel>Sort by</MenuLabel>",
        "    </div>",
        "  }",
        "/>",
      ].join("\n"),
    );
  });

  it("prints a handler that passes no value as an arrow, and a trigger beside the element", () => {
    const trigger = labSource(createElement("button"), {
      tokens: plain("<Button onClick={() => setIsOpen(true)}>Open</Button>"),
      imports: [{ name: "Button", from: "@tuja/ui/components/button" }],
    });
    const { text } = buildLabSnippet({
      element: "Sheet",
      importPath: "@tuja/ui/components/sheet",
      props: { isOpen: false, closeLabel: "Close" },
      docs: [],
      controls: [],
      state: { prop: "isOpen", handler: "onClose", nextValue: false, trigger },
    });
    expect(text).toBe(
      [
        'import { Sheet } from "@tuja/ui/components/sheet";',
        'import { Button } from "@tuja/ui/components/button";',
        'import { useState } from "react";',
        "",
        "const [isOpen, setIsOpen] = useState(false);",
        "",
        "<>",
        "  <Button onClick={() => setIsOpen(true)}>Open</Button>",
        "  <Sheet",
        "    isOpen={isOpen}",
        "    onClose={() => setIsOpen(false)}",
        '    closeLabel="Close"',
        "  />",
        "</>",
      ].join("\n"),
    );
  });
});
