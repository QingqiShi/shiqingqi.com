import { t } from "@tuja/i18n";

/** The words of a `ReorderList` of to-dos or steps, for its handle and for a screen reader after a move. */
export function useMoveLabels() {
  const move = t({ en: "Move {title}", zh: "移动 {title}" });
  const movedTo = t({
    en: "{title}: place {place} of {count}",
    zh: "{title}：第 {place} 项，共 {count} 项",
  });
  return {
    handleLabel: (title: string) => move.replace("{title}", title),
    movedLabel: (title: string, place: number, count: number) =>
      movedTo
        .replace("{place}", String(place))
        .replace("{count}", String(count))
        .replace("{title}", title),
  };
}
