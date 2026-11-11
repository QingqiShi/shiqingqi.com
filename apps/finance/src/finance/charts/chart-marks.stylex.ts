import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";

/**
 * The marks every Finance chart shares, so a line, a bar and a stacked bar
 * read as one system: hairline solid gridlines, 2px lines with round joins,
 * an area that fades towards zero, and a surface ring on a dot. A line, an
 * area stop and a dot paint in `currentColor`, so a group's `color` sets
 * the series colour of all three.
 */
export const chartMarks = stylex.create({
  gridline: {
    stroke: color.border,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  zeroLine: {
    stroke: color.mutedForeground,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  axisLabel: {
    fill: color.mutedForeground,
  },
  line: {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinejoin: "round",
    strokeLinecap: "round",
  },
  areaStop: {
    stopColor: "currentColor",
  },
  dotFill: {
    fill: "currentColor",
  },
  trendLine: {
    fill: "none",
    stroke: color.mutedForeground,
    strokeWidth: 2,
    strokeLinejoin: "round",
    strokeLinecap: "round",
    opacity: 0.7,
  },
  crosshair: {
    stroke: color.mutedForeground,
    strokeWidth: 1,
    shapeRendering: "crispEdges",
  },
  dotRing: {
    stroke: color.card,
    strokeWidth: 2,
  },
  primaryKey: {
    backgroundColor: color.primary,
  },
  trendKey: {
    backgroundColor: color.mutedForeground,
    opacity: 0.7,
  },
  neutralKey: {
    backgroundColor: `color-mix(in srgb, ${color.mutedForeground} 60%, transparent)`,
  },
  referenceKey: {
    backgroundColor: color.foreground,
  },
});
