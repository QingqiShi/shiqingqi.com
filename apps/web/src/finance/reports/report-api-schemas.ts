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

const weeklyReportResponseSchema = z.object({
  id: z.string(),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  generatedAt: z.string(),
  data: weeklyReportDataSchema,
});

const regenerateReportResponseSchema = z.object({
  id: z.string(),
  periodEnd: z.iso.date(),
  /** False when the stored Report already had this data. */
  written: z.boolean(),
  /** The Household clock after the write; pull to see the Report in the list. */
  clock: z.number().int(),
});

/** The response bodies of the Report routes, shared by the handlers and the client. */
export const reportApiSchemas = {
  report: weeklyReportResponseSchema,
  regenerate: regenerateReportResponseSchema,
};

export type WeeklyReportResponse = z.infer<typeof weeklyReportResponseSchema>;
export type RegenerateReportResponse = z.infer<
  typeof regenerateReportResponseSchema
>;
