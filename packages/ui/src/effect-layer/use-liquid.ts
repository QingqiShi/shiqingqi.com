import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const LIQUID = roleBits(["liquid"]);

export interface LiquidOptions {
  /**
   * Where the thumb rests, as a share of the track's travel: 0 at the off
   * end, 1 at the on end, 0.5 in the middle for indeterminate. For an
   * indicator, the index of the selected segment. A new one pours the
   * liquid there, where it flows on for about 0.8 s and then sets.
   *
   * @zh 滑块的静止位置，以轨道行程的比例表示：0 在关闭端，1 在开启端，0.5 在中间表示未定。对指示块而言，它是已选分段的序号：序号一变，液体就涌向新的分段，到位后继续流动约 0.8 秒，然后凝固。
   */
  position: number;
  /**
   * Where a drag holds the thumb, as a share of the travel, or `null` while
   * no drag is on. For an indicator, a segment index that can be
   * fractional: between two segments, the liquid is between their pills in
   * place and in length. The liquid follows the pointer with its own
   * inertia.
   *
   * @default null
   * @zh 拖动时滑块所在的位置，以行程的比例表示；未拖动时为 `null`。对指示块而言，它是可以带小数的分段序号：处于两个分段之间时，液体的位置和长度也介于两者之间。液体带着惯性跟随指针。
   */
  drag?: number | null;
  /**
   * A pointer is down on the control. The liquid melts while it is
   * pressed, and sets again once it is released and still.
   *
   * @default false
   * @zh 指针正按在控件上。按住时液体融化，松开并静止后重新凝固。
   */
  pressed?: boolean;
}

/**
 * Draws a Switch's thumb or a segmented control's indicator as liquid on
 * the effect layer while it moves, as the `effect` prop of the Switch, the
 * SegmentedControl and the TabBar describes. For a thumb, attach the
 * returned ref to the Switch's `<input>`: its track gives the liquid its
 * room, its `::before` thumb gives the liquid its size and colour, and the
 * colour of its `::after` gives the fill the track takes on a toggle. For an
 * indicator, attach it to the track: each segment marked with
 * `data-liquid-segment` gives the liquid a pill to rest in, and the element
 * marked with `data-liquid-indicator` gives its colour, its corners and its
 * edge.
 * While the effect draws, the element has the `data-effect-drawn`
 * attribute, so the control hides its own thumb or indicator then and at
 * no other time. Outside an `EffectLayerProvider`, or where the effect
 * layer is off, the ref does nothing.
 */
export function useLiquid({
  position,
  drag = EFFECT_SETTING_DEFAULTS.liquid.drag,
  pressed = EFFECT_SETTING_DEFAULTS.liquid.pressed,
}: LiquidOptions) {
  return useEffectRegistration(LIQUID, {
    liquid: { position, drag, pressed },
  });
}
