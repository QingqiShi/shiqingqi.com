import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { changedScope, trackElements } from "./track-elements.ts";

const ON_PAGE = { scope: PAGE_SCOPE, holds: null };

function mount() {
  document.body.innerHTML = `
    <section id="card">
      <span id="padding"></span>
      <button id="button"><span id="label"></span></button>
    </section>
    <aside id="other"></aside>
  `;
  const byId = (id: string) => {
    const element = document.getElementById(id);
    if (element === null) {
      throw new Error(`no #${id}`);
    }
    return element;
  };
  return {
    card: byId("card"),
    button: byId("button"),
    label: byId("label"),
    padding: byId("padding"),
    other: byId("other"),
  };
}

describe("changedScope", () => {
  it("is the target alone when it moves in from its parent", () => {
    const { card, button } = mount();
    expect(changedScope(button, card)).toBe(button);
  });

  it("is nothing when it moves out to a child, which stays inside", () => {
    const { card, button } = mount();
    expect(changedScope(card, button)).toBeNull();
  });

  it("reaches up to the child of the common ancestor", () => {
    const { card, label, other } = mount();
    expect(changedScope(label, other)).toBe(card);
  });

  it("stops below an ancestor that both share", () => {
    const { button, label, padding } = mount();
    expect(changedScope(label, padding)).toBe(button);
  });

  it("is the root element when it comes from outside the page", () => {
    const { label } = mount();
    expect(changedScope(label, null)).toBe(document.documentElement);
  });

  it("is nothing for a target that is not an element", () => {
    expect(changedScope(window, null)).toBeNull();
  });
});

describe("trackElements", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  /**
   * Tracks `button` and `other` from `mount`, each laid out, and counts the
   * reads of their boxes.
   */
  function track() {
    const frames = stubFrames();
    stubObservers();
    const elements = mount();
    const reads: Element[] = [];
    layOut(elements.button, { x: 0, y: 0, width: 100, height: 40 }, reads);
    layOut(elements.other, { x: 0, y: 100, width: 100, height: 40 }, reads);
    const registry = createEffectRegistry();
    registry.register(elements.button, 0, NO_SETTINGS, ON_PAGE);
    registry.register(elements.other, 0, NO_SETTINGS, ON_PAGE);
    const onChange = vi.fn();
    const tracking = trackElements(registry, createFrameScheduler(), onChange);
    frames.run();
    reads.length = 0;
    onChange.mockClear();
    return { ...elements, frames, reads, registry, onChange, tracking };
  }

  it("measures each new element once in the next frame, and then nothing", () => {
    const frames = stubFrames();
    stubObservers();
    const { button, other } = mount();
    const reads: Element[] = [];
    layOut(button, { x: 0, y: 0, width: 100, height: 40 }, reads);
    layOut(other, { x: 0, y: 100, width: 100, height: 40 }, reads);
    const registry = createEffectRegistry();
    registry.register(button, 0, NO_SETTINGS, ON_PAGE);
    const onChange = vi.fn();
    trackElements(registry, createFrameScheduler(), onChange);
    registry.register(other, 0, NO_SETTINGS, ON_PAGE);
    expect(reads).toEqual([]);

    frames.run();
    expect(reads).toEqual([button, other]);
    expect(onChange).toHaveBeenCalledOnce();
    expect(frames.pending()).toBe(0);
  });

  it("measures only the elements a hover change can restyle", () => {
    const { button, other, reads, frames, onChange } = track();
    button.dispatchEvent(
      new MouseEvent("pointerover", { bubbles: true, relatedTarget: other }),
    );
    frames.run();
    expect(reads).toEqual([button]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("measures only the elements inside a box that scrolled", () => {
    const { card, button, reads, frames } = track();
    card.dispatchEvent(new Event("scroll"));
    frames.run();
    expect(reads).toEqual([button]);
  });

  it("measures only sticky elements on a window scroll", () => {
    const { other, reads, frames, registry } = track();
    other.style.position = "sticky";
    for (const tracker of registry.trackers()) {
      tracker.signal();
    }
    frames.run();
    reads.length = 0;

    document.dispatchEvent(new Event("scroll"));
    frames.run();
    expect(reads).toEqual([other]);
  });

  it("measures each frame while a transition runs, and once more after it ends", () => {
    const { card, button, reads, frames } = track();
    let running = true;
    // jsdom has no Web Animations API.
    Object.defineProperty(card, "getAnimations", {
      value: () => (running ? [{ pending: false, playState: "running" }] : []),
    });
    card.dispatchEvent(
      Object.assign(new Event("transitionrun"), { pseudoElement: "" }),
    );
    frames.run();
    frames.run();
    expect(reads).toEqual([button, button]);

    running = false;
    frames.run();
    expect(reads).toEqual([button, button, button]);
    expect(frames.pending()).toBe(0);
  });

  it("removes every tracker and listener when it is destroyed", () => {
    const { button, reads, frames, registry, tracking } = track();
    tracking.destroy();
    expect([...registry.trackers()]).toEqual([]);
    button.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    frames.run();
    expect(reads).toEqual([]);
  });
});
