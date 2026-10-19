import type {
  MeasureText,
  ReportImageCommand,
  ReportImageDrawing,
  ReportImageFont,
  ReportImagePaint,
} from "./build-report-image-drawing.ts";

/** The largest canvas iOS Safari draws, in pixels; a larger one stays blank. */
const MAX_CANVAS_AREA = 4096 * 4096;

/** Inter is the page's font; its `@font-face` covers Latin only, so other text falls back to the device's sans-serif. */
function fontOf({ size, weight }: ReportImageFont) {
  return `${String(weight)} ${String(size)}px Inter, sans-serif`;
}

function paintOf(
  context: CanvasRenderingContext2D,
  paint: ReportImagePaint,
): string | CanvasGradient {
  if (typeof paint === "string") return paint;
  const gradient = context.createLinearGradient(0, paint.y0, 0, paint.y1);
  for (const stop of paint.stops) {
    gradient.addColorStop(stop.offset, stop.color);
  }
  return gradient;
}

function paintCommand(
  context: CanvasRenderingContext2D,
  command: ReportImageCommand,
) {
  switch (command.kind) {
    case "rect":
      context.fillStyle = command.color;
      context.beginPath();
      context.roundRect(
        command.x,
        command.y,
        command.width,
        command.height,
        command.radius ?? 0,
      );
      context.fill();
      return;
    case "path": {
      const path = new Path2D(command.d);
      context.save();
      context.translate(command.x, command.y);
      if (command.fill !== undefined) {
        context.fillStyle = paintOf(context, command.fill);
        context.fill(path);
      }
      if (command.stroke !== undefined) {
        context.strokeStyle = command.stroke.color;
        context.lineWidth = command.stroke.width;
        context.setLineDash(command.stroke.dash ?? []);
        context.lineCap = command.stroke.round ? "round" : "butt";
        context.lineJoin = command.stroke.round ? "round" : "miter";
        context.stroke(path);
      }
      context.restore();
      return;
    }
    case "text":
      context.font = fontOf(command.font);
      context.fillStyle = command.color;
      context.textAlign = command.align;
      context.textBaseline = command.baseline;
      context.fillText(command.text, command.x, command.y);
      return;
  }
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The canvas gave no PNG"));
    }, "image/png");
  });
}

/**
 * Draws the share image on a canvas and returns it as a PNG. `draw` gets a
 * `measureText` with Inter loaded, so it can fit names to their columns. An
 * image too tall for the canvas limit is drawn smaller, not cut.
 */
export async function paintReportImage(
  draw: (measureText: MeasureText) => ReportImageDrawing,
): Promise<Blob> {
  await Promise.all(
    ([400, 600, 700] as const).map((weight) =>
      document.fonts.load(fontOf({ size: 20, weight })),
    ),
  );
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The canvas has no 2D context");
  const measureText: MeasureText = (text, font) => {
    context.font = fontOf(font);
    return context.measureText(text).width;
  };
  const drawing = draw(measureText);
  const scale = Math.min(
    1,
    Math.sqrt(MAX_CANVAS_AREA / (drawing.width * drawing.height)),
  );
  canvas.width = Math.floor(drawing.width * scale);
  canvas.height = Math.floor(drawing.height * scale);
  context.scale(scale, scale);
  for (const command of drawing.commands) paintCommand(context, command);
  try {
    return await toPng(canvas);
  } finally {
    // iOS Safari frees a canvas late and limits the memory of all canvases.
    canvas.width = 0;
    canvas.height = 0;
  }
}
