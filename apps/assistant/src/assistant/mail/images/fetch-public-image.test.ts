import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fetchPublicImage,
  type ResolvedAddress,
} from "./fetch-public-image.ts";
import { isPublicAddress } from "./is-public-address.ts";

const PNG = Buffer.from("89504e470d0a1a0a", "hex");

let server: Server;
let port: number;
let requests: string[];
let redirectTo: string | null;

beforeEach(async () => {
  requests = [];
  redirectTo = null;
  server = createServer((request, response) => {
    requests.push(request.url ?? "");
    if (redirectTo) {
      response.writeHead(302, { Location: redirectTo }).end();
      return;
    }
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

function resolver(table: Record<string, string>) {
  return (hostname: string): Promise<ResolvedAddress[]> => {
    const address = table[hostname];
    if (!address) return Promise.reject(new Error(`ENOTFOUND ${hostname}`));
    return Promise.resolve([
      { address, family: address.includes(":") ? 6 : 4 },
    ]);
  };
}

/** Lets the test server through, as if it were on the internet. */
function allowTestServer(address: string) {
  return address === "127.0.0.1" || isPublicAddress(address);
}

describe("fetchPublicImage", () => {
  it("refuses loopback, by address and by a name that resolves to it", async () => {
    const resolve = resolver({ "images.example": "127.0.0.1" });

    const results = await Promise.all([
      fetchPublicImage(`http://127.0.0.1:${String(port)}/a.png`, { resolve }),
      fetchPublicImage(`http://[::ffff:127.0.0.1]:${String(port)}/a.png`, {
        resolve,
      }),
      fetchPublicImage(`http://images.example:${String(port)}/a.png`, {
        resolve,
      }),
    ]);

    expect(results).toEqual(Array(3).fill({ ok: false, reason: "refused" }));
    expect(requests).toEqual([]);
  });

  it("refuses names that resolve to private, link-local or IPv4-mapped addresses", async () => {
    const table = {
      "private.example": "10.1.2.3",
      "metadata.example": "169.254.169.254",
      "mapped.example": "::ffff:192.168.0.1",
      "ula.example": "fd00::1",
    };
    const resolve = resolver(table);

    for (const host of Object.keys(table)) {
      expect(
        await fetchPublicImage(`http://${host}/a.png`, { resolve }),
      ).toEqual({ ok: false, reason: "refused" });
    }
  });

  it("checks each redirect again and refuses one to a private address", async () => {
    const resolve = resolver({
      "cdn.example": "127.0.0.1",
      "internal.example": "10.0.0.8",
    });
    const options = { resolve, isAllowedAddress: allowTestServer };

    const direct = await fetchPublicImage(
      `http://cdn.example:${String(port)}/a.png`,
      options,
    );
    redirectTo = "http://169.254.169.254/latest/meta-data/";
    const toMetadata = await fetchPublicImage(
      `http://cdn.example:${String(port)}/a.png`,
      options,
    );
    redirectTo = `http://internal.example:${String(port)}/a.png`;
    const toInternal = await fetchPublicImage(
      `http://cdn.example:${String(port)}/a.png`,
      options,
    );

    expect(direct).toEqual({ ok: true, contentType: "image/png", body: PNG });
    expect(toMetadata).toEqual({ ok: false, reason: "refused" });
    expect(toInternal).toEqual({ ok: false, reason: "refused" });
  });

  it("refuses an SVG", async () => {
    server.removeAllListeners("request");
    server.on("request", (_request, response) => {
      response
        .writeHead(200, { "Content-Type": "image/svg+xml" })
        .end("<svg xmlns='http://www.w3.org/2000/svg'/>");
    });

    const result = await fetchPublicImage(
      `http://cdn.example:${String(port)}/a.svg`,
      {
        resolve: resolver({ "cdn.example": "127.0.0.1" }),
        isAllowedAddress: allowTestServer,
      },
    );

    expect(result).toEqual({ ok: false, reason: "not-image" });
  });
});
