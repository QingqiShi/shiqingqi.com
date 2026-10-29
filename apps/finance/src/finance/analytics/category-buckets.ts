import {
  SERIES_TONES,
  seriesToneAt,
  type SeriesTone,
} from "../charts/series-tone-at.ts";
import type { AnalyticsIndex, AnalyticsKind } from "./types.ts";

interface CategoryBuckets {
  /** The bucket of each Category index, or -1. */
  bucketOf: Int32Array;
  /** The Category index each bucket stands for; the last index is no Category. */
  categories: Int32Array;
  /** The bucket that holds Transactions on the drilled-into Category itself, or -1. */
  directBucket: number;
  /** A colour per bucket from its rank over all time, so it keeps it in every range. */
  tones: readonly SeriesTone[];
  count: number;
}

const MAX_DEPTH = 32;

/** The ancestor of `category` whose parent is `parent` (-1 = a root), or -1 when there is none. */
function ancestorUnder(
  parents: Int32Array,
  category: number,
  parent: number,
): number {
  let current = category;
  for (let depth = 0; depth < MAX_DEPTH && current >= 0; depth++) {
    const up = parents[current];
    if (up === parent) return current;
    current = up;
  }
  return -1;
}

/**
 * Groups Categories for a breakdown: every root Category (and no Category)
 * when `parent` is -1, else the children of `parent`, with Transactions on
 * `parent` itself in a bucket of their own. Each Category counts in the
 * bucket of its ancestor at that level.
 */
export function categoryBuckets(
  index: AnalyticsIndex,
  kind: AnalyticsKind,
  parent: number,
): CategoryBuckets {
  const { categoryParents } = index;
  const size = categoryParents.length;
  const none = size - 1;
  const bucketOf = new Int32Array(size).fill(-1);
  const representative: number[] = [];
  const bucketByCategory = new Map<number, number>();
  let directBucket = -1;

  for (let category = 0; category < size; category++) {
    let head: number;
    if (parent < 0) {
      head =
        category === none ? none : ancestorUnder(categoryParents, category, -1);
    } else if (category === parent) {
      if (directBucket < 0) {
        directBucket = representative.length;
        representative.push(parent);
      }
      bucketOf[category] = directBucket;
      continue;
    } else {
      head = ancestorUnder(categoryParents, category, parent);
    }
    if (head < 0) continue;
    let bucket = bucketByCategory.get(head);
    if (bucket === undefined) {
      bucket = representative.length;
      bucketByCategory.set(head, bucket);
      representative.push(head);
    }
    bucketOf[category] = bucket;
  }

  const count = representative.length;
  const weight = new Float64Array(count);
  for (let category = 0; category < size; category++) {
    const bucket = bucketOf[category];
    if (bucket < 0) continue;
    const spending = index.spendingByCategory[category];
    const income = index.incomeByCategory[category];
    weight[bucket] +=
      kind === "spending"
        ? spending
        : kind === "income"
          ? income
          : Math.abs(spending) + Math.abs(income);
  }
  const ranked = Array.from({ length: count }, (_, bucket) => bucket)
    .filter((bucket) => weight[bucket] > 0)
    .sort((a, b) => weight[b] - weight[a] || a - b);
  const named =
    ranked.length > SERIES_TONES.length
      ? SERIES_TONES.length - 1
      : ranked.length;
  const tones: SeriesTone[] = new Array<SeriesTone>(count).fill("other");
  ranked.forEach((bucket, rank) => {
    if (rank < named) tones[bucket] = seriesToneAt(rank);
  });

  return {
    bucketOf,
    categories: Int32Array.from(representative),
    directBucket,
    tones,
    count,
  };
}
