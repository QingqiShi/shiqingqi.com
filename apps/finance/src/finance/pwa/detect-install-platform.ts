/**
 * How this browser adds Finance to the home screen. `installed` is the home
 * screen app itself. `ios` has no install API, so the visitor follows steps in
 * the Share menu. `other` installs only through `beforeinstallprompt`, if the
 * browser fires it.
 */
export type InstallPlatform = "installed" | "ios" | "other";

interface InstallEnvironment {
  userAgent: string;
  maxTouchPoints: number;
  standalone?: boolean;
  displayModeStandalone: boolean;
}

declare global {
  interface Navigator {
    /** Only WebKit on iOS and iPadOS defines it. */
    standalone?: boolean;
  }
}

export function detectInstallPlatform({
  userAgent,
  maxTouchPoints,
  standalone,
  displayModeStandalone,
}: InstallEnvironment): InstallPlatform {
  if (displayModeStandalone || standalone) return "installed";
  // iPadOS Safari reports a Mac user agent. Only the iPad has touch.
  const isIos =
    /iPhone|iPod|iPad/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  return isIos ? "ios" : "other";
}

export function readInstallPlatform(): InstallPlatform {
  return detectInstallPlatform({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: navigator.standalone,
    displayModeStandalone: window.matchMedia("(display-mode: standalone)")
      .matches,
  });
}
