"use client";

import { t } from "@tuja/i18n";
import { Card } from "@tuja/ui/components/card";
import { Select } from "@tuja/ui/components/select";
import { SettingList } from "@tuja/ui/components/setting-list";
import { SettingRow } from "@tuja/ui/components/setting-row";
import { Switch } from "@tuja/ui/components/switch";
import { TextField } from "@tuja/ui/components/text-field";
import { useState } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";

function MorningReport() {
  const [enabled, setEnabled] = useState(true);
  return (
    <Card>
      <SettingList>
        <SettingRow
          label={t({ en: "Send a morning report", zh: "发送晨间报告" })}
          description={t({
            en: "Get one summary by email each day.",
            zh: "每天通过邮件收到一份摘要。",
          })}
          control={
            <Switch
              value={enabled ? "on" : "off"}
              onChange={(next) => {
                setEnabled(next === "on");
              }}
            />
          }
        />
        <SettingRow
          label={t({ en: "Delivery time", zh: "发送时间" })}
          control={
            <Select
              size="sm"
              defaultValue="07:30"
              disabled={!enabled}
              options={[
                { value: "07:00", label: "07:00" },
                { value: "07:30", label: "07:30" },
                { value: "08:00", label: "08:00" },
              ]}
            />
          }
        />
      </SettingList>
    </Card>
  );
}

export function SettingListExample() {
  return (
    <Specimen
      caption={t({
        en: "turn the report off, and its time is disabled",
        zh: "关闭报告后，发送时间不可更改",
      })}
    >
      <MorningReport />
    </Specimen>
  );
}

function FileReceipts() {
  const [enabled, setEnabled] = useState(true);
  return (
    <Card>
      <SettingList>
        <SettingRow
          label={t({
            en: "File receipts into a folder",
            zh: "把收据归入文件夹",
          })}
          description={t({
            en: "Receipts are moved out of the inbox.",
            zh: "收据会被移出收件箱。",
          })}
          control={
            <Switch
              value={enabled ? "on" : "off"}
              onChange={(next) => {
                setEnabled(next === "on");
              }}
            />
          }
        >
          {enabled ? (
            <TextField
              label={t({ en: "Folder name", zh: "文件夹名称" })}
              size="sm"
              defaultValue="Finance/Receipts"
            />
          ) : null}
        </SettingRow>
      </SettingList>
    </Card>
  );
}

export function DependentSettingExample() {
  return (
    <Specimen
      caption={t({
        en: "turn it off, and the field goes",
        zh: "关闭后，字段随之消失",
      })}
    >
      <FileReceipts />
    </Specimen>
  );
}
