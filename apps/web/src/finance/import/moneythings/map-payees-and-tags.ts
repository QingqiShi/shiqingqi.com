import { importId } from "./import-id.ts";
import type { PayeeRow, TagRow } from "./types.ts";
import type { MapOptions } from "./types.ts";
import type { SourceData, SourceTag } from "./types.ts";

/** MoneyThings tag types whose tags name the merchant. */
const PAYEE_TYPES = new Set([
  "食物",
  "外卖平台",
  "超市",
  "订阅",
  "保险",
  "网购",
]);
/** When a transaction has two merchant tags, this type is the payee. */
const PREFERRED_PAYEE_TYPE = "外卖平台";

export interface MappedPayeesAndTags {
  payees: PayeeRow[];
  tags: TagRow[];
  /** The payee and tags of a transaction (or a rule) with these MoneyThings tag ids. */
  resolve: (tagIds: readonly string[]) => {
    payeeId: string | null;
    tagIds: string[];
  };
  /** Source tag ids that no tag row matches (deleted in MoneyThings). */
  unknownTagIds: Set<string>;
}

/** A tag-type name without its leading emoji: "🍔 食物" → "食物". */
function typeLabel(name: string) {
  const space = name.indexOf(" ");
  return space === -1 ? name : name.slice(space + 1).trim();
}

/**
 * MoneyThings tags become payees (merchant types) or tags (社交, 交通工具).
 * A second merchant tag on one transaction becomes a tag of the same name.
 */
export function mapPayeesAndTags(
  source: SourceData,
  options: MapOptions,
): MappedPayeesAndTags {
  const typeByPk = new Map(
    source.tagTypes.map((t) => [t.pk, typeLabel(t.name)]),
  );
  const tagsById = new Map(source.tags.map((t) => [t.id, t]));
  const payees: PayeeRow[] = [];
  const tags: TagRow[] = [];
  const unknownTagIds = new Set<string>();

  const typeOf = (tag: SourceTag) =>
    tag.typePk === null ? "" : (typeByPk.get(tag.typePk) ?? "");
  const isPayee = (tag: SourceTag) => PAYEE_TYPES.has(typeOf(tag));

  const ordered = [...source.tags].sort(
    (a, b) => a.order - b.order || a.pk - b.pk,
  );
  for (const tag of ordered) {
    if (isPayee(tag)) {
      payees.push({
        id: importId("payee", tag.id),
        householdId: options.householdId,
        name: tag.name,
        note: typeOf(tag),
        version: 0,
      });
    } else {
      tags.push({
        id: importId("tag", tag.id),
        householdId: options.householdId,
        name: tag.name,
        position: tags.length,
        version: 0,
      });
    }
  }

  const extraTagIds = new Set<string>();
  const tagFromPayee = (tag: SourceTag) => {
    const id = importId("tag", tag.id);
    if (!extraTagIds.has(id)) {
      extraTagIds.add(id);
      tags.push({
        id,
        householdId: options.householdId,
        name: tag.name,
        position: tags.length,
        version: 0,
      });
    }
    return id;
  };

  return {
    payees,
    tags,
    unknownTagIds,
    resolve(tagIds) {
      const found: SourceTag[] = [];
      for (const tagId of tagIds) {
        const tag = tagsById.get(tagId);
        if (tag) {
          if (!found.includes(tag)) found.push(tag);
        } else {
          unknownTagIds.add(tagId);
        }
      }
      const merchants = found.filter(isPayee);
      const payee =
        merchants.find((tag) => typeOf(tag) === PREFERRED_PAYEE_TYPE) ??
        merchants.at(0);
      return {
        payeeId: payee ? importId("payee", payee.id) : null,
        tagIds: found
          .filter((tag) => tag !== payee)
          .map((tag) =>
            isPayee(tag) ? tagFromPayee(tag) : importId("tag", tag.id),
          ),
      };
    },
  };
}
