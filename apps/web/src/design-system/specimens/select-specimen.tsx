import { Select } from "@tuja/ui/components/select";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/** The options-array form, which is how most callsites use it. */
export function SelectSpecimen() {
  return (
    <Select
      size="sm"
      label={t({ en: "Sort by", zh: "排序方式" })}
      defaultValue="rating"
      options={[
        { value: "popular", label: t({ en: "Popular", zh: "热门" }) },
        { value: "rating", label: t({ en: "Top rated", zh: "高分" }) },
        { value: "newest", label: t({ en: "Newest", zh: "最新" }) },
      ]}
      css={specimenLayout.fill}
    />
  );
}
