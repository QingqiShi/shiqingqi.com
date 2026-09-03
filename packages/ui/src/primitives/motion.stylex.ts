import * as stylex from "@stylexjs/stylex";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

export const motionConstants = stylex.defineConsts({
  REDUCED_MOTION,
});

/**
 * The one property every looping animation in the package shares, exposed so an
 * ancestor can hold the motion beneath it still.
 *
 * `animation-play-state` does not inherit, and the components that loop run
 * their animation on an inner element `css` cannot reach — so without this a
 * consumer has no way to pause them at all, which is the one shape of
 * customization the system otherwise always leaves open. A custom property
 * *does* inherit, so one declaration on a container reaches every looping
 * descendant, conditionally if it likes: a gallery tile can hold its specimens
 * still and start them on hover.
 *
 * It lives here rather than in a per-component token file because pausing is
 * not a Spinner dimension the way `width` is a Skeleton dimension — it is the
 * same property for every looping component, and a per-component token would
 * make each one's pause mechanism something a consumer has to look up.
 *
 * `"running"` is the default, so nothing changes for existing callers.
 */
export const motionTokens = stylex.defineVars({
  playState: "running",
});

// `defineConsts`, not a plain object: `@tuja/only-stylex-exports` gives
// the reason. Not `defineVars` either: nothing themes these at runtime.
//
// The scale covers every duration the package actually uses — the short end for
// transitions, `_800` and up for the looping animations in `animate` below and
// the components that roll their own.
export const duration = stylex.defineConsts({
  _75: "75ms",
  _100: "100ms",
  _150: "150ms",
  _200: "200ms",
  _300: "300ms",
  _400: "400ms",
  _500: "500ms",
  _700: "700ms",
  _800: "800ms",
  _1000: "1000ms",
  _1400: "1400ms",
  _1600: "1600ms",
  _2000: "2000ms",
});

export const easing = stylex.defineConsts({
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  entrance: "cubic-bezier(0.32, 0.72, 0, 1)",
  // A damped spring (zeta 0.6) sampled into `linear()`: it overshoots by 9%,
  // dips less than 1%, then settles. A cubic-bezier cannot cross 1 twice.
  spring:
    "linear(0, 0.101, 0.322, 0.568, 0.783, 0.941, 1.038, 1.085, 1.095, 1.083, 1.061, 1.038, 1.018, 1.004, 0.996, 0.992, 0.991, 0.992, 0.995, 0.998, 1)",
  // An overshooting bezier that approximates `spring` where `linear()` is
  // unsupported. It has no counter-dip, because a bezier cannot cross 1 twice.
  springFallback: "cubic-bezier(0.34, 1.3, 0.35, 1)",
  // Symmetric ease for looping attention states (pulse/shimmer), which need a
  // gentler hold at each end than `easeInOut` gives.
  pulse: "cubic-bezier(.4,0,.6,1)",
});

export const transition = stylex.create({
  none: { transition: "none" },
  all: {
    transition: {
      default: `all ${duration._200} ${easing.ease}`,
      [REDUCED_MOTION]: `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, opacity ${duration._200} ${easing.ease}`,
    },
  },
  colors: {
    transition: `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, border-color ${duration._200} ${easing.ease}`,
  },
  opacity: {
    transition: `opacity ${duration._200} ${easing.ease}`,
  },
  shadow: {
    transition: `box-shadow ${duration._200} ${easing.ease}`,
  },
  transform: {
    transition: {
      default: `transform ${duration._200} ${easing.ease}`,
      [REDUCED_MOTION]: "none",
    },
  },
  // Fades the themed scrollbar thumb in/out for `scrollbar.autoHide`
  // (layout.stylex.ts). Chromium interpolates `scrollbar-color`; other browsers
  // (and reduced-motion) get an instant swap.
  scrollbarColor: {
    transition: {
      default: `scrollbar-color ${duration._200} ${easing.easeOut}`,
      [REDUCED_MOTION]: "none",
    },
  },
});

const fadeInKeyframes = stylex.keyframes({
  from: { opacity: 0 },
});

const fadeOutKeyframes = stylex.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

const slideUpKeyframes = stylex.keyframes({
  from: { transform: "translateY(100%)" },
});

const slideDownKeyframes = stylex.keyframes({
  from: { transform: "translateY(-100%)" },
});

const pulseKeyframes = stylex.keyframes({
  "50%": { opacity: 0.1 },
});

const bounceKeyframes = stylex.keyframes({
  "0%, 80%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
  "40%": { opacity: 1, transform: "scale(1)" },
});

const expandKeyframes = stylex.keyframes({
  from: { gridTemplateRows: "0fr" },
  to: { gridTemplateRows: "1fr" },
});

const collapseKeyframes = stylex.keyframes({
  from: { gridTemplateRows: "1fr" },
  to: { gridTemplateRows: "0fr" },
});

export const animate = stylex.create({
  fadeIn: {
    animationName: fadeInKeyframes,
    animationDuration: duration._200,
    animationTimingFunction: easing.ease,
  },
  fadeOut: {
    animationName: fadeOutKeyframes,
    animationDuration: duration._200,
    animationTimingFunction: easing.ease,
  },
  slideUp: {
    animationName: {
      default: slideUpKeyframes,
      [REDUCED_MOTION]: "none",
    },
    animationDuration: duration._300,
    animationTimingFunction: easing.entrance,
  },
  slideDown: {
    animationName: {
      default: slideDownKeyframes,
      [REDUCED_MOTION]: "none",
    },
    animationDuration: duration._300,
    animationTimingFunction: easing.entrance,
  },
  pulse: {
    // No infinite motion under reduced-motion (mirrors Skeleton's own guard),
    // so consumers of the preset get the accessible behaviour for free.
    animationName: {
      default: pulseKeyframes,
      [REDUCED_MOTION]: "none",
    },
    animationDuration: duration._2000,
    animationTimingFunction: easing.pulse,
    animationIterationCount: "infinite",
  },
  bounce: {
    animationName: {
      default: bounceKeyframes,
      [REDUCED_MOTION]: "none",
    },
    animationDuration: duration._1400,
    animationTimingFunction: easing.easeInOut,
    animationIterationCount: "infinite",
    animationFillMode: "both",
  },
  expand: {
    display: "grid",
    animationName: expandKeyframes,
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
    animationFillMode: "forwards",
  },
  collapse: {
    display: "grid",
    animationName: collapseKeyframes,
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
    animationFillMode: "forwards",
  },
});
