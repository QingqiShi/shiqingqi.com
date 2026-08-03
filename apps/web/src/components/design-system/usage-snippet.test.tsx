import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { CodeToken } from "./code/code-token.ts";
import { UsageSnippet } from "./usage-snippet.tsx";

const CODE = '<Badge intent="info">New</Badge>';

const SOURCE: readonly CodeToken[] = [
  ["punct", "<"],
  ["component", "Badge"],
  ["plain", " "],
  ["attr", "intent"],
  ["punct", '="'],
  ["string", "info"],
  ["punct", '">'],
  ["plain", "New"],
  ["punct", "</"],
  ["component", "Badge"],
  ["punct", ">"],
];

describe("UsageSnippet", () => {
  it("colours the source the Babel plugin gives it", () => {
    const { container } = render(<UsageSnippet code={CODE} source={SOURCE} />);

    expect(container.querySelectorAll("code > span")).toHaveLength(
      SOURCE.length,
    );
    expect(container.querySelector("code")?.textContent).toBe(CODE);
  });

  // `source={undefined}` is written out because the Babel plugin skips an
  // element that already carries the prop. Without it the plugin would fill
  // this snippet in and there would be no fallback left to test.
  it("falls back to one plain run without a source", () => {
    const { container } = render(
      <UsageSnippet code={CODE} source={undefined} />,
    );

    expect(container.querySelectorAll("code > span")).toHaveLength(1);
    expect(container.querySelector("code")?.textContent).toBe(CODE);
  });

  it("captions the snippet, with an override", () => {
    const { rerender } = render(<UsageSnippet code={CODE} />);
    expect(screen.getByText("Usage")).toBeVisible();

    rerender(<UsageSnippet code={CODE} label="Import" />);
    expect(screen.getByText("Import")).toBeVisible();
  });
});
