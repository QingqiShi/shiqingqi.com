import { describe, expect, it } from "vitest";
import { driveGrabber, type GrabberMotion } from "./drive-grabber.ts";
import type { SheetPose } from "./publish-sheet-pose.ts";

const FRAME = 1 / 60;
const RADIUS = 6;
const SHOWN: SheetPose = { phase: "shown", y: 0, finger: null, dim: null };

/** Drives the grabber along the card's path, one frame at a time. */
function follow(path: readonly number[], pose: SheetPose | null = SHOWN) {
  let motion: GrabberMotion | null = null;
  const drives = [];
  for (const y of path) {
    const driven = driveGrabber(motion, y, pose, FRAME, RADIUS);
    motion = driven.motion;
    drives.push(driven.drive);
  }
  return drives;
}

/**
 * The card's y as it slides up to rest and stops: fast, then at once
 * still, for long enough that the smoothed acceleration dies away.
 */
const LANDING = [
  600,
  400,
  240,
  120,
  40,
  ...Array.from({ length: 18 }, () => 0),
];

describe("driveGrabber", () => {
  it("drives nothing on a card that is still", () => {
    const [first, ...rest] = follow([500, 500, 500]);
    expect(first.force).toEqual([0, 0]);
    expect(first.stir).toBe(false);
    expect(first.pressed).toBe(false);
    for (const drive of rest) {
      expect(drive.force).toEqual([0, 0]);
      expect(drive.stir).toBe(false);
    }
  });

  it("pushes the liquid on up the card as the card stops, and lets it go as the card rests", () => {
    const drives = follow(LANDING);
    const atStop = drives[5];
    expect(atStop.force[1]).toBeLessThan(0);
    expect(atStop.stir).toBe(true);
    expect(drives.at(-1)?.stir).toBe(false);
    expect(Math.abs(drives.at(-1)?.force[1] ?? 1)).toBeLessThan(1);
  });

  it("pushes the liquid down the card as the card sets off upwards", () => {
    const [, setOff] = follow([600, 560]);
    expect(setOff.force[1]).toBeGreaterThan(0);
  });

  it("holds the force within a limit, whatever the card does", () => {
    for (const drive of follow([0, 5000, 0, 5000, 0])) {
      expect(Math.abs(drive.force[0])).toBeLessThanOrEqual(70);
      expect(Math.abs(drive.force[1])).toBeLessThanOrEqual(70);
    }
  });

  it("takes a jump for a new start, not for motion", () => {
    const [, afterJump] = follow([0, 700]);
    expect(afterJump.force).toEqual([0, 0]);
    expect(afterJump.stir).toBe(false);
  });

  it("pulls the liquid towards a finger that holds the card past where it can go, and stirs it while it holds", () => {
    const dragging: SheetPose = {
      phase: "dragging",
      y: -20,
      finger: [30, -40],
      dim: null,
    };
    const [drive] = follow([100], dragging);
    expect(drive.pressed).toBe(true);
    expect(drive.stir).toBe(true);
    expect(drive.force[0]).toBeGreaterThan(0);
    expect(drive.force[1]).toBeLessThan(0);
    expect(Math.abs(drive.force[1])).toBeGreaterThan(Math.abs(drive.force[0]));
  });

  it("stirs a held liquid even with the finger where it took hold", () => {
    const held: SheetPose = {
      phase: "dragging",
      y: 30,
      finger: [0, 0],
      dim: null,
    };
    const [drive] = follow([100], held);
    expect(drive.force).toEqual([0, 0]);
    expect(drive.pressed).toBe(true);
    expect(drive.stir).toBe(true);
  });

  it("reads no finger from a pose that is not a drag", () => {
    const [drive] = follow([100], { ...SHOWN, finger: [30, -40] });
    expect(drive.force).toEqual([0, 0]);
    expect(drive.pressed).toBe(false);
  });
});
