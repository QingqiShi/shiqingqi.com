"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Combobox } from "@tuja/ui/components/combobox";
import { DateField } from "@tuja/ui/components/date-field";
import { Divider } from "@tuja/ui/components/divider";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import { useTripApi } from "#src/trips/trip-api.ts";
import { useEditor } from "./editor-provider.tsx";
import { SheetActions } from "./sheet-actions.tsx";
import { useFormChange } from "./use-form-change.tsx";

function timeZoneOptions(current: string) {
  const zones = new Set([current, ...Intl.supportedValuesOf("timeZone")]);
  return [...zones].sort().map((zone) => ({
    id: zone,
    label: zone.replaceAll("_", " "),
  }));
}

/** The details of the trip itself: its title, the lines under it, its first day and its time zone. An owner can delete the trip here. */
export function TripForm({ onDone }: { onDone: () => void }) {
  const editor = useEditor();
  const api = useTripApi();
  const router = useRouter();
  const locale = useLocale();
  const { trip } = editor;
  const [values, setValues] = useState({
    title: trip.title,
    subtitle: trip.subtitle ?? "",
    party: trip.party ?? "",
  });
  const [firstDate, setFirstDate] = useState(trip.days[0].date);
  const [timeZone, setTimeZone] = useState(trip.timeZone);
  const [zones] = useState(() => timeZoneOptions(trip.timeZone));
  const [noTitle, setNoTitle] = useState(false);
  const form = useFormChange(onDone);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteState, setDeleteState] = useState<"idle" | "busy" | "failed">(
    "idle",
  );

  const saved = t({ en: "Saved", zh: "已保存" });
  const deleteQuestion = t({
    en: "Delete “{title}”?",
    zh: "删除“{title}”？",
  });

  const bind = (key: keyof typeof values) => ({
    value: values[key],
    autoComplete: "off",
    onChange: (event: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
    },
  });

  const save = () => {
    const title = values.title.trim();
    setNoTitle(title === "");
    if (title === "" || firstDate === "") return;
    const fields = {
      ...(title !== trip.title ? { title } : {}),
      ...(values.subtitle.trim() !== (trip.subtitle ?? "")
        ? { subtitle: values.subtitle.trim() || null }
        : {}),
      ...(values.party.trim() !== (trip.party ?? "")
        ? { party: values.party.trim() || null }
        : {}),
      ...(timeZone !== trip.timeZone ? { timeZone } : {}),
    };
    const ops: DraftOp[] = [
      ...(Object.keys(fields).length > 0
        ? [{ op: "setTrip" as const, fields }]
        : []),
      ...(firstDate !== trip.days[0].date
        ? [{ op: "setFirstDate" as const, date: firstDate }]
        : []),
    ];
    form.submit(ops, { message: saved });
  };

  if (isDeleting) {
    return (
      <div css={stack.item}>
        <Text as="p" weight="semibold">
          {deleteQuestion.replace("{title}", trip.title)}
        </Text>
        <Text as="p" tone="muted">
          {t({
            en: "This deletes the trip for everyone on it, with its history. You cannot take this back.",
            zh: "这会为所有成员删除这个行程及其历史记录，且无法恢复。",
          })}
        </Text>
        {deleteState === "failed" ? (
          <Callout intent="destructive" role="alert">
            {t({
              en: "The trip was not deleted. Try again.",
              zh: "行程没有删除，请重试。",
            })}
          </Callout>
        ) : null}
        <SheetActions>
          <Button
            look="ghost"
            onClick={() => {
              setIsDeleting(false);
            }}
          >
            {t({ en: "Cancel", zh: "取消" })}
          </Button>
          <Button
            look="destructive"
            loading={deleteState === "busy"}
            onClick={() => {
              setDeleteState("busy");
              api
                .remove(editor.tripId)
                .then((deleted) => {
                  if (!deleted) throw new Error("not deleted");
                  router.replace(getLocalePath("/", locale));
                })
                .catch(() => {
                  setDeleteState("failed");
                });
            }}
          >
            {t({ en: "Delete trip", zh: "删除行程" })}
          </Button>
        </SheetActions>
      </div>
    );
  }

  return (
    <form
      css={stack.item}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <TextField
        label={t({ en: "Title", zh: "标题" })}
        error={
          noTitle
            ? t({ en: "Give the trip a title.", zh: "请填写标题。" })
            : undefined
        }
        {...bind("title")}
      />
      <TextField
        label={t({ en: "Subtitle", zh: "副标题" })}
        {...bind("subtitle")}
      />
      <TextField
        label={t({ en: "Who travels", zh: "同行的人" })}
        description={t({
          en: "A short line, such as 3 people by car.",
          zh: "一句话，例如 3 人自驾。",
        })}
        {...bind("party")}
      />
      <DateField
        label={t({ en: "First day", zh: "第一天" })}
        description={t({
          en: "Every day of the trip moves with it.",
          zh: "行程的每一天都会随之移动。",
        })}
        value={firstDate}
        onValueChange={setFirstDate}
      />
      <Combobox
        label={t({ en: "Time zone", zh: "时区" })}
        description={t({
          en: "It sets “today” and “now” on the trip.",
          zh: "它决定行程中的“今天”和“现在”。",
        })}
        options={zones}
        selected={timeZone}
        onSelectedChange={setTimeZone}
        emptyLabel={t({ en: "No time zone matches", zh: "没有匹配的时区" })}
      />
      {form.problem}
      <SheetActions>
        <Button type="submit" look="primary" disabled={!editor.canEdit}>
          {t({ en: "Save", zh: "保存" })}
        </Button>
      </SheetActions>
      {editor.isOwner ? (
        <>
          <Divider />
          <div>
            <Button
              type="button"
              look="ghost"
              intent="destructive"
              bleed="start"
              onClick={() => {
                setIsDeleting(true);
              }}
            >
              {t({ en: "Delete trip…", zh: "删除行程…" })}
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}
