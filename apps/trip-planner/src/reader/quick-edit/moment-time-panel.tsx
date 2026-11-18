"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { TimeField } from "@tuja/ui/components/time-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import type { Moment, MomentTime } from "#src/trips/types.ts";
import { momentMinutes } from "../day-feed/moment-minutes.ts";
import type { QuickEdit } from "./quick-edit-context.ts";

/** The clock time that a time shows as, as `HH:MM`: a part of the day gives the time it stands for, and a backup plan none. */
function clockOf(time: MomentTime): string {
  if (time === "backup") return "";
  const minutes = momentMinutes(time);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${two(Math.floor(minutes / 60))}:${two(minutes % 60)}`;
}

/**
 * A new clock time for a moment. It saves on Done, not at each turn of the
 * picker, and only when the person changed the time that the panel opened
 * with, so that Done cannot write over a newer time from someone else.
 */
export function MomentTimePanel({
  quickEdit,
  moment,
}: {
  quickEdit: QuickEdit;
  moment: Moment;
}) {
  const [opened] = useState(() => clockOf(moment.time));
  const [clock, setClock] = useState(opened);
  const message = t({ en: "Time changed to {time}", zh: "时间已改为 {time}" });
  return (
    <form
      css={stack.group}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (clock === "") return;
        const isChanged =
          clock === opened ||
          quickEdit.change(
            [{ op: "setMoment", id: moment.id, fields: { time: clock } }],
            message.replace("{time}", clock),
          );
        if (isChanged) quickEdit.close();
      }}
    >
      <TimeField
        label={t({ en: "Time", zh: "时间" })}
        autoFocus
        value={clock}
        onValueChange={setClock}
      />
      <FormFooter>
        <Button type="submit" look="primary" disabled={clock === ""}>
          {t({ en: "Done", zh: "完成" })}
        </Button>
      </FormFooter>
    </form>
  );
}
