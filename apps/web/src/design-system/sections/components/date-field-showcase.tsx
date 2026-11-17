import { t } from "@tuja/i18n";
import { Columns } from "@tuja/ui/components/columns";
import { DateField } from "@tuja/ui/components/date-field";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";

export function DateFieldShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Ask for a day with the device's own picker.",
          zh: "用设备自带的选择器填写日期。",
        })}
        lead={t({
          en: "DateField is the native date input in the frame of a Text field. A phone opens its own date picker, and a keyboard types the day part by part.",
          zh: "DateField 是放在文本输入框边框中的原生日期输入。手机会打开自带的日期选择器，键盘则可以逐段输入日期。",
        })}
      >
        <Example>
          <DateField
            label={t({ en: "Check-in", zh: "入住" })}
            defaultValue="2026-05-14"
          />
        </Example>
        <GuideNote>
          {t({
            en: "The day shows in the format of the visitor's device. The value is always YYYY-MM-DD.",
            zh: "日期以访客设备的格式显示，值始终为 YYYY-MM-DD。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: 'onValueChange gets a whole day, or "" when the field is cleared. A day that is half typed stays on the screen and is not sent.',
            zh: 'onValueChange 收到完整的日期；字段被清空时收到 ""。只输入了一半的日期会留在屏幕上，但不会被发送。',
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Keep the day in its range.",
          zh: "让日期留在范围之内。",
        })}
        lead={t({
          en: "min and max limit the days that the picker offers. A keyboard can still type a day outside them, so say why it is wrong in error.",
          zh: "min 和 max 限定选择器提供的日期。键盘仍可输入范围之外的日期，因此要用 error 说明原因。",
        })}
      >
        <Example fill>
          <Columns gap="item">
            <DateField
              label={t({ en: "Check-in", zh: "入住" })}
              defaultValue="2026-05-14"
            />
            <DateField
              label={t({ en: "Check-out", zh: "退房" })}
              defaultValue="2026-05-12"
              min="2026-05-15"
              error={t({
                en: "Check-out comes after check-in.",
                zh: "退房日期须晚于入住日期。",
              })}
            />
          </Columns>
        </Example>
      </GuideSection>

      <PropsTable component="date-field" />
    </>
  );
}
