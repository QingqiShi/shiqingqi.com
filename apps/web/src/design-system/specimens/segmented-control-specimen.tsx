"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Two segments, the first selected — the smallest arrangement in which the
 * raised segment reads as raised, since it needs an unraised neighbour to
 * differ from.
 *
 * A client component, unlike the other specimens: the control is controlled by
 * contract, so it needs an `onChange` — and a function can't cross the server
 * boundary. The handler is a no-op and the plate is inert, so the specimen still
 * holds no state of its own.
 */
export function SegmentedControlSpecimen() {
  return (
    <div css={specimenLayout.fill}>
      <SegmentedControl
        aria-label={t({ en: "View", zh: "视图" })}
        size="sm"
        fullWidth
        value="grid"
        onChange={noop}
        options={[
          { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
          { value: "list", label: t({ en: "List", zh: "列表" }) },
        ]}
      />
    </div>
  );
}

function noop() {
  // The specimen is inert; nothing can select a segment.
}
