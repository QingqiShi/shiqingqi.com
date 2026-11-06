import { describe, expect, it } from "vitest";
import { buildLabSnippet } from "./build-lab-snippet.ts";

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
});
