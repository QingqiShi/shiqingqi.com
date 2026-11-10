import { t } from "@tuja/i18n";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { LiveSwitch, SpecimenSwitch } from "./switch-specimens.tsx";

export function SwitchShowcase() {
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

      <Showcase
        label={t({ en: "Label and description", zh: "标签与说明" })}
        leadsWithText
      >
        <Text look="bodySmall" tone="muted">
          {t({
            en: "With a `label`, the switch leads and its name follows, so the two read as one setting with no box around them. The description sits under the name, and a click on the name toggles the switch.",
            zh: "有 `label` 时，开关在前，名称紧随其后，二者无需外框即可读作同一个设置项。说明文字位于名称下方，点击名称也会切换开关。",
          })}
        </Text>
        <Specimen caption="label, description">
          <Switch
            defaultValue="on"
            label={t({ en: "Show subtitles", zh: "显示字幕" })}
            description={t({
              en: "Captions appear at the bottom of the screen while a video plays.",
              zh: "播放视频时，字幕会显示在屏幕底部。",
            })}
          />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="xs">
            <Switch
              size="xs"
              defaultValue="on"
              aria-label={t({ en: "Extra small", zh: "特小" })}
            />
          </Specimen>
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

      <Showcase label={t({ en: "Interactive", zh: "交互" })} leadsWithText>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Click, drag the thumb, or focus and press Space or Enter. The switch reports each change through `onChange`.",
            zh: "点击、拖动滑块，或聚焦后按空格或回车。开关会通过 `onChange` 报告每次变化。",
          })}
        </Text>
        <Specimen caption={t({ en: "live", zh: "实时" })}>
          <LiveSwitch />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Effect", zh: "效果" })} leadsWithText>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'By default the thumb is plain and solid at rest. While a pointer is over the switch, a light lands on its top edge and leans towards the pointer. When it is pressed or toggled, it melts into water, pours across the track, flows on for a moment after it arrives and sets solid again, as the effect prop below describes. effect="none" keeps the plain thumb and track, and so does a switch without an EffectLayerProvider or WebGPU.',
            zh: '默认情况下，滑块在静止时是普通的实心块。指针停在开关上时，光落在它的上缘，并偏向指针。按下或切换时，它融化成水并涌过轨道，到位后继续流动片刻，再重新凝固，详见下方的 effect prop。设置 effect="none" 会保留普通的滑块与轨道；没有 EffectLayerProvider 或 WebGPU 时也是如此。',
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
      </Showcase>

      <PropsTable component="switch" />
    </>
  );
}
