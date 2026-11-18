"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import type { MomentTime as Time } from "#src/trips/types.ts";
import { useTimeLabel } from "../use-time-label.ts";
import { useQuickEdit } from "./quick-edit-context.ts";

/**
 * The time of a moment in words, in an element with `textId`, which can name
 * the heading that holds it. For a person who can change the trip, it is a
 * button that changes it.
 */
export function MomentTime({
  id,
  time,
  textId,
}: {
  id: string;
  time: Time;
  textId: string;
}) {
  const quickEdit = useQuickEdit();
  const timeLabel = useTimeLabel();
  const label = t({ en: "Change the time, {time}", zh: "修改时间，{time}" });
  const text = <span id={textId}>{timeLabel(time)}</span>;
  if (!quickEdit) return text;
  return (
    <Button
      look="ghost"
      size="sm"
      bleed="start"
      aria-label={label.replace("{time}", timeLabel(time))}
      onClick={() => {
        quickEdit.open({ kind: "moment", id });
      }}
    >
      {text}
    </Button>
  );
}
