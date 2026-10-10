"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useDeferredValue, useState, type SubmitEvent } from "react";
import { t } from "#src/i18n.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { householdApiClient } from "./household-api-client.ts";
import { SettingsPanel } from "./settings-panel.tsx";
import { supportedTimeZones } from "./supported-time-zones.ts";
import { timeZoneOptions } from "./time-zone-options.ts";
import { useIsOwner } from "./use-is-owner.ts";

/** The Household's name and timezone; the base currency is fixed in v1. */
export function HouseholdSettings() {
  const household = useReplica((snapshot) => snapshot.household);
  const { runtime } = useFinanceRuntime();
  const isOwner = useIsOwner();
  const showToast = useToast();
  const [name, setName] = useState(household?.name ?? "");
  const [timezone, setTimezone] = useState(
    household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const listsAllZones = useDeferredValue(true, false);
  const messages = {
    name: t({ en: "Give the household a name", zh: "请填写家庭名称" }),
    saved: t({ en: "Household saved", zh: "家庭信息已保存" }),
    failed: t({
      en: "The household did not save. Try again when you are online.",
      zh: "家庭信息未能保存，请联网后重试。",
    }),
    ownerOnly: t({
      en: "Only the owner can change the household.",
      zh: "只有所有者可以更改家庭信息。",
    }),
  };
  if (!household) return null;
  const zones = timeZoneOptions(
    household.timezone,
    listsAllZones ? supportedTimeZones() : [],
  );
  const changed =
    name.trim() !== household.name || timezone !== household.timezone;

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!household) return;
    if (name.trim() === "") {
      setError(messages.name);
      return;
    }
    setSaving(true);
    try {
      await householdApiClient.update({
        ...(name.trim() === household.name ? {} : { name: name.trim() }),
        ...(timezone === household.timezone ? {} : { timezone }),
      });
      await runtime.loop.sync();
      showToast({ message: messages.saved, durationMs: 4000 });
    } catch (failure) {
      showToast({
        message:
          failure instanceof FinanceApiError && failure.status === 403
            ? messages.ownerOnly
            : messages.failed,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsPanel
      title={t({ en: "Household", zh: "家庭" })}
      description={
        isOwner
          ? t({
              en: "Saving needs you to be online. Each device gets the change on its next sync.",
              zh: "保存需要联网；每台设备会在下次同步时收到修改。",
            })
          : messages.ownerOnly
      }
    >
      <form
        onSubmit={(event) => void save(event)}
        css={[stack.item, styles.form]}
        noValidate
      >
        <TextField
          label={t({ en: "Name", zh: "名称" })}
          value={name}
          readOnly={!isOwner}
          error={error}
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
        />
        <TextField
          label={t({ en: "Base currency", zh: "本位币" })}
          description={t({
            en: "Every total is in this currency. It cannot change yet.",
            zh: "所有合计都以此币种计算，暂不可更改。",
          })}
          value={household.baseCurrency}
          readOnly
        />
        <Select
          label={t({ en: "Timezone", zh: "时区" })}
          description={t({
            en: "Decides when today starts for dates and balances.",
            zh: "决定日期与余额中“今天”从何时开始。",
          })}
          value={timezone}
          disabled={!isOwner}
          onChange={(event) => {
            setTimezone(event.target.value);
          }}
        >
          <optgroup label={t({ en: "Common", zh: "常用" })}>
            {zones.common.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={t({ en: "All timezones", zh: "全部时区" })}>
            {zones.others.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </optgroup>
        </Select>
        {isOwner ? (
          <div>
            <Button
              type="submit"
              look="primary"
              disabled={!changed}
              loading={saving}
            >
              {t({ en: "Save", zh: "保存" })}
            </Button>
          </div>
        ) : null}
      </form>
    </SettingsPanel>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: "32rem",
  },
});
