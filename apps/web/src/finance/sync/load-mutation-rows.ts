import {
  draftRowRepository,
  type DraftTableName,
} from "../db/repositories/draft-row-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import { institutionCacheRepository } from "../institutions/institution-cache-repository.ts";
import type { MutationCall } from "../mutations/apply-to-draft.ts";
import { bindMutation } from "../mutations/bind-mutation.ts";
import type { Read } from "../mutations/read.ts";
import { rowMatcher } from "../mutations/row-matcher.ts";
import type { ReplicaRow } from "../replica/types.ts";
import type { StrictDraft } from "./create-strict-draft.ts";

type Fact = Extract<Read, { kind: "hasLive" | "balanceAt" }>;

function present(values: readonly (string | null | undefined)[]) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function append<Key, Value>(
  map: Map<Key, Value[]>,
  key: Key,
  values: readonly Value[],
) {
  const list = map.get(key) ?? [];
  list.push(...values);
  map.set(key, list);
}

async function loadKeys(
  scope: RepositoryScope,
  strict: StrictDraft,
  table: DraftTableName,
  wanted: readonly (string | null | undefined)[],
) {
  const sought = present(wanted);
  if (sought.length === 0) return;
  strict.addKeys(
    table,
    sought,
    await draftRowRepository.select(scope, table, { keys: sought }),
  );
}

async function loadSets(
  scope: RepositoryScope,
  strict: StrictDraft,
  table: DraftTableName,
  matches: readonly Partial<ReplicaRow<DraftTableName>>[],
) {
  const found = await draftRowRepository.select(scope, table, { matches });
  for (const match of matches) {
    strict.addSet(table, match, found.filter(rowMatcher(match)));
  }
}

async function loadIconVersions(
  scope: RepositoryScope,
  strict: StrictDraft,
  wanted: readonly (string | null | undefined)[],
) {
  const domains = present(wanted);
  if (domains.length === 0) return;
  const versions = await institutionCacheRepository.findIconVersions(
    scope.db,
    domains,
  );
  for (const domain of domains) {
    strict.addInstitutionIconVersion(domain, versions.get(domain) ?? null);
  }
}

async function loadFact(
  scope: RepositoryScope,
  strict: StrictDraft,
  fact: Fact,
) {
  if (fact.kind === "hasLive") {
    strict.addHasLive(
      fact.table,
      fact.match,
      await draftRowRepository.hasLive(scope, fact.table, fact.match),
    );
    return;
  }
  strict.addBalanceAt(
    fact.accountId,
    fact.day,
    await valuationRepository.balanceAt(scope, fact.accountId, fact.day),
  );
}

/**
 * Loads `reads` into `strict` at once: one query for each table's rows by
 * key, one for each table's rows by fields, one for the icon versions, and
 * one for each fact.
 */
export async function loadReads(
  scope: RepositoryScope,
  strict: StrictDraft,
  reads: readonly (Read | undefined)[],
): Promise<void> {
  const keys = new Map<DraftTableName, (string | null | undefined)[]>();
  const matches = new Map<
    DraftTableName,
    Partial<ReplicaRow<DraftTableName>>[]
  >();
  const domains: (string | null | undefined)[] = [];
  const facts: Fact[] = [];
  for (const each of reads) {
    if (!each) continue;
    switch (each.kind) {
      case "get": {
        append(keys, each.table, each.keys);
        break;
      }
      case "where": {
        append(matches, each.table, [each.match]);
        break;
      }
      case "institutionIconVersion": {
        domains.push(...each.domains);
        break;
      }
      case "hasLive":
      case "balanceAt": {
        facts.push(each);
        break;
      }
    }
  }
  await Promise.all([
    ...[...keys].map(([table, wanted]) =>
      loadKeys(scope, strict, table, wanted),
    ),
    ...[...matches].map(([table, sought]) =>
      loadSets(scope, strict, table, sought),
    ),
    loadIconVersions(scope, strict, domains),
    ...facts.map((fact) => loadFact(scope, strict, fact)),
  ]);
}

/** Loads into `strict` the rows that `mutation` declares it reads, stage by stage. */
export async function loadMutationRows(
  scope: RepositoryScope,
  strict: StrictDraft,
  mutation: MutationCall,
): Promise<void> {
  for (const stage of bindMutation(mutation).reads) {
    await loadReads(scope, strict, stage(strict.draft));
  }
}
