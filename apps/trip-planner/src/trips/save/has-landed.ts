import { withExpect, type DraftOp } from "#src/trips/ops/apply-ops.ts";
import type { Trip } from "#src/trips/types.ts";

/**
 * Whether the newest trip holds what a batch makes: each thing that the
 * batch adds, changes or removes is in `newest` as it is in `expected`. A
 * move is not looked at, because a move that goes again does no harm.
 */
export function hasLanded(
  ops: readonly DraftOp[],
  expected: Trip,
  newest: Trip,
) {
  const probes = ops.map(probeOf).filter((probe) => probe !== null);
  return (
    probes.length > 0 &&
    probes.every(
      (probe) => thingDigest(expected, probe) === thingDigest(newest, probe),
    )
  );
}

/**
 * An op whose `expect` is the digest of the thing that `op` makes or
 * changes. For a thing that `op` adds, that is a set, whose digest does not
 * change when someone else moves the thing.
 */
function probeOf(op: DraftOp): DraftOp | null {
  switch (op.op) {
    case "addDay":
      return { op: "setDay", id: op.id, fields: {} };
    case "addMoment":
      return { op: "setMoment", id: op.moment.id, fields: {} };
    case "addItem":
      return { op: "setItem", id: op.item.id, fields: {} };
    case "moveDay":
    case "moveMoment":
    case "moveItem":
      return null;
    default:
      return op;
  }
}

function thingDigest(trip: Trip, probe: DraftOp) {
  const [stamped] = withExpect(trip, [probe]);
  return "expect" in stamped ? stamped.expect : undefined;
}
