import { afterEach, expect, it, vi } from "vitest";
import { isAllowedOrigin } from "./is-allowed-origin.ts";

const APP = ["https://app.example"];

afterEach(() => {
  vi.unstubAllEnvs();
});

it("allows the app's origins and http://localhost, and no other site", () => {
  vi.stubEnv("VERCEL_URL", "");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
  vi.stubEnv("ALLOWED_DEV_ORIGINS", "");

  expect(isAllowedOrigin("https://app.example", APP)).toBe(true);
  expect(isAllowedOrigin("http://localhost:3000", APP)).toBe(true);
  expect(isAllowedOrigin("https://localhost", APP)).toBe(false);
  expect(isAllowedOrigin("https://app.example.evil.test", APP)).toBe(false);
  expect(isAllowedOrigin("http://app.example", APP)).toBe(false);
  expect(isAllowedOrigin("not a url", APP)).toBe(false);
});

it("allows this deployment on Vercel and the dev hosts that Next allows", () => {
  vi.stubEnv("VERCEL_URL", "app-abc.vercel.app");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
  vi.stubEnv("ALLOWED_DEV_ORIGINS", "192.168.1.5,mac.local");

  expect(isAllowedOrigin("https://app-abc.vercel.app", APP)).toBe(true);
  expect(isAllowedOrigin("https://app-xyz.vercel.app", APP)).toBe(false);
  expect(isAllowedOrigin("http://mac.local:3000", APP)).toBe(true);
});
