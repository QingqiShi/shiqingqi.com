"use client";

import * as stylex from "@stylexjs/stylex";
import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

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
  const switchLabel = t({ en: "Autoplay trailers", zh: "自动播放预告" });
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

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="sm">
            <Switch
              size="sm"
              defaultValue="on"
              aria-label={t({ en: "Small", zh: "小" })}
            />
          </ShowcaseItem>
          <ShowcaseItem label="md">
            <Switch
              size="md"
              defaultValue="on"
              aria-label={t({ en: "Medium", zh: "中" })}
            />
          </ShowcaseItem>
          <ShowcaseItem label="lg">
            <Switch
              size="lg"
              defaultValue="on"
              aria-label={t({ en: "Large", zh: "大" })}
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

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { useState } from "react";

const [state, setState] = useState<SwitchState>("off");

<Switch value={state} onChange={setState} aria-label="Reduce motion" />`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "value",
              type: "SwitchState",
              description: t({
                en: 'Controlled state ("off" | "on" | "indeterminate"); pair with onChange.',
                zh: '受控状态（"off" | "on" | "indeterminate"）；与 onChange 搭配使用。',
              }),
            },
            {
              name: "defaultValue",
              type: "SwitchState",
              defaultValue: '"off"',
              description: t({
                en: "Initial state for an uncontrolled switch; ignored once value is set.",
                zh: "非受控开关的初始状态；一旦设置了 value 便忽略。",
              }),
            },
            {
              name: "onChange",
              type: "(state: SwitchState) => void",
              description: t({
                en: "Fires with the next state on every user toggle (pointer, keyboard, label).",
                zh: "每次用户切换（指针、键盘、标签）时以下一状态触发。",
              }),
            },
            {
              name: "size",
              type: '"sm" | "md" | "lg"',
              defaultValue: '"md"',
              description: t({
                en: "Track-height ramp via controlSize; the width and thumb scale with it.",
                zh: "基于 controlSize 的轨道高度梯度；宽度与滑块随之缩放。",
              }),
            },
            {
              name: "disabled",
              type: "boolean",
              description: t({
                en: "Disables all interaction.",
                zh: "禁用所有交互。",
              }),
            },
            {
              name: "aria-label",
              type: "string",
              description: t({
                en: 'Accessible name for the role="switch" input; provide this or associate a <label>.',
                zh: '为 role="switch" 输入提供可访问名称；提供它或关联一个 <label>。',
              }),
            },
            {
              name: "…input attributes",
              type: 'ComponentProps<"input">',
              description: t({
                en: "Native input attributes are forwarded; checked and onChange are managed internally.",
                zh: "原生 input 属性会被转发；checked 与 onChange 由内部管理。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <label css={styles.switchField}>
              <Text as="span" variant="bodySmall">
                {switchLabel}
              </Text>
              <Switch defaultValue="on" aria-label={switchLabel} />
            </label>
          }
          doCaption={t({
            en: "Give every switch a name — an aria-label or an associated <label> — so it announces its purpose.",
            zh: "为每个开关命名——aria-label 或关联的 <label>——以便宣读其用途。",
          })}
          dont={<Switch defaultValue="off" />}
          dontCaption={t({
            en: "Don't ship a switch unlabeled or use it to commit an action like submitting a form — that's a Button's job.",
            zh: "不要让开关缺少标签，也不要用它来提交表单等执行动作——那是按钮的职责。",
          })}
        />
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
  switchField: {
    display: "inline-flex",
    flexDirection: "row",
    alignItems: "center",
    gap: space._2,
    cursor: "pointer",
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
