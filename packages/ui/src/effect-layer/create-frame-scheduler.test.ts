import { afterEach, describe, expect, it, vi } from "vitest";
import { stubFrames } from "../test-support/stub-frames.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";

describe("createFrameScheduler", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("requests no frame until something is queued", () => {
    const frames = stubFrames();
    createFrameScheduler(vi.fn());
    expect(frames.pending()).toBe(0);
  });

  it("runs the reads before it draws, in one frame", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler(vi.fn());
    const calls: string[] = [];
    scheduler.draw(() => calls.push("draw"));
    scheduler.read(() => calls.push("read"));
    expect(frames.pending()).toBe(1);
    frames.run();
    expect(calls).toEqual(["read", "draw"]);
    expect(frames.pending()).toBe(0);
  });

  it("runs a read once however often it is queued", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler(vi.fn());
    const read = vi.fn();
    scheduler.read(read);
    scheduler.read(read);
    frames.run();
    expect(read).toHaveBeenCalledOnce();
  });

  it("draws in the same frame when a read asks for it", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler(vi.fn());
    const draw = vi.fn();
    scheduler.read(() => {
      scheduler.draw(draw);
    });
    frames.run();
    expect(draw).toHaveBeenCalledOnce();
    expect(frames.pending()).toBe(0);
  });

  it("moves a read queued during a frame to the next frame", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler(vi.fn());
    let count = 0;
    const read = () => {
      count += 1;
      if (count < 3) {
        scheduler.read(read);
      }
    };
    scheduler.read(read);
    frames.run();
    expect(count).toBe(1);
    frames.run();
    frames.run();
    expect(count).toBe(3);
    expect(frames.pending()).toBe(0);
  });

  it("moves a draw requested while drawing to the next frame", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler(vi.fn());
    const draw = vi.fn(() => {
      if (draw.mock.calls.length < 2) {
        scheduler.draw(draw);
      }
    });
    scheduler.draw(draw);
    frames.run();
    expect(draw).toHaveBeenCalledOnce();
    frames.run();
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it("replaces, clears, and sets the wake again after it fires", () => {
    vi.useFakeTimers({ toFake: ["performance", "setTimeout", "clearTimeout"] });
    const onWake = vi.fn();
    const scheduler = createFrameScheduler(onWake);
    scheduler.wake(100);
    scheduler.wake(200);
    vi.advanceTimersByTime(150);
    expect(onWake).not.toHaveBeenCalled();
    scheduler.wake(Infinity);
    vi.runAllTimers();
    expect(onWake).not.toHaveBeenCalled();
    scheduler.wake(300);
    vi.advanceTimersByTime(200);
    expect(onWake).toHaveBeenCalledOnce();
    scheduler.wake(300);
    vi.runAllTimers();
    expect(onWake).toHaveBeenCalledTimes(2);
  });

  it("runs nothing after it is destroyed", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler(vi.fn());
    const read = vi.fn();
    scheduler.read(read);
    scheduler.destroy();
    expect(frames.pending()).toBe(0);
  });

  it("wakes nothing after it is destroyed", () => {
    vi.useFakeTimers({ toFake: ["performance", "setTimeout", "clearTimeout"] });
    const onWake = vi.fn();
    const scheduler = createFrameScheduler(onWake);
    scheduler.wake(100);
    scheduler.destroy();
    vi.runAllTimers();
    expect(onWake).not.toHaveBeenCalled();
  });
});
