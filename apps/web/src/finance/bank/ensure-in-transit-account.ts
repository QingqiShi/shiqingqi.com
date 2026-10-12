import { randomUUID } from "node:crypto";
import { accountGroupRepository } from "../db/repositories/account-group-repository.ts";
import { accountRepository } from "../db/repositories/account-repository.ts";
import type { ServerWriteContext } from "../sync/run-server-write.ts";

/** The stored name of every In transit account; screens show it translated. */
const IN_TRANSIT_NAME = "In transit";

/** The stored name of the Group made for In transit when the Household has no asset Group. */
const FALLBACK_GROUP_NAME = "Cash";

/**
 * The Household's In transit account in `currency`, made the first time it
 * is needed: a Shared cash account, counted in net worth, at the end of the
 * first asset Group. A Household with no asset Group gets a "Cash" Group.
 */
export async function ensureInTransitAccount(
  context: ServerWriteContext,
  currency: string,
): Promise<string> {
  const { scope } = context;
  const existing = await accountRepository.findSystemId(scope, currency);
  if (existing) return existing;

  let group = await accountGroupRepository.findFirstAsset(scope);
  if (!group) {
    const groupId = randomUUID();
    await accountGroupRepository.insert(scope, {
      id: groupId,
      name: FALLBACK_GROUP_NAME,
      side: "asset",
      position: await accountGroupRepository.nextPosition(scope),
    });
    group = await accountGroupRepository.findById(scope, groupId);
    if (!group) throw new Error("The In transit Group was not written");
  }

  const id = randomUUID();
  await accountRepository.insert(scope, {
    id,
    groupId: group.id,
    ownerMemberId: null,
    name: IN_TRANSIT_NAME,
    kind: "cash",
    currency,
    excludedFromNetWorth: false,
    position: await accountRepository.nextPosition(scope, group.id),
    isSystem: true,
  });
  context.markWritten();
  return id;
}
