import { afterEach, describe, expect, it, vi } from "vitest";
import { stubFrames } from "../test-support/stub-frames.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";

describe("createFrameScheduler", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests no frame until something is queued", () => {
    const frames = stubFrames();
    createFrameScheduler();
    expect(frames.pending()).toBe(0);
  });

  it("runs the reads before it draws, in one frame", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler();
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
    const scheduler = createFrameScheduler();
    const read = vi.fn();
    scheduler.read(read);
    scheduler.read(read);
    frames.run();
    expect(read).toHaveBeenCalledOnce();
  });

  it("draws in the same frame when a read asks for it", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler();
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
    const scheduler = createFrameScheduler();
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
    const scheduler = createFrameScheduler();
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

  it("runs nothing after it is destroyed", () => {
    const frames = stubFrames();
    const scheduler = createFrameScheduler();
    const read = vi.fn();
    scheduler.read(read);
    scheduler.destroy();
    expect(frames.pending()).toBe(0);
  });
});
