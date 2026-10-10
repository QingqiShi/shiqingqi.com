import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFreshPrefetch } from "./use-fresh-prefetch.ts";

function Probe({ name }: { name: string }) {
  return <output aria-label={name}>{String(useFreshPrefetch())}</output>;
}

function prefetchOf(name: string) {
  return screen.getByRole("status", { name }).textContent;
}

describe("useFreshPrefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("turns prefetch off for one frame each minute and when the app comes into view or online", () => {
    render(
      <>
        <Probe name="nav" />
        <Probe name="row" />
      </>,
    );
    expect(prefetchOf("nav")).toBe("true");

    for (const trigger of [
      () => {
        vi.advanceTimersByTime(60_000);
      },
      () => {
        document.dispatchEvent(new Event("visibilitychange"));
      },
      () => {
        window.dispatchEvent(new Event("online"));
      },
    ]) {
      act(trigger);
      expect(prefetchOf("nav")).toBe("false");
      expect(prefetchOf("row")).toBe("false");
      act(() => {
        vi.advanceTimersToNextFrame();
      });
      expect(prefetchOf("nav")).toBe("true");
      expect(prefetchOf("row")).toBe("true");
    }
  });

  it("leaves prefetch on while the app is hidden", () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    render(<Probe name="nav" />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(prefetchOf("nav")).toBe("true");
  });
});
