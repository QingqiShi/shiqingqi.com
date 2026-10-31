import { t } from "@tuja/i18n";
import { TextField } from "@tuja/ui/components/text-field";
import { Example } from "#src/design-system/example.tsx";

export function CustomizationContentExample() {
  return (
    <Example>
      <TextField
        label={t({
          en: "Walk from the station, in minutes",
          zh: "从车站步行的时间（分钟）",
        })}
        trailing={t({ en: "min", zh: "分" })}
        defaultValue="12"
      />
    </Example>
  );
}
