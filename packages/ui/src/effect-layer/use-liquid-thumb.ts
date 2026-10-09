import { useCallback, useMemo, useState } from "react";
import { mergeRefs } from "../merge-refs.ts";
import { roleBits } from "./effect-roles.ts";
import {
  isLiquidThumbDrawn,
  LIQUID_THUMB_DRAWN_EVENT,
} from "./mark-liquid-thumb-drawn.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const LIQUID_THUMB = roleBits(["liquidThumb"]);

export interface LiquidThumbOptions {
  /**
   * Where the thumb rests, as a share of the track's travel: 0 at the off
   * end, 1 at the on end, 0.5 in the middle for indeterminate.
   *
   * @zh 滑块的静止位置，以轨道行程的比例表示：0 在关闭端，1 在开启端，0.5 在中间表示未定。
   */
  position: number;
  /**
   * Where a drag holds the thumb, as a share of the travel, or `null` while
   * no drag is on. The drop stretches towards the pointer, and a fast
   * release throws a droplet off its back.
   *
   * @default null
   * @zh 拖动时滑块所在的位置，以行程的比例表示；未拖动时为 `null`。液滴会朝指针方向拉伸，快速松开时会从尾部甩出一颗小液滴。
   */
  drag?: number | null;
}

/**
 * Draws a Switch's thumb as a drop of liquid on the effect layer: attach the
 * returned `ref` to the Switch's `<input>`, whose track gives the drop its
 * travel and whose `::before` thumb gives it its size and colour. The drop
 * springs across on a toggle and wobbles to rest, stretches after a dragging
 * pointer, flattens under a press, and lifts with a shadow under a pointer
 * that can hover. Under reduced motion it goes straight to its place.
 * `drawn` is `true` only while the effect draws the thumb, so the Switch
 * hides its own thumb then and at no other time. Outside an
 * `EffectLayerProvider`, or where the effect layer is off, the ref does
 * nothing and `drawn` stays `false`.
 */
export function useLiquidThumb({ position, drag = null }: LiquidThumbOptions) {
  const register = useEffectRegistration(LIQUID_THUMB, {
    liquidThumb: { position, drag },
  });
  const [drawn, setDrawn] = useState(false);
  const listen = useCallback((element: Element | null) => {
    if (element === null) {
      return undefined;
    }
    const onDrawn = (event: Event) => {
      setDrawn(isLiquidThumbDrawn(event));
    };
    element.addEventListener(LIQUID_THUMB_DRAWN_EVENT, onDrawn);
    return () => {
      element.removeEventListener(LIQUID_THUMB_DRAWN_EVENT, onDrawn);
      setDrawn(false);
    };
  }, []);
  const ref = useMemo(() => mergeRefs(register, listen), [register, listen]);
  return { ref, drawn };
}
