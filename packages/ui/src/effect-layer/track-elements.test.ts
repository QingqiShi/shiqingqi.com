import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { trackElements } from "./track-elements.ts";

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
      createFrameScheduler(vi.fn()),
      onChange,
      () => 0,
    );
    frames.run();
    reads.length = 0;
    onChange.mockClear();
    return { ...elements, frames, reads, registry, onChange, tracking };
  }

  it("removes every tracker and listener when it is destroyed", () => {
    const { button, reads, frames, registry, tracking } = track();
    tracking.destroy();
    expect([...registry.trackers()]).toEqual([]);
    button.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    frames.run();
    expect(reads).toEqual([]);
  });
});
