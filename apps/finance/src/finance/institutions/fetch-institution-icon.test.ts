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
  serveFakeWebsites,
  solidPng,
  type FakeSite,
  type FakeWebsites,
  type Rgb,
} from "./testing/serve-fake-websites.ts";

const RED = { r: 220, g: 20, b: 20 };
const GREEN = { r: 20, g: 180, b: 40 };

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
