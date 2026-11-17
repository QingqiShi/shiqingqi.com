import { t } from "@tuja/i18n";
import { Columns } from "@tuja/ui/components/columns";
import { DateField } from "@tuja/ui/components/date-field";
import { TimeField } from "@tuja/ui/components/time-field";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";

export function TimeFieldShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Ask for a time with the device's own picker.",
          zh: "用设备自带的选择器填写时刻。",
        })}
        lead={t({
          en: "TimeField is the native time input in the frame of a Text field. A phone opens its own time picker, and a keyboard types the hours and the minutes.",
          zh: "TimeField 是放在文本输入框边框中的原生时间输入。手机会打开自带的时间选择器，键盘则可以分别输入小时和分钟。",
        })}
      >
        <Example>
          <TimeField
            label={t({ en: "Departs", zh: "出发" })}
            defaultValue="09:30"
          />
        </Example>
        <GuideNote>
          {t({
            en: "The time shows on the 12-hour or the 24-hour clock of the visitor's device. The value is always HH:MM on the 24-hour clock.",
            zh: "时刻按访客设备的 12 小时制或 24 小时制显示，值始终为 24 小时制的 HH:MM。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: 'onValueChange gets a whole time, or "" when the field is cleared. A time that is half typed stays on the screen and is not sent.',
            zh: 'onValueChange 收到完整的时刻；字段被清空时收到 ""。只输入了一半的时刻会留在屏幕上，但不会被发送。',
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Set a day and a time side by side.",
          zh: "把日期和时刻并排放置。",
        })}
        lead={t({
          en: "A Date field and a Time field have the frame and the heights of every other field, so they line up in one row.",
          zh: "日期输入框和时间输入框与其他输入框的边框和高度相同，因此能在一行中对齐。",
        })}
      >
        <Example fill>
          <Columns gap="item">
            <DateField
              label={t({ en: "Day", zh: "日期" })}
              defaultValue="2026-05-14"
            />
            <TimeField
              label={t({ en: "Time", zh: "时刻" })}
              defaultValue="14:15"
            />
          </Columns>
        </Example>
      </GuideSection>

      <PropsTable component="time-field" />
    </>
  );
}
