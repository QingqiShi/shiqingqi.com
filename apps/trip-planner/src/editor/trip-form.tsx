"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { DateField } from "@tuja/ui/components/date-field";
import { Divider } from "@tuja/ui/components/divider";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { use, useState } from "react";
import { TimeZoneField } from "#src/time-zones/time-zone-field.tsx";
import { DeleteTripConfirm } from "#src/trip-details/delete-trip-confirm.tsx";
import {
  tripDetailsOf,
  tripDetailsOps,
  type TripDetails,
} from "#src/trip-details/trip-details-ops.ts";
import { useEditor } from "./editor-provider.tsx";
import { SheetActions } from "./sheet-actions.tsx";
import { SheetInputContext } from "./sheet-input-context.ts";
import { useFormChange } from "./use-form-change.tsx";

/** The details of the trip itself: its title, the lines under it, its first day and its time zone. An owner can delete the trip here. */
export function TripForm({ onDone }: { onDone: () => void }) {
  const editor = useEditor();
  const locale = useLocale();
  const { trip } = editor;
  const [values, setValues] = useState(() => tripDetailsOf(trip));
  const [noTitle, setNoTitle] = useState(false);
  const form = useFormChange(onDone);
  const markInput = use(SheetInputContext);
  const [isDeleting, setIsDeleting] = useState(false);

  const saved = t({ en: "Saved", zh: "已保存" });

  const bind = (key: keyof Omit<TripDetails, "firstDate" | "timeZone">) => ({
    value: values[key],
    autoComplete: "off",
    onChange: (event: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
    },
  });

  const save = () => {
    const isTitleEmpty = values.title.trim() === "";
    setNoTitle(isTitleEmpty);
    if (isTitleEmpty || values.firstDate === "") return;
    form.submit(tripDetailsOps(tripDetailsOf(trip), values), {
      message: saved,
    });
  };

  if (isDeleting) {
    return (
      <DeleteTripConfirm
        tripId={editor.tripId}
        title={trip.title}
        onCancel={() => {
          setIsDeleting(false);
        }}
        announce={editor.announce}
      />
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
          zh: "一句话，例如“3 人自驾”。",
        })}
        {...bind("party")}
      />
      <DateField
        label={t({ en: "First day", zh: "第一天" })}
        description={t({
          en: "Every day of the trip moves with it.",
          zh: "行程的每一天都会随之移动。",
        })}
        value={values.firstDate}
        onValueChange={(firstDate) => {
          setValues((current) => ({ ...current, firstDate }));
        }}
      />
      <TimeZoneField
        value={values.timeZone}
        description={t({
          en: "It sets “today” and “now” on the trip.",
          zh: "它决定行程中的“今天”和“现在”。",
        })}
        onChange={(timeZone) => {
          markInput();
          setValues((current) => ({ ...current, timeZone }));
        }}
      />
      {form.problem}
      <SheetActions>
        <Button type="submit" look="primary" disabled={!editor.canEdit}>
          {t({ en: "Save", zh: "保存" })}
        </Button>
      </SheetActions>
      <Divider />
      <div css={stack.tight}>
        <div>
          <Button
            look="ghost"
            bleed="start"
            icon={<ClockCounterClockwiseIcon weight="bold" />}
            href={getLocalePath(`/${editor.tripId}/history`, locale)}
          >
            {t({ en: "History", zh: "历史版本" })}
          </Button>
        </div>
        {editor.isOwner ? (
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
        ) : null}
      </div>
    </form>
  );
}
