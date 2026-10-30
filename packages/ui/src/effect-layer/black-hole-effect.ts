import { blackHoleWgsl } from "../_generated/wgsl/black-hole.ts";
import { blackHoleLayout, Scene } from "../_generated/wgsl/layouts.ts";
import { beamColor } from "./beam-color.ts";
import { beamMeetsRect, distanceToEdge } from "./beam-meets-rect.ts";
import { compileEffectShader } from "./compile-effect-shader.ts";
import { createBindGroup } from "./create-binding.ts";
import { createUniformBuffer } from "./create-uniform-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import {
  aimBehindLenses,
  largestBendIn,
  nearestLens,
  sourceBehind,
  type Lens,
  type PageRect,
} from "./lens-from-box.ts";
import { lensesOfScope } from "./lenses-of-scope.ts";
import { indicesIn } from "./plan-scopes.ts";
import { sceneValue, type ShaderBeam } from "./scene-value.ts";
import { cssAngleToRadians, stepAim, type Aim } from "./step-aim.ts";
import type {
  Effect,
  EffectElementRecord,
  EffectFrame,
  EffectTarget,
} from "./types.ts";

const LIGHT_BEAM = roleBits(["lightBeam"]);

/** How far a beam reaches, as a multiple of the viewport's diagonal. */
const REACH_SCALE = 1.1;
/** Inside its element and this far out, the pointer does not turn a beam. */
const AIM_DEAD_ZONE = 8;

/** The part of the page a target draws this frame. */
function drawnRect({
  x,
  width,
  drawnPageRange: [top, bottom],
}: EffectTarget): PageRect {
  return { x, y: top, width, height: bottom - top };
}

/**
 * Black hole and Light beam: each Light beam casts a ray of light in its
 * fill colour over the page, from the edge of its element, and each Black
 * hole bends the light that passes behind it. A beam turns towards the
 * pointer on a spring and comes back to rest pointing at the nearest Black
 * hole. A beam draws on the `<canvas>` element of its own element, the fixed
 * one for a fixed Light beam, and only inside its Effect container. Only the
 * Black holes of a beam's scope bend it, so each scope on each `<canvas>`
 * element draws a scene of its own.
 * It draws only on the targets its light can reach, and asks for frames only
 * while a beam turns. Under reduced motion a beam turns only while the
 * pointer is pressed, and with no spring.
 *
 * @internal
 */
export const blackHoleEffect: Effect = {
  async setup({ device, colorTarget }) {
    const pipeline = await compileEffectShader(device, blackHoleWgsl).render(
      colorTarget,
    );

    function createScene() {
      const buffer = createUniformBuffer(device, Scene);
      return {
        buffer,
        bindGroup: createBindGroup(device, blackHoleLayout, { scene: buffer }),
      };
    }
    type DrawnScene = ReturnType<typeof createScene>;
    // One scene for each scope with Light beams on each kind of target, by
    // the scope's id and the kind of target.
    const scenes = new Map<string, DrawnScene>();
    function sceneFor(key: string) {
      let scene = scenes.get(key);
      if (scene === undefined) {
        scene = createScene();
        scenes.set(key, scene);
      }
      return scene;
    }

    let aims = new Map<number, Aim>();
    /** The scenes each target draws this frame. */
    const drawn = new Map<EffectTarget, DrawnScene[]>();

    function aimBeam(
      record: EffectElementRecord,
      lenses: readonly Lens[],
      frame: EffectFrame,
      nextAims: Map<number, Aim>,
    ) {
      const { angle, followsPointer } =
        record.settings.lightBeam ?? EFFECT_SETTING_DEFAULTS.lightBeam;
      const centre = {
        x: record.x + record.width / 2,
        y: record.y + record.height / 2,
      };
      // Work behind the lenses, so that the bent beam is seen to leave the
      // element and to pass through what it aims at.
      const origin = sourceBehind(lenses, centre);
      const { pointer } = frame;
      const aimed =
        followsPointer &&
        pointer.present &&
        (pointer.pressed || !frame.reducedMotion);
      const outside =
        Math.abs(pointer.x - centre.x) > record.width / 2 + AIM_DEAD_ZONE ||
        Math.abs(pointer.y - centre.y) > record.height / 2 + AIM_DEAD_ZONE;
      const previous = aims.get(record.id);
      let target = 0;
      if (aimed && outside) {
        target = aimBehindLenses(lenses, origin, pointer);
      } else if (aimed && previous !== undefined) {
        target = previous.angle;
      } else {
        const restAngle = finiteOr(angle, null);
        const nearest =
          restAngle === null ? nearestLens(lenses, centre.x, centre.y) : null;
        if (restAngle !== null) {
          target = cssAngleToRadians(restAngle);
        } else if (nearest !== null) {
          target = aimBehindLenses(lenses, origin, nearest);
        }
      }
      const next =
        previous === undefined || frame.reducedMotion
          ? { angle: target, velocity: 0, settled: true }
          : stepAim(previous, target, frame.delta);
      nextAims.set(record.id, next);
      return { ...origin, angle: next.angle, settled: next.settled };
    }

    return {
      followsPointer: true,
      update(_encoder, frame) {
        drawn.clear();
        const reach =
          Math.hypot(frame.viewport.width, frame.viewport.height) * REACH_SCALE;
        const nextAims = new Map<number, Aim>();
        const kept = new Set<string>();
        let turning = false;
        for (const [scopeIndex, scope] of frame.scopes.entries()) {
          const shaderLenses = lensesOfScope(
            frame.elements,
            scope,
            frame.viewport,
          );
          const lenses = shaderLenses.map(({ lens }) => lens);
          for (const [carrier, range] of scope.ranges.entries()) {
            const beams: ShaderBeam[] = [];
            for (const element of indicesIn(range)) {
              const record = frame.elements[element];
              if ((record.roles & LIGHT_BEAM) === 0) {
                continue;
              }
              const { x, y, angle, settled } = aimBeam(
                record,
                lenses,
                frame,
                nextAims,
              );
              turning ||= !settled;
              beams.push({
                beam: {
                  x,
                  y,
                  angle,
                  start: distanceToEdge(
                    record.width / 2,
                    record.height / 2,
                    angle,
                  ),
                  reach,
                  color: beamColor(record.fill, scope.dark),
                },
                element,
              });
            }
            if (beams.length === 0) {
              continue;
            }
            const key = `${String(frame.carriers[carrier])} ${String(scope.id)}`;
            kept.add(key);
            const shown = new Set<ShaderBeam>();
            for (const target of frame.targets) {
              if (target.carrier !== carrier) {
                continue;
              }
              const rect = drawnRect(target);
              const bend = lenses.reduce(
                (sum, lens) => sum + largestBendIn(lens, rect),
                0,
              );
              const meeting = beams.filter(({ beam }) =>
                beamMeetsRect(beam, rect, bend),
              );
              if (meeting.length === 0) {
                continue;
              }
              const scene = sceneFor(key);
              drawn.set(target, [...(drawn.get(target) ?? []), scene]);
              for (const shaderBeam of meeting) {
                shown.add(shaderBeam);
              }
            }
            if (shown.size > 0) {
              sceneFor(key).buffer.write(
                sceneValue(shaderLenses, [...shown], scope.dark, scopeIndex),
              );
            }
          }
        }
        aims = nextAims;
        for (const [key, scene] of scenes) {
          if (!kept.has(key)) {
            scene.buffer.destroy();
            scenes.delete(key);
          }
        }
        return turning && drawn.size > 0;
      },
      draw(pass, target) {
        for (const scene of drawn.get(target) ?? []) {
          pass.draw(pipeline, scene.bindGroup, 3);
        }
      },
      destroy() {
        for (const scene of scenes.values()) {
          scene.buffer.destroy();
        }
        scenes.clear();
      },
    };
  },
};
