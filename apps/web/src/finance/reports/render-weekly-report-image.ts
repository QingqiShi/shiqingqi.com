import { ImageResponse } from "next/og";
import { FINANCE_NO_STORE } from "../http/finance-json.ts";
import {
  buildReportImage,
  REPORT_IMAGE_SIZE,
  type ReportImageOptions,
} from "./build-report-image.tsx";
import { collectElementText } from "./collect-element-text.ts";
import type { ReportFont } from "./load-report-fonts.ts";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/** Renders a weekly Report's share image as a PNG response. */
export async function renderWeeklyReportImage(
  data: WeeklyReportData,
  options: ReportImageOptions,
  loadFonts: (text: string) => Promise<ReportFont[]>,
): Promise<Response> {
  const element = buildReportImage(data, options);
  let fonts: ReportFont[] = [];
  try {
    fonts = await loadFonts(collectElementText(element));
  } catch (error) {
    console.error("Report image fonts failed to load", error);
  }
  const response = new ImageResponse(element, {
    ...REPORT_IMAGE_SIZE,
    ...(fonts.length > 0 ? { fonts } : {}),
  });
  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": FINANCE_NO_STORE,
    },
  });
}
