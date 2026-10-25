import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { createFrameLoop, type SyncedAnimation } from "./create-frame-loop.ts";

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createFrameLoop", () => {
  it("runs the reads of a frame before its writes, whatever order they were queued in", async () => {
    const loop = createFrameLoop();
    const order: string[] = [];
    loop.write(() => order.push("write"));
    loop.every(() => order.push("every"));
    loop.read(() => order.push("read"));
    await clock.advance(0.016);
    expect(order).toEqual(["read", "write", "every"]);
  });

  it("runs a write that a read queues in the same frame, and other new tasks next frame", async () => {
    const loop = createFrameLoop();
    const order: string[] = [];
    loop.read(() => {
      order.push("read");
      loop.write(() => order.push("write from read"));
    });
    loop.write(() => {
      order.push("write");
      loop.write(() => order.push("next write"));
      loop.read(() => order.push("next read"));
    });
    await clock.advance(0.016);
    expect(order).toEqual(["read", "write", "write from read"]);
    await clock.advance(0.016);
    expect(order.slice(3)).toEqual(["next read", "next write"]);
  });

  it("runs a read once a frame, however often it is queued", async () => {
    const loop = createFrameLoop();
    const read = vi.fn();
    loop.read(read);
    loop.read(read);
    await clock.advance(0.016);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("gives each frame the time on its clock, and requests no frame when it has no task", async () => {
    const loop = createFrameLoop();
    const times: number[] = [];
    const stop = loop.every((now) => times.push(now));
    await clock.advance(0.048);
    stop();
    expect(times).toHaveLength(3);
    expect(times[1] - times[0]).toBeCloseTo(0.016);
    expect(vi.getTimerCount()).toBe(1);
    await clock.advance(0.016);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("runs a task at a time on its clock", async () => {
    const loop = createFrameLoop();
    const task = vi.fn();
    loop.at(loop.now() + 0.25, task);
    await clock.advance(0.249);
    expect(task).not.toHaveBeenCalled();
    await clock.advance(0.002);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("drops every task on destroy", async () => {
    const loop = createFrameLoop();
    const task = vi.fn();
    loop.write(task);
    loop.every(task);
    loop.at(0.1, task);
    loop.destroy();
    await clock.advance(0.2);
    expect(task).not.toHaveBeenCalled();
  });

  describe("its clock", () => {
    function setUp() {
      vi.useRealTimers();
      vi.useFakeTimers({
        toFake: ["performance", "setTimeout", "clearTimeout"],
      });
      const frames = stubFrames();
      const loop = createFrameLoop();
      /** Runs a frame `ms` after the one before. */
      const frame = (ms: number) => {
        vi.advanceTimersByTime(ms);
        frames.run();
      };
      return { loop, frame };
    }

    /** A Web Animation that the browser starts when `start` is called. */
    function fakeAnimation() {
      let resolve: () => void = () => {};
      const animation: SyncedAnimation = {
        startTime: null,
        ready: new Promise<void>((done) => {
          resolve = done;
        }),
      };
      return {
        animation,
        start(time: number) {
          animation.startTime ??= time;
          resolve();
        },
      };
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("holds back a long frame while the page writes the motion once a frame", () => {
      const { loop, frame } = setUp();
      loop.every(() => {});
      loop.start();
      frame(16);
      frame(16);
      const before = loop.now();

      frame(200);

      expect(loop.now() - before).toBeCloseTo(1 / 30, 5);
      frame(16);
      expect(loop.now() - before).toBeCloseTo(1 / 30 + 0.016, 5);
    });

    it("shows at most 1/60 s of a motion in its first frame", () => {
      const { loop, frame } = setUp();
      loop.every(() => {});
      const start = loop.now();
      loop.start();

      frame(100);

      expect(loop.now() - start).toBeCloseTo(1 / 60, 5);
    });

    it("keeps to the time in a hidden page", () => {
      const { loop, frame } = setUp();
      loop.every(() => {});
      loop.start();
      frame(16);
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      const before = loop.now();

      vi.advanceTimersByTime(500);
      expect(loop.now() - before).toBeCloseTo(0.5, 5);
      vi.restoreAllMocks();
      frame(16);
      expect(loop.now() - before).toBeCloseTo(0.516, 5);
    });

    it("waits at the start of a Web Animation until the browser starts it, and then gives the others its start", async () => {
      const { loop, frame } = setUp();
      const times: number[] = [];
      loop.every((now) => times.push(now));
      const start = loop.now();
      const first = fakeAnimation();
      const second = fakeAnimation();
      loop.sync(first.animation, start, start + 1);
      loop.sync(second.animation, start, start + 1);

      frame(16);
      frame(16);
      expect(times).toEqual([start, start]);

      first.start((start + 0.032) * 1000);
      await Promise.resolve();
      await Promise.resolve();
      expect(second.animation.startTime).toBeCloseTo((start + 0.032) * 1000);
      frame(16);
      expect(times[2] - start).toBeCloseTo(0.016, 5);
    });

    it("takes the frame that gave a waiting Web Animation to the browser as its start, for a read between frames", async () => {
      const { loop, frame } = setUp();
      const start = loop.now();
      const { animation } = fakeAnimation();
      loop.sync(animation, start, start + 1);
      vi.advanceTimersByTime(10);
      frame(0);
      await Promise.resolve();

      vi.advanceTimersByTime(20);

      expect(loop.now() - start).toBeCloseTo(0.02, 5);
      expect(animation.startTime).toBeCloseTo((start + 0.01) * 1000);
    });

    it("gives a Web Animation that a frame makes the frame that it goes to the browser in", async () => {
      const { loop, frame } = setUp();
      const { animation } = fakeAnimation();
      let at = 0;
      loop.write((now) => {
        at = now;
        queueMicrotask(() => loop.sync(animation, now, now + 1));
      });
      vi.advanceTimersByTime(10);
      const given = performance.now();
      frame(0);
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(20);
      expect(loop.now() - at).toBeCloseTo(0.02, 5);
      expect(animation.startTime).toBeCloseTo(given, 3);
    });

    it("gives a Web Animation the clock of the one that plays, and keeps to the time while it plays", async () => {
      const { loop, frame } = setUp();
      loop.every(() => {});
      const first = fakeAnimation();
      loop.sync(first.animation, loop.now(), loop.now() + 1);
      first.start(performance.now());
      await Promise.resolve();
      await Promise.resolve();
      frame(16);
      const before = loop.now();

      frame(200);
      expect(loop.now() - before).toBeCloseTo(0.2, 5);

      const second = fakeAnimation();
      loop.sync(second.animation, loop.now(), loop.now() + 1);
      expect(second.animation.startTime).toBeCloseTo(loop.now() * 1000, 3);
    });

    it("gives a Web Animation the clock of one that it cuts, but waits again after one that came to its end", async () => {
      const { loop, frame } = setUp();
      const first = fakeAnimation();
      const stopFirst = loop.sync(
        first.animation,
        loop.now(),
        loop.now() + 0.1,
      );
      first.start(performance.now());
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(50);
      stopFirst();
      const cutting = fakeAnimation();
      const stopCutting = loop.sync(
        cutting.animation,
        loop.now(),
        loop.now() + 0.1,
      );
      expect(cutting.animation.startTime).not.toBeNull();

      frame(16);
      vi.advanceTimersByTime(200);
      stopCutting();
      const next = fakeAnimation();
      loop.sync(next.animation, loop.now(), loop.now() + 0.1);
      expect(next.animation.startTime).toBeNull();
    });

    it("starts a Web Animation that the browser does not start after a few frames, at the frame that gave it", async () => {
      const { loop, frame } = setUp();
      const { animation } = fakeAnimation();
      loop.sync(animation, loop.now(), loop.now() + 1);
      vi.advanceTimersByTime(10);
      const given = performance.now();
      frame(0);
      await Promise.resolve();
      for (let count = 0; count < 10; count++) frame(16);
      expect(animation.startTime).toBeCloseTo(given, 3);
    });

    it("starts a waiting Web Animation when no frame comes for a while", () => {
      const { loop } = setUp();
      const { animation } = fakeAnimation();
      const start = loop.now();
      loop.sync(animation, start, start + 1);
      vi.advanceTimersByTime(600);
      expect(loop.now()).toBe(start);
      expect(animation.startTime).not.toBeNull();
      vi.advanceTimersByTime(100);
      expect(loop.now() - start).toBeCloseTo(0.1, 5);
    });

    it("forgets on destroy that a motion played", async () => {
      const { loop, frame } = setUp();
      const first = fakeAnimation();
      loop.sync(first.animation, loop.now(), loop.now() + 1);
      first.start(performance.now());
      await Promise.resolve();
      await Promise.resolve();
      frame(16);
      loop.destroy();
      const next = fakeAnimation();
      loop.sync(next.animation, loop.now(), loop.now() + 1);
      expect(next.animation.startTime).toBeNull();
    });

    it("lets the clock go on when a waiting Web Animation stops", () => {
      const { loop, frame } = setUp();
      const { animation } = fakeAnimation();
      const start = loop.now();
      const stop = loop.sync(animation, start, start + 1);
      frame(16);
      stop();
      frame(16);
      expect(loop.now() - start).toBeCloseTo(0.016, 5);
    });
  });
});
