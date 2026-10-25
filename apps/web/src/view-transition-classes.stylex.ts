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
  // The Lab has no reduced-motion step that is long enough to see, so it
  // shortens to the least time that the browser still counts as an animation.
  labDuration: {
    default: duration._500,
    [motionConstants.REDUCED_MOTION]: "1ms",
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

// The Lab's Specimen cross-fades. Its snippet card slides to its new place.
// The browser draws the card's own content live through the transition,
// because the card animates its code on its own DOM. A snapshot of that code
// goes outside the card clip on a narrow screen. The group animation is the
// animation of the browser, so these classes set its timing, and its
// reduced-motion step, for the whole Lab in one place.
export const labMorph = stylex.viewTransitionClass({
  group: {
    animationDuration: viewTransitionTokens.labDuration,
    animationTimingFunction: easing.spring,
  },
});

export const labLive = stylex.viewTransitionClass({
  group: {
    animationDuration: viewTransitionTokens.labDuration,
    animationTimingFunction: easing.spring,
  },
  old: { display: "none" },
  new: { animationName: "none" },
});

export const inlineChatInputMorph = stylex.viewTransitionClass({
  group: {
    animationDuration: viewTransitionTokens.inputMorphDuration,
    animationTimingFunction: easing.spring,
  },
});
