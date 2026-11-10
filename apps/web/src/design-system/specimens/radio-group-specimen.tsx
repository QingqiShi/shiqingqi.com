import { t } from "@tuja/i18n";
import { RadioGroup } from "@tuja/ui/components/radio-group";

/** Three plain answers, the second picked. */
export function RadioGroupSpecimen() {
  return (
    <RadioGroup
      aria-label={t({ en: "Notify me", zh: "通知我" })}
      defaultValue="needs-me"
      options={[
        { value: "every", label: t({ en: "Every report", zh: "每份报告" }) },
        {
          value: "needs-me",
          label: t({ en: "When it needs me", zh: "有事需要我时" }),
        },
        { value: "never", label: t({ en: "Never", zh: "从不" }) },
      ]}
    />
  );
}
