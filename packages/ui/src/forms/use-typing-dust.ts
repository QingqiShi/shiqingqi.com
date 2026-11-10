import { useState } from "react";
import { useDust } from "../effect-layer/use-dust.ts";

/**
 * Particles that each input sheds along every 100 px of the frame. A field
 * of one line sheds about two a key.
 */
const DUST_PER_INPUT = 0.2;

/**
 * Dust that floats off the frame of a field each time the visitor types, so
 * faster typing sheds more: put `ref` on the field's dust frame and call
 * `shed` on each input. Under reduced motion the frame sheds nothing.
 *
 * @internal
 */
export function useTypingDust() {
  const [inputs, setInputs] = useState(0);
  const ref = useDust({
    density: 0,
    burst: DUST_PER_INPUT,
    shakes: inputs,
    drift: true,
  });
  const shed = () => {
    setInputs((count) => count + 1);
  };
  return { ref, shed };
}
