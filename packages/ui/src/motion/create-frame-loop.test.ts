import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { createFrameLoop } from "./create-frame-loop.ts";

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
});
