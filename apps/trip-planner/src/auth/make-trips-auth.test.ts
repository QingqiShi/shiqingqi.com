import { PGlite } from "@electric-sql/pglite";
import { createSoftwareAuthenticator } from "@tuja/server-auth/testing/create-software-authenticator";
import type { Email } from "@tuja/server-email/types";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  emailCodes,
  passkeys,
  recoveries,
  sessions,
  signUps,
  users,
} from "#src/db/auth-schema.ts";
import {
  schema,
  tripInvites,
  tripMembers,
  tripRevisions,
  trips,
} from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { tripSharing } from "#src/share/trip-sharing.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { importTrip } from "#src/trips/import-trip.ts";
import sample from "#src/trips/sample-trip.json";
import { makeTripsAuth, type AuthHandlers } from "./make-trips-auth.ts";
import { resolveSession } from "./resolve-session.ts";
import { tripsSessionCookie } from "./trips-session-cookie.ts";

const ORIGIN = "http://localhost:3000";

type Authenticator = ReturnType<typeof createSoftwareAuthenticator>;
type PublicKeyCredentialCreationOptionsJSON = Parameters<
  Authenticator["register"]
>[0];
type PublicKeyCredentialRequestOptionsJSON = Parameters<
  Authenticator["authenticate"]
>[0];

let client: PGlite;
let db: TripsDb;
let handlers: AuthHandlers;
const sent: Email[] = [];
const afterTasks: Promise<void>[] = [];

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
  handlers = makeHandlers(db);
});

afterAll(() => client.close());

function makeHandlers(database: TripsDb) {
  return makeTripsAuth({
    getDb: () => database,
    now: () => new Date(),
    authSecret: () => "test-secret",
    isAllowedOrigin: (origin) => origin === ORIGIN,
    limitRequest: () => Promise.resolve({ success: true, reset: 0 }),
    refundRequest: () => Promise.resolve(),
    clientIp: () => "test",
    emailSender: () => ({
      send: (email) => {
        sent.push(email);
        return Promise.resolve();
      },
    }),
    afterResponse: (task) => {
      afterTasks.push(task());
    },
  });
}

interface AuthAnswer {
  error?: string;
  options?: PublicKeyCredentialCreationOptionsJSON &
    PublicKeyCredentialRequestOptionsJSON;
}

function optionsIn({ options }: AuthAnswer) {
  if (!options) throw new Error("No passkey options in the answer.");
  return options;
}

/** A browser on `ORIGIN` that keeps the cookies that the routes set. */
function newBrowser() {
  const jar = new Map<string, string>();
  async function post(
    route: keyof AuthHandlers,
    body: unknown = {},
    routes: AuthHandlers = handlers,
  ): Promise<{ status: number; body: AuthAnswer }> {
    const response = await routes[route](
      new Request(`${ORIGIN}/api/auth/${route}`, {
        method: "POST",
        headers: {
          Origin: ORIGIN,
          "Content-Type": "application/json",
          Cookie: [...jar]
            .map(([name, value]) => `${name}=${value}`)
            .join("; "),
        },
        body: JSON.stringify(body),
      }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = ""] = cookie.split(";");
      const name = pair.slice(0, pair.indexOf("="));
      const value = decodeURIComponent(pair.slice(name.length + 1));
      if (value === "" || /max-age=0/i.test(cookie)) jar.delete(name);
      else jar.set(name, value);
    }
    return {
      status: response.status,
      body: (await response.json()) as AuthAnswer,
    };
  }
  return { jar, post };
}

type Person = Awaited<ReturnType<typeof signUp>>;

/** Signs a new user up as a person does: an emailed link, then a passkey. */
async function signUp(name: string) {
  const email = `${name}-${crypto.randomUUID()}@example.com`;
  const browser = newBrowser();
  const device = createSoftwareAuthenticator();
  await browser.post("requestSignUp", { email });
  const token = /\/sign-up\/([\w-]+)/.exec(sent.at(-1)?.text ?? "")?.[1];
  const { body } = await browser.post("signUpOptions", { token });
  const response = await device.register(optionsIn(body), ORIGIN);
  expect((await browser.post("signUpVerify", { token, response })).status).toBe(
    200,
  );
  const [{ userId }] = await db
    .select({ userId: users.id })
    .from(users)
    .where(eq(users.email, email));
  return { userId, email, browser, device };
}

/** Asks to delete the account of the browser's session and confirms with a passkey of `device`. */
async function deleteAccount(
  { browser, device }: Pick<Person, "browser" | "device">,
  routes: AuthHandlers = handlers,
) {
  const options = await browser.post("deleteAccountOptions", {}, routes);
  if (options.status !== 200) return options;
  const response = await device.authenticate(optionsIn(options.body), ORIGIN);
  return browser.post("deleteAccountVerify", { response }, routes);
}

function isSignedIn({ browser }: Person) {
  const token = browser.jar.get(tripsSessionCookie.name) ?? "";
  return resolveSession(db, token, {
    now: new Date(),
    allowRefresh: false,
  }).then((resolved) => resolved !== null);
}

async function addTrip(
  slug: string,
  members: [Person, "owner" | "editor"][],
): Promise<string> {
  await importTrip(db, { ...sample, id: slug, slug });
  const [{ id }] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(eq(trips.slug, slug));
  await db
    .insert(tripMembers)
    .values(
      members.map(([{ userId }, role]) => ({ tripId: id, userId, role })),
    );
  return id;
}

async function inviteBy({ userId }: Person, tripId: string) {
  const made = await tripSharing.createInvite(db, userId, tripId, new Date());
  if (typeof made === "string") throw new Error(`No invite: ${made}.`);
  return made.invite.id;
}

function membersOf(tripId: string) {
  return db
    .select({ userId: tripMembers.userId, role: tripMembers.role })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId))
    .orderBy(tripMembers.role, tripMembers.userId);
}

function invitesOf(tripIds: string[]) {
  return db
    .select({ id: tripInvites.id })
    .from(tripInvites)
    .where(inArray(tripInvites.tripId, tripIds))
    .then((rows) => rows.map(({ id }) => id).sort());
}

it("deletes the trips that only the user owns, leaves the others, and changes no other user", async () => {
  const mara = await signUp("mara");
  const noor = await signUp("noor");
  const ines = await signUp("ines");
  const alone = await addTrip("mara-alone", [
    [mara, "owner"],
    [ines, "editor"],
  ]);
  const shared = await addTrip("mara-noor", [
    [mara, "owner"],
    [noor, "owner"],
    [ines, "editor"],
  ]);
  const joined = await addTrip("noor-mara", [
    [noor, "owner"],
    [mara, "editor"],
  ]);
  await inviteBy(mara, alone);
  await inviteBy(mara, shared);
  const noorsInvite = await inviteBy(noor, shared);
  const noorsMembers = await membersOf(joined);
  // A recovery that Mara asked for, unused: its code and link end with the account.
  await mara.browser.post("requestRecovery", { email: mara.email });
  await Promise.all(afterTasks);
  expect(await db.$count(recoveries, eq(recoveries.userId, mara.userId))).toBe(
    1,
  );

  expect(await tripSharing.listTripsOwnedAlone(db, mara.userId)).toEqual([
    alone,
  ]);
  expect((await deleteAccount(mara)).status).toBe(200);

  expect(
    await db
      .select({ id: trips.id })
      .from(trips)
      .where(inArray(trips.id, [alone, shared, joined])),
  ).toEqual(expect.arrayContaining([{ id: shared }, { id: joined }]));
  expect(await db.$count(trips, eq(trips.id, alone))).toBe(0);
  expect(await db.$count(tripRevisions, eq(tripRevisions.tripId, alone))).toBe(
    0,
  );
  expect(await membersOf(alone)).toEqual([]);
  expect(await membersOf(shared)).toEqual(
    [
      { userId: ines.userId, role: "editor" },
      { userId: noor.userId, role: "owner" },
    ].sort((a, b) => a.role.localeCompare(b.role)),
  );
  expect(await membersOf(joined)).toEqual(
    noorsMembers.filter(({ userId }) => userId !== mara.userId),
  );
  expect(await invitesOf([alone, shared, joined])).toEqual([noorsInvite]);

  expect(await db.$count(users, eq(users.id, mara.userId))).toBe(0);
  expect(await db.$count(passkeys, eq(passkeys.userId, mara.userId))).toBe(0);
  expect(await db.$count(sessions, eq(sessions.userId, mara.userId))).toBe(0);
  expect(await db.$count(recoveries, eq(recoveries.userId, mara.userId))).toBe(
    0,
  );
  expect(await db.$count(emailCodes, eq(emailCodes.email, mara.email))).toBe(0);
  expect(await db.$count(signUps, eq(signUps.email, mara.email))).toBe(0);
  expect(await isSignedIn(mara)).toBe(false);
  expect((await mara.browser.post("deleteAccountOptions")).status).toBe(401);

  for (const other of [noor, ines]) {
    expect(await isSignedIn(other)).toBe(true);
    expect(await db.$count(passkeys, eq(passkeys.userId, other.userId))).toBe(
      1,
    );
  }
});

it("takes an editor out of the trip and leaves the trip as it was", async () => {
  const owner = await signUp("owner");
  const editor = await signUp("editor");
  const trip = await addTrip("editor-leaves", [
    [owner, "owner"],
    [editor, "editor"],
  ]);
  const invite = await inviteBy(owner, trip);

  expect(await tripSharing.listTripsOwnedAlone(db, editor.userId)).toEqual([]);
  expect((await deleteAccount(editor)).status).toBe(200);

  expect(await membersOf(trip)).toEqual([
    { userId: owner.userId, role: "owner" },
  ]);
  expect(await invitesOf([trip])).toEqual([invite]);
  expect(await db.$count(tripRevisions, eq(tripRevisions.tripId, trip))).toBe(
    1,
  );
});

it("deletes nothing for a visitor who is not signed in, or with a passkey or check of another user", async () => {
  const mara = await signUp("mara");
  const noor = await signUp("noor");
  const visitor = { browser: newBrowser(), device: mara.device };

  expect((await deleteAccount(visitor)).status).toBe(401);
  expect(
    (
      await visitor.browser.post("deleteAccountVerify", {
        response: await mara.device.authenticate(
          { challenge: "x", rpId: "localhost" },
          ORIGIN,
        ),
      })
    ).status,
  ).toBe(401);

  // Noor's session with Mara's passkey.
  expect(
    await deleteAccount({ browser: noor.browser, device: mara.device }),
  ).toMatchObject({ status: 401, body: { error: "passkey_unknown" } });

  // Noor's session with the check that Mara's browser started.
  const { body } = await mara.browser.post("deleteAccountOptions");
  const response = await mara.device.authenticate(optionsIn(body), ORIGIN);
  const stolen = newBrowser();
  for (const [name, value] of mara.browser.jar) {
    if (name !== tripsSessionCookie.name) stolen.jar.set(name, value);
  }
  stolen.jar.set(
    tripsSessionCookie.name,
    noor.browser.jar.get(tripsSessionCookie.name) ?? "",
  );
  expect(await stolen.post("deleteAccountVerify", { response })).toMatchObject({
    status: 400,
    body: { error: "challenge_invalid" },
  });

  // The role of the pages cannot run the deletion of trips.
  await expect(
    asViewer(db, noor.userId, (tx) =>
      tx.execute(sql`select public.trips_forget_user(${mara.userId})`),
    ),
  ).rejects.toThrow();

  expect(
    await db.$count(users, inArray(users.id, [mara.userId, noor.userId])),
  ).toBe(2);
  expect(await isSignedIn(mara)).toBe(true);
  expect(await isSignedIn(noor)).toBe(true);
});

it("keeps a user whose session ended while the request was under way", async () => {
  const state = {
    transactions: 0,
    runBefore: 0,
    task: (): Promise<unknown> => Promise.resolve(),
  };
  const racing = makeHandlers(
    new Proxy(db, {
      get(target, key) {
        const value: unknown = Reflect.get(target, key);
        if (key !== "transaction") return value;
        const transaction: TripsDb["transaction"] = async (...args) => {
          state.transactions += 1;
          if (state.transactions === state.runBefore) await state.task();
          return target.transaction(...args);
        };
        return transaction;
      },
    }),
  );
  const other = await signUp("other");
  const owner = await signUp("owner");
  const trip = await addTrip("owner-stays", [[owner, "owner"]]);

  expect((await deleteAccount(other, racing)).status).toBe(200);
  // The deletion's last transaction is the one that writes.
  state.runBefore = state.transactions;
  state.transactions = 0;
  state.task = () =>
    db.delete(sessions).where(eq(sessions.userId, owner.userId));

  expect((await deleteAccount(owner, racing)).status).toBe(401);
  expect(await db.$count(users, eq(users.id, owner.userId))).toBe(1);
  expect(
    await db.$count(
      tripMembers,
      and(eq(tripMembers.tripId, trip), eq(tripMembers.userId, owner.userId)),
    ),
  ).toBe(1);
});
