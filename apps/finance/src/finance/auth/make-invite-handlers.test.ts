import { createSoftwareAuthenticator } from "@tuja/server-auth/testing/create-software-authenticator";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { invites, members, passkeys, users } from "#src/finance/db/schema.ts";
import { createTestHousehold } from "#src/finance/db/testing/create-test-household.ts";
import { readOutbox } from "../email/make-outbox-email-sender.ts";
import { createAuthTestClient } from "./testing/create-auth-test-client.ts";
import {
  acceptInvite,
  advance,
  afterTasks,
  claimedHousehold,
  DAY_MS,
  db,
  makeHandlers,
  now,
  outboxDir,
  recover,
  setUpAuthHandlerTests,
  signIn,
} from "./testing/test-auth-handlers.ts";

setUpAuthHandlerTests();

describe("invites", () => {
  async function ownerAndInvite() {
    const { imported, owner } = await claimedHousehold();
    const invite = await owner.post<{ token: string; path: string }>(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );
    return { imported, owner, invite };
  }

  it("makes a user who signed up the invited member, and refuses a visitor and a user who is a member already", async () => {
    const { imported, owner, invite } = await ownerAndInvite();
    expect(invite.status).toBe(201);
    expect(invite.body.path).toBe(`/invite/${invite.body.token}`);
    const { token } = invite.body;

    const visitor = await createAuthTestClient(makeHandlers()).post(
      "acceptInvite",
      { token },
    );
    const member = await owner.post("acceptInvite", { token });
    const partner = createAuthTestClient(makeHandlers());
    const result = await acceptInvite(
      partner,
      createSoftwareAuthenticator(),
      token,
      "partner@example.com",
    );

    expect(visitor.status).toBe(401);
    expect(member).toMatchObject({
      status: 409,
      body: { error: "already_member" },
    });
    expect(result.status).toBe(200);
    const session = await partner.get<{ userId: string }>("session");
    expect(session.body).toMatchObject({
      householdId: imported.householdId,
      memberId: imported.memberIds[1],
      role: "member",
    });
    const used = (
      await db
        .select()
        .from(invites)
        .where(eq(invites.memberId, imported.memberIds[1] ?? ""))
    ).at(0);
    expect(used?.usedAt).toEqual(now);
    expect((await partner.get("recoveryEmail")).body).toEqual({
      email: "partner@example.com",
      verified: true,
    });
  });

  it("rejects a used invite", async () => {
    const { invite } = await ownerAndInvite();
    await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
    );

    const again = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
      "late@example.com",
    );

    expect(again).toMatchObject({
      status: 410,
      body: { error: "invite_invalid" },
    });
  });

  it("rejects an expired invite", async () => {
    const { invite } = await ownerAndInvite();

    advance(7 * DAY_MS + 1);
    const result = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
    );

    expect(result.status).toBe(410);
  });

  it("revokes an earlier invite when a new one is made", async () => {
    const { imported, owner, invite } = await ownerAndInvite();
    await owner.post("createInvite", { memberId: imported.memberIds[1] });

    const result = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      invite.body.token,
    );

    expect(result.status).toBe(410);
  });

  it("only invites unclaimed members of the session's household", async () => {
    const { imported, owner } = await ownerAndInvite();
    const other = await createTestHousehold(db, {
      name: "Other",
      members: [{ name: "Stranger", role: "owner" }],
    });

    const claimed = await owner.post("createInvite", {
      memberId: imported.memberIds[0],
    });
    const foreign = await owner.post("createInvite", {
      memberId: other.memberIds[0],
    });
    const anonymous = await createAuthTestClient(makeHandlers()).post(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );

    expect(claimed.status).toBe(409);
    expect(foreign.status).toBe(404);
    expect(anonymous.status).toBe(401);
  });
});

describe("recovery links from the owner", () => {
  async function ownerAndPartner() {
    const { imported, owner } = await claimedHousehold();
    const invite = await owner.post<{ token: string }>("createInvite", {
      memberId: imported.memberIds[1],
    });
    const lostPhone = createSoftwareAuthenticator();
    const partner = createAuthTestClient(makeHandlers());
    await acceptInvite(partner, lostPhone, invite.body.token);
    return { imported, owner, partner, lostPhone };
  }

  it("lets a member who lost every passkey back in", async () => {
    const { imported, owner, lostPhone } = await ownerAndPartner();
    const partnerMember = (
      await db
        .select()
        .from(members)
        .where(eq(members.id, imported.memberIds[1]))
    ).at(0);

    const recovery = await owner.post<{ token: string; path: string }>(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );
    expect(recovery).toMatchObject({
      status: 201,
      body: { recovery: true, path: `/recover/${recovery.body.token}` },
    });

    const newPhone = createSoftwareAuthenticator();
    const newDevice = createAuthTestClient(makeHandlers());
    const result = await recover(newDevice, newPhone, recovery.body.token);

    expect(result).toMatchObject({ status: 200, body: { ok: true } });
    const session = await newDevice.get<{ userId: string; memberId: string }>(
      "session",
    );
    expect(session.body).toMatchObject({
      userId: partnerMember?.userId,
      memberId: imported.memberIds[1],
    });
    const stored = await db
      .select({ id: passkeys.id })
      .from(passkeys)
      .where(eq(passkeys.userId, partnerMember?.userId ?? ""));
    expect(stored).toEqual([{ id: newPhone.credentials[0]?.id }]);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), lostPhone)).status,
    ).toBe(401);
    expect(
      (await signIn(createAuthTestClient(makeHandlers()), newPhone)).status,
    ).toBe(200);
  });

  it("ends the lost device's sessions", async () => {
    const { imported, owner, partner } = await ownerAndPartner();
    const recovery = await owner.post<{ token: string }>("createInvite", {
      memberId: imported.memberIds[1],
    });

    await recover(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      recovery.body.token,
    );

    expect((await partner.get("session")).status).toBe(401);
  });

  it("still works after someone asks for a recovery by email", async () => {
    const { imported, owner } = await ownerAndPartner();
    const [partnerMember] = await db
      .select({ userId: members.userId })
      .from(members)
      .where(eq(members.id, imported.memberIds[1]));
    await db
      .update(users)
      .set({ email: "partner@example.com", emailVerifiedAt: now })
      .where(eq(users.id, partnerMember.userId ?? ""));
    const recovery = await owner.post<{ token: string }>("createInvite", {
      memberId: imported.memberIds[1],
    });

    await createAuthTestClient(makeHandlers()).post("requestRecovery", {
      email: "partner@example.com",
      locale: "en",
    });
    await Promise.all(afterTasks.splice(0));
    expect((await readOutbox(outboxDir)).at(-1)?.to).toBe(
      "partner@example.com",
    );

    const result = await recover(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      recovery.body.token,
    );

    expect(result.status).toBe(200);
  });

  it("is for the owner only", async () => {
    const { imported, partner } = await ownerAndPartner();

    const result = await partner.post("createInvite", {
      memberId: imported.memberIds[0],
    });

    expect(result).toMatchObject({
      status: 403,
      body: { error: "owner_only" },
    });
  });
});
