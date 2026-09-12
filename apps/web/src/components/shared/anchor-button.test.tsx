import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { AnchorButton } from "./anchor-button";

describe("AnchorButton bound to next/link", () => {
  it("renders the destination as a link", () => {
    render(<AnchorButton href="/en/movie-database">Browse</AnchorButton>);

    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "href",
      "/en/movie-database",
    );
  });

  // The Slot's whole look travels as `className` and `style`, so a binding that
  // drops either renders an unstyled link.
  it("forwards the compiled styles onto the router link", () => {
    render(<AnchorButton href="/en">Home</AnchorButton>);

    expect(screen.getByRole("link").className).toContain("sharedStyles.base");
  });
});
