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

describe("Button aria-pressed from isActive", () => {
  it("emits aria-pressed='true' when isActive is true", () => {
    render(<Button isActive>Active</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("emits aria-pressed='false' when isActive is false", () => {
    render(<Button isActive={false}>Inactive</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("omits aria-pressed when isActive is not supplied", () => {
    render(<Button>Plain</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("lets the caller override aria-pressed explicitly", () => {
    render(
      <Button isActive aria-pressed={false}>
        Overridden
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Button variant='primary' visual-only prop", () => {
  it("omits aria-pressed when variant is primary (not a toggle)", () => {
    render(<Button variant="primary">Play trailer</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("applies the same active highlight class as isActive", () => {
    const { container: activeContainer } = render(
      <Button isActive>Active</Button>,
    );
    const { container: primaryContainer } = render(
      <Button variant="primary">Primary</Button>,
    );

    const activeButton = activeContainer.querySelector("button");
    const primaryButton = primaryContainer.querySelector("button");

    expect(activeButton?.className).toContain("active");
    expect(primaryButton?.className).toContain("active");
  });
});

describe("Button type attribute", () => {
  it('defaults to type="button" to prevent accidental form submission', () => {
    render(<Button>Click</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
  });

  it("allows overriding the type to submit", () => {
    render(<Button type="submit">Submit</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("allows overriding the type to reset", () => {
    render(<Button type="reset">Reset</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "reset");
  });
});
