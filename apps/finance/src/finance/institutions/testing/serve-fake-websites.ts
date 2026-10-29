import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import sharp from "sharp";

interface FakeRoute {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  /** Sends the body gzip-encoded. */
  gzip?: boolean;
  /** Sends the body in chunks without a Content-Length. */
  chunked?: boolean;
}

/** The routes of one site, by path with query. */
export type FakeSite = Record<string, FakeRoute>;

export interface FakeWebsites {
  port: number;
  /** Every request as `host/path`, in order. */
  requests: string[];
  close: () => Promise<void>;
}

const CHUNK_BYTES = 64 * 1024;

function hostOf(request: IncomingMessage) {
  return (request.headers.host ?? "").replace(/:\d+$/, "").toLowerCase();
}

function send(response: ServerResponse, route: FakeRoute) {
  const raw =
    typeof route.body === "string"
      ? Buffer.from(route.body)
      : Buffer.from(route.body ?? new Uint8Array());
  const body = route.gzip ? gzipSync(raw) : raw;
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    ...route.headers,
  };
  if (route.gzip) headers["Content-Encoding"] = "gzip";
  if (!route.chunked) headers["Content-Length"] = String(body.length);
  response.writeHead(route.status ?? 200, headers);
  if (!route.chunked) {
    response.end(body);
    return;
  }
  for (let at = 0; at < body.length; at += CHUNK_BYTES) {
    response.write(body.subarray(at, at + CHUNK_BYTES));
  }
  response.end();
}

function routeOf(
  sites: Record<string, FakeSite>,
  host: string,
  path: string,
): FakeRoute | undefined {
  if (!Object.hasOwn(sites, host)) return undefined;
  const site = sites[host];
  return Object.hasOwn(site, path) ? site[path] : undefined;
}

/**
 * A local HTTP server that answers as several websites at once, chosen by
 * the Host header. An unknown host or path answers 404 with an HTML page.
 */
export async function serveFakeWebsites(
  sites: Record<string, FakeSite>,
): Promise<FakeWebsites> {
  const requests: string[] = [];

  function handle(request: IncomingMessage, response: ServerResponse) {
    const host = hostOf(request);
    const path = request.url ?? "/";
    requests.push(`${host}${path}`);
    const route = routeOf(sites, host, path);
    send(
      response,
      route ?? { status: 404, body: "<!doctype html><title>Not found</title>" },
    );
  }

  const server = createServer(handle);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The fake websites server has no port");
  }
  const { port } = address satisfies AddressInfo;
  return {
    port,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** A square PNG of one colour, with a transparent border when `transparentBorder` is set. */
export async function solidPng(
  size: number,
  colour: Rgb,
  options: { transparentBorder?: number } = {},
): Promise<Uint8Array> {
  const border = options.transparentBorder ?? 0;
  const inner = size - border * 2;
  const image =
    border === 0
      ? sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { ...colour, alpha: 1 },
          },
        })
      : sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        }).composite([
          {
            input: {
              create: {
                width: inner,
                height: inner,
                channels: 4,
                background: { ...colour, alpha: 1 },
              },
            },
            left: border,
            top: border,
          },
        ]);
  return new Uint8Array(await image.png().toBuffer());
}
