import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "./code-block.tsx";
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
    const { container } = render(<CodeBlock source={SOURCE} />);

    expect(container.textContent).toBe(
      'const tone = "muted"\n// the quiet one',
    );
  });
});
