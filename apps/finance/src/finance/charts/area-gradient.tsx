import type { TimeSeriesGeometry } from "./build-time-series-geometry.ts";
import { chartMarks } from "./chart-marks.stylex.ts";
import { toneColor } from "./tone-color.stylex.ts";

const AREA_DEPTH = 0.32;

export function AreaGradient({
  id,
  gradient,
  tone,
}: {
  id: string;
  gradient: TimeSeriesGeometry["gradient"];
  tone: keyof typeof toneColor;
}) {
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={0}
      x2={0}
      y1={gradient.y1}
      y2={gradient.y2}
      css={toneColor[tone]}
    >
      {gradient.stops.map((stop, index) => (
        <stop
          key={index}
          offset={stop.offset}
          stopOpacity={stop.strength * AREA_DEPTH}
          css={chartMarks.areaStop}
        />
      ))}
    </linearGradient>
  );
}
