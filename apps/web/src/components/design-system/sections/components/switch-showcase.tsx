"use client";

import * as stylex from "@stylexjs/stylex";
import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";

function DemoSwitch({
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

function LiveSwitch() {
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
      <Text variant="bodySmall" tone="muted">
        {t({ en: "onChange →", zh: "onChange →" })}{" "}
        <span css={styles.stateValue}>{label}</span>
      </Text>
    </div>
  );
}

export function SwitchShowcase() {
  return (
    <>
      <Showcase label={t({ en: "States", zh: "状态" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="off">
            <DemoSwitch initial="off" label={t({ en: "Off", zh: "关闭" })} />
          </ShowcaseItem>
          <ShowcaseItem label="on">
            <DemoSwitch initial="on" label={t({ en: "On", zh: "开启" })} />
          </ShowcaseItem>
          <ShowcaseItem label="indeterminate">
            <DemoSwitch
              initial="indeterminate"
              label={t({ en: "Indeterminate", zh: "未定" })}
            />
          </ShowcaseItem>
          <ShowcaseItem label="disabled">
            <DemoSwitch
              initial="off"
              disabled
              label={t({ en: "Disabled", zh: "禁用" })}
            />
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "交互" })}>
        <div css={[flex.col, styles.interactiveStack]}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "Click, drag the thumb, or focus and press Space or Enter. The switch reports each change through `onChange`.",
              zh: "点击、拖动滑块，或聚焦后按空格或回车。开关会通过 `onChange` 报告每次变化。",
            })}
          </Text>
          <LiveSwitch />
        </div>
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  interactiveStack: {
    gap: space._3,
  },
  liveRow: {
    gap: space._3,
    alignItems: "center",
  },
  stateValue: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.textMain,
    paddingInline: space._1,
    paddingBlock: space._00,
    borderRadius: border.radius_1,
    backgroundColor: color.bgInteractiveRest,
  },
});
