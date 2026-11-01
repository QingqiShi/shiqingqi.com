"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Select } from "@tuja/ui/components/select";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserLocale } from "../db/schema.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";

export interface SettingsValues {
  timeZone: string;
  digestHour: number;
  locale: UserLocale;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

/** The time zone, the hour and the language of the morning report. */
export function SettingsForm({
  initial,
  timeZones,
}: {
  initial: SettingsValues;
  /** Every IANA zone the server knows. */
  timeZones: readonly string[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"saved" | "failed" | null>(null);

  function update(change: Partial<SettingsValues>) {
    setValues((current) => ({ ...current, ...change }));
    setNotice(null);
  }

  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        assistantFetch("/api/settings", {
          method: "PUT",
          body: JSON.stringify(values),
        })
          .then(() => {
            setNotice("saved");
            router.refresh();
          })
          .catch(() => {
            setNotice("failed");
          })
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <Select
        label={t({ en: "Time zone", zh: "时区" })}
        description={t({
          en: "The report follows the clock of this zone, summer time included. It covers the mail of the day before in this zone.",
          zh: "晨报按这个时区的时间送达，包括夏令时，并以这个时区的“前一天”来读取邮件。",
        })}
        value={values.timeZone}
        options={timeZones.map((zone) => ({
          value: zone,
          label: zone.replaceAll("_", " "),
        }))}
        onChange={(event) => {
          update({ timeZone: event.target.value });
        }}
      />
      <Select
        label={t({ en: "Report time", zh: "晨报时间" })}
        description={t({
          en: "The report is ready within the hour.",
          zh: "晨报会在这个整点后的一小时内写好。",
        })}
        value={String(values.digestHour)}
        options={HOURS}
        onChange={(event) => {
          update({ digestHour: Number(event.target.value) });
        }}
      />
      <Select
        label={t({ en: "Language of the report", zh: "晨报语言" })}
        description={t({
          en: "The assistant writes the report and the to-dos in this language.",
          zh: "助手用这种语言撰写晨报和待办。",
        })}
        value={values.locale}
        options={[
          { value: "en", label: "English" },
          { value: "zh", label: "中文" },
        ]}
        onChange={(event) => {
          update({ locale: event.target.value === "zh" ? "zh" : "en" });
        }}
      />
      {notice === "saved" ? (
        <Callout intent="success" role="status">
          {t({ en: "Settings saved.", zh: "设置已保存。" })}
        </Callout>
      ) : null}
      {notice === "failed" ? (
        <Callout intent="danger" role="alert">
          {t({
            en: "The settings were not saved. Try again.",
            zh: "设置没有保存成功，请重试。",
          })}
        </Callout>
      ) : null}
      <div>
        <Button type="submit" look="primary" loading={busy}>
          {t({ en: "Save", zh: "保存" })}
        </Button>
      </div>
    </form>
  );
}
