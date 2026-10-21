import { describe, expect, it } from "vitest";
import { detectInstallPlatform } from "./detect-install-platform.ts";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

const browser = { displayModeStandalone: false };

describe("detectInstallPlatform", () => {
  it("takes Safari on iPhone for the Share menu steps", () => {
    expect(
      detectInstallPlatform({
        ...browser,
        userAgent: IPHONE,
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe("ios");
  });

  it("takes an iPad, which reports a Mac user agent, for the Share menu steps", () => {
    expect(
      detectInstallPlatform({ ...browser, userAgent: MAC, maxTouchPoints: 5 }),
    ).toBe("ios");
  });

  it("takes a Mac, which has no touch, for a browser with no steps", () => {
    expect(
      detectInstallPlatform({ ...browser, userAgent: MAC, maxTouchPoints: 0 }),
    ).toBe("other");
  });

  it("leaves Chrome on Android to the install prompt", () => {
    expect(
      detectInstallPlatform({
        ...browser,
        userAgent: ANDROID_CHROME,
        maxTouchPoints: 5,
      }),
    ).toBe("other");
  });

  it("knows the home screen app on iOS from navigator.standalone", () => {
    expect(
      detectInstallPlatform({
        ...browser,
        userAgent: IPHONE,
        maxTouchPoints: 5,
        standalone: true,
      }),
    ).toBe("installed");
  });

  it("knows an installed app elsewhere from its display mode", () => {
    expect(
      detectInstallPlatform({
        ...browser,
        userAgent: ANDROID_CHROME,
        maxTouchPoints: 5,
        displayModeStandalone: true,
      }),
    ).toBe("installed");
  });
});
