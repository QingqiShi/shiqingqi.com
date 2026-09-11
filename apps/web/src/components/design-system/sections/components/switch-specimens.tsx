"use client";

import * as stylex from "@stylexjs/stylex";
import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { StateReadout } from "../../showcase.tsx";

export function SpecimenSwitch({
  initial = "off",
  disabled,
  label,
}: {
  initial?: SwitchState;
  disabled?: boolean;
  label: string;
}) {
  const [state, setState] = useState<SwitchState>(initial);
  return (
    <Switch
      value={state}
      onChange={setState}
      disabled={disabled}
      aria-label={label}
    />
  );
}

export function LiveSwitch() {
  const [state, setState] = useState<SwitchState>("off");
  const label = {
    off: t({ en: "Off", zh: "关闭" }),
    on: t({ en: "On", zh: "开启" }),
    indeterminate: t({ en: "Indeterminate", zh: "未定" }),
  }[state];
  return (
    <div css={[flex.row, styles.liveRow]}>
      <Switch
        value={state}
        onChange={setState}
        aria-label={t({ en: "Demo toggle", zh: "演示开关" })}
      />
      <StateReadout label={t({ en: "onChange →", zh: "onChange →" })}>
        {label}
      </StateReadout>
    </div>
  );
}

const styles = stylex.create({
  liveRow: {
    gap: space._3,
    alignItems: "center",
  },
});
