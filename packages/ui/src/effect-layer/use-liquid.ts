import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const LIQUID = roleBits(["liquid"]);

export interface LiquidOptions {
  /**
   * Where the thumb rests, as a share of the track's travel: 0 at the off
   * end, 1 at the on end, 0.5 in the middle for indeterminate.
   *
   * @zh 滑块的静止位置，以轨道行程的比例表示：0 在关闭端，1 在开启端，0.5 在中间表示未定。
   */
  position: number;
  /**
   * Where a drag holds the thumb, as a share of the travel, or `null` while
   * no drag is on. The liquid follows the pointer with its own inertia.
   *
   * @default null
   * @zh 拖动时滑块所在的位置，以行程的比例表示；未拖动时为 `null`。液体带着惯性跟随指针。
   */
  drag?: number | null;
  /**
   * A pointer is down on the Switch. The thumb thaws while it is pressed,
   * and freezes again once it is released and still.
   *
   * @default false
   * @zh 指针正按在开关上。按住时滑块融化，松开并静止后重新冻结。
   */
  pressed?: boolean;
  /**
   * Where the press that toggled the Switch was across the track, from -1
   * at its top to 1 at its bottom. The liquid leans a little that way as it
   * pours, so it lands higher or lower on the far end, and the ring light
   * starts where it lands. A toggle with no press point, from a key or a
   * label, aims at 0, the centre line.
   *
   * @default 0
   * @zh 切换开关的那次按压在轨道上的纵向位置，从顶部的 -1 到底部的 1。液体涌过时会略微偏向那一侧，因此落在远端偏上或偏下的位置，环形光从落点开始。没有按压位置的切换（来自按键或标签）以 0，即中线为准。
   */
  aim?: number;
}

/**
 * Draws a Switch's thumb as liquid on the effect layer, as the Switch's
 * `effect` prop describes. Attach the returned ref to the Switch's
 * `<input>`: its track gives the liquid its room, its `::before` thumb gives
 * the liquid its size and colour, and the colour of its `::after` gives the
 * fill the track takes on a toggle. While the effect draws the thumb, the
 * `<input>` has the `data-effect-drawn` attribute, so the Switch hides its
 * own thumb then and at no other time. Outside an `EffectLayerProvider`, or
 * where the effect layer is off, the ref does nothing.
 */
export function useLiquid({
  position,
  drag = EFFECT_SETTING_DEFAULTS.liquid.drag,
  pressed = EFFECT_SETTING_DEFAULTS.liquid.pressed,
  aim = EFFECT_SETTING_DEFAULTS.liquid.aim,
}: LiquidOptions) {
  return useEffectRegistration(LIQUID, {
    liquid: { position, drag, pressed, aim },
  });
}
