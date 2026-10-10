import { z } from "zod";
import { weeklyReportDataSchema } from "./weekly-report-data-schema.ts";

/** The `error` codes the Report routes answer with. */
export type ReportApiErrorCode =
  | "not-configured"
  | "forbidden-origin"
  | "unauthorised"
  | "not-found"
  | "outdated"
  | "invalid-json"
  | "invalid-body"
  | "week-not-ended"
  | "too-many-requests";

const reportListItemSchema = z.object({
  id: z.string(),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
});

const reportListResponseSchema = z.object({
  /** Newest week first. */
  reports: z.array(reportListItemSchema),
});

const weeklyReportResponseSchema = reportListItemSchema.extend({
  generatedAt: z.string(),
  data: weeklyReportDataSchema,
});

/** The 409 body of a Report stored with an older data version: regenerate `periodEnd`, then read it again. */
const outdatedReportResponseSchema = z.object({
  error: z.literal("outdated"),
  periodEnd: z.iso.date(),
});

const regenerateReportResponseSchema = z.object({
  id: z.string(),
  periodEnd: z.iso.date(),
  /** False when the stored Report already had this data. */
  written: z.boolean(),
});

/** The response bodies of the Report routes, shared by the handlers and the client. */
export const reportApiSchemas = {
  list: reportListResponseSchema,
  report: weeklyReportResponseSchema,
  outdated: outdatedReportResponseSchema,
  regenerate: regenerateReportResponseSchema,
};

export type ReportListItem = z.infer<typeof reportListItemSchema>;
export type ReportListResponse = z.infer<typeof reportListResponseSchema>;
export type WeeklyReportResponse = z.infer<typeof weeklyReportResponseSchema>;
export type OutdatedReportResponse = z.infer<
  typeof outdatedReportResponseSchema
>;
export type RegenerateReportResponse = z.infer<
  typeof regenerateReportResponseSchema
>;
