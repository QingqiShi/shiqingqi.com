import { afterEach, describe, expect, it } from "vitest";
import { liftOrigin } from "./lift-origin.ts";

const ROW = { top: 600, left: 16, width: 358, height: 60 };
const TX = "/finance?account=a&tx=1";
const OTHER_TX = "/finance?account=a&tx=2";

function link(href: string, box: Partial<typeof ROW> = {}) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.setAttribute("data-split-view-link", "");
  const { top, left, width, height } = { ...ROW, ...box };
  anchor.getBoundingClientRect = () => new DOMRect(left, top, width, height);
  return anchor;
}

function column(name: string, page: string | null, ...links: HTMLElement[]) {
  const element = document.createElement("div");
  element.setAttribute("data-split-view-column", name);
  if (page === null) {
    element.append(...links);
  } else {
    const pageElement = document.createElement("div");
    pageElement.setAttribute("data-split-view-page", page);
    pageElement.append(...links);
    element.append(pageElement);
  }
  return element;
}

function viewOf(...columns: HTMLElement[]) {
  const view = document.createElement("div");
  view.append(...columns);
  document.body.append(view);
  return view;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("liftOrigin", () => {
  it("gives the pressed link where it opens the URL of the sheet", () => {
    const first = link(TX);
    const pressed = link(TX, { top: 700 });
    const view = viewOf(column("content", "current", first, pressed));
    expect(liftOrigin(view, pressed, TX)).toBe(pressed);
  });

  it("gives the link in the content that opens the URL of the sheet, after the URL changed", () => {
    const row = link(TX);
    const view = viewOf(column("content", "current", link(OTHER_TX), row));
    expect(liftOrigin(view, null, TX)).toBe(row);
  });

  it("compares URLs without their fragment and the order of their params", () => {
    const row = link("/finance?tx=1&account=a#top");
    const view = viewOf(column("content", "current", row));
    expect(liftOrigin(view, null, TX)).toBe(row);
  });

  it("does not take a pressed link that opens another URL", () => {
    const pressed = link(OTHER_TX);
    const row = link(TX);
    const view = viewOf(column("content", "current", pressed, row));
    expect(liftOrigin(view, pressed, TX)).toBe(row);
  });

  it("takes the link in the content where a pressed link is gone", () => {
    const pressed = link(TX);
    const row = link(TX);
    const view = viewOf(column("content", "current", row));
    expect(liftOrigin(view, pressed, TX)).toBe(row);
  });

  it("takes a plain link in the content that opens the URL of the sheet", () => {
    const row = link(TX);
    row.removeAttribute("data-split-view-link");
    const view = viewOf(column("content", "current", row));
    expect(liftOrigin(view, null, TX)).toBe(row);
  });

  it("does not take a link outside the content", () => {
    const view = viewOf(column("sidebar", null, link(TX)));
    expect(liftOrigin(view, null, TX)).toBeNull();
  });

  it("gives null where the link scrolled off the screen", () => {
    const above = viewOf(column("content", "current", link(TX, { top: -80 })));
    expect(liftOrigin(above, null, TX)).toBeNull();
    const below = viewOf(
      column("content", "current", link(TX, { top: window.innerHeight })),
    );
    expect(liftOrigin(below, null, TX)).toBeNull();
  });

  it("takes a link that shows only in part", () => {
    const row = link(TX, { top: -30 });
    const view = viewOf(column("content", "current", row));
    expect(liftOrigin(view, null, TX)).toBe(row);
  });

  it("gives null where the link is on a page that is not the current one", () => {
    const leaving = viewOf(column("content", "leaving", link(TX)));
    expect(liftOrigin(leaving, null, TX)).toBeNull();
    const under = viewOf(column("content", "under", link(TX)));
    expect(liftOrigin(under, null, TX)).toBeNull();
  });

  it("gives null where the link does not render", () => {
    const row = link(TX);
    row.style.display = "none";
    const view = viewOf(column("content", "current", row));
    expect(liftOrigin(view, null, TX)).toBeNull();
  });

  it("gives null where the link is not there, as after a delete", () => {
    const view = viewOf(column("content", "current", link(OTHER_TX)));
    expect(liftOrigin(view, null, TX)).toBeNull();
  });

  it("gives null where the sheet has no URL", () => {
    const row = link(TX);
    const view = viewOf(column("content", "current", row));
    expect(liftOrigin(view, row, null)).toBeNull();
  });
});
