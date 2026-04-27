import * as stylex from "@stylexjs/stylex";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

export const motionConstants = stylex.defineConsts({
  REDUCED_MOTION,
});

export const duration = {
  _75: "75ms",
  _100: "100ms",
  _150: "150ms",
  _200: "200ms",
  _300: "300ms",
  _500: "500ms",
  _700: "700ms",
  _1000: "1000ms",
} as const;

export const easing = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  entrance: "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;

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
    animationDuration: "200ms",
    animationTimingFunction: "ease",
  },
  fadeOut: {
    animationName: fadeOutKeyframes,
    animationDuration: "200ms",
    animationTimingFunction: "ease",
  },
  slideUp: {
    animationName: {
      default: slideUpKeyframes,
      [REDUCED_MOTION]: "none",
    },
    animationDuration: "300ms",
    animationTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
  },
  slideDown: {
    animationName: {
      default: slideDownKeyframes,
      [REDUCED_MOTION]: "none",
    },
    animationDuration: "300ms",
    animationTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
  },
  pulse: {
    animationName: pulseKeyframes,
    animationDuration: "2s",
    animationTimingFunction: "cubic-bezier(.4,0,.6,1)",
    animationIterationCount: "infinite",
  },
  bounce: {
    animationName: bounceKeyframes,
    animationDuration: "1.4s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  },
  expand: {
    display: "grid",
    animationName: expandKeyframes,
    animationDuration: "300ms",
    animationTimingFunction: "ease-out",
    animationFillMode: "forwards",
  },
  collapse: {
    display: "grid",
    animationName: collapseKeyframes,
    animationDuration: "300ms",
    animationTimingFunction: "ease-out",
    animationFillMode: "forwards",
  },
});
