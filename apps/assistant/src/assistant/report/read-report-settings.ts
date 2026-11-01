import { eq } from "drizzle-orm";
import {
  DEFAULT_DIGEST_HOUR,
  DEFAULT_TIME_ZONE,
  userSettings,
  type UserLocale,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { isTimeZone } from "./due-report-date.ts";

export interface ReportSettings {
  timeZone: string;
  /** The local hour from which the morning report is built. */
  digestHour: number;
  locale: UserLocale;
}

export async function readReportSettings({
  db,
  userId,
}: UserScope): Promise<ReportSettings> {
  const row = (
    await db
      .select({
        timeZone: userSettings.timeZone,
        digestHour: userSettings.digestHour,
        locale: userSettings.locale,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
  ).at(0);
  return {
    timeZone:
      row && isTimeZone(row.timeZone) ? row.timeZone : DEFAULT_TIME_ZONE,
    digestHour: row?.digestHour ?? DEFAULT_DIGEST_HOUR,
    locale: row?.locale ?? "en",
  };
}
