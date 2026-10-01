import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnchorButton, type AnchorButtonLinkProps } from "./anchor-button.tsx";
import { Button } from "./button.tsx";

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

  it("emits no aria-pressed — a destination is not a toggle", () => {
    render(
      <AnchorButton href="/a" isActive>
        Current
      </AnchorButton>,
    );
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-pressed");
  });
});

describe("AnchorButton link Slot", () => {
  it("renders a plain anchor by default", () => {
    render(<AnchorButton href="/a">Home</AnchorButton>);

    const link = screen.getByRole("link", { name: "Home" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/a");
  });

  it("hands the Slot the href, the styles, the ref and the press handlers", () => {
    const received: AnchorButtonLinkProps[] = [];
    function RouterLink(props: AnchorButtonLinkProps) {
      received.push(props);
      return <a {...props} />;
    }
    const ref = vi.fn();

    render(
      <AnchorButton href="/a" linkComponent={RouterLink} ref={ref}>
        Home
      </AnchorButton>,
    );

    const props = received[0];
    expect(props.href).toBe("/a");
    expect(props.className).toBeTruthy();
    expect(props.ref).toBeTypeOf("function");
    expect(props.onPointerDown).toBeTypeOf("function");
    expect(props.onClick).toBeTypeOf("function");
    // The Slot forwarded the ref it was handed, so the caller's own ref is
    // attached to the element the press animation measures.
    expect(ref).toHaveBeenCalledWith(screen.getByRole("link"));
  });

  it("passes anchor attributes through to the Slot", () => {
    render(
      <AnchorButton href="https://example.com" target="_blank" rel="noopener">
        External
      </AnchorButton>,
    );

    const link = screen.getByRole("link", { name: "External" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });
});

describe("AnchorButton accessible name", () => {
  it("marks the icon wrapper as decorative (aria-hidden)", () => {
    render(
      <AnchorButton href="/a" icon={<span data-testid="icon">★</span>}>
        Save
      </AnchorButton>,
    );

    expect(screen.getByTestId("icon").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("takes an icon-only link's name from aria-label, not the icon", () => {
    render(
      <AnchorButton href="/a" icon={<span>★</span>} aria-label="Favorite" />,
    );

    expect(screen.getByRole("link", { name: "Favorite" })).toBeInTheDocument();
  });

  it("supports aria-labelledby for an icon-only link", () => {
    render(
      <>
        <span id="fav-label">Favorite</span>
        <AnchorButton
          href="/a"
          icon={<span>★</span>}
          aria-labelledby="fav-label"
        />
      </>,
    );

    expect(screen.getByRole("link", { name: "Favorite" })).toBeInTheDocument();
  });

  it("applies labelId to the label span", () => {
    render(
      <AnchorButton href="/a" labelId="my-label">
        Labelled
      </AnchorButton>,
    );

    expect(screen.getByText("Labelled")).toHaveAttribute("id", "my-label");
  });
});

describe("AnchorButton icon-only layout", () => {
  it("composes iconOnly for an icon-only link, not hasIcon", () => {
    render(
      <AnchorButton href="/a" icon={<span>★</span>} aria-label="Favorite" />,
    );

    const className = screen.getByRole("link").className;
    expect(className).toContain("sharedStyles.iconOnly");
    expect(className).not.toContain("sharedStyles.hasIcon");
  });

  it("composes hasIcon for icon plus children without hideLabelOnMobile", () => {
    render(
      <AnchorButton href="/a" icon={<span>★</span>}>
        Save
      </AnchorButton>,
    );

    const className = screen.getByRole("link").className;
    expect(className).toContain("sharedStyles.hasIcon");
    expect(className).not.toContain("sharedStyles.iconOnly");
  });

  it("composes iconOnlyBelowMd instead of hasIcon when hideLabelOnMobile pairs with icon and children", () => {
    render(
      <AnchorButton href="/a" icon={<span>★</span>} hideLabelOnMobile>
        Save
      </AnchorButton>,
    );

    const className = screen.getByRole("link").className;
    expect(className).toContain("sharedStyles.iconOnlyBelowMd");
    expect(className).not.toContain("sharedStyles.hasIcon");
  });
});

describe("AnchorButton looks", () => {
  it("paints the shared active highlight for the primary look", () => {
    render(
      <AnchorButton href="/a" look="primary">
        Save
      </AnchorButton>,
    );

    expect(screen.getByRole("link").className).toContain("sharedStyles.active");
  });

  it.each(["outline", "ghost", "danger"] as const)(
    "applies the %s skin",
    (look) => {
      render(
        <AnchorButton href="/a" look={look}>
          Save
        </AnchorButton>,
      );

      expect(screen.getByRole("link").className).toContain(
        `lookStyles.${look}`,
      );
    },
  );

  it("leaves the default link unskinned", () => {
    render(<AnchorButton href="/a">Save</AnchorButton>);

    const className = screen.getByRole("link").className;
    expect(className).not.toContain("lookStyles.");
    expect(className).not.toContain("sharedStyles.active");
  });

  it("applies the bright surface", () => {
    render(
      <AnchorButton href="/a" bright>
        Bright
      </AnchorButton>,
    );

    expect(screen.getByRole("link").className).toContain("sharedStyles.bright");
  });
});

// The reason the component lives in the package at all: a link drawn as a
// button has to be the same height as the button beside it, at every size.
describe("AnchorButton and Button share one size scale", () => {
  it.each(["sm", "md", "lg"] as const)(
    "emits the same size class at %s",
    (size) => {
      const { container: link } = render(
        <AnchorButton href="/a" size={size}>
          Label
        </AnchorButton>,
      );
      const { container: button } = render(<Button size={size}>Label</Button>);

      const sizeClass = (element: Element | null) =>
        (element?.className ?? "")
          .split(" ")
          .filter((name) => name.includes("sizeStyles."));

      const linkSize = sizeClass(link.querySelector("a"));
      const buttonSize = sizeClass(button.querySelector("button"));

      expect(linkSize[0]).toContain(`sizeStyles.${size}`);
      expect(linkSize).toEqual(buttonSize);
    },
  );

  it("defaults to the md size when size is omitted", () => {
    render(<AnchorButton href="/a">Implicit</AnchorButton>);

    expect(screen.getByRole("link").className).toContain("sizeStyles.md");
  });

  it("shares the base that carries the height guarantee", () => {
    const { container: link } = render(
      <AnchorButton href="/a">Label</AnchorButton>,
    );
    const { container: button } = render(<Button>Label</Button>);

    expect(link.querySelector("a")?.className).toContain("sharedStyles.base");
    expect(button.querySelector("button")?.className).toContain(
      "sharedStyles.base",
    );
  });
});
