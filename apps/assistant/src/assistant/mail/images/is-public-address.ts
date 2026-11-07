import { BlockList, isIP } from "node:net";

/** IANA special-purpose IPv4 blocks, and the private, shared and multicast ones. */
const SPECIAL_V4: readonly [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

/** Blocks inside 2000::/3 that are not plain global unicast: protocol assignments (Teredo among them), documentation and 6to4. */
const SPECIAL_V6: readonly [string, number][] = [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
];

const specialV4 = new BlockList();
for (const [network, prefix] of SPECIAL_V4) {
  specialV4.addSubnet(network, prefix, "ipv4");
}

const globalUnicastV6 = new BlockList();
globalUnicastV6.addSubnet("2000::", 3, "ipv6");

const specialV6 = new BlockList();
for (const [network, prefix] of SPECIAL_V6) {
  specialV6.addSubnet(network, prefix, "ipv6");
}

/** The IPv4 address in an IPv4-mapped IPv6 address such as `::ffff:127.0.0.1`. */
function mappedV4(address: string) {
  const canonical = new URL(`http://[${address}]/`).hostname;
  const match = /^\[::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})\]$/.exec(canonical);
  if (!match?.[1] || !match[2]) return null;
  const high = Number.parseInt(match[1], 16);
  const low = Number.parseInt(match[2], 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

/**
 * True for an address on the public internet. Loopback, private, link-local
 * (also the cloud metadata address 169.254.169.254), shared (CGNAT),
 * unique-local, multicast, documentation and reserved addresses are not, and
 * an IPv4-mapped IPv6 address counts as its IPv4 address. Of IPv6, only
 * global unicast (2000::/3) can pass, so that NAT64 and other ranges that
 * hold an IPv4 address do not.
 */
export function isPublicAddress(address: string): boolean {
  if (address.includes("%")) return false;
  const version = isIP(address);
  if (version === 4) return !specialV4.check(address, "ipv4");
  if (version !== 6) return false;
  const v4 = mappedV4(address);
  if (v4) return isPublicAddress(v4);
  return (
    globalUnicastV6.check(address, "ipv6") && !specialV6.check(address, "ipv6")
  );
}
