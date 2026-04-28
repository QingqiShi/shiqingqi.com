"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/** Target reveal rate scales with buffer size (chars per 16.67ms at 60fps baseline) */
const RATE_FACTOR = 0.08;
/** Smoothing factor for acceleration (slow ramp-up when chunks arrive) */
const RATE_SMOOTHING_UP = 0.15;
/** Smoothing factor for deceleration (fast slow-down as buffer drains) */
const RATE_SMOOTHING_DOWN = 0.3;
/** Minimum reveal rate — floor of ~2 chars/sec at the tail */
const MIN_RATE = 0.033;
/** Reference frame duration in ms (60fps baseline for normalizing delta time) */
const FRAME_MS = 16.67;
/** Maximum delta to prevent jumps after tab switches or long pauses */
const MAX_DELTA_MS = 100;

// Reduced-motion detection via useSyncExternalStore. Module-level functions
// ensure stable references so useSyncExternalStore doesn't re-subscribe.
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => {
    mql.removeEventListener("change", onChange);
  };
}

function getReducedMotionSnapshot() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

const MARKER_CHARS = /[*`~]/;

/** UTF-16 high surrogate (first half of emoji / astral code point) */
function isHighSurrogate(code: number) {
  return code >= 0xd800 && code <= 0xdbff;
}

// ---------------------------------------------------------------------------
// Shared markdown marker scanning and balancing
// ---------------------------------------------------------------------------

interface MarkerState {
  inCodeFence: boolean;
  inlineCodeOpenPos: number;
  boldOpenPos: number;
  italicOpenPos: number;
  strikeOpenPos: number;
}

function initialMarkerState(): MarkerState {
  return {
    inCodeFence: false,
    inlineCodeOpenPos: -1,
    boldOpenPos: -1,
    italicOpenPos: -1,
    strikeOpenPos: -1,
  };
}

/** Scan `text[from..limit)` for markdown markers, mutating `s` in-place. */
function scanMarkers(
  text: string,
  from: number,
  limit: number,
  s: MarkerState,
) {
  for (let i = from; i < limit; ) {
    const ch = text[i];

    // Code fence ```
    if (
      s.inlineCodeOpenPos === -1 &&
      ch === "`" &&
      i + 2 < limit &&
      text[i + 1] === "`" &&
      text[i + 2] === "`"
    ) {
      s.inCodeFence = !s.inCodeFence;
      i += 3;
      if (s.inCodeFence) {
        while (i < limit && text[i] !== "\n") i++;
      }
      continue;
    }

    if (s.inCodeFence) {
      i++;
      continue;
    }

    // Inline code `
    if (ch === "`") {
      s.inlineCodeOpenPos = s.inlineCodeOpenPos === -1 ? i : -1;
      i++;
      continue;
    }

    if (s.inlineCodeOpenPos >= 0) {
      i++;
      continue;
    }

    // Strikethrough ~~
    if (ch === "~" && i + 1 < limit && text[i + 1] === "~") {
      s.strikeOpenPos = s.strikeOpenPos === -1 ? i : -1;
      i += 2;
      continue;
    }

    // List marker: * at start of line followed by space — not emphasis
    if (
      ch === "*" &&
      (i === 0 || text[i - 1] === "\n") &&
      i + 1 < limit &&
      text[i + 1] === " "
    ) {
      i += 2;
      continue;
    }

    // *** bold+italic, ** bold, * italic
    if (ch === "*") {
      if (i + 2 < limit && text[i + 1] === "*" && text[i + 2] === "*") {
        s.boldOpenPos = s.boldOpenPos === -1 ? i : -1;
        s.italicOpenPos = s.italicOpenPos === -1 ? i : -1;
        i += 3;
      } else if (i + 1 < limit && text[i + 1] === "*") {
        s.boldOpenPos = s.boldOpenPos === -1 ? i : -1;
        i += 2;
      } else {
        s.italicOpenPos = s.italicOpenPos === -1 ? i : -1;
        i++;
      }
      continue;
    }

    i++;
  }
}

/**
 * Build output string for `text[0..outputEnd)` by closing or stripping
 * unclosed markers. Markers with content after them are closed; markers
 * at the end with no content are stripped to avoid flashing raw syntax.
 */
function buildBalancedOutput(
  text: string,
  outputEnd: number,
  s: MarkerState,
): string {
  let suffix = "";
  let stripFrom = outputEnd;

  if (s.inlineCodeOpenPos >= 0) {
    if (hasNonMarkerContent(text, s.inlineCodeOpenPos, outputEnd)) {
      suffix += "`";
    } else {
      stripFrom = Math.min(stripFrom, s.inlineCodeOpenPos);
    }
  }

  if (s.italicOpenPos >= 0) {
    if (hasNonMarkerContent(text, s.italicOpenPos, outputEnd)) {
      suffix += "*";
    } else {
      stripFrom = Math.min(stripFrom, s.italicOpenPos);
    }
  }

  if (s.boldOpenPos >= 0) {
    if (hasNonMarkerContent(text, s.boldOpenPos, outputEnd)) {
      suffix += "**";
    } else {
      stripFrom = Math.min(stripFrom, s.boldOpenPos);
    }
  }

  if (s.strikeOpenPos >= 0) {
    if (hasNonMarkerContent(text, s.strikeOpenPos, outputEnd)) {
      suffix += "~~";
    } else {
      stripFrom = Math.min(stripFrom, s.strikeOpenPos);
    }
  }

  if (s.inCodeFence) suffix += "\n```";

  if (!suffix && stripFrom >= outputEnd) {
    return outputEnd === text.length ? text : text.slice(0, outputEnd);
  }
  const base = text.slice(0, stripFrom);
  return suffix ? base + suffix : base;
}

function hasNonMarkerContent(text: string, from: number, to = text.length) {
  for (let i = from; i < to; i++) {
    const ch = text[i];
    if (ch !== "*" && ch !== "~" && ch !== "`") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Standalone closeOpenMarkers (O(n) full scan)
// ---------------------------------------------------------------------------

/**
 * Appends closing markers for any unclosed inline markdown syntax so
 * that partially revealed text renders with formatting instead of
 * showing raw syntax characters. Single O(n) scan per call.
 *
 * Handles: ** (bold), * (italic), *** (bold+italic), ` (inline code),
 * ~~ (strikethrough), and ``` (code fences).
 */
export function closeOpenMarkers(text: string): string {
  if (!MARKER_CHARS.test(text)) return text;

  const s = initialMarkerState();
  scanMarkers(text, 0, text.length, s);
  return buildBalancedOutput(text, text.length, s);
}

// ---------------------------------------------------------------------------
// Incremental marker tracker (amortised O(delta) per frame)
// ---------------------------------------------------------------------------

/**
 * Incremental marker tracker — amortises `closeOpenMarkers` across frames.
 *
 * During progressive reveal, text grows monotonically. Instead of re-scanning
 * the entire string every frame (O(n)), the tracker remembers its scan
 * position and marker state, only scanning newly revealed characters (O(delta)).
 *
 * Trailing marker characters at the reveal boundary are excluded from the
 * committed scan because they might be part of an incomplete multi-character
 * marker (e.g. the first `*` of `**`). They are stripped from the output and
 * re-scanned next frame once more context is available.
 */
export function createMarkerTracker() {
  let scannedTo = 0;
  const state = initialMarkerState();

  function reset() {
    scannedTo = 0;
    state.inCodeFence = false;
    state.inlineCodeOpenPos = -1;
    state.boldOpenPos = -1;
    state.italicOpenPos = -1;
    state.strikeOpenPos = -1;
  }

  function closeAt(text: string, end: number): string {
    if (end < scannedTo) reset();

    if (end > scannedTo) {
      // Exclude trailing marker chars from committed scan — they may be
      // part of an incomplete multi-char marker (**, ***, ~~, ```)
      let scanLimit = end;
      while (
        scanLimit > scannedTo &&
        (text[scanLimit - 1] === "*" || text[scanLimit - 1] === "`")
      ) {
        scanLimit--;
      }
      // Exclude trailing ~ when it could be part of a ~~ pair.
      // Uncommit a previously committed ~ first so both are re-scanned.
      if (scanLimit > scannedTo && text[scanLimit - 1] === "~") {
        if (scannedTo > 0 && text[scannedTo - 1] === "~") scannedTo--;
        if (scanLimit - 2 >= scannedTo && text[scanLimit - 2] === "~") {
          while (scanLimit > scannedTo && text[scanLimit - 1] === "~") {
            scanLimit--;
          }
        }
      }

      scanMarkers(text, scannedTo, scanLimit, state);
      scannedTo = scanLimit;
    }

    // Fast path: no open markers and no trailing marker chars to strip
    const hasOpen =
      state.inCodeFence ||
      state.inlineCodeOpenPos >= 0 ||
      state.boldOpenPos >= 0 ||
      state.italicOpenPos >= 0 ||
      state.strikeOpenPos >= 0;

    if (!hasOpen) {
      const outputEnd = Math.min(scannedTo, end);
      return outputEnd === text.length ? text : text.slice(0, outputEnd);
    }

    return buildBalancedOutput(text, scannedTo, state);
  }

  return { reset, closeAt };
}

// ---------------------------------------------------------------------------
// useSmoothedText hook
// ---------------------------------------------------------------------------

interface UseSmoothedTextOptions {
  /** Fires when the animation catches up to the target text AND sealed is true. */
  onCaughtUp?: () => void;
  /**
   * When true, the text part is finalized (won't receive more content).
   * onCaughtUp only fires when sealed — this prevents premature release
   * when the animation temporarily catches up between streaming chunks.
   * @default true
   */
  sealed?: boolean;
  /**
   * When false, animation starts from position 0 instead of showing the
   * initial text immediately. Use for queued text parts that mount with
   * their full content already available.
   * @default true
   */
  startRevealed?: boolean;
  /**
   * Extra buffer from subsequent text parts — keeps the reveal rate high
   * across part boundaries instead of decelerating at each part's tail.
   * @default 0
   */
  trailingBufferHint?: number;
}

/**
 * Smooths streaming text by adaptively revealing characters using
 * requestAnimationFrame with delta-time normalization — the animation
 * speed is consistent regardless of monitor refresh rate.
 *
 * The reveal rate scales with buffer size — more buffered text means
 * faster reveal, less means slower. Easing is asymmetric: slow to
 * accelerate when new text arrives, fast to decelerate as the buffer
 * drains, producing a visible slow-down at the tail (~2 chars/sec).
 *
 * The rAF loop is self-managing: it starts when new text arrives and
 * stops when fully caught up. It does not depend on streaming state,
 * so it naturally continues draining the buffer after streaming ends
 * rather than jumping to the full text.
 */
export function useSmoothedText(
  targetText: string,
  options?: UseSmoothedTextOptions,
) {
  const sealed = options?.sealed ?? true;
  const startRevealed = options?.startRevealed ?? true;
  const trailingBufferHint = options?.trailingBufferHint ?? 0;

  const [displayedText, setDisplayedText] = useState(
    startRevealed ? targetText : "",
  );
  const displayedLengthRef = useRef(startRevealed ? targetText.length : 0);
  const rafRef = useRef(0);
  const rateRef = useRef(0);
  const accumulatorRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const trackerRef = useRef(createMarkerTracker());

  // Stable reference to onCaughtUp that always calls the latest callback
  // without needing it in the effect's dependency array.
  const onCaughtUp = useEffectEvent(() => {
    options?.onCaughtUp?.();
  });

  // Stable getter for trailingBufferHint — read every rAF frame but
  // should not restart the animation loop when it changes.
  const getTrailingBufferHint = useEffectEvent(() => trailingBufferHint);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    // Reduced-motion: skip the animation loop entirely. The hook returns
    // targetText directly (below) so no setState is needed here.
    if (prefersReducedMotion) {
      cancelAnimationFrame(rafRef.current);
      displayedLengthRef.current = targetText.length;
      if (sealed) {
        onCaughtUp();
      }
      return;
    }

    // Reset if text got shorter (new streaming session)
    if (displayedLengthRef.current > targetText.length) {
      displayedLengthRef.current = 0;
      rateRef.current = 0;
      accumulatorRef.current = 0;
      trackerRef.current.reset();
    }

    // Already caught up — show immediately, no loop needed
    if (displayedLengthRef.current >= targetText.length) {
      setDisplayedText(
        trackerRef.current.closeAt(targetText, targetText.length),
      );
      if (sealed) {
        onCaughtUp();
      }
      return;
    }

    const animate = (timestamp: DOMHighResTimeStamp) => {
      const deltaMs =
        lastTimestampRef.current > 0
          ? Math.min(timestamp - lastTimestampRef.current, MAX_DELTA_MS)
          : FRAME_MS;
      lastTimestampRef.current = timestamp;
      const normalizedDelta = deltaMs / FRAME_MS;

      const target = targetText;
      const current = displayedLengthRef.current;
      const remaining = target.length - current;

      const totalBuffer = remaining + getTrailingBufferHint();
      const targetRate =
        totalBuffer > 0 ? Math.max(MIN_RATE, totalBuffer * RATE_FACTOR) : 0;

      // Asymmetric easing: decelerate quickly for visible slow-down at
      // the tail, accelerate slowly for smooth ramp-up on new chunks
      const smoothingFactor =
        targetRate < rateRef.current ? RATE_SMOOTHING_DOWN : RATE_SMOOTHING_UP;
      const smoothingStep = 1 - Math.pow(1 - smoothingFactor, normalizedDelta);
      rateRef.current += (targetRate - rateRef.current) * smoothingStep;

      if (remaining > 0) {
        accumulatorRef.current += rateRef.current * normalizedDelta;
        const charsToAdd = Math.min(
          Math.floor(accumulatorRef.current),
          remaining,
        );
        if (charsToAdd > 0) {
          accumulatorRef.current -= charsToAdd;
          let newLength = current + charsToAdd;
          // Avoid slicing in the middle of a surrogate pair (emoji, etc.)
          if (
            newLength < target.length &&
            isHighSurrogate(target.charCodeAt(newLength - 1))
          ) {
            newLength++;
          }
          displayedLengthRef.current = newLength;
          setDisplayedText(trackerRef.current.closeAt(target, newLength));
        }
        rafRef.current = requestAnimationFrame(animate);
      } else if (sealed) {
        onCaughtUp();
      }
    };

    lastTimestampRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [targetText, sealed, prefersReducedMotion]);

  return prefersReducedMotion ? targetText : displayedText;
}
