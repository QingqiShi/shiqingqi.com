import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Badge } from "@tuja/ui/components/badge";
import { Callout } from "@tuja/ui/components/callout";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { PageHeader } from "@tuja/ui/components/page-header";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Trip } from "#src/trips/types.ts";
import { summarizeChange } from "./summarize-change.ts";
import type { TripVersion } from "./trip-history.ts";
import { versionLabels, type VersionWords } from "./version-labels.ts";

/** The versions of a trip, newest first, each with when, who and what changed from the version before. */
export function VersionList({
  tripId,
  trip,
  versions,
  locale,
  now,
  changed,
}: {
  tripId: string;
  trip: Trip;
  versions: TripVersion[];
  locale: SupportedLocale;
  now: Date;
  /** A restore found that the trip changed since the person read it. */
  changed: boolean;
}) {
  const words: VersionWords = {
    now: t({ en: "Under a minute ago", zh: "刚刚" }),
    you: t({ en: "You", zh: "你" }),
    member: t({ en: "Another member", zh: "其他成员" }),
    made: t({ en: "Trip made", zh: "创建行程" }),
    oldest: t({ en: "Oldest version kept", zh: "保留的最早版本" }),
    none: t({ en: "No changes", zh: "没有改动" }),
    trip: t({ en: "Trip details", zh: "行程信息" }),
    day: t({ en: "Day {n}", zh: "第 {n} 天" }),
    dayAdded: t({ en: "{day} added", zh: "新增{day}" }),
    dayRemoved: t({ en: "{day} removed", zh: "删除{day}" }),
    dayChanges: t({ en: "{day}: {counts}", zh: "{day}：{counts}" }),
    added: t({ en: "{n} added", zh: "新增 {n}" }),
    changed: t({ en: "{n} changed", zh: "修改 {n}" }),
    removed: t({ en: "{n} removed", zh: "删除 {n}" }),
    comma: t({ en: ", ", zh: "，" }),
    oneMoreDay: t({ en: "1 more day", zh: "另有 1 天" }),
    moreDays: t({ en: "{n} more days", zh: "另有 {n} 天" }),
  };
  const labels = versionLabels(words, locale);
  const current = t({ en: "Current", zh: "当前" });

  const changeOf = (version: TripVersion, older: TripVersion | undefined) => {
    if (!older) return labels.first(version);
    if (!version.trip || !older.trip) return null;
    return labels.change(summarizeChange(older.trip, version.trip));
  };

  return (
    <div css={stack.group}>
      <PageHeader
        eyebrow={<span lang={trip.language}>{trip.title}</span>}
        title={t({ en: "History", zh: "历史版本" })}
        description={t({
          en: "Each saved version of the trip, newest first. Times are in the trip’s time zone, {zone}.",
          zh: "行程每次保存的版本，最新的在前。时间按行程的时区（{zone}）显示。",
        }).replace("{zone}", trip.timeZone.replaceAll("_", " "))}
      />
      {changed ? (
        <Callout intent="warning" role="alert">
          {t({
            en: "The trip changed after you opened that version, so nothing was restored. The list shows the versions as they are now.",
            zh: "你打开那个版本后行程有了改动，所以没有恢复。下面是现在的各个版本。",
          })}
        </Callout>
      ) : null}
      <List aria-label={t({ en: "Versions", zh: "版本" })}>
        {versions.map((version, index) => (
          <ListRow
            key={version.revision}
            href={getLocalePath(
              `/${tripId}/history/${String(version.revision)}`,
              locale,
            )}
            wrap
            value={labels.savedAt(version.savedAt, trip.timeZone, now)}
            detail={[
              labels.author(version.author),
              changeOf(version, versions.at(index + 1)),
            ]
              .filter((part) => part !== null)
              .join(" · ")}
            extra={
              index === 0 ? (
                <Badge size="sm" intent="info">
                  {current}
                </Badge>
              ) : undefined
            }
          >
            {labels.ago(version.savedAt, now)}
          </ListRow>
        ))}
      </List>
    </div>
  );
}
