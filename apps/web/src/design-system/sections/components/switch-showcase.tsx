import * as stylex from "@stylexjs/stylex";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { t } from "#src/i18n.ts";
import { LiveSwitch, SpecimenSwitch } from "./switch-specimens.tsx";

export function SwitchShowcase() {
  const switchLabel = t({ en: "Autoplay trailers", zh: "自动播放预告" });
  return (
    <>
      <Showcase label={t({ en: "States", zh: "状态" })}>
        <SpecimenGrid>
          <Specimen caption="off">
            <SpecimenSwitch
              initial="off"
              label={t({ en: "Off", zh: "关闭" })}
            />
          </Specimen>
          <Specimen caption="on">
            <SpecimenSwitch initial="on" label={t({ en: "On", zh: "开启" })} />
          </Specimen>
          <Specimen caption="indeterminate">
            <SpecimenSwitch
              initial="indeterminate"
              label={t({ en: "Indeterminate", zh: "未定" })}
            />
          </Specimen>
          <Specimen caption="disabled">
            <SpecimenSwitch
              initial="off"
              disabled
              label={t({ en: "Disabled", zh: "禁用" })}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Switch
              size="sm"
              defaultValue="on"
              aria-label={t({ en: "Small", zh: "小" })}
            />
          </Specimen>
          <Specimen caption="md">
            <Switch
              size="md"
              defaultValue="on"
              aria-label={t({ en: "Medium", zh: "中" })}
            />
          </Specimen>
          <Specimen caption="lg">
            <Switch
              size="lg"
              defaultValue="on"
              aria-label={t({ en: "Large", zh: "大" })}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "交互" })}>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Click, drag the thumb, or focus and press Space or Enter. The switch reports each change through `onChange`.",
              zh: "点击、拖动滑块，或聚焦后按空格或回车。开关会通过 `onChange` 报告每次变化。",
            })}
          </Text>
          <Specimen caption={t({ en: "live", zh: "实时" })}>
            <LiveSwitch />
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Effect", zh: "效果" })}>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: 'By default the thumb is a frozen drop of frosted ice, which thaws into water and pours across the track when it is pressed or toggled, as the effect prop below describes. effect="none" keeps the plain thumb and track, and so does a switch without an EffectLayerProvider or WebGPU.',
              zh: '默认情况下，滑块是一滴结霜的冰，按下或切换时融化成水并涌过轨道，详见下方的 effect 属性。设置 effect="none" 会保留普通的滑块与轨道；没有 EffectLayerProvider 或 WebGPU 时也是如此。',
            })}
          </Text>
          <SpecimenGrid>
            <Specimen caption="liquid">
              <SpecimenSwitch
                initial="off"
                label={t({ en: "Liquid", zh: "液态" })}
              />
            </Specimen>
            <Specimen caption="none">
              <SpecimenSwitch
                initial="off"
                effect="none"
                label={t({ en: "No effect", zh: "无效果" })}
              />
            </Specimen>
          </SpecimenGrid>
        </div>
      </Showcase>

      <PropsTable component="switch" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <label css={styles.switchField}>
              <Text as="span" look="bodySmall">
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
  switchField: {
    display: "inline-flex",
    flexDirection: "row",
    alignItems: "center",
    gap: rhythm.tight,
    cursor: "pointer",
  },
});
