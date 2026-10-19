import { queryOptions } from "@tanstack/react-query";
import {
  buildReportImageDrawing,
  type ReportImageOptions,
} from "../reports/build-report-image-drawing.ts";
import { paintReportImage } from "../reports/paint-report-image.ts";
import type { WeeklyReportResponse } from "../reports/report-api-schemas.ts";
import type { ReportImageCopy } from "../reports/use-report-image-copy.ts";

const HOUR = 60 * 60 * 1000;

/** A Report's share image as a PNG, drawn on the device. */
export const reportImageQuery = (
  report: WeeklyReportResponse,
  options: ReportImageOptions,
  copy: ReportImageCopy,
) =>
  queryOptions({
    queryKey: [
      "finance",
      "report-image",
      report.id,
      report.generatedAt,
      options,
    ],
    queryFn: () =>
      paintReportImage((measureText) =>
        buildReportImageDrawing(report.data, {
          ...options,
          copy,
          measureText,
        }),
      ),
    staleTime: Infinity,
    gcTime: HOUR,
    retry: false,
  });
