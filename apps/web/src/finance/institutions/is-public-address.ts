import { BlockList, isIP } from "node:net";

const NON_PUBLIC_IPV4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const NON_PUBLIC_IPV6: [string, number][] = [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
];

const nonPublicIpv4 = new BlockList();
for (const [network, prefix] of NON_PUBLIC_IPV4) {
  nonPublicIpv4.addSubnet(network, prefix, "ipv4");
}

const globalUnicastIpv6 = new BlockList();
globalUnicastIpv6.addSubnet("2000::", 3, "ipv6");

const nonPublicIpv6 = new BlockList();
for (const [network, prefix] of NON_PUBLIC_IPV6) {
  nonPublicIpv6.addSubnet(network, prefix, "ipv6");
}

/**
 * True for a public unicast address only. IPv6 must be in 2000::/3, so
 * loopback, ULA, link-local, multicast, NAT64 and IPv4-mapped addresses fail.
 */
export function isPublicAddress(address: string, family: 4 | 6): boolean {
  if (isIP(address) !== family) return false;
  if (family === 4) return !nonPublicIpv4.check(address, "ipv4");
  return (
    globalUnicastIpv6.check(address, "ipv6") &&
    !nonPublicIpv6.check(address, "ipv6")
  );
}
