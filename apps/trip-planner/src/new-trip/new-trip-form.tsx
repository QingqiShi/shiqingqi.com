"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { DateField } from "@tuja/ui/components/date-field";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState, type RefObject, type SubmitEvent } from "react";
import { TimeZoneField } from "#src/time-zones/time-zone-field.tsx";
import { deviceTimeZone } from "#src/time-zones/time-zone-label.ts";
import { addDays, daysBetween } from "#src/trips/ops/add-days.ts";
import { useTripApi } from "#src/trips/trip-api.ts";

/** What the person has typed in the New trip sheet so far. */
export interface NewTripDraft {
  title: string;
  firstDate: string;
  lastDate: string;
  timeZone: string;
}

/** The most days a trip can have when it is made. */
const MAX_DAYS = 1000;

/** Today on the device's calendar, as `YYYY-MM-DD`. */
function localToday() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function newDraft(): NewTripDraft {
  return {
    title: "",
    firstDate: localToday(),
    lastDate: addDays(localToday(), 2),
    timeZone: deviceTimeZone(),
  };
}

/**
 * The fields of a new trip: its title, its first and last day, and its time
 * zone. Create makes the trip and opens it to read; a failure keeps
 * what the person typed. It starts from `draft`, and gives each change to
 * `onDraftChange`.
 */
export function NewTripForm({
  titleRef,
  draft: startDraft,
  onDraftChange,
  onCreated,
}: {
  titleRef: RefObject<HTMLInputElement | null>;
  draft: NewTripDraft | null;
  onDraftChange: (draft: NewTripDraft) => void;
  onCreated: () => void;
}) {
  const locale = useLocale();
  const router = useRouter();
  const tripApi = useTripApi();
  const [draft, setDraft] = useState(() => startDraft ?? newDraft());
  const { title, firstDate, lastDate, timeZone } = draft;
  const change = (patch: Partial<NewTripDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDraftChange(next);
  };
  const [showErrors, setShowErrors] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const days =
    firstDate === "" || lastDate === ""
      ? null
      : daysBetween(firstDate, lastDate) + 1;
  const dayCount =
    days === 1
      ? t({ en: "1 day", zh: "共 1 天" })
      : t({ en: "{count} days", zh: "共 {count} 天" }).replace(
          "{count}",
          String(days),
        );
  const titleError =
    title.trim() === ""
      ? t({ en: "Give the trip a name.", zh: "请给行程起个名字。" })
      : undefined;
  const firstDateError =
    firstDate === ""
      ? t({ en: "Pick the first day.", zh: "请选择第一天。" })
      : undefined;
  const lastDateError =
    lastDate === ""
      ? t({ en: "Pick the last day.", zh: "请选择最后一天。" })
      : days !== null && days < 1
        ? t({
            en: "The last day cannot be before the first day.",
            zh: "最后一天不能早于第一天。",
          })
        : days !== null && days > MAX_DAYS
          ? t({
              en: "A trip can have up to 1000 days.",
              zh: "一个行程最多 1000 天。",
            })
          : undefined;
  const isValid =
    titleError === undefined &&
    firstDateError === undefined &&
    lastDateError === undefined &&
    days !== null;

  function create(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (!isValid || isSending) return;
    setIsSending(true);
    setFailed(false);
    tripApi
      .create({
        title: title.trim(),
        firstDate,
        days,
        timeZone,
        language: locale,
      })
      .then((tripId) => {
        onCreated();
        router.push(getLocalePath(`/${tripId}`, locale));
      })
      .catch(() => {
        setFailed(true);
        setIsSending(false);
      });
  }

  return (
    <form noValidate onSubmit={create} css={stack.group}>
      <div css={stack.item}>
        <TextField
          ref={titleRef}
          label={t({ en: "Title", zh: "标题" })}
          value={title}
          error={showErrors ? titleError : undefined}
          autoComplete="off"
          onChange={(event) => {
            change({ title: event.target.value });
          }}
        />
        <DateField
          label={t({ en: "First day", zh: "第一天" })}
          value={firstDate}
          error={showErrors ? firstDateError : undefined}
          onValueChange={(next) => {
            // The trip keeps its length when its first day moves.
            change(
              next !== "" && firstDate !== "" && lastDate !== ""
                ? {
                    firstDate: next,
                    lastDate: addDays(next, daysBetween(firstDate, lastDate)),
                  }
                : { firstDate: next },
            );
          }}
        />
        <DateField
          label={t({ en: "Last day", zh: "最后一天" })}
          value={lastDate}
          min={firstDate === "" ? undefined : firstDate}
          max={firstDate === "" ? undefined : addDays(firstDate, MAX_DAYS - 1)}
          error={showErrors ? lastDateError : undefined}
          status={days !== null && days >= 1 ? dayCount : ""}
          onValueChange={(next) => {
            change({ lastDate: next });
          }}
        />
        <TimeZoneField
          value={timeZone}
          description={t({
            en: "Where the trip is. Times in the trip are in this zone.",
            zh: "行程所在的地方。行程里的时间都按这个时区。",
          })}
          onChange={(next) => {
            change({ timeZone: next });
          }}
        />
      </div>
      {failed ? (
        <Callout intent="destructive" role="alert">
          {t({
            en: "The trip was not made. Try again.",
            zh: "行程没有创建成功，请重试。",
          })}
        </Callout>
      ) : null}
      <FormFooter>
        <Button type="submit" look="primary" loading={isSending}>
          {t({ en: "Create trip", zh: "创建行程" })}
        </Button>
      </FormFooter>
    </form>
  );
}
