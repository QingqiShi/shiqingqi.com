import { hostname, networkInterfaces } from "node:os";

/**
 * Hosts that other devices use to reach this machine's dev server: every
 * non-loopback IPv4 address (LAN, Tailscale, hotspot) and the mDNS name.
 * In development Next answers 403 to `/_next/*` requests from any host it
 * does not know, so each app's `next.config.js` allow-lists these.
 */
export function getLocalDevOrigins() {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface?.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
  return [...addresses, hostname()];
}
