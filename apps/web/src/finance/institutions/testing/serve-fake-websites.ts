import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import sharp from "sharp";

export interface FakeRoute {
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

/** A JPEG of one colour. */
export async function solidJpeg(
  width: number,
  height: number,
  colour: Rgb,
): Promise<Uint8Array> {
  const image = sharp({
    create: { width, height, channels: 3, background: colour },
  });
  return new Uint8Array(await image.jpeg().toBuffer());
}

interface IcoImage {
  edge: number;
  bitCount: number;
  data: Uint8Array;
}

/** An ICO file that holds `images`, in the given order. */
export function icoFile(images: IcoImage[]): Uint8Array {
  const headerBytes = 6 + images.length * 16;
  const header = Buffer.alloc(headerBytes);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = headerBytes;
  images.forEach((image, index) => {
    const at = 6 + index * 16;
    header.writeUInt8(image.edge >= 256 ? 0 : image.edge, at);
    header.writeUInt8(image.edge >= 256 ? 0 : image.edge, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(image.bitCount, at + 6);
    header.writeUInt32LE(image.data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += image.data.length;
  });
  return new Uint8Array(
    Buffer.concat([header, ...images.map((image) => Buffer.from(image.data))]),
  );
}

/**
 * A bottom-up icon bitmap of one colour, 32-bit BGRA or 24-bit BGR with an
 * AND mask. `maskBorder` marks that many edge pixels transparent in the mask.
 */
export function solidIconBitmap(
  edge: number,
  colour: Rgb,
  bitCount: 24 | 32,
  options: { maskBorder?: number; alpha?: number } = {},
): Uint8Array {
  const bytesPerPixel = bitCount / 8;
  const stride = Math.ceil((edge * bytesPerPixel) / 4) * 4;
  const maskStride = Math.ceil(edge / 32) * 4;
  const data = Buffer.alloc(40 + stride * edge + maskStride * edge);
  data.writeUInt32LE(40, 0);
  data.writeInt32LE(edge, 4);
  data.writeInt32LE(edge * 2, 8);
  data.writeUInt16LE(1, 12);
  data.writeUInt16LE(bitCount, 14);
  const border = options.maskBorder ?? 0;
  for (let row = 0; row < edge; row++) {
    for (let x = 0; x < edge; x++) {
      const at = 40 + row * stride + x * bytesPerPixel;
      data[at] = colour.b;
      data[at + 1] = colour.g;
      data[at + 2] = colour.r;
      if (bitCount === 32) data[at + 3] = options.alpha ?? 255;
      const edgePixel =
        x < border ||
        row < border ||
        x >= edge - border ||
        row >= edge - border;
      if (edgePixel) {
        const maskAt = 40 + stride * edge + row * maskStride + (x >> 3);
        data[maskAt] = (data[maskAt] ?? 0) | (0x80 >> (x & 7));
      }
    }
  }
  return new Uint8Array(data);
}
