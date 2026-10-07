"use client";

import { Button } from "@tuja/ui/components/button";
import { Progress } from "@tuja/ui/components/progress";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { StateReadout } from "#src/design-system/showcase.tsx";
import { t } from "#src/i18n.ts";

/** Steps a controlled value so a visitor can watch `aria-valuenow` track it. */
export function ProgressStepper() {
  const STEP = 20;
  const [value, setValue] = useState(40);
  return (
    <div css={stack.item}>
      <Progress
        value={value}
        size="lg"
        label={t({ en: "Export progress", zh: "导出进度" })}
      />
      <div css={cluster.tight}>
        <Button
          size="sm"
          look="outline"
          disabled={value === 0}
          onClick={() => {
            setValue((current) => Math.max(current - STEP, 0));
          }}
        >
          {t({ en: "Back", zh: "后退" })}
        </Button>
        <Button
          size="sm"
          look="outline"
          disabled={value === 100}
          onClick={() => {
            setValue((current) => Math.min(current + STEP, 100));
          }}
        >
          {t({ en: "Forward", zh: "前进" })}
        </Button>
        <StateReadout label="aria-valuenow" tabular>
          {value}
        </StateReadout>
      </div>
    </div>
  );
}
