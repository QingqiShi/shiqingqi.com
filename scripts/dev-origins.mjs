import { promises as dns } from "node:dns";
import { hostname, networkInterfaces } from "node:os";
import { setTimeout as delay } from "node:timers/promises";

const REVERSE_LOOKUP_TIMEOUT_MS = 1000;

async function reverseResolve(address) {
  // Use getnameinfo and not `dns.reverse`: getnameinfo reads the macOS scoped
  // resolvers that Tailscale MagicDNS installs, but c-ares does not.
  const service = await Promise.race([
    dns.lookupService(address, 0).catch(() => undefined),
    delay(REVERSE_LOOKUP_TIMEOUT_MS, undefined, { ref: false }),
  ]);
  return service?.hostname;
}

function firstLabel(name) {
  return name.split(".")[0];
}

/**
 * Hosts that other devices use to reach this machine's dev server. In
 * development Next answers 403 to `/_next/*` requests from any host it does
 * not know, so each app's `next.config.js` allow-lists these.
 */
export async function getLocalDevOrigins() {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface?.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
  const resolved = await Promise.all(addresses.map(reverseResolve));
  const machineName = hostname();
  const names = [
    ...resolved.filter(Boolean),
    machineName,
    `${firstLabel(machineName)}.local`,
  ];

  return [
    ...new Set(
      [...addresses, ...names, ...names.map(firstLabel)].map((host) =>
        host.toLowerCase(),
      ),
    ),
  ];
}
