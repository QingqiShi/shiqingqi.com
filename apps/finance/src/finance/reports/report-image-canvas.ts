import { gray } from "@tuja/ui/palette/gray.stylex";
import { green } from "@tuja/ui/palette/green.stylex";
import { red } from "@tuja/ui/palette/red.stylex";
import { area, line } from "d3-shape";
import {
  IMAGE_CONTENT_WIDTH,
  IMAGE_PADDING,
  IMAGE_RULE_GAP,
} from "./report-image-layout.ts";

export interface ReportImageFont {
  size: number;
  weight: 400 | 600 | 700;
}

/** The width of `text` in `font`, in pixels. */
export type MeasureText = (text: string, font: ReportImageFont) => number;

/** A fill or stroke colour; a gradient runs down the path from `y0` to `y1`. */
export type ReportImagePaint =
  | string
  | {
      y0: number;
      y1: number;
      stops: { offset: number; color: string }[];
    };

export type ReportImageCommand =
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      radius?: number;
    }
  | {
      kind: "path";
      /** SVG path data, drawn with its origin at `x`, `y`. */
      d: string;
      x: number;
      y: number;
      fill?: ReportImagePaint;
      stroke?: {
        color: string;
        width: number;
        round?: boolean;
      };
    }
  | {
      kind: "text";
      text: string;
      x: number;
      y: number;
      font: ReportImageFont;
      color: string;
      align: "left" | "right" | "center";
      /** `alphabetic` puts the baseline on `y`; `middle` centres the line on it. */
      baseline: "alphabetic" | "middle";
      /** An outline under the text, in the background colour, so a line behind it stops short of each letter. */
      halo?: { color: string; width: number };
    };

export interface ReportImageDrawing {
  width: number;
  height: number;
  commands: ReportImageCommand[];
}

interface TextRun {
  text: string;
  font: ReportImageFont;
  color: string;
}

export const fonts = {
  heading: { size: 21, weight: 700 },
  hero: { size: 88, weight: 700 },
  stat: { size: 26, weight: 700 },
  statNote: { size: 26, weight: 400 },
  title: { size: 26, weight: 700 },
  amount: { size: 32, weight: 700 },
  groupName: { size: 21, weight: 600 },
  body: { size: 21, weight: 400 },
  caption: { size: 18, weight: 400 },
  captionStrong: { size: 18, weight: 600 },
} satisfies Record<string, ReportImageFont>;

export const colors = {
  background: gray._97,
  ink: gray._13,
  muted: gray._30,
  hairline: gray._90,
  axis: gray._80,
  track: gray._92,
  accent: gray._13,
  gain: green._30,
  loss: red._30,
};

/** `color` (#RRGGBB) at `opacity`, as #RRGGBBAA. */
export function withOpacity(color: string, opacity: number) {
  return `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export function signColor(minor: number) {
  if (minor > 0) return colors.gain;
  if (minor < 0) return colors.loss;
  return colors.muted;
}

export function linePath(x1: number, y1: number, x2: number, y2: number) {
  return `M ${String(x1)} ${String(y1)} L ${String(x2)} ${String(y2)}`;
}

export function circlePath(cx: number, cy: number, r: number) {
  return `M ${String(cx - r)} ${String(cy)} a ${String(r)} ${String(r)} 0 1 0 ${String(r * 2)} 0 a ${String(r)} ${String(r)} 0 1 0 ${String(-r * 2)} 0`;
}

/** The line through the points `xs`, `ys`, and the area under it down to `baseline`. */
export function lineAndArea(
  xs: readonly number[],
  ys: readonly number[],
  baseline: number,
) {
  const indices = Array.from(xs.keys());
  const x = (index: number) => xs[index];
  const y = (index: number) => ys[index];
  return {
    line: line<number>().x(x).y(y).digits(1)(indices) ?? "",
    area: area<number>().x(x).y0(baseline).y1(y).digits(1)(indices) ?? "",
  };
}

export function reportImageCanvas(measureText: MeasureText) {
  const commands: ReportImageCommand[] = [];

  function rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    radius?: number,
  ) {
    commands.push({ kind: "rect", x, y, width, height, color, radius });
  }

  function path(
    d: string,
    x: number,
    y: number,
    style: Pick<
      Extract<ReportImageCommand, { kind: "path" }>,
      "fill" | "stroke"
    >,
  ) {
    commands.push({ kind: "path", d, x, y, ...style });
  }

  /** Draws `value` and returns its width; `maxWidth` cuts it short with an ellipsis. */
  function text(
    value: string,
    x: number,
    y: number,
    font: ReportImageFont,
    color: string,
    {
      align = "left",
      baseline = "middle",
      maxWidth,
      halo,
    }: {
      align?: "left" | "right" | "center";
      baseline?: "alphabetic" | "middle";
      maxWidth?: number;
      halo?: number;
    } = {},
  ) {
    const fitted = maxWidth === undefined ? value : fit(value, font, maxWidth);
    if (fitted === "") return 0;
    commands.push({
      kind: "text",
      text: fitted,
      x,
      y,
      font,
      color,
      align,
      baseline,
      halo:
        halo === undefined
          ? undefined
          : { color: colors.background, width: halo },
    });
    return measureText(fitted, font);
  }

  /** `value`, cut short with an ellipsis when it is wider than `maxWidth`. */
  function fit(value: string, font: ReportImageFont, maxWidth: number) {
    if (measureText(value, font) <= maxWidth) return value;
    const characters = Array.from(value);
    let low = 0;
    let high = characters.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      const candidate = `${characters.slice(0, middle).join("").trimEnd()}…`;
      if (measureText(candidate, font) <= maxWidth) low = middle;
      else high = middle - 1;
    }
    return low === 0 ? "" : `${characters.slice(0, low).join("").trimEnd()}…`;
  }

  /** Draws `parts` one after the other from `x` and returns their width. */
  function runs(
    parts: readonly TextRun[],
    x: number,
    y: number,
    options: { baseline?: "alphabetic" | "middle"; halo?: number } = {},
  ) {
    let width = 0;
    for (const part of parts) {
      width += text(part.text, x + width, y, part.font, part.color, options);
    }
    return width;
  }

  function runsWidth(parts: readonly TextRun[]) {
    return parts.reduce(
      (width, part) => width + measureText(part.text, part.font),
      0,
    );
  }

  /** A rule across the image, then a section title over `top`. */
  function sectionStart(title: string, top: number) {
    rect(
      left,
      top - IMAGE_RULE_GAP - 1.5,
      IMAGE_CONTENT_WIDTH,
      1.5,
      colors.hairline,
    );
    text(title, left, top + 17, fonts.title, colors.ink);
  }

  const left = IMAGE_PADDING;
  const contentRight = IMAGE_PADDING + IMAGE_CONTENT_WIDTH;

  return {
    commands,
    measureText,
    left,
    contentRight,
    rect,
    path,
    text,
    runs,
    runsWidth,
    sectionStart,
  };
}

export type ReportImageCanvas = ReturnType<typeof reportImageCanvas>;
