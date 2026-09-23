import { bandHeight, bandSpan } from "./band-span.ts";
import { classifyResize, type ResizeKind } from "./classify-resize.ts";
import {
  EMPTY_STRIP_COUNTER,
  exposedStrips,
  noteStrip,
  type StripCounter,
} from "./exposed-strips.ts";
import { planBandTop } from "./plan-band-top.ts";
import type { ProbedViewports } from "./resolve-probes.ts";
import { trackMotion, type Motion } from "./track-motion.ts";

export interface BandMetrics {
  /** The layout viewport width, in CSS px. */
  viewportWidth: number;
  probed: ProbedViewports;
  /** The height of the flow content the band has to stay inside. */
  docHeight: number;
  /** Device px per CSS px. */
  scale: number;
}

export interface BandBox {
  /** In CSS px. */
  width: number;
  /** In CSS px. */
  height: number;
  /** Where the band starts in the document, in CSS px. */
  top: number;
  /** The drawing buffer width, in device px. */
  pixelWidth: number;
  /** The drawing buffer height, in device px. */
  pixelHeight: number;
}

export interface BandFrame {
  box: BandBox;
  /** The box changed size, so the band has to be drawn again in full. */
  resized: boolean;
  moved: boolean;
}

export interface BandStats {
  /** How many times the band moved after its first placement. */
  moves: number;
  /** Strips of the document that the band did not cover. */
  inside: StripCounter;
  /** Strips of rubber band above or below the document. */
  outside: StripCounter;
}

const AT_REST: Motion = { y: 0, at: 0, speed: 0, dir: 0 };

/**
 * Where the band is and how large, from the readings the runtime gives it.
 * It reads no layout itself, so a scroll costs no layout flush: the runtime
 * measures only on a real viewport change or a document change.
 */
export function createBandDriver() {
  let metrics: BandMetrics | null = null;
  let motion: Motion | null = null;
  let box: BandBox | null = null;
  let stats: BandStats = {
    moves: 0,
    inside: EMPTY_STRIP_COUNTER,
    outside: EMPTY_STRIP_COUNTER,
  };

  function plannedTop(
    measured: BandMetrics,
    height: number,
    top: number | null,
    scrollY: number,
  ) {
    return planBandTop({
      top,
      height,
      largeViewport: measured.probed.large,
      docHeight: measured.docHeight,
      scrollY,
      motion: motion ?? AT_REST,
      scale: measured.scale,
    });
  }

  function needsMove(scrollY: number) {
    if (metrics === null || box === null) return false;
    return plannedTop(metrics, box.height, box.top, scrollY) !== box.top;
  }

  return {
    stats() {
      return stats;
    },

    measure(next: BandMetrics) {
      metrics = next;
    },

    /** What a viewport event means for the band, from the last measurement. */
    classifyViewport(reading: {
      width: number;
      innerHeight: number;
    }): ResizeKind {
      if (metrics === null) return "width";
      return classifyResize(reading, metrics.viewportWidth, metrics.probed);
    },

    /** Notes a scroll. Returns whether the band has to move. */
    scroll(scrollY: number, innerHeight: number, now: number) {
      motion = trackMotion(motion, scrollY, now);
      if (metrics !== null && box !== null) {
        const strips = exposedStrips({
          scrollY,
          innerHeight,
          bandTop: box.top,
          bandHeight: box.height,
          docHeight: metrics.docHeight,
        });
        const inside = noteStrip(stats.inside, strips.inside, now);
        const outside = noteStrip(stats.outside, strips.outside, now);
        if (inside !== stats.inside || outside !== stats.outside) {
          stats = { ...stats, inside, outside };
        }
      }
      return needsMove(scrollY);
    },

    /**
     * Forgets the scroll direction once the scroll stops, so the band goes
     * back to the centre while nothing moves, not on the first frame of the
     * next scroll. Returns whether the band has to move.
     */
    rest(scrollY: number) {
      motion = null;
      return needsMove(scrollY);
    },

    /** Forgets the box, so the next frame sizes and places the band again. */
    reset() {
      box = null;
    },

    /** The box for a frame at this scroll position, or `null` before a measurement. */
    frame(scrollY: number): BandFrame | null {
      if (metrics === null) return null;
      const { viewportWidth, probed, docHeight, scale } = metrics;
      const span = bandSpan({
        viewportWidth,
        largeViewport: probed.large,
        scale,
      });
      const height = bandHeight(probed.large, span, scale, docHeight);
      const width = viewportWidth;
      const pixelWidth = Math.max(1, Math.round(width * scale));
      const pixelHeight = Math.max(1, Math.round(height * scale));
      const resized =
        box === null ||
        box.width !== width ||
        box.height !== height ||
        box.pixelWidth !== pixelWidth ||
        box.pixelHeight !== pixelHeight;
      const keptTop =
        box !== null && !resized && box.top + height <= docHeight
          ? box.top
          : null;
      const top = plannedTop(metrics, height, keptTop, scrollY);
      const moved = box !== null && box.top !== top;
      if (moved) stats = { ...stats, moves: stats.moves + 1 };
      box = { width, height, top, pixelWidth, pixelHeight };
      return { box, resized, moved };
    },
  };
}
