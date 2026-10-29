import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Anchor } from "./anchor.tsx";

describe("Anchor", () => {
  it("adds rel='noopener noreferrer' when target is _blank", () => {
    render(
      <Anchor
        href="https://example.com"
        target="_blank"
        newTabLabel="(opens in new tab)"
      >
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
      <Anchor
        href="https://example.com"
        target="_blank"
        rel="nofollow me"
        newTabLabel="(opens in new tab)"
      >
        External
      </Anchor>,
    );

    const link = screen.getByRole("link", {
      name: "External(opens in new tab)",
    });
    const rel = link.getAttribute("rel");
    expect(rel).toContain("nofollow");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });
});
