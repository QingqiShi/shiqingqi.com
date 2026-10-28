import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button.tsx";

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
});

describe("Button type attribute", () => {
  it('defaults to type="button" to prevent accidental form submission', () => {
    render(<Button>Click</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
  });
});

describe("Button loading state", () => {
  it("announces busy and blocks activation without losing focus", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    // `aria-disabled`, not the native attribute: a natively disabled button
    // drops out of the tab order, throwing focus to the document body just as
    // the busy state is announced.
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();

    button.focus();
    expect(button).toHaveFocus();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not fire onClick while loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    await user.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });
});
