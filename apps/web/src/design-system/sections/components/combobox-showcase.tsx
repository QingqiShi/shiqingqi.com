import { t } from "@tuja/i18n";
import { Combobox } from "@tuja/ui/components/combobox";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";

function TimeZoneField() {
  const timeZones = Intl.supportedValuesOf("timeZone").map((id) => ({
    id,
    label: id.slice(id.lastIndexOf("/") + 1).replaceAll("_", " "),
    detail: id,
  }));
  return (
    <Combobox
      label={t({ en: "Time zone", zh: "时区" })}
      options={timeZones}
      defaultSelected="Europe/Lisbon"
      emptyLabel={t({ en: "No time zone matches", zh: "没有匹配的时区" })}
    />
  );
}

export function ComboboxShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Find one of many by typing.",
          zh: "输入几个字，从众多选项中找到一个。",
        })}
        lead={t({
          en: "Combobox is a Text field with a list under it. Each word typed keeps the options with a word that starts with it, so “new y” finds New York among four hundred time zones.",
          zh: "Combobox 是下方带列表的文本输入框。输入的每个词都会保留以它开头的选项，因此在四百个时区中输入“new y”就能找到 New York。",
        })}
      >
        <Example fill>
          <TimeZoneField />
        </Example>
        <GuideNote>
          {t({
            en: "Up and Down move through the list, Enter picks, and Escape puts the picked option back.",
            zh: "上下方向键在列表中移动，Enter 选中，Escape 恢复已选的选项。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "On a phone, the list opens above the field when the keyboard leaves more room there.",
            zh: "在手机上，若键盘使上方空间更大，列表会在输入框上方打开。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Pass value and onValueChange instead, and the text is the value: the options are suggestions you rank, and createLabel offers to make a new item of the text.",
            zh: "改为传入 value 和 onValueChange 时，文字本身就是值：选项是由你排序的建议，createLabel 则提供以这段文字新建条目的选项。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="combobox" />
    </>
  );
}
