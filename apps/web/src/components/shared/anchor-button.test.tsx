import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
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
