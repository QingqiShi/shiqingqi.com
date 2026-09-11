"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Progress } from "@tuja/ui/components/progress";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { StateReadout } from "../../showcase.tsx";

/** Steps a controlled value so a visitor can watch `aria-valuenow` track it. */
export function ProgressStepper() {
  const STEP = 20;
  const [value, setValue] = useState(40);
  return (
    <div css={[flex.col, styles.stepperStack]}>
      <Progress
        value={value}
        size="lg"
        label={t({ en: "Export progress", zh: "导出进度" })}
      />
      <div css={[flex.row, styles.stepperControls]}>
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

const styles = stylex.create({
  stepperStack: {
    gap: space._3,
  },
  stepperControls: {
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
  },
});
