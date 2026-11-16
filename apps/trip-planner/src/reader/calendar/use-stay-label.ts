import { t } from "@tuja/i18n";
import type { TripStay } from "./trip-stays.ts";

/** "Baixa House · 2 nights" */
export function useStayLabel() {
  const one = t({ en: "{name} · 1 night", zh: "{name} · 1 晚" });
  const many = t({ en: "{name} · {n} nights", zh: "{name} · {n} 晚" });
  return (stay: TripStay) =>
    (stay.nights === 1 ? one : many)
      .replace("{name}", stay.name)
      .replace("{n}", String(stay.nights));
}
