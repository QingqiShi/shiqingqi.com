import type { Item } from "./op-schema.ts";

/** The words that name an item. */
export function itemName(item: Item): string {
  switch (item.type) {
    case "flight":
      return `${item.number} ${item.from.code} → ${item.to.code}`;
    case "checklist":
    case "signSheet":
      return item.title;
    case "nav":
      return item.label;
    case "tip":
      return item.text;
    case "dining":
    case "place":
    case "lodging":
      return item.name;
  }
}
