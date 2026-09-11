import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** One call the component made to the animation stub, for assertions below. */
interface AnimateCall {
  target: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

/**
 * jsdom has no `Element.prototype.animate`, `getAnimations`, or
 * `ResizeObserver` — the three `parts` reads to animate a change. Stubbed
 * just enough to exercise the arrive/leave paths; `apps/web/e2e/lab.spec.ts`
 * covers the real animation.
 */
function stubAnimationApis() {
  const calls: AnimateCall[] = [];
  // eslint-disable-next-line @typescript-eslint/unbound-method -- captured only to restore later, never invoked detached
  const originalAnimate = Element.prototype.animate;
  // eslint-disable-next-line @typescript-eslint/unbound-method -- captured only to restore later, never invoked detached
  const originalGetAnimations = Element.prototype.getAnimations;
  const originalResizeObserver = globalThis.ResizeObserver;

  Element.prototype.animate = function (
    this: Element,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ) {
    const resolved = typeof options === "object" ? options : {};
    calls.push({
      target: this,
      keyframes: Array.isArray(keyframes) ? keyframes : [],
      options: resolved,
    });
    // eslint-disable-next-line no-restricted-syntax -- the stub carries only the fields CodeBlock reads back off an Animation (id, cancel, finished)
    return {
      id: resolved.id ?? "",
      cancel: vi.fn(),
      finished: Promise.resolve(),
    } as unknown as Animation;
  };
  Element.prototype.getAnimations = vi.fn(() => []);

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

  return {
    calls,
    restore() {
      Element.prototype.animate = originalAnimate;
      Element.prototype.getAnimations = originalGetAnimations;
      globalThis.ResizeObserver = originalResizeObserver;
    },
  };
}

let stub: ReturnType<typeof stubAnimationApis>;

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

    expect(container.firstElementChild).toHaveAttribute("tabindex", "0");
  });

  it("draws nothing for an empty source", () => {
    const { container } = render(<CodeBlock source={[]} />);

    expect(container.textContent).toBe("");
  });
});

describe("CodeBlock parts", () => {
  beforeEach(() => {
    stub = stubAnimationApis();
  });

  afterEach(() => {
    stub.restore();
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

  it("fades a dropped part as a ghost holding its own tokens", () => {
    const first: readonly CodePart[] = [
      { id: "a", lead: "", tokens: [["keyword", "const"]] },
      { id: "b", lead: " ", tokens: [["plain", "gone"]] },
    ];
    const { container, rerender } = render(<CodeBlock parts={first} />);

    rerender(<CodeBlock parts={[first[0]]} />);

    const ghost = container.querySelector('[aria-hidden="true"]');
    expect(ghost?.textContent).toBe("gone");
    expect(
      stub.calls.some(
        (call) =>
          call.target === ghost && call.options.id === "code-block-fade",
      ),
    ).toBe(true);
  });

  it("rises a newly arrived part in with a fade from opacity 0", () => {
    const first: readonly CodePart[] = [
      { id: "a", lead: "", tokens: [["keyword", "const"]] },
    ];
    const second: readonly CodePart[] = [
      ...first,
      { id: "b", lead: " ", tokens: [["plain", "new"]] },
    ];
    const { rerender } = render(<CodeBlock parts={first} />);

    rerender(<CodeBlock parts={second} />);

    const arrival = stub.calls.find(
      (call) =>
        call.options.id === "code-block-fade" &&
        call.target instanceof HTMLElement &&
        call.target.dataset.box === "b",
    );
    expect(arrival?.keyframes[0]).toMatchObject({ opacity: 0 });
  });
});
