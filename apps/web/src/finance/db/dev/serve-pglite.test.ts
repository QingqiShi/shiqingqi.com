import { createHash } from "node:crypto";
import { connect } from "node:net";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { servePglite, type PgliteServer } from "./serve-pglite.ts";

function frontendMessage(type: string, ...fields: (string | number[])[]) {
  const body = Buffer.concat(
    fields.map((field) =>
      typeof field === "string"
        ? Buffer.from(`${field}\0`)
        : Buffer.from(field),
    ),
  );
  const header = Buffer.alloc(5);
  header.write(type, 0);
  header.writeInt32BE(4 + body.length, 1);
  return Buffer.concat([header, body]);
}

function startupMessage() {
  const body = Buffer.from("user\0postgres\0database\0postgres\0\0");
  const header = Buffer.alloc(8);
  header.writeInt32BE(8 + body.length, 0);
  header.writeInt32BE(196_608, 4);
  return Buffer.concat([header, body]);
}

/** Sends `messages` after the startup and gives the types of the backend messages until `count` ReadyForQuery messages came. */
async function backendMessageTypes(
  port: number,
  messages: Buffer[],
  count: number,
): Promise<string[]> {
  const socket = connect(port, "127.0.0.1");
  const types: string[] = [];
  let buffer = Buffer.alloc(0);
  let ready = 0;
  await new Promise<void>((resolve, reject) => {
    socket.on("error", reject);
    socket.on("data", (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 5 && buffer.length >= 1 + buffer.readInt32BE(1)) {
        const type = String.fromCharCode(buffer[0]);
        buffer = buffer.subarray(1 + buffer.readInt32BE(1));
        if (ready > 0) types.push(type);
        if (type !== "Z") continue;
        ready += 1;
        if (ready === 1) socket.write(Buffer.concat(messages));
        if (ready === count + 1) resolve();
      }
    });
    socket.write(startupMessage());
  });
  socket.destroy();
  return types;
}

describe("servePglite", () => {
  let db: PGlite;
  let server: PgliteServer;
  let pool: Pool;
  let port: number;

  beforeAll(async () => {
    db = await PGlite.create();
    await db.exec("create table counters (id int primary key, value int)");
    await db.exec("insert into counters values (1, 0)");
    port = 20_000 + Math.floor(Math.random() * 20_000);
    server = await servePglite(db, { host: "127.0.0.1", port });
    pool = new Pool({
      connectionString: `postgres://postgres:postgres@127.0.0.1:${String(port)}/postgres`,
      max: 8,
    });
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await server.close();
    await db.close();
  });

  it("answers parameterised queries from many connections at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        index % 2 === 0
          ? pool.query<{ n: number; b: string }>(
              `select ${String(index)} as n, $1::text as b`,
              [`row ${String(index)}`],
            )
          : pool.query<{ n: number; b: string; c: number }>(
              `select ${String(index)} as n, $1::text as b, $2::int as c`,
              [`row ${String(index)}`, index],
            ),
      ),
    );
    expect(results.map((result) => result.rows[0])).toEqual(
      Array.from({ length: 40 }, (_, index) =>
        index % 2 === 0
          ? { n: index, b: `row ${String(index)}` }
          : { n: index, b: `row ${String(index)}`, c: index },
      ),
    );
  });

  it("keeps each transaction to its own connection", async () => {
    const increment = async () => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const { rows } = await client.query<{ value: number }>(
          "select value from counters where id = $1",
          [1],
        );
        await new Promise((resolve) => setTimeout(resolve, 5));
        await client.query("update counters set value = $1 where id = $2", [
          rows[0].value + 1,
          1,
        ]);
        await client.query("commit");
      } finally {
        client.release();
      }
    };
    const [reads] = await Promise.all([
      Promise.all(
        Array.from({ length: 30 }, async (_, index) => {
          const { rows } = await pool.query<{ n: number; m: number }>(
            `select $1::int + ${String(index)} as n, $2::int as m`,
            [index, 3 * index],
          );
          return rows[0];
        }),
      ),
      ...Array.from({ length: 10 }, increment),
    ]);
    expect(reads).toEqual(
      Array.from({ length: 30 }, (_, index) => ({
        n: 2 * index,
        m: 3 * index,
      })),
    );
    const { rows } = await pool.query<{ value: number }>(
      "select value from counters where id = 1",
    );
    expect(rows[0].value).toBe(10);
  });

  it("streams a large result without corrupting it", async () => {
    const { rows } = await pool.query<{ n: number; text: string }>(
      "select n, repeat(md5(n::text), 20) as text from generate_series(1, 5000) as n",
    );
    expect(rows).toEqual(
      Array.from({ length: 5000 }, (_, index) => ({
        n: index + 1,
        text: createHash("md5")
          .update(String(index + 1))
          .digest("hex")
          .repeat(20),
      })),
    );
  });

  it("rolls back the transaction of a connection that closes", async () => {
    const client = await pool.connect();
    await client.query("begin");
    await client.query("update counters set value = -1 where id = 1");
    client.release(true);
    const { rows } = await pool.query<{ value: number }>(
      "select value from counters where id = 1",
    );
    expect(rows[0].value).toBe(10);
  });

  it("sends one ReadyForQuery for a failed extended query", async () => {
    const types = await backendMessageTypes(
      port,
      [
        frontendMessage("P", "", "select 1 / 0", [0, 0]),
        frontendMessage("B", "", "", [0, 0, 0, 0, 0, 0]),
        frontendMessage("E", "", [0, 0, 0, 0]),
        frontendMessage("S"),
        frontendMessage("Q", "select 42"),
      ],
      2,
    );
    expect(types).toEqual(["1", "E", "Z", "T", "D", "C", "Z"]);
  });

  it("keeps answering after many failed statements", async () => {
    // A low limit makes the lost stack show after some errors, not thousands.
    await pool.query("set max_stack_depth = '100kB'");
    try {
      for (let index = 0; index < 300; index += 1) {
        await expect(pool.query("select $1::int / 0", [index])).rejects.toThrow(
          "division by zero",
        );
      }
      const { rows } = await pool.query<{ n: number }>("select 1 as n");
      expect(rows).toEqual([{ n: 1 }]);
    } finally {
      await pool.query("reset max_stack_depth");
    }
  });
});
