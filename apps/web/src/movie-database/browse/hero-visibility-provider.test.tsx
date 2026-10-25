import { act, render, screen } from "@testing-library/react";
import { use } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  DATA_HERO_COLLAPSED_BUTTON,
  HeroVisibilityContext,
} from "./hero-visibility-context";
import { HeroVisibilityProvider } from "./hero-visibility-provider";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let report: ObserverCallback = () => {};
let observed: Element[] = [];

beforeEach(() => {
  observed = [];
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn(function (this: unknown, callback: ObserverCallback) {
      report = callback;
      return {
        observe: (element: Element) => observed.push(element),
        disconnect: () => {},
      };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function layOut(element: HTMLElement, x: number, y: number) {
  element.getBoundingClientRect = () =>
    DOMRect.fromRect({ x, y, width: 300, height: 48 });
}

function Hero() {
  const { heroInputRef, heroSlotRef } = use(HeroVisibilityContext);
  return (
    <div ref={heroSlotRef} data-testid="slot">
      <div ref={heroInputRef} data-testid="hero" />
    </div>
  );
}

it("watches a box around the hero input that the morph does not move", () => {
  render(
    <HeroVisibilityProvider>
      <Hero />
      <button type="button" {...{ [DATA_HERO_COLLAPSED_BUTTON]: "" }}>
        Ask
      </button>
    </HeroVisibilityProvider>,
  );
  const slot = screen.getByTestId("slot");
  const hero = screen.getByTestId("hero");
  layOut(slot, 0, 400);
  layOut(hero, 0, 400);
  layOut(screen.getByRole("button", { name: "Ask" }), 0, 0);

  act(() => {
    report([{ isIntersecting: false }]);
  });

  expect(hero.style.opacity).not.toBe("");
  expect(observed).toEqual([slot]);
  expect(slot.getAttribute("style")).toBeNull();
});
