import type { Beam as BeamRecord } from "./beam-meets-rect.ts";
import type { Beam, Lens, Scene } from "./black-hole-layout.ts";
import type { ShaderLens } from "./lenses-of-scope.ts";
import type { EffectInput } from "./types.ts";

/**
 * How many Black holes and Light beams one scene draws at most.
 *
 * @internal
 */
export const MAX_LENSES = 8;
/** @internal */
export const MAX_BEAMS = 4;

/**
 * A beam with the index of its element in `effectElements`.
 *
 * @internal
 */
export interface ShaderBeam {
  readonly beam: BeamRecord;
  readonly element: number;
}

const NO_LENS: EffectInput<typeof Lens> = {
  center: [0, 0],
  halfSize: [0, 0],
  cornerRadius: 0,
  mass: 0,
  falloff: 0,
  element: 0,
};

const NO_BEAM: EffectInput<typeof Beam> = {
  origin: [0, 0],
  direction: [0, 0],
  color: [0, 0, 0],
  reach: 0,
  start: 0,
  element: 0,
};

/**
 * `scene` for one scope on one kind of target, with at most `MAX_LENSES`
 * lenses, as `lensesOfScope` gives them. It takes the first `MAX_BEAMS`
 * beams.
 *
 * @internal
 */
export function sceneValue(
  lenses: readonly ShaderLens[],
  beams: readonly ShaderBeam[],
  dark: boolean,
  scope: number,
): EffectInput<typeof Scene> {
  const lensValues: EffectInput<typeof Lens>[] = [];
  for (let index = 0; index < MAX_LENSES; index += 1) {
    const shaderLens = lenses.at(index);
    if (shaderLens === undefined) {
      lensValues.push(NO_LENS);
      continue;
    }
    const { lens, element } = shaderLens;
    lensValues.push({
      center: [lens.x, lens.y],
      halfSize: [lens.halfWidth, lens.halfHeight],
      cornerRadius: lens.cornerRadius,
      mass: lens.mass,
      falloff: lens.falloff,
      element,
    });
  }
  const beamValues: EffectInput<typeof Beam>[] = [];
  for (let index = 0; index < MAX_BEAMS; index += 1) {
    const shaderBeam = beams.at(index);
    if (shaderBeam === undefined) {
      beamValues.push(NO_BEAM);
      continue;
    }
    const { beam, element } = shaderBeam;
    beamValues.push({
      origin: [beam.x, beam.y],
      direction: [Math.cos(beam.angle), Math.sin(beam.angle)],
      color: beam.color,
      reach: beam.reach,
      start: beam.start,
      element,
    });
  }
  return {
    lensCount: lenses.length,
    beamCount: Math.min(beams.length, MAX_BEAMS),
    dark: dark ? 1 : 0,
    scope,
    lenses: lensValues,
    beams: beamValues,
  };
}
