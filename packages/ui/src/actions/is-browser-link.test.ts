import { describe, expect, it } from "vitest";
import { isBrowserLink } from "./is-browser-link.ts";

describe("isBrowserLink", () => {
  it("keeps a page of the app on the router", () => {
    expect(isBrowserLink({ href: "/settings/mailboxes" })).toBe(false);
    expect(isBrowserLink({ href: "/zh/reports?week=1" })).toBe(false);
    expect(isBrowserLink({ href: "/apiary" })).toBe(false);
  });

  it("gives an OAuth entry to the browser, so that a fetch cannot start it", () => {
    expect(isBrowserLink({ href: "/api/connect/google/start?locale=en" })).toBe(
      true,
    );
  });

  it("gives a link that leaves the page's history to the browser", () => {
    expect(isBrowserLink({ href: "https://mail.google.com/" })).toBe(true);
    expect(isBrowserLink({ href: "message://abc" })).toBe(true);
    expect(isBrowserLink({ href: "#content" })).toBe(true);
    expect(isBrowserLink({ href: "/a", target: "_blank" })).toBe(true);
    expect(isBrowserLink({ href: "/a.pdf", download: true })).toBe(true);
  });
});
