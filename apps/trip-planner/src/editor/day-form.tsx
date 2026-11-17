"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Columns } from "@tuja/ui/components/columns";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import { digest } from "#src/trips/ops/digest.ts";
import type { Day } from "#src/trips/types.ts";
import { useEditor } from "./editor-provider.tsx";
import { isLink } from "./item-fields.ts";
import { SheetActions } from "./sheet-actions.tsx";
import { useFormChange } from "./use-form-change.tsx";

const text = (value: string) => (value.trim() === "" ? null : value.trim());

/** The fields of a day that are not its plan: its title and route, the drive, the forecast, and the words about the night. */
export function DayForm({ day, onDone }: { day: Day; onDone: () => void }) {
  const editor = useEditor();
  const [values, setValues] = useState({
    title: day.title ?? "",
    route: day.route ?? "",
    driving: day.driving ?? "",
    drivingMinutes:
      day.drivingMinutes === undefined ? "" : String(day.drivingMinutes),
    temp: day.weather?.temp ?? "",
    summary: day.weather?.summary ?? "",
    weatherNote: day.weather?.note ?? "",
    lat: day.coords ? String(day.coords.lat) : "",
    lon: day.coords ? String(day.coords.lon) : "",
    staySummary: day.stay.summary ?? "",
    stayNote: day.stay.note ?? "",
    bookingUrl: day.stay.bookingUrl ?? "",
  });
  const [errors, setErrors] = useState<Partial<typeof values>>({});
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const form = useFormChange(onDone);

  const saved = t({ en: "Saved", zh: "已保存" });
  const wholeMinutes = t({
    en: "A whole number of minutes.",
    zh: "请填写整数分钟。",
  });
  const bothWeather = t({
    en: "A forecast needs a temperature and a summary.",
    zh: "天气需要同时填写温度和概况。",
  });
  const bothCoords = t({
    en: "A latitude from -90 to 90 and a longitude from -180 to 180.",
    zh: "纬度在 -90 到 90 之间，经度在 -180 到 180 之间。",
  });
  const badLink = t({
    en: "A link starts with https://",
    zh: "链接应以 https:// 开头",
  });

  const bind = (key: keyof typeof values) => ({
    value: values[key],
    error: errors[key],
    autoComplete: "off",
    onChange: (event: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
    },
  });

  const save = () => {
    const nextErrors: Partial<typeof values> = {};
    const minutes = values.drivingMinutes.trim();
    if (minutes !== "" && !/^\d+$/.test(minutes)) {
      nextErrors.drivingMinutes = wholeMinutes;
    }
    const hasTemp = values.temp.trim() !== "";
    const hasSummary = values.summary.trim() !== "";
    if (hasTemp !== hasSummary || (values.weatherNote.trim() && !hasTemp)) {
      nextErrors.summary = bothWeather;
    }
    const lat = Number(values.lat);
    const lon = Number(values.lon);
    const hasCoords = values.lat.trim() !== "" || values.lon.trim() !== "";
    if (
      hasCoords &&
      (values.lat.trim() === "" ||
        values.lon.trim() === "" ||
        !(Math.abs(lat) <= 90) ||
        !(Math.abs(lon) <= 180))
    ) {
      nextErrors.lon = bothCoords;
    }
    const link = values.bookingUrl.trim();
    if (link !== "" && !isLink(link)) nextErrors.bookingUrl = badLink;
    setErrors(nextErrors);
    if (nextErrors.drivingMinutes ?? nextErrors.summary ?? nextErrors.lon) {
      setIsMoreOpen(true);
    }
    if (Object.keys(nextErrors).length > 0) return;

    const before: Record<string, unknown> = { ...day, ...day.stay };
    const changed = (fields: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(fields).filter(
          ([key, value]) => digest(before[key] ?? null) !== digest(value),
        ),
      );
    const dayFields = changed({
      title: text(values.title),
      route: text(values.route),
      driving: text(values.driving),
      drivingMinutes: minutes === "" ? null : Number(minutes),
      weather: hasTemp
        ? {
            temp: values.temp.trim(),
            summary: values.summary.trim(),
            ...(text(values.weatherNote)
              ? { note: values.weatherNote.trim() }
              : {}),
          }
        : null,
      coords: hasCoords ? { lat, lon } : null,
    });
    const stayFields = changed({
      summary: text(values.staySummary),
      note: text(values.stayNote),
      bookingUrl: text(values.bookingUrl),
    });
    const ops: DraftOp[] = [
      ...(Object.keys(dayFields).length > 0
        ? [{ op: "setDay" as const, id: day.id, fields: dayFields }]
        : []),
      ...(Object.keys(stayFields).length > 0
        ? [{ op: "setStay" as const, dayId: day.id, fields: stayFields }]
        : []),
    ];
    form.submit(ops, { message: saved, dayId: day.id });
  };

  return (
    <form
      css={stack.item}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <TextField label={t({ en: "Title", zh: "标题" })} {...bind("title")} />
      <TextField
        label={t({ en: "Route", zh: "路线" })}
        description={t({
          en: "Where the day goes, such as Lisbon → Sintra → Lisbon.",
          zh: "这一天的行进路线，例如 里斯本 → 辛特拉 → 里斯本。",
        })}
        {...bind("route")}
      />
      <Disclosure
        summary={t({ en: "Tonight’s stay", zh: "当晚住宿" })}
        defaultOpen={Boolean(
          day.stay.summary ?? day.stay.note ?? day.stay.bookingUrl,
        )}
      >
        <div css={stack.item}>
          <TextField
            label={t({ en: "Where you sleep", zh: "住在哪里" })}
            description={t({
              en: "A short line, such as the town or the name of the hotel.",
              zh: "一句话，例如城镇或酒店名称。",
            })}
            {...bind("staySummary")}
          />
          <Textarea
            label={t({ en: "Note about the stay", zh: "住宿备注" })}
            rows={2}
            autoGrow
            {...bind("stayNote")}
          />
          <TextField
            label={t({ en: "Booking link", zh: "预订链接" })}
            type="url"
            inputMode="url"
            {...bind("bookingUrl")}
          />
        </div>
      </Disclosure>
      <Disclosure
        summary={t({ en: "Driving and weather", zh: "驾驶与天气" })}
        open={isMoreOpen}
        onOpenChange={setIsMoreOpen}
      >
        <div css={stack.item}>
          <Columns gap="item">
            <TextField
              label={t({ en: "Driving", zh: "驾驶" })}
              description={t({
                en: "In words, such as 1 h 20 min.",
                zh: "文字描述，例如 1 小时 20 分。",
              })}
              {...bind("driving")}
            />
            <TextField
              label={t({ en: "Driving minutes", zh: "驾驶分钟数" })}
              description={t({
                en: "The same time as a number, for the totals.",
                zh: "同一段时间的数字，用于汇总。",
              })}
              inputMode="numeric"
              {...bind("drivingMinutes")}
            />
          </Columns>
          <Columns gap="item">
            <TextField
              label={t({ en: "Temperature", zh: "气温" })}
              {...bind("temp")}
            />
            <TextField
              label={t({ en: "Weather", zh: "天气概况" })}
              {...bind("summary")}
            />
          </Columns>
          <TextField
            label={t({ en: "Weather note", zh: "天气备注" })}
            description={t({
              en: "The written forecast shows when no live forecast covers the day.",
              zh: "没有实时预报时，显示这里填写的天气。",
            })}
            {...bind("weatherNote")}
          />
          <Columns gap="item">
            <TextField
              label={t({ en: "Latitude", zh: "纬度" })}
              inputMode="decimal"
              {...bind("lat")}
            />
            <TextField
              label={t({ en: "Longitude", zh: "经度" })}
              description={t({
                en: "Where the live forecast is for.",
                zh: "实时预报所用的位置。",
              })}
              inputMode="decimal"
              {...bind("lon")}
            />
          </Columns>
        </div>
      </Disclosure>
      {form.problem}
      <SheetActions>
        <Button type="submit" look="primary" disabled={!editor.canEdit}>
          {t({ en: "Save", zh: "保存" })}
        </Button>
      </SheetActions>
    </form>
  );
}
