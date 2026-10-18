import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { PAGE_CARRIER } from "./resolve-carrier.ts";
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
    const tracking = trackElements(
      registry,
      createFrameScheduler(),
      onChange,
      () => 0,
    );
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
    trackElements(registry, createFrameScheduler(), onChange, () => 0);
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

  it("measures nothing on a scroll of a Scroll region, and asks for a frame", () => {
    const frames = stubFrames();
    const observers = stubObservers();
    document.body.innerHTML =
      '<div id="list"><div id="content"><button id="item"></button></div></div>';
    const list = document.getElementById("list");
    const content = document.getElementById("content");
    const item = document.getElementById("item");
    if (list === null || content === null || item === null) {
      throw new Error("no region");
    }
    const reads: Element[] = [];
    layOut(list, { x: 0, y: 100, width: 300, height: 200 });
    layOut(content, { x: 0, y: 100, width: 300, height: 900 });
    layOut(item, { x: 0, y: 500, width: 100, height: 40 }, reads);
    const registry = createEffectRegistry();
    const carrier = { kind: "region", id: 3, parent: PAGE_CARRIER } as const;
    registry.register(item, 0, NO_SETTINGS, { ...ON_PAGE, carrier });
    registry.registerRegion(3, PAGE_CARRIER, "scroller", list);
    registry.registerRegion(3, PAGE_CARRIER, "content", content);
    const onScroll = vi.fn();
    const tracking = trackElements(
      registry,
      createFrameScheduler(),
      () => {},
      () => 0,
      onScroll,
    );
    frames.run();
    reads.length = 0;
    expect(observers.intersectionRootsOf(item)).toEqual([content]);

    list.dispatchEvent(new Event("scroll", { bubbles: false }));
    frames.run();
    expect(reads).toEqual([]);
    expect(onScroll).toHaveBeenCalledOnce();

    expect(tracking.clock(0, 40, () => 0).regionPlace(3)).toMatchObject({
      origin: { x: 0, y: 100 },
      scrollTop: 0,
    });
  });

  it("measures nothing on a window scroll, in a sticky box too", () => {
    const { other, reads, frames, registry } = track();
    other.style.position = "sticky";
    for (const tracker of registry.trackers()) {
      tracker.signal();
    }
    frames.run();
    reads.length = 0;

    document.dispatchEvent(new Event("scroll"));
    frames.run();
    expect(reads).toEqual([]);
  });

  /**
   * Tracks `button` and `padding` in the sticky box `card`, which
   * `useEffectSticky` declares, and `other` on the page.
   */
  function trackSticky() {
    const frames = stubFrames();
    const observers = stubObservers();
    const elements = mount();
    const { card, button, padding, other } = elements;
    card.style.position = "sticky";
    card.style.top = "0px";
    const reads: Element[] = [];
    layOut(card, { x: 0, y: 200, width: 300, height: 60 });
    layOut(button, { x: 0, y: 210, width: 100, height: 40 }, reads);
    layOut(padding, { x: 120, y: 210, width: 20, height: 40 }, reads);
    layOut(other, { x: 0, y: 400, width: 100, height: 40 }, reads);
    const registry = createEffectRegistry();
    let isStuck = false;
    const carrier = { kind: "sticky", id: 1, parent: PAGE_CARRIER } as const;
    const sticky = registry.registerSticky(card, carrier, () => isStuck);
    const setStuck = (stuck: boolean) => {
      isStuck = stuck;
      sticky.changed();
    };
    const onSticky = { ...ON_PAGE, carrier };
    registry.register(button, 0, NO_SETTINGS, onSticky);
    registry.register(padding, 0, NO_SETTINGS, onSticky);
    registry.register(other, 0, NO_SETTINGS, ON_PAGE);
    trackElements(
      registry,
      createFrameScheduler(),
      () => {},
      () => 0,
    );
    frames.run();
    reads.length = 0;
    const carrierOf = (element: Element) =>
      [...registry.trackers()].find((tracker) => tracker.element === element)
        ?.measured?.carrier;
    return { ...elements, frames, observers, reads, carrierOf, setStuck };
  }

  it("moves every element of a sticky box to the fixed canvas in one frame when its stuck watch reports, and back", () => {
    const { card, button, padding, frames, reads, carrierOf, setStuck } =
      trackSticky();
    expect(carrierOf(button)).toBe("page");

    layOut(card, { x: 0, y: 0, width: 300, height: 60 });
    setStuck(true);
    frames.run();
    expect(reads).toEqual([button, padding]);
    expect(carrierOf(button)).toBe("fixed");
    expect(carrierOf(padding)).toBe("fixed");

    layOut(card, { x: 0, y: 120, width: 300, height: 60 });
    setStuck(false);
    frames.run();
    expect(carrierOf(button)).toBe("page");
  });

  it("keeps the elements of a sticky box on the canvas its stuck watch reports, whatever the layout says", () => {
    const { card, button, padding, frames, carrierOf } = trackSticky();
    layOut(card, { x: 0, y: 0, width: 300, height: 60 });
    padding.dispatchEvent(
      new MouseEvent("pointerover", { bubbles: true, relatedTarget: button }),
    );
    frames.run();
    expect(carrierOf(padding)).toBe("page");
    expect(carrierOf(button)).toBe("page");
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

  it("takes the box away while an ancestor fades out, and gives it back when it fades in", async () => {
    const { card, button, frames, registry } = track();
    const boxOf = () =>
      [...registry.trackers()].find((tracker) => tracker.element === button)
        ?.measured?.box ?? null;
    expect(boxOf()).not.toBeNull();
    // jsdom has no Web Animations API.
    Object.defineProperty(card, "getAnimations", { value: () => [] });

    card.style.opacity = "0";
    // The attribute change reaches the trackers in a microtask.
    await Promise.resolve();
    frames.run();
    expect(boxOf()).toBeNull();

    card.style.opacity = "1";
    await Promise.resolve();
    frames.run();
    expect(boxOf()).toMatchObject({ width: 100, height: 40 });
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
