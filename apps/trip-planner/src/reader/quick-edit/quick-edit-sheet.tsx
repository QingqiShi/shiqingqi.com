"use client";

import { t } from "@tuja/i18n";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { Fragment, type ReactNode } from "react";
import { findItem, findMoment } from "#src/trips/ops/find-item.ts";
import { itemName } from "#src/trips/ops/item-name.ts";
import { TripText } from "../trip-text.tsx";
import { ItemPanel } from "./item-panel.tsx";
import { MomentTimePanel } from "./moment-time-panel.tsx";
import {
  type QuickEditTarget,
  useGoneMessage,
  useQuickEdit,
} from "./quick-edit-context.ts";
import { TripDetailsPanel } from "./trip-details-panel.tsx";

/** The title and the controls of the sheet for a thing, from the trip as it is now. */
function useSheetParts(target: QuickEditTarget | null): {
  title: ReactNode;
  body: ReactNode;
} {
  const quickEdit = useQuickEdit();
  const goneTitle = t({ en: "Not in the trip", zh: "不在行程中" });
  const goneBody = useGoneMessage();
  const momentTitle = t({ en: "Change the time", zh: "修改时间" });
  const tripTitle = t({ en: "Trip details", zh: "行程信息" });
  const gone = {
    title: goneTitle,
    body: <Text tone="muted">{goneBody}</Text>,
  };
  if (!quickEdit || !target) return gone;

  if (target.kind === "trip") {
    return {
      title: tripTitle,
      body: <TripDetailsPanel quickEdit={quickEdit} />,
    };
  }
  if (target.kind === "moment") {
    const found = findMoment(quickEdit.trip, target.id);
    if (!found) return gone;
    return {
      title: momentTitle,
      body: <MomentTimePanel quickEdit={quickEdit} moment={found.moment} />,
    };
  }
  const found = findItem(quickEdit.trip, target.id);
  if (!found) return gone;
  return {
    title: <TripText>{itemName(found.item)}</TripText>,
    body: <ItemPanel quickEdit={quickEdit} found={found} />,
  };
}

/** The one sheet of the quick changes of the reader. */
export function QuickEditSheet({
  target,
  openCount,
  isOpen,
  onClose,
}: {
  target: QuickEditTarget | null;
  /** How many times the sheet opened. Each opening starts its panel fresh. */
  openCount: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { title, body } = useSheetParts(target);
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      closeLabel={t({ en: "Close", zh: "关闭" })}
    >
      <Fragment key={openCount}>{body}</Fragment>
    </Sheet>
  );
}
