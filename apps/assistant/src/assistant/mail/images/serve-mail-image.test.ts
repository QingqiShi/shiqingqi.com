import type { IncomingHttpHeaders } from "node:http";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeMailImageLinks } from "./make-mail-image-links.ts";
import { serveMailImage } from "./serve-mail-image.ts";

const SECRET = "test-auth-secret";
const NOW = new Date("2026-11-07T10:20:00Z");
const PNG = Buffer.from("89504e470d0a1a0a", "hex");

let server: Server;
let port: number;
let sent: IncomingHttpHeaders[];

beforeEach(async () => {
  sent = [];
  server = createServer((request, response) => {
    sent.push(request.headers);
    response.writeHead(200, { "Content-Type": "image/png" }).end(PNG);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  port = address.port;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const fetchOptions = {
  resolve: () => Promise.resolve([{ address: "127.0.0.1", family: 4 }]),
  isAllowedAddress: (address: string) => address === "127.0.0.1",
};

describe("serveMailImage", () => {
  it("serves a signed image as a sandboxed image and refuses a forged link", async () => {
    const link = makeMailImageLinks(
      "https://assistant.example",
      SECRET,
      NOW,
    ).link(`http://cdn.example:${String(port)}/a.png`);

    const served = await serveMailImage(
      new Request(link, { headers: { Cookie: "session=1", Referer: link } }),
      { secret: SECRET, now: NOW, fetchOptions },
    );
    const forged = await serveMailImage(new Request(link), {
      secret: "other-secret",
      now: NOW,
      fetchOptions,
    });

    expect(served.status).toBe(200);
    expect(Buffer.from(await served.arrayBuffer())).toEqual(PNG);
    expect(served.headers.get("Content-Type")).toBe("image/png");
    expect(served.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(served.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(sent).toHaveLength(1);
    expect(sent[0]).not.toHaveProperty("cookie");
    expect(sent[0]).not.toHaveProperty("referer");
    expect(forged.status).toBe(403);
  });
});
