import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";

// `viewTransitionClass` takes a plain value only, not a condition. A custom
// property can hold a condition, and the view-transition pseudo-elements
// inherit it from the root element. So each value that changes for reduced
// motion is a custom property here.
export const viewTransitionTokens = stylex.defineVars({
  riseDistance: {
    default: "1.5rem",
    [motionConstants.REDUCED_MOTION]: "0rem",
  },
  riseEasing: {
    default: easing.spring,
    [motionConstants.REDUCED_MOTION]: easing.ease,
  },
  riseInDuration: {
    default: duration._500,
    [motionConstants.REDUCED_MOTION]: duration._150,
  },
  riseOutDuration: {
    default: duration._400,
    [motionConstants.REDUCED_MOTION]: duration._150,
  },
  inputMorphDuration: {
    default: duration._700,
    [motionConstants.REDUCED_MOTION]: duration._150,
  },
});

const riseInFrames = stylex.keyframes({
  from: {
    transform: `translateY(${viewTransitionTokens.riseDistance})`,
    opacity: 0,
  },
});

const riseOutFrames = stylex.keyframes({
  to: {
    transform: `translateY(${viewTransitionTokens.riseDistance})`,
    opacity: 0,
  },
});

const fadeInFrames = stylex.keyframes({
  from: { opacity: 0 },
});

const fadeOutFrames = stylex.keyframes({
  to: { opacity: 0 },
});

// The distance is shorter than a full slide, so the rise pairs with the shared
// input morph. Under reduced motion the distance is zero, which leaves a fade.
export const riseIn = stylex.viewTransitionClass({
  new: {
    animationName: riseInFrames,
    animationDuration: viewTransitionTokens.riseInDuration,
    animationTimingFunction: viewTransitionTokens.riseEasing,
    animationFillMode: "forwards",
  },
});

export const riseOut = stylex.viewTransitionClass({
  old: {
    animationName: riseOutFrames,
    animationDuration: viewTransitionTokens.riseOutDuration,
    animationTimingFunction: viewTransitionTokens.riseEasing,
    animationFillMode: "forwards",
  },
});

export const softFadeIn = stylex.viewTransitionClass({
  new: {
    animationName: fadeInFrames,
    animationDuration: duration._200,
    animationTimingFunction: easing.ease,
    animationDelay: duration._75,
    animationFillMode: "both",
  },
});

export const softFadeOut = stylex.viewTransitionClass({
  old: {
    animationName: fadeOutFrames,
    animationDuration: duration._200,
    animationTimingFunction: easing.ease,
    animationFillMode: "forwards",
  },
});

export const inlineChatInputMorph = stylex.viewTransitionClass({
  group: {
    animationDuration: viewTransitionTokens.inputMorphDuration,
    animationTimingFunction: easing.spring,
  },
});
