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
import { SwitchLampStage } from "./switch-lamp-stage.tsx";
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

      <Showcase label={t({ en: "Lamp", zh: "灯" })}>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: 'With effect="lamp", inside an EffectLayerProvider, the thumb is a light. Turning the switch on swells a pool of accent light out over the page around it, and the registered elements nearby cast soft shadows away from it. Drag the thumb and the light rides it, so the shadows swing. Turning it off lets the light die away. On a dark page the light brightens the page; on a light page it tints it, and the shadows darken it. Under reduced motion the light crosses from off to on with no swell. Without the effect layer the switch looks and works as it does with no effect.',
              zh: '在 EffectLayerProvider 之内设置 effect="lamp"，滑块就是一盏灯。开启开关时，一片强调色的光从滑块向四周页面扩散，附近已登记的元素投下背向它的柔和阴影。拖动滑块，光随之移动，阴影也随之摆动。关闭开关，光便熄灭。在深色页面上，光照亮页面；在浅色页面上，光为页面染色，阴影则让页面变暗。在减少动态效果模式下，光直接从关到开，没有渐强过程。没有效果层时，开关的外观与行为与无效果时相同。',
            })}
          </Text>
          <Specimen caption={t({ en: "lamp", zh: "灯" })}>
            <SwitchLampStage />
          </Specimen>
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
