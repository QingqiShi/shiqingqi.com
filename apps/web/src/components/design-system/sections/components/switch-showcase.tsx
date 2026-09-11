import * as stylex from "@stylexjs/stylex";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
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
        <div css={[flex.col, styles.interactiveStack]}>
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
  interactiveStack: {
    gap: space._3,
  },
  switchField: {
    display: "inline-flex",
    flexDirection: "row",
    alignItems: "center",
    gap: space._2,
    cursor: "pointer",
  },
});
