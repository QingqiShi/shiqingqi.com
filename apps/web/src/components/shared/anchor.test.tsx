import { describe, it, expect } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { Anchor } from "./anchor";

describe("Anchor", () => {
  it("renders a link with the given href", () => {
    render(<Anchor href="/about">About</Anchor>);

    const link = screen.getByRole("link", { name: "About" });
    expect(link).toHaveAttribute("href", "/about");
  });

  it("adds rel='noopener noreferrer' when target is _blank", () => {
    render(
      <Anchor href="https://example.com" target="_blank">
        External
      </Anchor>,
    );

    const link = screen.getByRole("link", {
      name: "External(opens in new tab)",
    });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("merges noopener noreferrer into existing rel for _blank links", () => {
    render(
      <Anchor href="https://example.com" target="_blank" rel="nofollow me">
        External
      </Anchor>,
    );

    const link = screen.getByRole("link", {
      name: "External(opens in new tab)",
    });
    const rel = link.getAttribute("rel");
    expect(rel).toContain("nofollow");
    expect(rel).toContain("me");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("does not duplicate tokens when rel already includes noopener noreferrer", () => {
    render(
      <Anchor
        href="https://example.com"
        target="_blank"
        rel="nofollow me noopener noreferrer"
      >
        External
      </Anchor>,
    );

    const link = screen.getByRole("link", {
      name: "External(opens in new tab)",
    });
    const rel = link.getAttribute("rel");
    if (!rel) throw new Error("expected rel attribute");
    const tokens = rel.split(/\s+/);
    expect(tokens.filter((token) => token === "noopener")).toHaveLength(1);
    expect(tokens.filter((token) => token === "noreferrer")).toHaveLength(1);
  });

  it("does not add rel when target is not _blank", () => {
    render(<Anchor href="/local-page">Local</Anchor>);

    const link = screen.getByRole("link", { name: "Local" });
    expect(link).not.toHaveAttribute("rel");
  });

  it("announces 'opens in new tab' for _blank links", () => {
    render(
      <Anchor href="https://example.com" target="_blank">
        External
      </Anchor>,
    );

    expect(
      screen.getByRole("link", { name: "External(opens in new tab)" }),
    ).toBeInTheDocument();
  });

  it("does not render the external indicator for internal links", () => {
    render(<Anchor href="/local">Local</Anchor>);

    const link = screen.getByRole("link", { name: "Local" });
    expect(link).toHaveAccessibleName("Local");
  });

  it("suppresses the external indicator when indicateExternal is false", () => {
    render(
      <Anchor
        href="https://example.com"
        target="_blank"
        indicateExternal={false}
      >
        External
      </Anchor>,
    );

    const link = screen.getByRole("link", { name: "External" });
    expect(link).toHaveAccessibleName("External");
  });
});
