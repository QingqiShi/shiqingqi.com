import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { printLabValue, withSource } from "./print-lab-value.ts";

const LAYOUT = { indent: 0, column: 0, trailing: 0, width: 40 };

function source(value: unknown, layout = LAYOUT) {
  return printLabValue(value, layout)
    .lines.map(
      (line) =>
        " ".repeat(layout.indent + 2 * line.depth) +
        line.tokens.map(([, text]) => text).join(""),
    )
    .join("\n");
}

describe("printLabValue", () => {
  it("prints an object that fits on one line, a function as an empty arrow", () => {
    expect(source({ label: "Undo", onAction: () => undefined })).toBe(
      '{ label: "Undo", onAction: () => {} }',
    );
  });

  it("breaks an array of objects with two properties each, as Prettier does", () => {
    expect(
      source([
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ]),
    ).toBe(
      [
        "[",
        '  { value: "a", label: "A" },',
        '  { value: "b", label: "B" },',
        "]",
      ].join("\n"),
    );
  });

  it("breaks a value past the width, and quotes a key that is not an identifier", () => {
    expect(
      source({ "aria-label": "Sort by date", title: "A long enough title" }),
    ).toBe(
      [
        "{",
        '  "aria-label": "Sort by date",',
        '  title: "A long enough title",',
        "}",
      ].join("\n"),
    );
  });

  it("prints a node by its source, with the imports it needs", () => {
    const icon = withSource(createElement("svg"), "<PlusIcon />", [
      { name: "PlusIcon", from: "@phosphor-icons/react/dist/ssr/Plus" },
    ]);
    const printed = printLabValue([icon], LAYOUT);
    expect(
      printed.lines.map((line) => line.tokens.map(([, t]) => t).join("")),
    ).toEqual(["[<PlusIcon />]"]);
    expect(printed.imports).toEqual([
      { name: "PlusIcon", from: "@phosphor-icons/react/dist/ssr/Plus" },
    ]);
  });

  it("refuses a node with no source, so it cannot vanish from the snippet", () => {
    expect(() => printLabValue(createElement("svg"), LAYOUT)).toThrow(
      /withSource/,
    );
  });
});
