"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { DateField } from "@tuja/ui/components/date-field";
import { Divider } from "@tuja/ui/components/divider";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { TextField } from "@tuja/ui/components/text-field";
import { useToast } from "@tuja/ui/components/toast-provider";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { TimeZoneField } from "#src/time-zones/time-zone-field.tsx";
import { DeleteTripConfirm } from "#src/trip-details/delete-trip-confirm.tsx";
import {
  tripDetailsOf,
  tripDetailsOps,
  type TripDetails,
} from "#src/trip-details/trip-details-ops.ts";
import type { QuickEdit } from "./quick-edit-context.ts";

/**
 * The details of the trip: its title, the line under it, who travels, its
 * first day and its time zone, saved together with one Undo. Under them are
 * the way to the history and, for an owner, Delete trip.
 */
export function TripDetailsPanel({ quickEdit }: { quickEdit: QuickEdit }) {
  const locale = useLocale();
  const showToast = useToast();
  const { trip, tripId } = quickEdit;
  const [opened] = useState(() => tripDetailsOf(trip));
  const [values, setValues] = useState(opened);
  const [noTitle, setNoTitle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const saved = t({ en: "Trip details saved", zh: "行程信息已保存" });

  if (isDeleting) {
    return (
      <DeleteTripConfirm
        tripId={tripId}
        title={trip.title}
        onCancel={() => {
          setIsDeleting(false);
        }}
        announce={(message) => {
          showToast({ message });
        }}
      />
    );
  }

  const set = (patch: Partial<TripDetails>) => {
    setValues({ ...values, ...patch });
  };
  const bind = (key: "title" | "subtitle" | "party") => ({
    value: values[key],
    autoComplete: "off",
    onChange: (event: { target: { value: string } }) => {
      set({ [key]: event.target.value });
    },
  });

  return (
    <div css={stack.group}>
      <form
        css={stack.item}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const isTitleEmpty = values.title.trim() === "";
          setNoTitle(isTitleEmpty);
          if (isTitleEmpty || values.firstDate === "") return;
          if (quickEdit.change(tripDetailsOps(opened, values), saved)) {
            quickEdit.close();
          }
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
            set({ firstDate });
          }}
        />
        <TimeZoneField
          value={values.timeZone}
          description={t({
            en: "It sets “today” and “now” on the trip.",
            zh: "它决定行程中的“今天”和“现在”。",
          })}
          onChange={(timeZone) => {
            set({ timeZone });
          }}
        />
        <FormFooter>
          <Button type="submit" look="primary">
            {t({ en: "Save", zh: "保存" })}
          </Button>
        </FormFooter>
      </form>
      <Divider />
      <div css={[row.tight, styles.more]}>
        <Button
          look="ghost"
          bleed="start"
          icon={<ClockCounterClockwiseIcon weight="bold" />}
          href={getLocalePath(`/${tripId}/history`, locale)}
        >
          {t({ en: "History", zh: "历史版本" })}
        </Button>
        {quickEdit.isOwner ? (
          <Button
            look="ghost"
            intent="destructive"
            bleed="end"
            icon={<TrashIcon weight="bold" />}
            onClick={() => {
              setIsDeleting(true);
            }}
          >
            {t({ en: "Delete trip…", zh: "删除行程…" })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const styles = stylex.create({
  more: {
    justifyContent: "space-between",
  },
});
