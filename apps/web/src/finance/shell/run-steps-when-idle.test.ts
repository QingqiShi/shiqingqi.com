import { describe, expect, it } from "vitest";
import {
  runStepsWhenIdle,
  type IdleDeadlineLike,
} from "./run-steps-when-idle.ts";

/** Idle periods the test hands out by hand, each with a fixed time left that the steps use up. */
function manualIdle() {
  const queue: ((deadline: IdleDeadlineLike) => void)[] = [];
  let left = 0;
  return {
    requestIdle: (callback: (deadline: IdleDeadlineLike) => void) => {
      queue.push(callback);
      return () => {
        queue.splice(queue.indexOf(callback), 1);
      };
    },
    spend(ms: number) {
      left -= ms;
    },
    period(ms: number) {
      left = ms;
      queue.shift()?.({ timeRemaining: () => Math.max(0, left) });
    },
    pending: () => queue.length,
  };
}

describe("runStepsWhenIdle", () => {
  it("runs steps in order, as many per idle period as its time allows", () => {
    const idle = manualIdle();
    const ran: number[] = [];
    let done = false;
    const steps = [0, 1, 2, 3].map((at) => () => {
      ran.push(at);
      idle.spend(10);
    });
    runStepsWhenIdle(steps, {
      requestIdle: idle.requestIdle,
      onDone: () => {
        done = true;
      },
    });
    expect(ran).toEqual([]);

    idle.period(25);
    expect(ran).toEqual([0, 1]);
    idle.period(1);
    expect(ran).toEqual([0, 1, 2]);
    expect(done).toBe(false);
    idle.period(50);
    expect(ran).toEqual([0, 1, 2, 3]);
    expect(done).toBe(true);
    expect(idle.pending()).toBe(0);
  });

  it("runs no more steps once stopped", () => {
    const idle = manualIdle();
    const ran: number[] = [];
    const stop = runStepsWhenIdle(
      [0, 1].map((at) => () => {
        ran.push(at);
        idle.spend(50);
      }),
      { requestIdle: idle.requestIdle },
    );
    idle.period(10);
    stop();
    expect(idle.pending()).toBe(0);
    expect(ran).toEqual([0]);
  });
});
