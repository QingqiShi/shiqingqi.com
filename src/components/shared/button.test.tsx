import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { Button } from "./button";

describe("Button Tailwind Integration", () => {
  it("renders button with Tailwind classes applied", () => {
    render(<Button>Test Button</Button>);

    const button = screen.getByRole("button");

    // Verify that Tailwind classes are applied
    expect(button.className).toBeTruthy();
    expect(button.className).toContain("inline-flex");
    expect(button.className).toContain("rounded-full");
  });

  it("applies different classes for bright variant", () => {
    const { container: normalContainer } = render(<Button>Normal</Button>);
    const { container: brightContainer } = render(
      <Button bright>Bright</Button>,
    );

    const normalButton = normalContainer.querySelector("button");
    const brightButton = brightContainer.querySelector("button");

    // Different variants should have different class names
    expect(normalButton?.className).not.toBe(brightButton?.className);
    expect(brightButton?.className).toContain("bg-white");
  });

  it("applies different classes for active state", () => {
    const { container: normalContainer } = render(<Button>Normal</Button>);
    const { container: activeContainer } = render(
      <Button isActive>Active</Button>,
    );

    const normalButton = normalContainer.querySelector("button");
    const activeButton = activeContainer.querySelector("button");

    // Active state should have different class names
    expect(normalButton?.className).not.toBe(activeButton?.className);
    expect(activeButton?.className).toContain("bg-purple-9");
  });
});
