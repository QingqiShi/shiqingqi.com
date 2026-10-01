"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useState } from "react";
import { t } from "#src/i18n.ts";

/**
 * A segmented control to try the arrow keys on. Its own `"use client"` island,
 * so the accessibility showcase stays a server component.
 */
export function KeyboardModelSpecimen() {
  const [view, setView] = useState("grid");

  return (
    <SegmentedControl
      aria-label={t({ en: "View", zh: "视图" })}
      options={[
        { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
        { value: "list", label: t({ en: "List", zh: "列表" }) },
        { value: "compact", label: t({ en: "Compact", zh: "紧凑" }) },
      ]}
      value={view}
      onChange={setView}
    />
  );
}
