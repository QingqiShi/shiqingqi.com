import { describe, expect, it, vi } from "vitest";
import {
  documentBox,
  dragPage,
  hidePage,
  installPageScrollHarness,
  mountShell,
  mountSkeleton,
  phoneView,
  scrollAfterReload,
  scrollPage,
  scrollTo,
  tap,
  traverse,
  visit,
  columnView,
  frames,
} from "./test-page-scroll.ts";

describe("createPageScroll across views", () => {
  installPageScrollHarness();

  it("takes the page back to where it was when Back mounts a new view at the entry", () => {
    const view = phoneView();
    const left = mountShell(view);
    scrollPage(900);

    visit("/settings");
    left.destroy();
    documentBox.place(0);
    const settings = mountShell(view);
    expect(scrollTo).not.toHaveBeenCalled();

    settings.destroy();
    traverse(-1);
    const back = mountShell(view);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 900,
      behavior: "instant",
    });
    back.destroy();
  });

  it("keeps the scroll of the entry while a navigation that starts shows another page", () => {
    const view = phoneView();
    const left = mountShell(view);
    scrollPage(900);

    left.remember();
    left.follow("other", "push");
    scrollPage(120);
    visit("/other");
    left.destroy();

    traverse(-1);
    scrollTo.mockClear();
    const back = mountShell(view);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 900,
      behavior: "instant",
    });
    back.destroy();
  });

  it.each([
    { order: "the screen goes first", screenFirst: true },
    { order: "the skeleton goes first", screenFirst: false },
  ])(
    "takes Back to the scroll of the screen, not of the skeleton of a slow tab switch, when $order",
    ({ screenFirst }) => {
      const screen = mountShell(phoneView());
      scrollPage(900);
      screen.hold();

      const skeleton = mountSkeleton(phoneView());
      skeleton.hold();
      scrollPage(375);
      skeleton.hold();

      visit("/settings");
      for (const going of screenFirst
        ? [screen, skeleton]
        : [skeleton, screen]) {
        going.destroy();
      }

      traverse(-1);
      scrollTo.mockClear();
      const back = mountShell(phoneView());
      expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
        top: 900,
        behavior: "instant",
      });
      back.destroy();
    },
  );

  it("starts a pushed page at the top when a loading fallback hears the clamp of the scroll", () => {
    const screen = mountShell(phoneView());
    scrollPage(900);
    screen.hold();
    visit("/settings");
    screen.destroy();

    const fallback = mountShell(phoneView());
    scrollPage(375);
    fallback.destroy();

    scrollTo.mockClear();
    const settings = mountShell(phoneView());
    expect(scrollTo).not.toHaveBeenCalled();
    settings.destroy();
  });

  it("does not move the skeleton of a slow tab switch to the scroll of the entry that the screen leaves", () => {
    const first = mountShell(phoneView());
    scrollPage(900);
    visit("/settings");
    first.destroy();

    traverse(-1);
    const screen = mountShell(phoneView());
    scrollPage(100);
    screen.hold();

    scrollTo.mockClear();
    const skeleton = mountSkeleton(phoneView());
    expect(scrollTo).not.toHaveBeenCalled();
    skeleton.destroy();
    screen.destroy();
  });

  describe("across a navigation of a view that stays mounted", () => {
    function atReport() {
      const shell = mountShell(phoneView());
      scrollPage(900);
      const entry: unknown = window.history.state;
      return { shell, entry };
    }

    function navigateAway(shell: ReturnType<typeof mountShell>) {
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");
      scrollPage(0);
      visit("/other");
      shell.setNavigating(false);
      shell.follow("other", "swap");
    }

    it("keeps each scroll at an entry that Back shows again", () => {
      const { shell, entry } = atReport();
      navigateAway(shell);

      shell.remember(true);
      traverse(-1);
      shell.follow("page", "pop");
      expect(window.scrollY).toBe(900);

      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    describe("while the old page stays on the screen after Back", () => {
      function backThatTheRouterHolds(shell: ReturnType<typeof mountShell>) {
        navigateAway(shell);
        shell.remember(true);
        traverse(-1);
        vi.advanceTimersByTime(1100);
        scrollPage(150);
      }

      it("does not keep a scroll of the old page for the entry that Back shows", () => {
        const { shell, entry } = atReport();
        backThatTheRouterHolds(shell);

        shell.follow("page", "pop");
        expect(window.scrollY).toBe(900);

        hidePage();
        shell.destroy();
        expect(scrollAfterReload(entry)).toBe(900);
      });

      it("takes a view that replaces the old one to the scroll of the entry", () => {
        const { shell } = atReport();
        backThatTheRouterHolds(shell);
        shell.destroy();

        scrollTo.mockClear();
        mountShell(phoneView());
        expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
          top: 900,
          behavior: "instant",
        });
      });

      it("does the same where the column scrolls", () => {
        const { view, box } = columnView();
        const shell = mountShell(view);
        box.scrollTo(900);
        frames();
        shell.remember();
        shell.setNavigating(true);
        shell.follow("other", "push");
        visit("/other");
        shell.setNavigating(false);
        frames();

        shell.remember(true);
        traverse(-1);
        box.scrollTo(150);
        frames();
        shell.follow("page", "pop");
        expect(box.top).toBe(900);
      });

      it.each([
        { motion: "no motion", hasMotion: false },
        { motion: "a motion of the same page", hasMotion: true },
      ])(
        "keeps each scroll for a reload when the step stays at the same page, with $motion",
        ({ hasMotion }) => {
          const { shell, entry } = atReport();
          navigateAway(shell);
          shell.remember(true);
          traverse(-1);
          vi.advanceTimersByTime(1100);

          scrollPage(1400);
          if (hasMotion) shell.follow("other", null);
          hidePage();
          shell.destroy();
          expect(scrollAfterReload(entry)).toBe(1400);
        },
      );

      it("keeps each scroll for the next steps when the step stays at the same page", () => {
        const { shell } = atReport();
        navigateAway(shell);
        shell.remember(true);
        traverse(-1);
        vi.advanceTimersByTime(1100);
        scrollPage(1400);

        shell.remember(true);
        traverse(1);
        shell.follow("detail", "swap");
        shell.remember(true);
        traverse(-1);
        shell.follow("page", "swap");
        expect(window.scrollY).toBe(1400);
      });
    });

    it("takes the page back to its scroll when the navigation is cancelled, and keeps later scrolls", () => {
      const { shell, entry } = atReport();
      shell.remember();
      shell.setNavigating(true);
      scrollPage(375);

      shell.setNavigating(false);
      expect(window.scrollY).toBe(900);

      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    it("gives the entry back after a click that starts no navigation", () => {
      const { shell, entry } = atReport();
      shell.remember();
      scrollPage(375);
      vi.advanceTimersByTime(1100);

      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    it("keeps the scroll of the first navigation when a second one starts during it", () => {
      const { shell, entry } = atReport();
      shell.remember();
      shell.setNavigating(true);
      shell.follow("other", "push");

      shell.remember();
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(900);
    });

    it("gives the entry back when a step of the browser ends a pending navigation", () => {
      const { shell, entry } = atReport();
      shell.remember();
      shell.setNavigating(true);

      shell.remember(true);
      vi.advanceTimersByTime(1100);
      scrollPage(1400);
      shell.setNavigating(false);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });

    it("gives the entry back when the page comes back from the back/forward cache", () => {
      const { shell, entry } = atReport();
      shell.remember();
      hidePage();

      window.dispatchEvent(
        Object.assign(new Event("pageshow"), { persisted: true }),
      );
      scrollPage(1400);
      hidePage();
      shell.destroy();
      expect(scrollAfterReload(entry)).toBe(1400);
    });
  });

  it("counts a scroll after the clamp of an arrival only once the visitor scrolls", () => {
    documentBox.place(375);
    const fallback = mountShell(phoneView());
    tap();
    scrollPage(400);
    hidePage();
    expect(sessionStorage).toHaveLength(0);

    dragPage(500);
    const entry: unknown = window.history.state;
    hidePage();
    fallback.destroy();
    expect(scrollAfterReload(entry)).toBe(500);
  });
});
