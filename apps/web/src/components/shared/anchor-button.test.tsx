import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "#src/test-utils.tsx";
import { AnchorButton } from "./anchor-button";

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("AnchorButton aria-current from isActive", () => {
  it("emits aria-current='true' when isActive is true", () => {
    render(
      <AnchorButton href="/a" isActive>
        Current
      </AnchorButton>,
    );
    expect(screen.getByRole("link", { name: "Current" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("omits aria-current when isActive is false", () => {
    render(
      <AnchorButton href="/a" isActive={false}>
        Other
      </AnchorButton>,
    );
    expect(screen.getByRole("link", { name: "Other" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("omits aria-current when isActive is not supplied", () => {
    render(<AnchorButton href="/a">Plain</AnchorButton>);
    expect(screen.getByRole("link", { name: "Plain" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("lets the caller override aria-current explicitly", () => {
    render(
      <AnchorButton href="/a" isActive aria-current="page">
        Overridden
      </AnchorButton>,
    );
    expect(screen.getByRole("link", { name: "Overridden" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("AnchorButton modified-click passthrough", () => {
  it("runs the consumer onClick and prevents default on a plain click", () => {
    const onClick = vi.fn((e: React.MouseEvent) => {
      e.preventDefault();
    });
    render(
      <AnchorButton href="/a" onClick={onClick}>
        Filter
      </AnchorButton>,
    );

    const notPrevented = fireEvent.click(
      screen.getByRole("link", { name: "Filter" }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    // dispatchEvent returns false when a handler called preventDefault, so the
    // browser stays on the page and the consumer drives client-side state.
    expect(notPrevented).toBe(false);
  });

  it.each([
    ["metaKey", { metaKey: true }],
    ["ctrlKey", { ctrlKey: true }],
    ["shiftKey", { shiftKey: true }],
    ["altKey", { altKey: true }],
    ["a non-primary button", { button: 1 }],
  ])(
    "skips the consumer onClick and leaves default unprevented for %s",
    (_label, init) => {
      const onClick = vi.fn((e: React.MouseEvent) => {
        e.preventDefault();
      });
      render(
        <AnchorButton href="/a" onClick={onClick}>
          Filter
        </AnchorButton>,
      );

      const notPrevented = fireEvent.click(
        screen.getByRole("link", { name: "Filter" }),
        init,
      );

      expect(onClick).not.toHaveBeenCalled();
      // Default left intact, so the browser can open the href in a new tab.
      expect(notPrevented).toBe(true);
    },
  );
});
