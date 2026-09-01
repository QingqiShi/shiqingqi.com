import * as stylex from "@stylexjs/stylex";

// Code sits on `bgSurfaceRaised` — gray._100 in light, gray._7 in dark. Every
// colour below clears WCAG AA (4.5:1) there; `syntax.contrast.test.ts` measures
// it.
//
// Three hues, not nine. The greys repeat the text ladder, so a snippet reads as
// part of the page: `plain` is textMain, `punct` textMuted, `comment`
// textSubtle. Each hue holds one tone per theme, so the three differ in hue
// alone. Green takes _60 in the dark theme because its ramp runs bright at _70.
//
// Kinds share a colour when they share a job. A string and a number are both
// literals. An attribute name and a property name both name a value. A
// lowercase tag is scaffolding around the component the page documents, so it
// stays with the punctuation.
//
// The tones are written out rather than imported: StyleX inlines a
// `defineConsts` member only from a relative import, and `@tuja/ui/palette/*`
// crosses a package boundary. `syntax.contrast.test.ts` compares each value
// with the hue it names, so a regenerated palette cannot drift away unseen.

const light = {
  plain: "#212220", // gray._13
  keyword: "#6B0098", // purple._30
  string: "#00581E", // green._30
  comment: "#5E5E5C", // gray._40
  number: "#00581E", // green._30
  tag: "#464744", // gray._30
  component: "#6B0098", // purple._30
  attr: "#004D6B", // cyan._30
  property: "#004D6B", // cyan._30
  punct: "#464744", // gray._30
};

const dark: { [key in keyof typeof light]: string } = {
  plain: "#E9E8E4", // gray._92
  keyword: "#DA8EFF", // purple._70
  string: "#48D766", // green._60
  comment: "#91918E", // gray._60
  number: "#48D766", // green._60
  tag: "#C7C6C3", // gray._80
  component: "#DA8EFF", // purple._70
  attr: "#48BCF6", // cyan._70
  property: "#48BCF6", // cyan._70
  punct: "#C7C6C3", // gray._80
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
