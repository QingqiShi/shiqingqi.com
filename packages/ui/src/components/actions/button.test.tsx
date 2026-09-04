import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Spinner } from "../feedback/spinner.tsx";
import { Button } from "./button.tsx";

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

describe("Button size", () => {
  it("applies distinct classes per size", () => {
    const { container: sm } = render(<Button size="sm">A</Button>);
    const { container: lg } = render(<Button size="lg">B</Button>);

    const smButton = sm.querySelector("button");
    const lgButton = lg.querySelector("button");

    expect(smButton?.className).not.toBe(lgButton?.className);
    expect(smButton?.className).toContain("sizeStyles.sm");
    expect(lgButton?.className).toContain("sizeStyles.lg");
  });

  it("defaults to the md size when size is omitted", () => {
    const { container: implicit } = render(<Button>Implicit</Button>);
    const { container: explicit } = render(<Button size="md">Explicit</Button>);

    const implicitButton = implicit.querySelector("button");
    const explicitButton = explicit.querySelector("button");

    expect(implicitButton?.className).toContain("sizeStyles.md");
    expect(implicitButton?.className).toBe(explicitButton?.className);
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

describe("Button accessible name", () => {
  it("marks the icon wrapper as decorative (aria-hidden)", () => {
    render(<Button icon={<span data-testid="icon">★</span>}>Save</Button>);

    const iconWrapper = screen.getByTestId("icon").parentElement;
    expect(iconWrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("takes an icon-only button's name from aria-label, not the icon", () => {
    render(<Button icon={<span>★</span>} aria-label="Favorite" />);

    // The accessible name resolves to the label, not the decorative icon.
    expect(
      screen.getByRole("button", { name: "Favorite" }),
    ).toBeInTheDocument();
  });

  it("supports aria-labelledby for an icon-only button", () => {
    render(
      <>
        <span id="fav-label">Favorite</span>
        <Button icon={<span>★</span>} aria-labelledby="fav-label" />
      </>,
    );

    expect(
      screen.getByRole("button", { name: "Favorite" }),
    ).toBeInTheDocument();
  });
});

describe("Button icon-only layout", () => {
  it("composes iconOnly for an icon-only button, not hasIcon", () => {
    render(<Button icon={<span>★</span>} aria-label="Favorite" />);

    const className = screen.getByRole("button").className;
    expect(className).toContain("sharedStyles.iconOnly");
    expect(className).not.toContain("sharedStyles.hasIcon");
  });

  it("composes hasIcon for icon plus children without hideLabelOnMobile", () => {
    render(<Button icon={<span>★</span>}>Save</Button>);

    const className = screen.getByRole("button").className;
    expect(className).toContain("sharedStyles.hasIcon");
    expect(className).not.toContain("sharedStyles.iconOnly");
  });

  it("composes iconOnlyBelowMd instead of hasIcon when hideLabelOnMobile pairs with icon and children", () => {
    render(
      <Button icon={<span>★</span>} hideLabelOnMobile>
        Save
      </Button>,
    );

    const className = screen.getByRole("button").className;
    expect(className).toContain("sharedStyles.iconOnlyBelowMd");
    expect(className).not.toContain("sharedStyles.hasIcon");
  });

  it("renders no icon wrapper when the icon prop resolves to a falsy value", () => {
    function Save({ count }: { count: number }) {
      return (
        <Button icon={count && <span data-testid="icon">★</span>}>Save</Button>
      );
    }
    render(<Save count={0} />);

    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    const className = screen.getByRole("button").className;
    expect(className).not.toContain("sharedStyles.iconOnly");
    expect(className).not.toContain("sharedStyles.hasIcon");
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

describe("Button variants", () => {
  it("paints the shared active highlight for the primary variant", () => {
    render(<Button variant="primary">Save</Button>);

    expect(screen.getByRole("button").className).toContain(
      "sharedStyles.active",
    );
  });

  it.each(["outline", "ghost", "danger"] as const)(
    "applies the %s skin",
    (variant) => {
      render(<Button variant={variant}>Save</Button>);

      expect(screen.getByRole("button").className).toContain(
        `variantStyles.${variant}`,
      );
    },
  );

  it("leaves the default button unskinned", () => {
    render(<Button>Save</Button>);

    const className = screen.getByRole("button").className;
    expect(className).not.toContain("variantStyles.");
    expect(className).not.toContain("sharedStyles.active");
  });

  it("does not emit aria-pressed for a non-toggle variant", () => {
    render(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("lets an active toggle keep the highlight over its variant skin", () => {
    render(
      <Button variant="outline" isActive>
        Filter
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.className).toContain("sharedStyles.active");
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

  it("still disables natively when disabled outright", () => {
    render(
      <Button disabled loading>
        Save
      </Button>,
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("keeps a caller's own aria-busy when not loading", () => {
    render(
      <Button aria-busy icon={<Spinner size="sm" aria-hidden />}>
        Saving
      </Button>,
    );

    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("omits aria-busy when idle", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });

  it("keeps the label so the button does not resize mid-submit", () => {
    render(<Button loading>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("swaps a decorative spinner in for the icon", () => {
    render(
      <Button loading icon={<span data-testid="icon" />}>
        Save
      </Button>,
    );

    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
  });

  it("sizes the spinner to the icon box it replaces", () => {
    render(
      <Button loading icon={<span data-testid="icon" />}>
        Save
      </Button>,
    );

    // `size="inline"` is the 1em step. A rem-based step would be a different
    // width from the icon it stands in for, so the button would resize the
    // moment it went busy — the one thing the prop promises not to do. Asserted
    // on the class because jsdom computes no layout.
    const spinner =
      screen.getByRole("button").firstElementChild?.firstElementChild;
    expect(spinner?.className).toContain("sizeStyles.inline");
  });

  it("adds no icon slot to an icon-less button", () => {
    const { rerender } = render(<Button>Save</Button>);
    const idleChildren = screen.getByRole("button").children.length;

    rerender(<Button loading>Save</Button>);

    // With no icon there is no icon box to borrow, and inserting one would
    // widen the button by that box plus its gap. The spinner is laid over the
    // label instead, and the label keeps reserving its width.
    const button = screen.getByRole("button");
    expect(button.firstElementChild?.className).toContain(
      "sharedStyles.childrenContainer",
    );
    expect(button.firstElementChild?.className).toContain("styles.labelHidden");
    expect(button.lastElementChild?.className).toContain(
      "styles.spinnerOverlay",
    );
    expect(button.children.length).toBe(idleChildren + 1);
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("keeps a busy button out of reach of pointer events", () => {
    render(<Button loading>Save</Button>);

    // Standing in for what the native `disabled` attribute did to the pointer:
    // no hover lift on a control that can't be used, and no mousedown,
    // dblclick or pointerdown reaching a caller's handler.
    expect(screen.getByRole("button").className).toContain("styles.busy");
  });

  it("keeps the danger fill when a danger button is active", () => {
    render(
      <Button variant="danger" isActive>
        Delete
      </Button>,
    );

    // `sharedStyles.active` paints a literal accent background that would win
    // over the danger variant's token, so the destructive button would stop
    // reading as destructive exactly when it is armed.
    const button = screen.getByRole("button");
    expect(button.className).toContain("variantStyles.danger");
    expect(button.className).not.toContain("sharedStyles.active");
    expect(button).toHaveAttribute("aria-pressed", "true");
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
