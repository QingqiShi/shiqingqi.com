import { z } from "zod";
import type { FinanceSession } from "../auth/types.ts";
import { reportRepository } from "../db/repositories/report-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import type { FinanceDb } from "../db/types.ts";
import { FINANCE_NO_STORE, financeJson } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardOptions,
} from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import type { LimitFinanceRequest } from "../http/types.ts";
import { generateWeeklyReports } from "./generate-weekly-reports.ts";
import type { ReportFont } from "./load-report-fonts.ts";
import { renderWeeklyReportImage } from "./render-weekly-report-image.ts";
import type {
  OutdatedReportResponse,
  RegenerateReportResponse,
  ReportApiErrorCode,
  ReportListItem,
  ReportListResponse,
  WeeklyReportResponse,
} from "./report-api-schemas.ts";
import { weeklyReportDataSchema } from "./weekly-report-data-schema.ts";

interface ReportHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  loadFonts: (text: string) => Promise<ReportFont[]>;
  now: () => Date;
  limitRequest?: LimitFinanceRequest;
}

/** The second argument Next.js passes a handler of a `[id]` route. */
interface ReportRouteContext {
  params: Promise<{ id: string }>;
}

const regenerateSchema = z.object({ periodEnd: z.iso.date().optional() });
const imageQuerySchema = z.object({
  locale: z.enum(["en", "zh"]).catch("en"),
  names: z
    .string()
    .nullable()
    .transform((value) => value === "1"),
});

function failure(code: ReportApiErrorCode, status: number) {
  return financeJson({ error: code }, { status });
}

function outdated(periodEnd: string) {
  return financeJson(
    { error: "outdated", periodEnd } satisfies OutdatedReportResponse,
    { status: 409 },
  );
}

function toReportListItem(row: {
  id: string;
  periodStart: string;
  periodEnd: string;
}): ReportListItem {
  return { id: row.id, periodStart: row.periodStart, periodEnd: row.periodEnd };
}

/** The Report id of a `[id]` route, or null when it is not a UUID. */
async function parseReportId(context: ReportRouteContext) {
  const { id } = await context.params;
  return z.uuid().safeParse(id).success ? id : null;
}

/**
 * The Report routes under `/api/finance/reports/`. Every route needs a
 * session, and the Household comes from it; Regenerate and delete also need
 * a same-origin request.
 */
export function makeReportHandlers(dependencies: ReportHandlerDependencies) {
  async function guard(request: Request, options: FinanceRequestGuardOptions) {
    const session = await guardFinanceRequest(dependencies, request, options);
    if (session instanceof Response) return session;
    return { db: dependencies.getDb(), householdId: session.householdId };
  }

  async function findReport(
    scope: RepositoryScope,
    context: ReportRouteContext,
  ) {
    const id = await parseReportId(context);
    if (id === null) return null;
    const row = await reportRepository.findById(scope, id);
    if (!row) return null;
    const data = weeklyReportDataSchema.safeParse(row.data);
    return { row, data: data.success ? data.data : null };
  }

  return {
    /** `GET /api/finance/reports`: every Report without its data, newest week first. */
    async listReports(request: Request) {
      const scope = await guard(request, { write: false });
      if (scope instanceof Response) return scope;
      const rows = await reportRepository.list(scope);
      return financeJson({
        reports: rows.map(toReportListItem),
      } satisfies ReportListResponse);
    },

    /** `GET /api/finance/reports/[id]`: one Report with its data. */
    async getReport(request: Request, context: ReportRouteContext) {
      const scope = await guard(request, { write: false });
      if (scope instanceof Response) return scope;
      const report = await findReport(scope, context);
      if (!report) return failure("not-found", 404);
      if (!report.data) return outdated(report.row.periodEnd);
      return financeJson({
        ...toReportListItem(report.row),
        generatedAt: report.row.generatedAt.toISOString(),
        data: report.data,
      } satisfies WeeklyReportResponse);
    },

    /** `POST /api/finance/reports/regenerate` `{ periodEnd? }`: builds the Report of that week again; the default is last week. */
    async regenerate(request: Request) {
      const scope = await guard(request, {
        write: true,
        rateLimit: { bucket: "report-regenerate", per: "household" },
      });
      if (scope instanceof Response) return scope;
      const body = await readFinanceBody(request, regenerateSchema);
      if (body instanceof Response) return body;
      const { periodEnd } = body;
      const result = await generateWeeklyReports(
        scope.db,
        scope.householdId,
        dependencies.now(),
        periodEnd === undefined ? "last" : [periodEnd],
      );
      const report = result.reports.at(0);
      if (!report) return failure("week-not-ended", 400);
      return financeJson({
        id: report.id,
        periodEnd: report.periodEnd,
        written: result.written > 0,
      } satisfies RegenerateReportResponse);
    },

    /** `DELETE /api/finance/reports/[id]`: deletes one Report. Any Member may. */
    async remove(request: Request, context: ReportRouteContext) {
      const scope = await guard(request, { write: true });
      if (scope instanceof Response) return scope;
      const id = await parseReportId(context);
      const removed = id !== null && (await reportRepository.remove(scope, id));
      if (!removed) return failure("not-found", 404);
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": FINANCE_NO_STORE },
      });
    },

    /** `GET /api/finance/reports/[id]/image?locale=en|zh&names=0|1`: the share image as a PNG. */
    async image(request: Request, context: ReportRouteContext) {
      const scope = await guard(request, {
        write: false,
        rateLimit: { bucket: "report-image", per: "household" },
      });
      if (scope instanceof Response) return scope;
      const report = await findReport(scope, context);
      if (!report) return failure("not-found", 404);
      if (!report.data) return outdated(report.row.periodEnd);
      const { searchParams } = new URL(request.url);
      const query = imageQuerySchema.parse({
        locale: searchParams.get("locale"),
        names: searchParams.get("names"),
      });
      return renderWeeklyReportImage(
        report.data,
        { locale: query.locale, includeNames: query.names },
        dependencies.loadFonts,
      );
    },
  };
}
