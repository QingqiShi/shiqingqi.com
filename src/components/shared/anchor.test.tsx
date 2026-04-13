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

    const link = screen.getByRole("link", { name: "External" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("merges noopener noreferrer into existing rel for _blank links", () => {
    render(
      <Anchor href="https://example.com" target="_blank" rel="nofollow me">
        External
      </Anchor>,
    );

    const link = screen.getByRole("link", { name: "External" });
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

    const link = screen.getByRole("link", { name: "External" });
    const rel = link.getAttribute("rel");
    if (!rel) throw new Error("expected rel attribute");
    const tokens = rel.split(/\s+/);
    expect(tokens.filter((t) => t === "noopener")).toHaveLength(1);
    expect(tokens.filter((t) => t === "noreferrer")).toHaveLength(1);
  });

  it("does not add rel when target is not _blank", () => {
    render(<Anchor href="/local-page">Local</Anchor>);

    const link = screen.getByRole("link", { name: "Local" });
    expect(link).not.toHaveAttribute("rel");
  });
});
