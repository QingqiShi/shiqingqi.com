import { and, eq, gte, isNull } from "drizzle-orm";
import type { CalendarPolicy } from "#src/assistant/agent/calendar/run-calendars.ts";
import {
  agentActions,
  agentRuns,
  morningReportPreviews,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import {
  openReportMailboxes,
  readReportAccounts,
  reportContent,
  reportMailStart,
  runReportOverMailboxes,
  type ReportBuildDeps,
} from "./build-morning-report.ts";
import type { ClaimedReportPreview } from "./claim-report-preview.ts";
import { localClock } from "./due-report-date.ts";
import { MORNING_REPORT_BUDGET_MS } from "./make-morning-report-cron.ts";
import { previewMailboxSession } from "./preview-mailbox-session.ts";

/** A preview changes no calendar: every write tool refuses with this. */
const readOnlyCalendars: CalendarPolicy = () => ({
  canWrite: false,
  refusal:
    "This is a preview, so the calendar was not changed. Say in the report what you would change.",
});

/**
 * The Message-IDs, per account, of the mail that real reports marked read since
 * `since`. A preview covers this mail as if it were still unread, as a real
 * report sees it. A mail marked read comes after its arrival, so no older row
 * can be of mail that the preview covers.
 */
async function readMailMarkedReadByReports(
  { db, userId }: UserScope,
  since: Date,
): Promise<Map<string, Set<string>>> {
  const rows = await db
    .select({
      accountId: agentActions.accountId,
      messageId: agentActions.messageId,
    })
    .from(agentActions)
    .innerJoin(agentRuns, eq(agentActions.runId, agentRuns.id))
    .where(
      and(
        eq(agentActions.userId, userId),
        eq(agentRuns.userId, userId),
        eq(agentRuns.task, "report"),
        eq(agentActions.kind, "mark_read"),
        gte(agentActions.createdAt, since),
        isNull(agentActions.undoneAt),
      ),
    );
  const marked = new Map<string, Set<string>>();
  for (const { accountId, messageId } of rows) {
    if (!accountId || !messageId) continue;
    const ids = marked.get(accountId) ?? new Set();
    marked.set(accountId, ids.add(messageId));
  }
  return marked;
}

async function buildPreview(
  scope: UserScope,
  {
    startedAt,
    localDate,
    mailWindow,
    settings,
    recentReports,
  }: ClaimedReportPreview,
  deps: ReportBuildDeps | null,
) {
  if (!deps) return { error: "no-mailbox" as const };
  const { models } = deps;
  if (!models) return { error: "no-model" as const };
  const accounts = await readReportAccounts(scope);
  if (accounts.length === 0) return { error: "no-mailbox" as const };
  const mailStart = reportMailStart({
    recentReports,
    timeZone: settings.timeZone,
    mailWindow,
  });
  const markedRead = await readMailMarkedReadByReports(
    scope,
    new Date(
      Math.min(...accounts.map((account) => mailStart(account.id).getTime())),
    ),
  );
  const mailboxes = await openReportMailboxes(
    scope,
    deps,
    (session, accountId) =>
      previewMailboxSession(session, markedRead.get(accountId) ?? new Set()),
  );
  try {
    if (mailboxes.accounts.length === 0) {
      return { error: "no-mailbox" as const };
    }
    const agent = await runReportOverMailboxes(
      { ...scope, endsAt: startedAt.getTime() + MORNING_REPORT_BUDGET_MS },
      { ...deps, models },
      {
        mailboxes,
        settings,
        today: localDate,
        mailWindow,
        mailStart,
        calendarPolicy: readOnlyCalendars,
        task: "report-preview",
      },
    );
    if (!agent.report) return { error: "no-report" as const };
    return {
      content: reportContent({
        mailDate: localClock(mailWindow.start, settings.timeZone).date,
        status: "written",
        agent,
        accounts,
        mailboxes,
      }),
      todoChanges: agent.todoChanges,
      builtAt: deps.now(),
    };
  } finally {
    await mailboxes.finish();
  }
}

/**
 * Runs the real report agent for a claimed preview and stores what it
 * submits in the preview row. It stores no report and applies no to-do
 * change, and it never calls `markWindowMailRead` and pushes nothing. Its
 * agent has the calendar write tools, but the calendars are read-only. Every
 * failure ends in a `failed` row. It does not throw while the database works.
 */
export async function runReportPreview(
  scope: UserScope,
  claim: ClaimedReportPreview,
  deps: ReportBuildDeps | null,
): Promise<void> {
  const finished = await buildPreview(scope, claim, deps).catch(
    (error: unknown) => {
      console.error(
        "Report preview failed",
        error instanceof Error ? error.message : error,
      );
      return { error: "error" as const };
    },
  );
  await scope.db
    .update(morningReportPreviews)
    .set({
      ...finished,
      status: "error" in finished ? "failed" : "done",
    })
    .where(
      and(
        eq(morningReportPreviews.userId, scope.userId),
        eq(morningReportPreviews.status, "running"),
        eq(morningReportPreviews.startedAt, claim.startedAt),
      ),
    );
}
