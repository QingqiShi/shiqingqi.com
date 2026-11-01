import { createHash, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { createFakeMailServer } from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertUser,
  mailDeps,
  storedAccount,
} from "#src/assistant/mail/testing/insert-account.ts";
import { makeConnectHandlers } from "./make-connect-handlers.ts";

const ORIGIN = "http://localhost:3000";

let db: TestDb;
let userId: string;
let tokenRequests: URLSearchParams[];
let afterTasks: (() => Promise<unknown>)[];

function idToken(claims: Record<string, string>) {
  const part = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.signature`;
}

function makeHandlers({ signedInAs }: { signedInAs?: string } = {}) {
  const server = createFakeMailServer({
    user: "me@gmail.com",
    accessToken: "access-1",
  });
  return makeConnectHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () =>
      Promise.resolve({
        sessionId: randomUUID(),
        userId: signedInAs ?? userId,
      }),
    getMailDeps: () => mailDeps({ connector: server.connector }),
    now: () => new Date(),
    runAfter: (task) => {
      afterTasks.push(task);
    },
    authSecret: () => "test-auth-secret",
    oauthClient: () => ({
      clientId: "client-id",
      clientSecret: "client-secret",
    }),
    fetch: (_url, init) => {
      tokenRequests.push(
        new URLSearchParams(
          init?.body instanceof URLSearchParams ? init.body : undefined,
        ),
      );
      return Promise.resolve(
        Response.json({
          access_token: "access-1",
          refresh_token: "refresh-1",
          expires_in: 3600,
          id_token: idToken({ email: "Me@Gmail.com" }),
        }),
      );
    },
  });
}

async function start(handlers: ReturnType<typeof makeHandlers>) {
  const response = await handlers.start(
    new Request(`${ORIGIN}/api/connect/google/start?locale=zh`),
    "google",
  );
  const location = new URL(response.headers.get("Location") ?? "");
  const cookie = (response.headers.get("Set-Cookie") ?? "").split(";")[0];
  return { response, location, cookie };
}

function callback(
  handlers: ReturnType<typeof makeHandlers>,
  { cookie, state }: { cookie: string; state: string },
) {
  return handlers.callback(
    new Request(
      `${ORIGIN}/api/connect/google/callback?code=the-code&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: cookie } },
    ),
    "google",
  );
}

beforeEach(async () => {
  db = await createTestDb();
  userId = await insertUser(db);
  tokenRequests = [];
  afterTasks = [];
});

afterEach(async () => {
  await db.close();
});

describe("the OAuth connect flow", () => {
  it("sends the user to Google with a PKCE challenge, then stores the account the code gives", async () => {
    const handlers = makeHandlers();
    const { response, location, cookie } = await start(handlers);

    expect(response.status).toBe(303);
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(location.searchParams.get("redirect_uri")).toBe(
      `${ORIGIN}/api/connect/google/callback`,
    );
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");

    const done = await callback(handlers, {
      cookie,
      state: location.searchParams.get("state") ?? "",
    });

    expect(done.headers.get("Location")).toBe(
      `${ORIGIN}/zh/accounts?connected=gmail`,
    );
    const verifier = tokenRequests[0]?.get("code_verifier") ?? "";
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(
      location.searchParams.get("code_challenge"),
    );
    const [account] = await db.select().from(mailAccounts);
    expect(account).toMatchObject({
      provider: "gmail",
      address: "me@gmail.com",
    });
    expect((await storedAccount(db, userId, account.id)).opened).toMatchObject({
      type: "oauth",
      refreshToken: "refresh-1",
    });
    expect(afterTasks).toHaveLength(1);
  });

  it.each([
    ["a state that does not match", {}, "wrong-state"],
    ["another signed-in user", { signedInAs: randomUUID() }, null],
  ])(
    "refuses %s, without asking Google for tokens",
    async (_name, options, wrongState) => {
      const { location, cookie } = await start(makeHandlers());
      const state = wrongState ?? location.searchParams.get("state") ?? "";

      const done = await callback(makeHandlers(options), { cookie, state });

      expect(done.headers.get("Location")).toBe(
        `${ORIGIN}/zh/accounts?error=state`,
      );
      expect(tokenRequests).toEqual([]);
      expect(await db.$count(mailAccounts)).toBe(0);
    },
  );
});
