import { z } from "zod";
import { revokeMemberAccess } from "../auth/revoke-member-access.ts";
import type { FinanceSession } from "../auth/types.ts";
import { memberRepository } from "../db/repositories/member-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { financeJson } from "../http/finance-json.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { wireFields } from "../sync/wire-fields.ts";

interface MembersHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  now: () => Date;
}

const patchSchema = z
  .object({ id: wireFields.id, removed: z.boolean() })
  .strict();

const refusalStatus = {
  "member-not-found": 404,
  "cannot-remove-self": 409,
  "last-owner": 409,
};

type Refusal = keyof typeof refusalStatus;

/**
 * `PATCH /api/finance/household/members`: removes a Member, or brings a
 * removed one back. Removal is a soft delete that syncs like any other: past
 * Transactions keep the name, and the Member leaves every picker. It also
 * ends the Member's sessions, deletes their passkeys, cancels their pending
 * invites and unbinds their user, so a Member who is brought back signs in
 * again only through a new invite. Only the owner may do it, never to
 * themselves, and never to the last owner.
 */
export function makeMembersHandler(dependencies: MembersHandlerDependencies) {
  return async (request: Request) => {
    const session = await guardFinanceRequest(dependencies, request, {
      write: true,
      owner: true,
    });
    if (session instanceof Response) return session;
    const patch = await readFinanceBody(request, patchSchema);
    if (patch instanceof Response) return patch;
    const { result, clock } = await runServerWrite(
      dependencies.getDb(),
      session.householdId,
      dependencies.now(),
      async ({ scope, markWritten }): Promise<Refusal | null> => {
        const member = await memberRepository.findById(scope, patch.id);
        if (!member) return "member-not-found";
        if (!patch.removed) {
          if (member.deletedAt === null) return null;
          await memberRepository.restore(scope, member.id);
          markWritten();
          return null;
        }
        if (member.id === session.memberId) return "cannot-remove-self";
        if (member.deletedAt !== null) return null;
        if (
          member.role === "owner" &&
          (await memberRepository.countActiveOwners(scope)) <= 1
        ) {
          return "last-owner";
        }
        await memberRepository.remove(scope, member.id);
        await revokeMemberAccess(scope.db, {
          memberId: member.id,
          userId: member.userId,
        });
        markWritten();
        return null;
      },
    );
    if (result !== null) {
      return financeJson({ error: result }, { status: refusalStatus[result] });
    }
    return financeJson({ clock });
  };
}
