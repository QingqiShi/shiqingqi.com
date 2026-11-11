import { t } from "@tuja/i18n";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import {
  DependentSettingExample,
  SettingListExample,
} from "./setting-row-specimens.tsx";

export function SettingRowShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Give each setting one row.",
          zh: "每个设置占一行。",
        })}
        lead={t({
          en: "A SettingRow puts the name of a setting and what it changes at the start, and the one control that changes it at the end. A SettingList draws a divider between the rows.",
          zh: "SettingRow 把设置的名称及其作用放在行首，把改变它的唯一控件放在行尾。SettingList 在各行之间画出分隔线。",
        })}
      >
        <SettingListExample />
        <GuideNote>
          {t({
            en: "The name is the control's label, so a Switch or a Select in the row needs no label of its own, and a click on the name toggles the Switch.",
            zh: "名称就是控件的标签，因此行中的 Switch 或 Select 不需要自己的标签，点击名称也会切换 Switch。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Where the row is too narrow for both, the control moves under the name.",
            zh: "行宽不足以并排放下两者时，控件会移到名称下方。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Put what depends on a setting under it.",
          zh: "把依赖于设置的内容放在它下方。",
        })}
        lead={t({
          en: "The children of a row line up under its name, so a field that only matters while the setting is on reads as part of that setting. Turn the switch off, and the field goes.",
          zh: "行的子内容与名称对齐，位于名称下方，因此只在设置开启时才有意义的字段，读起来就是该设置的一部分。关闭开关，字段随之消失。",
        })}
      >
        <DependentSettingExample />
      </GuideSection>

      <PropsTable component="setting-list" />

      <PropsTable component="setting-row" />
    </>
  );
}
