"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useState } from "react";
import { t } from "#src/i18n.ts";

/** Holds the selected segment — `SegmentedControl` is controlled by contract. */
export function GlassSegmentsSpecimen() {
  const [view, setView] = useState("cards");

  return (
    <SegmentedControl
      aria-label={t({ en: "View", zh: "视图" })}
      options={[
        { value: "cards", label: t({ en: "Cards", zh: "卡片" }) },
        { value: "list", label: t({ en: "List", zh: "列表" }) },
        { value: "table", label: t({ en: "Table", zh: "表格" }) },
      ]}
      value={view}
      onChange={setView}
    />
  );
}
