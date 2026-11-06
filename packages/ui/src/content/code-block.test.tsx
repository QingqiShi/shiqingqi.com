import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeBlock, type CodePart } from "./code-block.tsx";
import type { CodeToken } from "./token-kinds.ts";

const SOURCE: readonly CodeToken[] = [
  ["keyword", "const"],
  ["plain", " "],
  ["property", "tone"],
  ["punct", " = "],
  ["string", '"muted"'],
  ["plain", "\n"],
  ["comment", "// the quiet one"],
];

describe("CodeBlock source", () => {
  it("draws the source exactly, whitespace included", () => {
    const { container } = render(<CodeBlock source={SOURCE} label="Code" />);

    expect(container.textContent).toBe(
      'const tone = "muted"\n// the quiet one',
    );
  });
});

describe("CodeBlock parts", () => {
  it("places the ghost of a leaving part where the part stood", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const parts = (id: string): CodePart[] => [
      { id: "a", lead: "", tokens: [["plain", "alpha"]] },
      { id, lead: "\n", tokens: [["plain", "omega"]] },
    ];
    const { container, rerender } = render(
      <CodeBlock parts={parts("b")} label="Code" />,
    );

    rerender(<CodeBlock parts={parts("c")} label="Code" />);

    const ghost = container.querySelector<HTMLElement>("span[aria-hidden]");
    expect(ghost?.textContent).toBe("omega");
    expect(ghost?.style.left).toMatch(/px$/);
    expect(ghost?.style.top).toMatch(/px$/);
  });
});
