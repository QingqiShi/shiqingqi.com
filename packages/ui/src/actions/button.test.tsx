import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button.tsx";
import { LinkProvider, type LinkSlotProps } from "./link-provider.tsx";

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

describe("Button with an href", () => {
  function ProvidedLink(props: LinkSlotProps) {
    return <a {...props} data-link="provided" />;
  }

  function OwnLink(props: LinkSlotProps) {
    return <a {...props} data-link="own" />;
  }

  it("renders a plain link without a provider", () => {
    render(<Button href="/settings">Settings</Button>);

    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("href", "/settings");
    expect(link).not.toHaveAttribute("data-link");
    expect(link).not.toHaveAttribute("type");
  });

  it("takes the link of the provider", () => {
    render(
      <LinkProvider linkComponent={ProvidedLink}>
        <Button href="/settings">Settings</Button>
      </LinkProvider>,
    );

    expect(screen.getByRole("link")).toHaveAttribute("data-link", "provided");
  });

  it("prefers its own linkComponent to the provider", () => {
    render(
      <LinkProvider linkComponent={ProvidedLink}>
        <Button href="/settings" linkComponent={OwnLink}>
          Settings
        </Button>
      </LinkProvider>,
    );

    expect(screen.getByRole("link")).toHaveAttribute("data-link", "own");
  });

  it("keeps a click handler working through the link", async () => {
    const handleClick = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    const user = userEvent.setup();
    render(
      <Button href="/settings" onClick={handleClick}>
        Settings
      </Button>,
    );

    await user.click(screen.getByRole("link"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button isActive ARIA", () => {
  it("presses a button and marks nothing as current", () => {
    render(<Button isActive>Filter</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).not.toHaveAttribute("aria-current");
  });

  it("marks a link as current and never presses it", () => {
    render(
      <Button href="/films" isActive>
        Films
      </Button>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-current", "true");
    expect(link).not.toHaveAttribute("aria-pressed");
  });

  it("lets the caller's aria-current win on a link", () => {
    render(
      <Button href="/films" isActive aria-current="page">
        Films
      </Button>,
    );

    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });
});
