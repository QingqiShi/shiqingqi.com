import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { invites, members, passkeys } from "#src/finance/db/schema.ts";
import { createTestHousehold } from "#src/finance/db/testing/create-test-household.ts";
import { readOutbox } from "../email/make-outbox-email-sender.ts";
import {
  createAuthTestClient,
  TEST_ORIGIN,
} from "./testing/create-auth-test-client.ts";
import { createSoftwareAuthenticator } from "./testing/create-software-authenticator.ts";
import {
  acceptInvite,
  advance,
  afterTasks,
  claimedHousehold,
  confirmRecoveryEmail,
  DAY_MS,
  db,
  makeHandlers,
  now,
  outboxDir,
  setUpAuthHandlerTests,
  signIn,
  verificationTokenIn,
  type RegistrationOptionsBody,
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

  it("binds a new user to the invited member, starts a session, and sends a confirmation to the user's email", async () => {
    const { imported, invite } = await ownerAndInvite();
    expect(invite.status).toBe(201);
    expect(invite.body.path).toBe(`/invite/${invite.body.token}`);

    const partner = createAuthTestClient(makeHandlers());
    const options = await partner.post<RegistrationOptionsBody>(
      "inviteOptions",
      { token: invite.body.token, email: "Partner@Example.com" },
    );
    expect(options.body).toMatchObject({
      householdName: "Home",
      memberName: "Partner",
    });
    const response = await createSoftwareAuthenticator().register(
      options.body.options,
      TEST_ORIGIN,
    );
    const result = await partner.post("inviteVerify", {
      token: invite.body.token,
      response,
      email: "Partner@Example.com",
      locale: "zh",
    });
    await Promise.all(afterTasks.splice(0));

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
      verified: false,
    });
    const [sent] = await readOutbox(outboxDir);
    expect(sent).toMatchObject({
      to: "partner@example.com",
      subject: "确认家庭账本恢复邮箱",
    });
    expect(
      await confirmRecoveryEmail(verificationTokenIn(sent.text, "/zh")),
    ).toBe(true);
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

describe("recovery invites", () => {
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

  it("lets the owner re-invite a member who lost every passkey", async () => {
    const { imported, owner, lostPhone } = await ownerAndPartner();
    const partnerMember = (
      await db
        .select()
        .from(members)
        .where(eq(members.id, imported.memberIds[1]))
    ).at(0);

    const recovery = await owner.post<{ token: string; recovery: boolean }>(
      "createInvite",
      { memberId: imported.memberIds[1] },
    );
    expect(recovery).toMatchObject({ status: 201, body: { recovery: true } });

    const newPhone = createSoftwareAuthenticator();
    const newDevice = createAuthTestClient(makeHandlers());
    const result = await acceptInvite(newDevice, newPhone, recovery.body.token);

    expect(result).toMatchObject({
      status: 200,
      body: { memberId: imported.memberIds[1] },
    });
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

    await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      recovery.body.token,
    );

    expect((await partner.get("session")).status).toBe(401);
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

  it("refuses a recovery invite once its member has another user", async () => {
    const { imported, owner } = await ownerAndPartner();
    const recovery = await owner.post<{ token: string }>("createInvite", {
      memberId: imported.memberIds[1],
    });
    await db
      .update(members)
      .set({ userId: null })
      .where(eq(members.id, imported.memberIds[1]));

    const result = await acceptInvite(
      createAuthTestClient(makeHandlers()),
      createSoftwareAuthenticator(),
      recovery.body.token,
    );

    expect(result.status).toBe(410);
  });
});
