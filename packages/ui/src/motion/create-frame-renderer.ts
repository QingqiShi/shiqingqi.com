import { clamp } from "../clamp.ts";
import type { FrameLoop } from "./create-frame-loop.ts";
import type { Styles } from "./px.ts";

/**
 * Plays the motion of a binding.
 *
 * @internal
 */
export interface Renderer {
  /** Plays the styles that `styleAt` gives at each time from `start` to `end`, in seconds on the clock of the engine. */
  play(styleAt: (time: number) => Styles, start: number, end: number): void;
  /** Stops the motion. What it leaves on the element differs by renderer, so the binding writes the pose it keeps. */
  stop(): void;
}

/**
 * Plays a motion by writing it at once, and then once a frame in the write
 * phase of `loop`, with `write`. For a browser with no Web Animations, such as jsdom, and
 * for a binding that asks for it.
 *
 * @internal
 */
export function createFrameRenderer(
  loop: FrameLoop,
  write: (styles: Styles) => void,
): Renderer {
  let stopTicking: (() => void) | null = null;
  const stop = () => {
    stopTicking?.();
    stopTicking = null;
  };
  return {
    play(styleAt, start, end) {
      stop();
      write(styleAt(start));
      stopTicking = loop.every((now) => {
        write(styleAt(clamp(now, start, end)));
        if (now >= end) stop();
      });
    },
    stop,
  };
}
