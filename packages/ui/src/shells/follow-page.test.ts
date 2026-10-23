import { describe, expect, it } from "vitest";
import {
  followPage,
  settlePages,
  type SplitViewPage,
  type SplitViewPages,
} from "./follow-page.ts";

function page(key: string, deep: boolean, motion = 0): SplitViewPage<string> {
  return { key, column: key, deep, motion };
}

const household = page("household", false);
const cash = page("cash", true);
const savings = page("savings", true);

function showing(current: SplitViewPage<string>): SplitViewPages<string> {
  return { under: null, current, leaving: null };
}

describe("followPage", () => {
  it("keeps the page it leaves under a page one deeper", () => {
    const { pages, change } = followPage(showing(household), {
      ...cash,
      motion: 1,
    });
    expect(change).toBe("push");
    expect(pages.under?.key).toBe("household");
    expect(pages.current.key).toBe("cash");
    expect(pages.leaving).toBeNull();
  });

  it("shows the page under again on the way back, and lets the deep one leave", () => {
    const pushed = followPage(showing(household), cash).pages;
    const { pages, change } = followPage(pushed, { ...household, motion: 2 });
    expect(change).toBe("pop");
    expect(pages.under).toBeNull();
    expect(pages.current.key).toBe("household");
    expect(pages.leaving).toMatchObject({ key: "cash", motion: 2 });
  });

  it("swaps a page at the same depth, and keeps the page under", () => {
    const pushed = followPage(showing(household), cash).pages;
    const { pages, change } = followPage(pushed, { ...savings, motion: 3 });
    expect(change).toBe("swap");
    expect(pages.under?.key).toBe("household");
    expect(pages.current.key).toBe("savings");
    expect(pages.leaving).toMatchObject({ key: "cash", motion: 3 });
  });

  it("takes back a page that is still leaving when it comes again", () => {
    const pushed = followPage(showing(household), cash).pages;
    const popped = followPage(pushed, { ...household, motion: 2 }).pages;
    const { pages, change } = followPage(popped, { ...cash, motion: 3 });
    expect(change).toBe("push");
    expect(pages.current.key).toBe("cash");
    expect(pages.under?.key).toBe("household");
    expect(pages.leaving).toBeNull();
  });

  it("changes nothing for the page that shows", () => {
    const pages = showing(household);
    expect(followPage(pages, household).change).toBeNull();
  });
});

describe("settlePages", () => {
  it("lets go of a page once the motion it left in has ended", () => {
    const pushed = followPage(showing(household), cash).pages;
    const popped = followPage(pushed, { ...household, motion: 2 }).pages;
    expect(settlePages(popped, 1)).toBe(popped);
    expect(settlePages(popped, 2).leaving).toBeNull();
  });
});
