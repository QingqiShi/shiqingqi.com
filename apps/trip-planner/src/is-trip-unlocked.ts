import { cookies } from "next/headers";
import { gateToken, tripGate } from "./trip-gate";

/**
 * True when this request carries the unlock cookie of the trip. The trip page
 * checks it itself, so that no gap in the proxy's path matching can open a
 * trip. A trip with no gate or no password is never unlocked.
 */
export async function isTripUnlocked(slug: string): Promise<boolean> {
  const gate = tripGate(slug);
  if (!gate?.password) return false;
  const store = await cookies();
  return (
    store.get(gate.cookie)?.value ===
    (await gateToken(gate.realm, gate.password))
  );
}
