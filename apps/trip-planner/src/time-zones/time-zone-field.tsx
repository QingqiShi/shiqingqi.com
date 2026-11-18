"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Combobox } from "@tuja/ui/components/combobox";
import { useState } from "react";
import { timeZoneLabel } from "./time-zone-label.ts";
import { timeZoneOptions } from "./time-zone-options.ts";

/** The field of the time zone of a trip, which finds a zone by a city or a country. */
export function TimeZoneField({
  value,
  onChange,
  description,
}: {
  value: string;
  onChange: (timeZone: string) => void;
  /** What the zone does, shown under the field. */
  description: string;
}) {
  const locale = useLocale();
  const zoneLabel = timeZoneLabel(value, locale);
  // The list of all zones costs a slow phone more than a frame, so it waits
  // until the person goes to the field.
  const [hasAllZones, setHasAllZones] = useState(false);
  const [isZoneKept, setIsZoneKept] = useState(false);
  const kept = t({
    en: "The time zone is still {zone}. To change it, pick a zone from the list.",
    zh: "时区仍是{zone}。要更换时区，请从列表中选择。",
  });

  return (
    <Combobox
      label={t({ en: "Time zone", zh: "时区" })}
      description={isZoneKept ? kept.replace("{zone}", zoneLabel) : description}
      options={
        hasAllZones
          ? timeZoneOptions(locale, value)
          : [{ id: value, label: zoneLabel }]
      }
      selected={value}
      onSelectedChange={onChange}
      onFocus={() => {
        setIsZoneKept(false);
        setHasAllZones(true);
      }}
      onBlur={(event) => {
        const typed = event.currentTarget.value.trim();
        setIsZoneKept(typed !== zoneLabel);
      }}
      emptyLabel={t({
        en: "No time zone matches. Search by a large city or the country, for example Tokyo or Japan.",
        zh: "没有匹配的时区。请搜索大城市或国家，例如“东京”或“日本”。",
      })}
    />
  );
}
