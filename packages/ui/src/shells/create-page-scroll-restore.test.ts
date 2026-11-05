import { describe, expect, it } from "vitest";
import {
  SCREEN_HEIGHT,
  TALL,
  columnView,
  documentBox,
  dragPage,
  frames,
  hidePage,
  installPageScrollHarness,
  mountShell,
  phoneView,
  scrollAfterReload,
  scrollPage,
  scrollTo,
  startDrag,
  tap,
  traverse,
  visit,
} from "./test-page-scroll.ts";

describe("createPageScroll across views", () => {
  installPageScrollHarness();

  describe("restoring a scroll that the content is still too short for", () => {
    /** Content that lets the page scroll to 300 and no further. */
    const SHORT = 300 + SCREEN_HEIGHT;

    function atReportThenOther() {
      const shell = mountShell(phoneView());
      scrollPage(900);
      const entry: unknown = window.history.state;
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");
      visit("/other");
      shell.setNavigating(false);
      shell.follow("other", "swap");
      frames();
      return { shell, entry };
    }

    function backToShortReport(shell: ReturnType<typeof mountShell>) {
      shell.remember(true);
      traverse(-1);
      documentBox.setHeight(SHORT);
      shell.follow("page", "swap");
    }

    function restoreOnShortReport() {
      const { shell, entry } = atReportThenOther();
      backToShortReport(shell);
      expect(window.scrollY).toBe(300);
      return { shell, entry };
    }

    function savedAfterReload(
      shell: ReturnType<typeof mountShell>,
      entry: unknown,
    ) {
      hidePage();
      shell.destroy();
      return scrollAfterReload(entry);
    }

    it("reaches the scroll on Back as the content grows, and keeps it", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      expect(window.scrollY).toBe(300);

      documentBox.setHeight(500 + SCREEN_HEIGHT);
      frames();
      expect(window.scrollY).toBe(500);

      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("reaches the scroll on Forward as the content grows, and keeps it", () => {
      const { shell } = atReportThenOther();
      scrollPage(500);
      const otherEntry: unknown = window.history.state;
      shell.remember(true);
      traverse(-1);
      shell.follow("page", "swap");
      frames();

      shell.remember(true);
      traverse(1);
      documentBox.setHeight(200 + SCREEN_HEIGHT);
      shell.follow("other", "swap");
      frames();
      expect(window.scrollY).toBe(200);

      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(500);

      hidePage();
      shell.destroy();
      window.history.replaceState(otherEntry, "", "/other");
      documentBox.place(0);
      scrollTo.mockClear();
      mountShell(phoneView()).destroy();
      expect(scrollTo.mock.lastCall?.[0].top).toBe(500);
    });

    it("stops and keeps where the visitor goes when the visitor scrolls", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      dragPage(120);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("stops and keeps where the visitor goes when a scroll comes with no input, as from a scroll bar", () => {
      const first = mountShell(phoneView());
      scrollPage(900);
      const entry: unknown = window.history.state;
      hidePage();
      first.destroy();

      documentBox.place(0);
      documentBox.setHeight(SHORT);
      const shell = mountShell(phoneView());
      frames();
      expect(window.scrollY).toBe(300);

      scrollPage(120);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("does not take the clamp for the visitor's scroll when an input comes before its event", () => {
      const { shell, entry } = restoreOnShortReport();
      startDrag();
      frames();
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("does not take the clamp of content that shrinks and regrows after a tap for the visitor's scroll", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      tap();
      documentBox.setHeight(100 + SCREEN_HEIGHT);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("does not take the clamp of content that shrinks and regrows after a key that does not scroll for the visitor's scroll", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
      documentBox.setHeight(100 + SCREEN_HEIGHT);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("keeps where a key scrolls to while the content grows", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      documentBox.setHeight(TALL);
      scrollPage(120);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("keeps where a finger drags to while the content grows", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(TALL);
      scrollPage(120);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("keeps the scroll while the content never grows enough", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      expect(window.scrollY).toBe(300);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("keeps the scroll when a link is pressed before the content grows", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      tap();
      shell.remember();
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("goes on when the same page swaps its loading content", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      shell.follow("page", "swap");
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("goes on when the content gets shorter first", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      documentBox.setHeight(100 + SCREEN_HEIGHT);
      frames();
      expect(window.scrollY).toBe(100);

      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("goes on when the content gets shorter and then taller before the event of the clamp", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      documentBox.setHeight(100 + SCREEN_HEIGHT);
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(900);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("counts one scroll of the visitor after an input when the content grew first", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();
      startDrag();
      documentBox.setHeight(TALL);
      frames();
      expect(window.scrollY).toBe(300);

      scrollPage(700);
      expect(savedAfterReload(shell, entry)).toBe(700);
    });

    it("keeps where the visitor goes when the content grows and the scroll comes before the resize", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(TALL);
      scrollPage(120);
      frames();
      expect(window.scrollY).toBe(120);
      expect(savedAfterReload(shell, entry)).toBe(120);
    });

    it("keeps where the visitor goes when the visitor scrolls to the end of content that grew before the resize", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(500 + SCREEN_HEIGHT);
      scrollPage(500);
      expect(savedAfterReload(shell, entry)).toBe(500);
    });

    it("does not take the clamp for the visitor's scroll when the content gets shorter after an input", () => {
      const { shell, entry } = restoreOnShortReport();
      frames();

      startDrag();
      documentBox.setHeight(100 + SCREEN_HEIGHT);
      frames();
      expect(window.scrollY).toBe(100);
      expect(savedAfterReload(shell, entry)).toBe(900);
    });

    it("gives a pop in the view the scroll, not the clamp, of a page that left before it grew", () => {
      const { shell } = restoreOnShortReport();
      frames();

      shell.remember();
      shell.follow("detail", "push");
      documentBox.setHeight(TALL);
      frames();

      shell.remember();
      shell.follow("page", "pop");
      expect(window.scrollY).toBe(900);
      shell.destroy();
    });

    it("keeps the scroll of a pop in the view for a reload before the content grows", () => {
      const { shell } = restoreOnShortReport();
      frames();
      shell.remember();
      shell.setNavigating(true);
      shell.follow("detail", "push");
      visit("/detail");
      shell.setNavigating(false);
      frames();

      shell.remember();
      shell.setNavigating(true);
      documentBox.setHeight(SHORT);
      shell.follow("page", "pop");
      visit("/report");
      shell.setNavigating(false);
      hidePage();
      shell.destroy();
      const entry: unknown = window.history.state;
      expect(scrollAfterReload(entry)).toBe(900);
    });

    it("keeps a leaving page at its own scroll while the page that shows grows", () => {
      const view = phoneView(
        '<div data-split-view-page="leaving" data-split-view-page-key="other"><div></div></div>',
      );
      const shell = mountShell(view);
      scrollPage(900);
      shell.remember();
      shell.follow("other", "push");
      visit("/other");
      frames();
      scrollPage(500);
      frames();

      shell.remember(true);
      traverse(-1);
      documentBox.setHeight(SHORT);
      shell.follow("page", "swap");
      frames();
      documentBox.setHeight(TALL);
      frames();

      const leaving = view.querySelector<HTMLElement>(
        '[data-split-view-page="leaving"]',
      );
      expect(window.scrollY).toBe(900);
      expect(leaving?.style.top).toBe("400px");
      shell.destroy();
    });

    it("does the same where the column scrolls", () => {
      const { view, box } = columnView();
      const shell = mountShell(view);
      box.scrollTo(900);
      frames();
      const entry: unknown = window.history.state;
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");
      visit("/other");
      shell.setNavigating(false);
      frames();

      shell.remember(true);
      traverse(-1);
      box.setHeight(SHORT);
      shell.follow("page", "swap");
      frames();
      expect(box.top).toBe(300);

      box.setHeight(TALL);
      frames();
      expect(box.top).toBe(900);

      hidePage();
      shell.destroy();
      window.history.replaceState(entry, "", "/report");
      box.place(0);
      mountShell(view).destroy();
      expect(box.top).toBe(900);
    });
  });
});
