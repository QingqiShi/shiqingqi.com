import * as stylex from "@stylexjs/stylex";
import { cyan } from "../../_generated/palette/hues/cyan.stylex.ts";
import { gray } from "../../_generated/palette/hues/gray.stylex.ts";
import { green } from "../../_generated/palette/hues/green.stylex.ts";
import { purple } from "../../_generated/palette/hues/purple.stylex.ts";

// Code sits on `bgSurfaceRaised` — gray._100 in light, gray._7 in dark. Every
// colour below clears WCAG AA (4.5:1) there; `syntax.contrast.test.ts` measures
// it.
//
// Three hues, not nine. `plain` matches textMain, so a snippet reads as part
// of the page; `punct` then `comment` step down from it, at gray._30 and _40
// in light and gray._80 and _60 in dark. Each hue holds one tone per theme, so
// the three differ in hue alone. Green takes _60 in the dark theme because its
// ramp runs bright at _70.
//
// Kinds share a colour when they share a job. A string and a number are both
// literals. An attribute name and a property name both name a value. A
// lowercase tag is scaffolding around the component the page documents, so it
// stays with the punctuation.

const light = {
  plain: gray._13,
  keyword: purple._30,
  string: green._30,
  comment: gray._40,
  number: green._30,
  tag: gray._30,
  component: purple._30,
  attr: cyan._30,
  property: cyan._30,
  punct: gray._30,
};

const dark: { [key in keyof typeof light]: string } = {
  plain: gray._92,
  keyword: purple._70,
  string: green._60,
  comment: gray._60,
  number: green._60,
  tag: gray._80,
  component: purple._70,
  attr: cyan._70,
  property: cyan._70,
  punct: gray._80,
};

export const syntax = stylex.defineVars({
  plain: `light-dark(${light.plain}, ${dark.plain})`,
  keyword: `light-dark(${light.keyword}, ${dark.keyword})`,
  string: `light-dark(${light.string}, ${dark.string})`,
  comment: `light-dark(${light.comment}, ${dark.comment})`,
  number: `light-dark(${light.number}, ${dark.number})`,
  tag: `light-dark(${light.tag}, ${dark.tag})`,
  component: `light-dark(${light.component}, ${dark.component})`,
  attr: `light-dark(${light.attr}, ${dark.attr})`,
  property: `light-dark(${light.property}, ${dark.property})`,
  punct: `light-dark(${light.punct}, ${dark.punct})`,
});
