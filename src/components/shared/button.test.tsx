import userEvent from "@testing-library/user-event";
import { beforeAll, describe, it, expect, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { Button } from "./button";

// Mock Pointer Capture API which is not available in jsdom
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe("Button StyleX Integration", () => {
  it("renders button with StyleX classes applied", () => {
    render(<Button>Test Button</Button>);

    const button = screen.getByRole("button");

    // Verify that StyleX is working by checking that real classes are applied
    expect(button.className).toBeTruthy();
    expect(button.className).toContain("button__styles.button");
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
    expect(brightButton?.className).toContain("bright");
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
    expect(activeButton?.className).toContain("active");
  });
});

describe("Button Interaction", () => {
  it("triggers onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Test</Button>);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick when disabled", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={handleClick} disabled>
        Test
      </Button>,
    );

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("triggers onClick on Enter key", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Test</Button>);

    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("{Enter}");

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick on Enter key when disabled", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={handleClick} disabled>
        Test
      </Button>,
    );

    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("{Enter}");

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders with icon and children", () => {
    render(
      <Button icon={<span data-testid="icon">★</span>}>Button Text</Button>,
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Button Text")).toBeInTheDocument();
  });

  it("applies labelId to children container", () => {
    render(<Button labelId="my-label">Labeled Button</Button>);

    const labelElement = screen.getByText("Labeled Button");
    expect(labelElement).toHaveAttribute("id", "my-label");
  });
});
