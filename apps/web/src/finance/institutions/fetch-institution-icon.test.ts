import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  fetchInstitutionIcon,
  INSTITUTION_ICON_SIZE,
  type FetchInstitutionIconOptions,
} from "./fetch-institution-icon.ts";
import type { ResolvedAddress } from "./fetch-public-resource.ts";
import { isPublicAddress } from "./is-public-address.ts";
import {
  icoFile,
  serveFakeWebsites,
  solidIconBitmap,
  solidJpeg,
  solidPng,
  type FakeSite,
  type FakeWebsites,
  type Rgb,
} from "./testing/serve-fake-websites.ts";

const RED = { r: 220, g: 20, b: 20 };
const GREEN = { r: 20, g: 180, b: 40 };
const BLUE = { r: 20, g: 40, b: 220 };
const YELLOW = { r: 240, g: 200, b: 20 };
const PURPLE = { r: 140, g: 30, b: 160 };
const WHITE = { r: 255, g: 255, b: 255 };

const OVERSIZE_BYTES = 3 * 1024 * 1024;

const sites: Record<string, FakeSite> = {};
let server: FakeWebsites;

function html(head: string) {
  return {
    body: `<!doctype html><html><head>${head}</head><body></body></html>`,
  };
}

function png(bytes: Uint8Array, contentType = "image/png") {
  return { body: bytes, headers: { "Content-Type": contentType } };
}

function oversizePng() {
  const body = new Uint8Array(OVERSIZE_BYTES);
  body.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return body;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="red"/></svg>`;

async function buildSites(port: number): Promise<Record<string, FakeSite>> {
  return {
    "apple.test": {
      "/": html(
        `<link href="static/apple.png" rel="apple-touch-icon" sizes="180x180"><link rel=icon href=/favicon-32.png sizes=32x32>`,
      ),
      "/static/apple.png": png(await solidPng(180, RED)),
      "/favicon-32.png": png(await solidPng(32, GREEN)),
    },
    "redirect.test": {
      "/": {
        status: 301,
        headers: { Location: `http://www.final.test:${String(port)}/en/home` },
      },
      "/apple-touch-icon.png": png(await solidPng(180, RED)),
    },
    "www.final.test": {
      "/en/home": html(`<link rel="icon" href="img/icon.png" sizes="96x96">`),
      "/en/img/icon.png": png(await solidPng(96, BLUE)),
    },
    "manifest.test": {
      "/": html(`<LINK REL="Manifest" HREF='/app/site.json'>`),
      "/app/site.json": {
        headers: { "Content-Type": "application/manifest+json" },
        body: JSON.stringify({
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "mono.png", sizes: "1024x1024", purpose: "monochrome" },
          ],
        }),
      },
      "/app/icon-192.png": png(await solidPng(192, RED)),
      "/app/icon-512.png": png(await solidPng(512, GREEN)),
      "/app/mono.png": png(await solidPng(1024, BLUE)),
    },
    "webmanifest.test": {
      "/": html(`<link rel="icon" href="/f.png" sizes="16x16">`),
      "/site.webmanifest": {
        body: JSON.stringify({
          icons: [{ src: "/pwa/icon.png", sizes: "256x256" }],
        }),
      },
      "/pwa/icon.png": png(await solidPng(256, PURPLE)),
      "/f.png": png(await solidPng(16, RED)),
    },
    "icon.test": {
      "/": html(
        `<link type="image/png" href="/i/fav.png" sizes="64x64" rel="shortcut icon">`,
      ),
      "/i/fav.png": png(await solidPng(64, YELLOW)),
    },
    "pngico.test": {
      "/": html(""),
      "/favicon.ico": png(
        icoFile([
          { edge: 16, bitCount: 32, data: await solidPng(16, RED) },
          { edge: 48, bitCount: 32, data: await solidPng(48, GREEN) },
        ]),
        "image/x-icon",
      ),
    },
    "bmpico.test": {
      "/": html(""),
      "/favicon.ico": png(
        icoFile([
          { edge: 16, bitCount: 24, data: solidIconBitmap(16, RED, 24) },
          { edge: 32, bitCount: 32, data: solidIconBitmap(32, BLUE, 32) },
        ]),
        "image/vnd.microsoft.icon",
      ),
    },
    "bmp24ico.test": {
      "/": html(""),
      "/favicon.ico": png(
        icoFile([
          {
            edge: 32,
            bitCount: 24,
            data: solidIconBitmap(32, YELLOW, 24, { maskBorder: 4 }),
          },
        ]),
        "image/x-icon",
      ),
    },
    "soft404.test": {
      "/": html(""),
      "/apple-touch-icon.png": html("<title>Page not found</title>"),
      "/favicon.ico": png(
        icoFile([{ edge: 32, bitCount: 32, data: await solidPng(32, GREEN) }]),
        "image/x-icon",
      ),
    },
    "xicon.test": {
      "/": html(""),
      "/favicon.ico": png(await solidPng(32, PURPLE), "image/x-icon"),
    },
    "tiny.test": {
      "/": html(
        `<link rel="apple-touch-icon" href="/natwest-42.png" sizes="42x42">`,
      ),
      "/natwest-42.png": png(await solidPng(42, RED)),
    },
    "favicon16.test": {
      "/": html(`<link rel="icon" href="/16.png">`),
      "/16.png": png(await solidPng(16, BLUE)),
    },
    "blocked.test": {
      "/": { status: 403, body: "<title>Just a moment...</title>" },
      "/apple-touch-icon.png": png(await solidPng(180, RED)),
    },
    "huge.test": {
      "/": html(
        `<link rel="apple-touch-icon" href="/huge.png"><link rel="icon" href="/chunked.png" sizes="512x512">`,
      ),
      "/huge.png": png(oversizePng()),
      "/chunked.png": { ...png(oversizePng()), chunked: true },
      "/favicon.ico": png(await solidPng(32, GREEN), "image/x-icon"),
    },
    "svg.test": {
      "/": html(
        `<link rel="icon" type="image/svg+xml" href="/icon.svg"><link rel="mask-icon" href="/mask.svg">`,
      ),
      "/icon.svg": { body: SVG, headers: { "Content-Type": "image/svg+xml" } },
      "/apple-touch-icon.png": {
        body: SVG,
        headers: { "Content-Type": "image/png" },
      },
    },
    "gzip.test": {
      "/": {
        ...html(`<link rel="apple-touch-icon" href="/a.png">`),
        gzip: true,
      },
      "/a.png": png(await solidPng(180, PURPLE)),
    },
    "transparent.test": {
      "/": html(`<link rel="apple-touch-icon" href="/a.png">`),
      "/a.png": png(await solidPng(180, BLUE, { transparentBorder: 30 })),
    },
    "jpeg.test": {
      "/": html(`<link rel="icon" href="/wide.jpg" sizes="200x100">`),
      "/wide.jpg": png(await solidJpeg(200, 100, GREEN), "image/jpeg"),
    },
    "ssrf-redirect.test": {
      "/": {
        status: 302,
        headers: { Location: `http://metadata.test:${String(port)}/` },
      },
    },
    "ip-redirect.test": {
      "/": {
        status: 302,
        headers: { Location: `http://127.0.0.1:${String(port)}/` },
      },
    },
    "metadata.test": {
      "/": html(`<link rel="apple-touch-icon" href="/a.png">`),
      "/a.png": png(await solidPng(180, RED)),
    },
  };
}

function testLookup(addresses: Record<string, string> = {}) {
  return (hostname: string): Promise<ResolvedAddress[]> => {
    const address = addresses[hostname] ?? "127.0.0.1";
    if (!hostname.endsWith(".test")) return Promise.resolve([]);
    return Promise.resolve([
      { address, family: address.includes(":") ? 6 : 4 },
    ]);
  };
}

function testOptions(): FetchInstitutionIconOptions {
  return {
    homepageUrl: (domain) => `http://${domain}:${String(server.port)}/`,
    lookup: testLookup(),
    isAllowedAddress: (address) => address === "127.0.0.1",
  };
}

async function pixelsOf(icon: Uint8Array) {
  const { data, info } = await sharp(icon)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return (x: number, y: number): Rgb => {
    const at = (y * info.width + x) * info.channels;
    return { r: data[at] ?? -1, g: data[at + 1] ?? -1, b: data[at + 2] ?? -1 };
  };
}

function expectColour(actual: Rgb, expected: Rgb) {
  expect(Math.abs(actual.r - expected.r)).toBeLessThan(16);
  expect(Math.abs(actual.g - expected.g)).toBeLessThan(16);
  expect(Math.abs(actual.b - expected.b)).toBeLessThan(16);
}

async function expectIcon(domain: string, centre: Rgb) {
  const icon = await fetchInstitutionIcon(domain, testOptions());
  if (icon === null) throw new Error(`No icon for ${domain}`);
  const metadata = await sharp(icon).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.width).toBe(INSTITUTION_ICON_SIZE);
  expect(metadata.height).toBe(INSTITUTION_ICON_SIZE);
  expect(metadata.hasAlpha).toBe(false);
  const pixel = await pixelsOf(icon);
  expectColour(pixel(64, 64), centre);
  return pixel;
}

beforeAll(async () => {
  server = await serveFakeWebsites(sites);
  Object.assign(sites, await buildSites(server.port));
});

afterAll(async () => {
  await server.close();
});

describe("fetchInstitutionIcon", () => {
  it("takes the apple-touch-icon link, resolved against the page", async () => {
    await expectIcon("apple.test", RED);
  });

  it("resolves relative URLs against the homepage after redirects", async () => {
    await expectIcon("redirect.test", BLUE);
    expect(server.requests).toContain("www.final.test/en/img/icon.png");
    expect(server.requests).not.toContain("redirect.test/apple-touch-icon.png");
  });

  it("takes the largest manifest icon, resolved against the manifest", async () => {
    await expectIcon("manifest.test", GREEN);
    expect(server.requests).not.toContain("manifest.test/app/mono.png");
  });

  it("finds a manifest at a well-known path when no link names one", async () => {
    await expectIcon("webmanifest.test", PURPLE);
  });

  it("takes a shortcut icon link", async () => {
    await expectIcon("icon.test", YELLOW);
  });

  it("takes the largest PNG entry of a favicon.ico", async () => {
    await expectIcon("pngico.test", GREEN);
  });

  it("decodes 32-bit bitmap entries of a favicon.ico", async () => {
    await expectIcon("bmpico.test", BLUE);
  });

  it("decodes a 24-bit bitmap entry and its mask onto white", async () => {
    const pixel = await expectIcon("bmp24ico.test", YELLOW);
    expectColour(pixel(0, 0), WHITE);
  });

  it("skips an HTML soft 404 at /apple-touch-icon.png", async () => {
    await expectIcon("soft404.test", GREEN);
  });

  it("accepts a PNG served as image/x-icon", async () => {
    await expectIcon("xicon.test", PURPLE);
  });

  it("upscales small icons, as there is no minimum size", async () => {
    await expectIcon("tiny.test", RED);
    await expectIcon("favicon16.test", BLUE);
  });

  it("still probes /apple-touch-icon.png when the homepage answers 403", async () => {
    await expectIcon("blocked.test", RED);
  });

  it("decodes a gzip-encoded homepage", async () => {
    await expectIcon("gzip.test", PURPLE);
  });

  it("rejects images over the size cap, with or without Content-Length", async () => {
    await expectIcon("huge.test", GREEN);
    expect(server.requests).toContain("huge.test/huge.png");
    expect(server.requests).toContain("huge.test/chunked.png");
  });

  it("never fetches SVG links and never decodes SVG bytes", async () => {
    expect(await fetchInstitutionIcon("svg.test", testOptions())).toBeNull();
    expect(server.requests).not.toContain("svg.test/icon.svg");
    expect(server.requests).not.toContain("svg.test/mask.svg");
    expect(server.requests).toContain("svg.test/apple-touch-icon.png");
  });

  it("fills transparent pixels and letterboxing with white", async () => {
    const transparent = await expectIcon("transparent.test", BLUE);
    expectColour(transparent(1, 1), WHITE);
    const wide = await expectIcon("jpeg.test", GREEN);
    expectColour(wide(64, 2), WHITE);
  });

  it("answers null for a site with no icon at all", async () => {
    expect(
      await fetchInstitutionIcon("nothing.test", testOptions()),
    ).toBeNull();
  });
});

describe("fetchInstitutionIcon SSRF guard", () => {
  function defaultRuleOptions(
    addresses: Record<string, string> = {},
  ): FetchInstitutionIconOptions {
    return {
      homepageUrl: (domain) => `http://${domain}:${String(server.port)}/`,
      lookup: testLookup(addresses),
    };
  }

  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "[::1]",
    "localhost",
    "intranet",
    "Apple.test",
    "apple.test.",
  ])("throws for the domain %s", async (domain) => {
    await expect(fetchInstitutionIcon(domain)).rejects.toThrow(RangeError);
  });

  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "fd00::1",
    "::ffff:127.0.0.1",
  ])("connects to no host that resolves to %s", async (address) => {
    const before = server.requests.length;
    const icon = await fetchInstitutionIcon(
      "apple.test",
      defaultRuleOptions({ "apple.test": address }),
    );
    expect(icon).toBeNull();
    expect(server.requests.length).toBe(before);
  });

  it("refuses a redirect to a host that resolves to a private address", async () => {
    const icon = await fetchInstitutionIcon("ssrf-redirect.test", {
      ...defaultRuleOptions({ "metadata.test": "169.254.169.254" }),
      isAllowedAddress: (address, family) =>
        address === "127.0.0.1" || isPublicAddress(address, family),
    });
    expect(icon).toBeNull();
    expect(server.requests).toContain("ssrf-redirect.test/");
    expect(server.requests).not.toContain("metadata.test/");
  });

  it("refuses a redirect to an IP literal", async () => {
    const icon = await fetchInstitutionIcon("ip-redirect.test", testOptions());
    expect(icon).toBeNull();
    expect(server.requests).not.toContain("127.0.0.1/");
  });

  it("refuses a redirect to another port", async () => {
    sites["port-redirect.test"] = {
      "/": { status: 302, headers: { Location: "http://apple.test:8443/" } },
    };
    const before = server.requests.length;
    expect(
      await fetchInstitutionIcon("port-redirect.test", testOptions()),
    ).toBeNull();
    expect(server.requests.slice(before)).not.toContain("apple.test/");
  });
});
