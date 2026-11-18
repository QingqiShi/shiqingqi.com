import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";

/** Says when a conversation started, in the person's time: "Today, 14:02", or a date and a time. */
export function useSegmentDate() {
  const locale = useLocale();
  const today = t({ en: "Today, {time}", zh: "今天 {time}" });
  return (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const time = date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (date.toDateString() === now.toDateString()) {
      return today.replace("{time}", time);
    }
    return date.toLocaleString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
      hour: "numeric",
      minute: "2-digit",
    });
  };
}
