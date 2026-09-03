import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar.tsx";

describe("Avatar naming", () => {
  it("announces as a single image named by the person", () => {
    render(<Avatar name="Qingqi Shi" />);

    expect(screen.getByRole("img", { name: "Qingqi Shi" })).toBeInTheDocument();
  });

  it("derives a monogram from the first and last words", () => {
    render(<Avatar name="Qingqi Shi" />);

    expect(screen.getByRole("img")).toHaveTextContent("QS");
  });

  it("takes one character from a single-word name", () => {
    render(<Avatar name="石头" />);

    expect(screen.getByRole("img")).toHaveTextContent("石");
  });

  it("takes the first and last of a three-word name", () => {
    render(<Avatar name="Ada Byron Lovelace" />);

    expect(screen.getByRole("img")).toHaveTextContent("AL");
  });

  it("renders nothing for an empty name", () => {
    render(<Avatar name="   " data-testid="avatar" />);

    expect(screen.getByTestId("avatar")).toHaveTextContent("");
  });

  it("prefers an explicit initials override", () => {
    render(<Avatar name="Qingqi Shi" initials="Q" />);

    expect(screen.getByRole("img", { name: "Qingqi Shi" })).toHaveTextContent(
      "Q",
    );
  });

  it("falls back to the monogram when initials is an empty string", () => {
    // A record carrying `initials: ""` has no override to honour; a blank
    // medallion is worse than the derivation.
    render(<Avatar name="Qingqi Shi" initials="" />);

    expect(screen.getByRole("img", { name: "Qingqi Shi" })).toHaveTextContent(
      "QS",
    );
  });

  it("is not an image when there is nothing to announce", () => {
    render(<Avatar name="   " data-testid="avatar" />);

    // An unnamed role="img" is a WCAG 1.1.1 failure; without a name this is
    // decoration, so the role comes off entirely.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("avatar")).not.toHaveAttribute("aria-label");
  });
});

describe("Avatar image", () => {
  it("renders a decorative portrait", () => {
    render(<Avatar name="Qingqi Shi" src="/portrait.jpg" />);

    const avatar = screen.getByRole("img", { name: "Qingqi Shi" });
    // The portrait itself is decorative — one accessible name, not two.
    expect(avatar.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("keeps the monogram underneath as the load-failure fallback", () => {
    render(<Avatar name="Qingqi Shi" src="/missing.jpg" />);

    // The portrait is layered over the monogram rather than replacing it, so a
    // src that 404s reveals the monogram with no client-side error handling.
    expect(screen.getByRole("img", { name: "Qingqi Shi" })).toHaveTextContent(
      "QS",
    );
  });
});

describe("Avatar badge", () => {
  it("renders the badge outside the accessibility tree", () => {
    render(
      <Avatar
        name="Ed"
        badge={<span data-testid="badge">→</span>}
        badgeLabel="arriving"
      />,
    );

    expect(screen.getByTestId("badge").parentElement).toHaveAttribute(
      "aria-hidden",
    );
  });

  it("appends the badge label to the accessible name", () => {
    render(<Avatar name="Ed" badge={<span>→</span>} badgeLabel="arriving" />);

    expect(
      screen.getByRole("img", { name: "Ed arriving" }),
    ).toBeInTheDocument();
  });

  it("keeps the badge label out of the monogram", () => {
    render(
      <Avatar
        name="Ada Lovelace"
        badge={<span>→</span>}
        badgeLabel="departing"
      />,
    );

    // Deriving from the full announced string would read "Ad" — the label must
    // not reach the monogram.
    expect(screen.getByRole("img")).toHaveTextContent("AL");
  });

  it("renders no badge slot when none is passed", () => {
    render(<Avatar name="Qingqi Shi" data-testid="avatar" />);

    expect(screen.getByTestId("avatar").children).toHaveLength(1);
  });

  it("treats a conditional badge that resolved to false as absent", () => {
    function Person({ isVerified }: { isVerified: boolean }) {
      return (
        <Avatar
          name="Ada Lovelace"
          badge={isVerified && <span>✓</span>}
          badgeLabel="verified"
          data-testid="avatar"
        />
      );
    }
    render(<Person isVerified={false} />);

    // `badge={cond && <Icon />}` is the idiomatic spelling and yields `false`.
    // Rendering it would paint an empty circle, and appending the label would
    // announce every unverified person as verified.
    expect(screen.getByTestId("avatar").children).toHaveLength(1);
    expect(
      screen.getByRole("img", { name: "Ada Lovelace" }),
    ).toBeInTheDocument();
  });
});

describe("Avatar styling", () => {
  it("applies the requested size and variant", () => {
    render(
      <Avatar
        name="Qingqi Shi"
        size="lg"
        variant="solid"
        data-testid="avatar"
      />,
    );

    const avatar = screen.getByTestId("avatar");
    expect(avatar.className).toContain("sizeStyles.lg");
    expect(avatar.firstElementChild?.className).toContain(
      "variantStyles.solid",
    );
  });

  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Avatar name="Qingqi Shi" css={overrides.box} data-testid="avatar" />,
    );

    expect(screen.getByTestId("avatar").className).toContain("overrides.box");
  });
});
