import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";

/**
 * The colour of each `SeriesTone`: a categorical palette for charts with
 * several series. The order passes the colour-blind checks for neighbours in
 * a stack, in both modes, so keep it.
 */
export const seriesColor = stylex.defineConsts({
  series1: "light-dark(#2a78d6, #3987e5)",
  series2: "light-dark(#eb6834, #d95926)",
  series3: "light-dark(#1baf7a, #199e70)",
  series4: "light-dark(#eda100, #c98500)",
  series5: "light-dark(#e87ba4, #d55181)",
  series6: "light-dark(#008300, #008300)",
  series7: "light-dark(#4a3aa7, #9085e9)",
  series8: "light-dark(#e34948, #e66767)",
  other: "light-dark(#b9b7b0, #55544f)",
});

/** The fill of each `SeriesTone`. */
export const seriesFill = stylex.create({
  series1: { fill: seriesColor.series1 },
  series2: { fill: seriesColor.series2 },
  series3: { fill: seriesColor.series3 },
  series4: { fill: seriesColor.series4 },
  series5: { fill: seriesColor.series5 },
  series6: { fill: seriesColor.series6 },
  series7: { fill: seriesColor.series7 },
  series8: { fill: seriesColor.series8 },
  other: { fill: seriesColor.other },
  primary: { fill: color.primary },
});

/** The same colours as `seriesFill`, for a legend key or a list swatch. */
export const seriesKey = stylex.create({
  series1: { backgroundColor: seriesColor.series1 },
  series2: { backgroundColor: seriesColor.series2 },
  series3: { backgroundColor: seriesColor.series3 },
  series4: { backgroundColor: seriesColor.series4 },
  series5: { backgroundColor: seriesColor.series5 },
  series6: { backgroundColor: seriesColor.series6 },
  series7: { backgroundColor: seriesColor.series7 },
  series8: { backgroundColor: seriesColor.series8 },
  other: { backgroundColor: seriesColor.other },
  primary: { backgroundColor: color.primary },
});

/** The same colours as `seriesFill`, for a stroke, such as a slice of a ring. */
export const seriesStroke = stylex.create({
  series1: { stroke: seriesColor.series1 },
  series2: { stroke: seriesColor.series2 },
  series3: { stroke: seriesColor.series3 },
  series4: { stroke: seriesColor.series4 },
  series5: { stroke: seriesColor.series5 },
  series6: { stroke: seriesColor.series6 },
  series7: { stroke: seriesColor.series7 },
  series8: { stroke: seriesColor.series8 },
  other: { stroke: seriesColor.other },
  primary: { stroke: color.primary },
});

/** The same colours as `seriesFill`, faint, for the tile behind an icon. "Other" takes twice the share, as its grey is pale. */
export const seriesTint = stylex.create({
  series1: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series1} 12%, transparent), color-mix(in srgb, ${seriesColor.series1} 20%, transparent))`,
  },
  series2: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series2} 12%, transparent), color-mix(in srgb, ${seriesColor.series2} 20%, transparent))`,
  },
  series3: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series3} 12%, transparent), color-mix(in srgb, ${seriesColor.series3} 20%, transparent))`,
  },
  series4: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series4} 12%, transparent), color-mix(in srgb, ${seriesColor.series4} 20%, transparent))`,
  },
  series5: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series5} 12%, transparent), color-mix(in srgb, ${seriesColor.series5} 20%, transparent))`,
  },
  series6: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series6} 12%, transparent), color-mix(in srgb, ${seriesColor.series6} 20%, transparent))`,
  },
  series7: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series7} 12%, transparent), color-mix(in srgb, ${seriesColor.series7} 20%, transparent))`,
  },
  series8: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.series8} 12%, transparent), color-mix(in srgb, ${seriesColor.series8} 20%, transparent))`,
  },
  other: {
    backgroundColor: `light-dark(color-mix(in srgb, ${seriesColor.other} 24%, transparent), color-mix(in srgb, ${seriesColor.other} 40%, transparent))`,
  },
  primary: { backgroundColor: color.primarySubtle },
});
