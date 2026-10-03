import { beamColor, isDarkBackdrop } from "./beam-color.ts";
import { beamMeetsRect, distanceToEdge, type Beam } from "./beam-meets-rect.ts";
import { BLACK_HOLE_ATTRIBUTES } from "./black-hole-attributes.ts";
import { BLACK_HOLE_WGSL, SCENE_LAYOUT } from "./black-hole-wgsl.ts";
import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { readSlotAttribute } from "./effect-boundary-slot.tsx";
import { roleBits } from "./effect-roles.ts";
import {
  aimBehindLenses,
  largestBendIn,
  lensFromBox,
  nearestLens,
  sourceBehind,
  type Lens,
  type PageRect,
} from "./lens-from-box.ts";
import { parseCssColor } from "./parse-css-color.ts";
import { cssAngleToRadians, stepAim, type Aim } from "./step-aim.ts";
import type {
  Effect,
  EffectCanvas,
  EffectElementRecord,
  EffectFrame,
  EffectTarget,
} from "./types.ts";

const BLACK_HOLE = roleBits(["blackHole"]);
const LIGHT_BEAM = roleBits(["lightBeam"]);

/** How far a beam reaches, as a multiple of the viewport's diagonal. */
const REACH_SCALE = 1.1;
/** Inside its element and this far out, the pointer does not turn a beam. */
const AIM_DEAD_ZONE = 8;

/** A lens with the index of its element in `effectElements`. */
interface ShaderLens {
  readonly lens: Lens;
  readonly element: number;
}

function readNumber(element: Element, name: `data-${string}`) {
  const value = Number.parseFloat(readSlotAttribute(element, name) ?? "");
  return Number.isFinite(value) ? value : null;
}

/** The part of the page a target draws this frame. */
function drawnRect(target: EffectTarget): PageRect {
  const { band } = target;
  return band === null
    ? { x: target.x, y: target.y, width: target.width, height: target.height }
    : {
        x: target.x,
        y: target.y + band.drawnTop,
        width: target.width,
        height: band.drawnHeight,
      };
}

/**
 * Black hole and Light beam: each Light beam casts a ray of light in its
 * fill colour, behind the page, and each Black hole bends the light that
 * passes behind it. A beam turns towards the pointer on a spring and comes
 * back to rest pointing at the nearest Black hole. A beam draws on the
 * `<canvas>` element of its own element: a fixed Light beam on the fixed one.
 * It draws only on the targets its light can reach, and asks for frames only
 * while a beam turns. Under reduced motion a beam turns only while the
 * pointer is pressed, and with no spring.
 *
 * @internal
 */
export const blackHoleEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const sceneLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    const module = device.createShaderModule({ code: BLACK_HOLE_WGSL });
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, sceneLayout],
      }),
      vertex: { module, entryPoint: "vertexMain" },
      fragment: {
        module,
        entryPoint: "fragmentMain",
        targets: [{ format, blend: PREMULTIPLIED_BLEND }],
      },
    });

    function createScene() {
      const buffer = device.createBuffer({
        size: SCENE_LAYOUT.bytes,
        usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
      });
      const data = new ArrayBuffer(SCENE_LAYOUT.bytes);
      return {
        buffer,
        bindGroup: device.createBindGroup({
          layout: sceneLayout,
          entries: [{ binding: 0, resource: { buffer } }],
        }),
        data,
        floats: new Float32Array(data),
        words: new Uint32Array(data),
      };
    }
    // One scene per kind of target, each with the beams that draw there.
    const scenes = { scroll: createScene(), fixed: createScene() };

    let aims = new Map<number, Aim>();
    const drawn = new Set<EffectTarget>();

    // The layer measures no change when a setting or the theme changes, so
    // draw a frame for each.
    const settingsObserver = new MutationObserver(requestFrame);
    settingsObserver.observe(document.documentElement, {
      subtree: true,
      attributeFilter: Object.values(BLACK_HOLE_ATTRIBUTES),
    });
    const themeObserver = new MutationObserver(requestFrame);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class", "style"],
    });
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkQuery.addEventListener("change", requestFrame);
    const rootStyle = getComputedStyle(document.documentElement);

    function aimBeam(
      record: EffectElementRecord,
      lenses: readonly Lens[],
      frame: EffectFrame,
      nextAims: Map<number, Aim>,
    ) {
      const { element } = record;
      const centre = {
        x: record.x + record.width / 2,
        y: record.y + record.height / 2,
      };
      // Work behind the lenses, so that the bent beam is seen to leave the
      // element and to pass through what it aims at.
      const origin = sourceBehind(lenses, centre);
      const { pointer } = frame;
      const aimed =
        readSlotAttribute(element, BLACK_HOLE_ATTRIBUTES.followsPointer) !==
          "false" &&
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
        const angle = readNumber(element, BLACK_HOLE_ATTRIBUTES.angle);
        const nearest =
          angle === null ? nearestLens(lenses, centre.x, centre.y) : null;
        if (angle !== null) {
          target = cssAngleToRadians(angle);
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

    function writeScene(
      scene: ReturnType<typeof createScene>,
      lenses: readonly ShaderLens[],
      beams: readonly Beam[],
      dark: boolean,
    ) {
      scene.words[0] = lenses.length;
      scene.words[1] = beams.length;
      scene.floats[2] = dark ? 1 : 0;
      for (const [index, { lens, element }] of lenses.entries()) {
        const at = SCENE_LAYOUT.lensOffset + index * SCENE_LAYOUT.lensFloats;
        scene.floats.set(
          [
            lens.x,
            lens.y,
            lens.halfWidth,
            lens.halfHeight,
            lens.cornerRadius,
            lens.mass,
            lens.falloff,
          ],
          at,
        );
        scene.words[at + 7] = element;
      }
      for (const [index, beam] of beams.entries()) {
        scene.floats.set(
          [
            beam.x,
            beam.y,
            Math.cos(beam.angle),
            Math.sin(beam.angle),
            ...beam.color,
            beam.reach,
            beam.start,
          ],
          SCENE_LAYOUT.beamOffset + index * SCENE_LAYOUT.beamFloats,
        );
      }
      device.queue.writeBuffer(scene.buffer, 0, scene.data);
    }

    return {
      followsPointer: true,
      update(_encoder, frame) {
        drawn.clear();
        const shaderLenses: ShaderLens[] = [];
        for (const [element, record] of frame.elements.entries()) {
          if ((record.roles & BLACK_HOLE) !== 0) {
            const mass =
              readNumber(record.element, BLACK_HOLE_ATTRIBUTES.mass) ?? 1;
            shaderLenses.push({ lens: lensFromBox(record, mass), element });
          }
        }
        shaderLenses.sort(
          (first, second) =>
            largestBendIn(second.lens, frame.viewport) -
            largestBendIn(first.lens, frame.viewport),
        );
        shaderLenses.length = Math.min(
          shaderLenses.length,
          SCENE_LAYOUT.maxLenses,
        );
        const lenses = shaderLenses.map(({ lens }) => lens);

        const dark = isDarkBackdrop(
          parseCssColor(rootStyle.backgroundColor),
          darkQuery.matches,
        );
        const reach =
          Math.hypot(frame.viewport.width, frame.viewport.height) * REACH_SCALE;
        const beams: Record<EffectCanvas, Beam[]> = { scroll: [], fixed: [] };
        const nextAims = new Map<number, Aim>();
        let turning = false;
        for (const record of frame.elements) {
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
          beams[record.fixed ? "fixed" : "scroll"].push({
            x,
            y,
            angle,
            start: distanceToEdge(record.width / 2, record.height / 2, angle),
            reach,
            color: beamColor(record.fill, dark),
          });
        }
        aims = nextAims;

        for (const canvas of ["scroll", "fixed"] as const) {
          const shown = new Set<Beam>();
          for (const target of frame.targets) {
            if (target.canvas !== canvas) {
              continue;
            }
            const rect = drawnRect(target);
            const bend = lenses.reduce(
              (sum, lens) => sum + largestBendIn(lens, rect),
              0,
            );
            for (const beam of beams[canvas]) {
              if (beamMeetsRect(beam, rect, bend)) {
                drawn.add(target);
                shown.add(beam);
              }
            }
          }
          if (shown.size > 0) {
            writeScene(
              scenes[canvas],
              shaderLenses,
              [...shown].slice(0, SCENE_LAYOUT.maxBeams),
              dark,
            );
          }
        }
        return turning && drawn.size > 0;
      },
      draw(pass, target) {
        if (!drawn.has(target)) {
          return;
        }
        pass.setPipeline(pipeline);
        pass.setBindGroup(2, scenes[target.canvas].bindGroup);
        pass.draw(3);
      },
      destroy() {
        settingsObserver.disconnect();
        themeObserver.disconnect();
        darkQuery.removeEventListener("change", requestFrame);
        scenes.scroll.buffer.destroy();
        scenes.fixed.buffer.destroy();
      },
    };
  },
};
