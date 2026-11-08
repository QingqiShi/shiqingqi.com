import { parseArgs } from "node:util";
import type { PublicPetState } from "#src/pet/types.ts";
import type { UploadBody } from "../upload/upload-body-schema.ts";
import { signUpload } from "../upload/verify-upload-signature.ts";
import { devAccount } from "./dev-account.ts";

/**
 * Signs a sample upload with the dev key and sends it to the dev server of
 * `pnpm dev`, whose local database seeds the machine `dev-mac` with that key.
 * Then it checks that a replay and a changed body get 401, and prints today's
 * tokens before and after.
 */
async function main() {
  const { values } = parseArgs({ options: { port: { type: "string" } } });
  const base = `http://localhost:${values.port ?? "3000"}`;
  const stateUrl = `${base}/api/v1/u/${devAccount.name}`;
  const uploadUrl = `${stateUrl}/upload`;

  const readState = async () => {
    const response = await fetch(stateUrl);
    if (!response.ok)
      throw new Error(`GET ${stateUrl}: ${String(response.status)}`);
    return (await response.json()) as PublicPetState;
  };

  const now = Date.now();
  const tzOffsetMin = -new Date(now).getTimezoneOffset();
  const today = new Date(now + tzOffsetMin * 60_000).toISOString().slice(0, 10);
  const tokensToday = (state: PublicPetState) =>
    state.days.find((day) => day.day === today)?.tokens ?? 0;

  const before = await readState();
  const tokens = tokensToday(before) + 123_456;
  const sample: UploadBody = {
    v: 1,
    at: now,
    tzOffsetMin,
    firstDay: null,
    days: [
      {
        day: today,
        tokens,
        costUsd: Math.round(tokens * 0.0000008 * 100) / 100,
      },
    ],
    quota: null,
    github: null,
    merges: null,
    party: null,
    growth: { highest: null, levelUp: null },
    pet: { fed: 0, patted: 0 },
  };
  const body = new TextEncoder().encode(JSON.stringify(sample));
  const headers = signUpload({
    user: devAccount.name,
    machine: devAccount.machine,
    privateKey: devAccount.privateKey(),
    body,
  });
  const post = (payload: Uint8Array) =>
    fetch(uploadUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: Buffer.from(payload),
    });

  const results = {
    upload: (await post(body)).status,
    replay: (await post(body)).status,
    changedBody: (
      await post(
        new TextEncoder().encode(JSON.stringify({ ...sample, at: now + 1 })),
      )
    ).status,
  };
  const after = await readState();

  console.log(`POST ${uploadUrl}`);
  console.log(`  signed upload: ${String(results.upload)} (want 200)`);
  console.log(`  same upload again: ${String(results.replay)} (want 401)`);
  console.log(`  changed body: ${String(results.changedBody)} (want 401)`);
  console.log(`GET ${stateUrl}`);
  console.log(
    `  tokens on ${today}: ${String(tokensToday(before))} -> ${String(tokensToday(after))}`,
  );
  console.log(
    `  updatedAt: ${String(before.updatedAt)} -> ${String(after.updatedAt)}`,
  );

  if (
    results.upload !== 200 ||
    results.replay !== 401 ||
    results.changedBody !== 401
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
