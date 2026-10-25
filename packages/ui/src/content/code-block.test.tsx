import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
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

/** jsdom has no `ResizeObserver`, which the `parts` read to keep their places. */
function stubResizeObserver() {
  const original = globalThis.ResizeObserver;
  class StubResizeObserver {
    observe() {
      // No layout to report: every box measures at zero either way.
    }
    unobserve() {
      // Nothing to stop observing.
    }
    disconnect() {
      // Nothing to disconnect.
    }
  }
  globalThis.ResizeObserver = StubResizeObserver;
  return () => {
    globalThis.ResizeObserver = original;
  };
}

let restoreResizeObserver: () => void;
let clock: ReturnType<typeof fakeMotionClock>;

function opacityOf(element: Element | null) {
  if (!(element instanceof HTMLElement)) return null;
  const { opacity } = element.style;
  return opacity === "" ? null : Number(opacity);
}

describe("CodeBlock source", () => {
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

    expect(container.querySelector("pre")?.parentElement).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("draws nothing for an empty source", () => {
    const { container } = render(<CodeBlock source={[]} />);

    expect(container.textContent).toBe("");
  });
});

describe("CodeBlock parts", () => {
  beforeEach(() => {
    restoreResizeObserver = stubResizeObserver();
    clock = fakeMotionClock();
  });

  afterEach(() => {
    restoreResizeObserver();
    vi.useRealTimers();
  });

  it("renders each part as a box carrying its id, with its lead outside the box", () => {
    const parts: readonly CodePart[] = [
      { id: "a", lead: "", tokens: [["keyword", "const"]] },
      { id: "b", lead: "  ", tokens: [["plain", "x"]] },
    ];
    const { container } = render(<CodeBlock parts={parts} />);

    const boxA = container.querySelector('[data-box="a"]');
    const boxB = container.querySelector('[data-box="b"]');
    expect(boxA?.textContent).toBe("const");
    expect(boxB?.textContent).toBe("x");
    // The lead is a sibling text node before the box, never inside it.
    expect(boxB?.previousSibling?.textContent).toBe("  ");
  });

  it("fades a dropped part as a ghost holding its own tokens", async () => {
    const first: readonly CodePart[] = [
      { id: "a", lead: "", tokens: [["keyword", "const"]] },
      { id: "b", lead: " ", tokens: [["plain", "gone"]] },
    ];
    const { container, rerender } = render(<CodeBlock parts={first} />);

    rerender(<CodeBlock parts={[first[0]]} />);

    const ghost = container.querySelector('code [aria-hidden="true"]');
    expect(ghost?.textContent).toBe("gone");
    await act(() => clock.advance(0.1));
    expect(opacityOf(ghost)).toBeGreaterThan(0);
    expect(opacityOf(ghost)).toBeLessThan(1);
    await act(() => clock.advance(0.5));
    expect(ghost?.isConnected).toBe(false);
    expect(opacityOf(ghost)).toBeNull();
  });

  it("rises a newly arrived part in with a fade from opacity 0", async () => {
    const first: readonly CodePart[] = [
      { id: "a", lead: "", tokens: [["keyword", "const"]] },
    ];
    const second: readonly CodePart[] = [
      ...first,
      { id: "b", lead: " ", tokens: [["plain", "new"]] },
    ];
    const { container, rerender } = render(<CodeBlock parts={first} />);

    rerender(<CodeBlock parts={second} />);

    const arrival = container.querySelector('[data-box="b"]');
    await act(() => clock.advance(0.016));
    expect(opacityOf(arrival)).toBeLessThan(0.5);
    expect(arrival instanceof HTMLElement && arrival.style.transform).toMatch(
      /^translateY\(0\.[1-5]\d*rem\)$/,
    );
    await act(() => clock.advance(1));
    expect(opacityOf(arrival)).toBeNull();
    expect(opacityOf(container.querySelector('[data-box="a"]'))).toBeNull();
  });
});
