import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/tokens.stylex";

/**
 * The fill of each `SeriesTone`: a categorical palette for charts with
 * several series. The order passes the colour-blind checks for neighbours in
 * a stack, in both modes, so keep it.
 */
export const seriesFill = stylex.create({
  series1: { fill: "light-dark(#2a78d6, #3987e5)" },
  series2: { fill: "light-dark(#eb6834, #d95926)" },
  series3: { fill: "light-dark(#1baf7a, #199e70)" },
  series4: { fill: "light-dark(#eda100, #c98500)" },
  series5: { fill: "light-dark(#e87ba4, #d55181)" },
  series6: { fill: "light-dark(#008300, #008300)" },
  series7: { fill: "light-dark(#4a3aa7, #9085e9)" },
  series8: { fill: "light-dark(#e34948, #e66767)" },
  other: { fill: "light-dark(#b9b7b0, #55544f)" },
  accent: { fill: color.bgAccent },
});

/** The same colours as `seriesFill`, for a legend key or a list swatch. */
export const seriesKey = stylex.create({
  series1: { backgroundColor: "light-dark(#2a78d6, #3987e5)" },
  series2: { backgroundColor: "light-dark(#eb6834, #d95926)" },
  series3: { backgroundColor: "light-dark(#1baf7a, #199e70)" },
  series4: { backgroundColor: "light-dark(#eda100, #c98500)" },
  series5: { backgroundColor: "light-dark(#e87ba4, #d55181)" },
  series6: { backgroundColor: "light-dark(#008300, #008300)" },
  series7: { backgroundColor: "light-dark(#4a3aa7, #9085e9)" },
  series8: { backgroundColor: "light-dark(#e34948, #e66767)" },
  other: { backgroundColor: "light-dark(#b9b7b0, #55544f)" },
  accent: { backgroundColor: color.bgAccent },
});
