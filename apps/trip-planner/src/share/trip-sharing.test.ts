import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { users } from "#src/db/auth-schema.ts";
import { schema, tripInvites, tripMembers, trips } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { importTrip } from "#src/trips/import-trip.ts";
import { readTrips } from "#src/trips/read-trips.ts";
import sample from "#src/trips/testing/sample-trip.json";
import { inviteToken } from "./invite-token.ts";
import { tripSharing } from "./trip-sharing.ts";

const NOW = new Date("2026-11-17T09:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

let client: PGlite;
let db: TripsDb;
let owner: string;
let lisbon: string;
let porto: string;

async function addUser() {
  const [{ id }] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@example.com`,
    })
    .returning({ id: users.id });
  return id;
}

async function tripId(slug: string) {
  const [{ id }] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(eq(trips.slug, slug));
  return id;
}

async function newInvite(trip: string, now = new Date()) {
  const made = await tripSharing.createInvite(db, owner, trip, now);
  if (typeof made === "string") throw new Error(`No invite: ${made}.`);
  return made;
}

async function rolesOf(userId: string) {
  const viewed = await readTrips(db, userId);
  return Object.fromEntries(viewed.map(({ trip, role }) => [trip.slug, role]));
}

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
  owner = await addUser();
  await importTrip(db, sample);
  await importTrip(db, { ...sample, id: "porto", slug: "porto" });
  lisbon = await tripId(sample.slug);
  porto = await tripId("porto");
  await db.insert(tripMembers).values([
    { tripId: lisbon, userId: owner, role: "owner" },
    { tripId: porto, userId: owner, role: "owner" },
  ]);
});

afterAll(() => client.close());

it("makes the user who accepts an invite an editor of that trip only, and only once", async () => {
  const { token } = await newInvite(lisbon);
  const guest = await addUser();
  const late = await addUser();

  expect(await tripSharing.isInviteOpen(db, token)).toBe(true);
  expect(await rolesOf(guest)).toEqual({});

  expect(await tripSharing.acceptInvite(db, guest, token)).toBe(sample.slug);

  expect(await rolesOf(guest)).toEqual({ [sample.slug]: "editor" });
  expect(await tripSharing.isInviteOpen(db, token)).toBe(false);
  expect(await tripSharing.acceptInvite(db, late, token)).toBeNull();
  expect(await rolesOf(late)).toEqual({});
});

it("keeps the role of a member who accepts, and keeps the invite for another person", async () => {
  const { token } = await newInvite(lisbon);

  expect(await tripSharing.acceptInvite(db, owner, token)).toBe(sample.slug);

  expect((await rolesOf(owner))[sample.slug]).toBe("owner");
  expect(await tripSharing.isInviteOpen(db, token)).toBe(true);
});

it("lets nobody join with an invite that is past its time, was ended, or never was", async () => {
  const old = await newInvite(lisbon, new Date(NOW.getTime() - 8 * DAY_MS));
  const ended = await newInvite(lisbon);
  const guest = await addUser();
  expect(await tripSharing.endInvite(db, owner, ended.invite.id)).toBe(true);

  for (const token of [old.token, ended.token, inviteToken.create(), "x"]) {
    expect(await tripSharing.isInviteOpen(db, token)).toBe(false);
    expect(await tripSharing.acceptInvite(db, guest, token)).toBeNull();
  }
  expect(await rolesOf(guest)).toEqual({});
  expect(
    await tripSharing.listInvites(db, owner, lisbon, NOW),
  ).not.toContainEqual(expect.objectContaining({ id: old.invite.id }));
});

it("lets only an owner of the trip make, see and end its invites", async () => {
  const { invite, token } = await newInvite(lisbon);
  const editor = await addUser();
  await tripSharing.acceptInvite(db, editor, (await newInvite(lisbon)).token);
  const stranger = await addUser();

  for (const other of [editor, stranger]) {
    expect(await tripSharing.createInvite(db, other, lisbon, NOW)).toBe(
      "forbidden",
    );
    await expect(
      asViewer(db, other, (tx) =>
        tx.execute(
          sql`insert into trip_invites (trip_id, token_hash, expires_at) values (${lisbon}, ${other}, now() + interval '1 day')`,
        ),
      ),
    ).rejects.toThrow();
    expect(await tripSharing.endInvite(db, other, invite.id)).toBe(false);
    expect(await tripSharing.listInvites(db, other, lisbon, NOW)).toEqual([]);
  }
  expect(await tripSharing.isInviteOpen(db, token)).toBe(true);
  expect(await tripSharing.listInvites(db, owner, lisbon, NOW)).toContainEqual(
    expect.objectContaining({ id: invite.id }),
  );
});

it("records the owner who made an invite, also when the insert does not name them", async () => {
  // The code of the deployment before `created_by` inserts no value.
  const [row] = await asViewer(db, owner, (tx) =>
    tx
      .insert(tripInvites)
      .values({
        tripId: lisbon,
        tokenHash: inviteToken.hash(inviteToken.create()),
        expiresAt: new Date(Date.now() + DAY_MS),
      })
      .returning({ createdBy: tripInvites.createdBy }),
  );
  expect(row.createdBy).toBe(owner);
  await expect(
    asViewer(db, owner, (tx) =>
      tx.insert(tripInvites).values({
        tripId: lisbon,
        createdBy: crypto.randomUUID(),
        tokenHash: inviteToken.hash(inviteToken.create()),
        expiresAt: new Date(Date.now() + DAY_MS),
      }),
    ),
  ).rejects.toThrow();
});

it("shows the members and their emails to an owner of the trip only", async () => {
  const editor = await addUser();
  await tripSharing.acceptInvite(db, editor, (await newInvite(porto)).token);
  const stranger = await addUser();

  const members = await tripSharing.listMembers(db, owner, porto);
  expect(members[0]).toMatchObject({ userId: owner, role: "owner" });
  expect(members).toContainEqual(
    expect.objectContaining({ userId: editor, role: "editor" }),
  );
  for (const other of [editor, stranger]) {
    expect(await tripSharing.listMembers(db, other, porto)).toEqual([]);
  }
  // The role reads the users only through the function.
  await expect(
    asViewer(db, owner, (tx) => tx.execute(sql`select email from users`)),
  ).rejects.toThrow();
});

it("lets only an owner take an editor out of the trip, and never an owner", async () => {
  const editor = await addUser();
  const second = await addUser();
  await tripSharing.acceptInvite(db, editor, (await newInvite(porto)).token);
  await tripSharing.acceptInvite(db, second, (await newInvite(porto)).token);

  expect(await tripSharing.removeMember(db, editor, porto, second)).toBe(false);
  expect(await tripSharing.removeMember(db, editor, porto, owner)).toBe(false);
  expect(await tripSharing.removeMember(db, owner, porto, owner)).toBe(false);
  await expect(
    asViewer(db, editor, (tx) => tx.delete(tripMembers)),
  ).rejects.toThrow();
  expect(await rolesOf(second)).toEqual({ porto: "editor" });
  expect((await rolesOf(owner)).porto).toBe("owner");

  expect(await tripSharing.removeMember(db, owner, porto, second)).toBe(true);
  expect(await rolesOf(second)).toEqual({});
  expect(await rolesOf(editor)).toEqual({ porto: "editor" });
});

it("gives a visitor who is not signed in nothing but the answer that an invite is open", async () => {
  const { token } = await newInvite(lisbon);

  expect(await tripSharing.acceptInvite(db, "", token)).toBeNull();
  const seen = await asViewer(db, null, async (tx) => ({
    invites: await tx.$count(tripInvites),
    members: await tx.$count(tripMembers),
    trips: await tx.$count(trips),
  }));
  expect(seen).toEqual({ invites: 0, members: 0, trips: 0 });
  expect(await tripSharing.isInviteOpen(db, token)).toBe(true);
});

it("refuses an invite more than the trip has room for", async () => {
  const open = await tripSharing.listInvites(db, owner, porto, new Date());
  for (let made = open.length; made < tripSharing.maxOpenInvites; made += 1) {
    await newInvite(porto);
  }
  expect(await tripSharing.createInvite(db, owner, porto, new Date())).toBe(
    "full",
  );
});
