import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/tokens.stylex";

/**
 * The marks every Finance chart shares, so a line, a bar and a stacked bar
 * read as one system: hairline solid gridlines, 2px lines with round joins,
 * a wash for an area, and a surface ring on a dot.
 */
export const chartMarks = stylex.create({
  gridline: {
    stroke: color.border,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  zeroLine: {
    stroke: color.fgMuted,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  axisLabel: {
    fill: color.fgMuted,
  },
  primaryLine: {
    fill: "none",
    stroke: color.bgAccent,
    strokeWidth: 2,
    strokeLinejoin: "round",
    strokeLinecap: "round",
  },
  primaryArea: {
    fill: `color-mix(in srgb, ${color.bgAccent} 12%, transparent)`,
    stroke: "none",
  },
  primaryFill: {
    fill: color.bgAccent,
  },
  trendLine: {
    fill: "none",
    stroke: color.fgMuted,
    strokeWidth: 2,
    strokeLinejoin: "round",
    strokeLinecap: "round",
    opacity: 0.7,
  },
  crosshair: {
    stroke: color.fgMuted,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  dotRing: {
    stroke: color.bgCanvas,
    strokeWidth: 2,
  },
  primaryKey: {
    backgroundColor: color.bgAccent,
  },
  trendKey: {
    backgroundColor: color.fgMuted,
    opacity: 0.7,
  },
});
