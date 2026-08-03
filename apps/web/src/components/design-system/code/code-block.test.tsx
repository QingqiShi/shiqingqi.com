import { describe, expect, it } from "vitest";
import { render } from "#src/test-utils.tsx";
import { CodeBlock } from "./code-block.tsx";
import type { CodeToken } from "./code-token.ts";

const SOURCE: readonly CodeToken[] = [
  ["keyword", "const"],
  ["plain", " "],
  ["property", "tone"],
  ["punct", " = "],
  ["string", '"muted"'],
  ["plain", "\n"],
  ["comment", "// the quiet one"],
];

describe("CodeBlock", () => {
  it("draws the source exactly, whitespace included", () => {
    const { container } = render(<CodeBlock source={SOURCE} />);

    expect(container.textContent).toBe(
      'const tone = "muted"\n// the quiet one',
    );
  });

  it("gives each run its own element, in source order", () => {
    const { container } = render(<CodeBlock source={SOURCE} />);

    const runs = container.querySelectorAll("code > span");

    expect([...runs].map((run) => run.textContent)).toEqual(
      SOURCE.map(([, text]) => text),
    );
  });

  it("lets a keyboard reach the scroll container", () => {
    const { container } = render(<CodeBlock source={SOURCE} />);

    expect(container.firstElementChild).toHaveAttribute("tabindex", "0");
  });

  it("draws nothing for an empty source", () => {
    const { container } = render(<CodeBlock source={[]} />);

    expect(container.textContent).toBe("");
  });
});
