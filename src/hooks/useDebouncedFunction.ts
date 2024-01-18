import type { DebounceSettings } from "lodash-es/debounce";
import debounce from "lodash-es/debounce";
import useEventCallback from "@mui/utils/useEventCallback";
import { useEffect, useMemo } from "react";

export function useDebouncedFunction<Args extends unknown[], Return>(
  callback: (...args: Args) => Return,
  delay: number,
  options: DebounceSettings
) {
  const stableCallback = useEventCallback(callback);
  const getOptions = useEventCallback(() => options);

  const debouncedFunction = useMemo(
    () => debounce(stableCallback, delay, getOptions()),
    [stableCallback, delay, getOptions]
  );

  useEffect(
    () => () => {
      debouncedFunction.cancel();
    },
    [debouncedFunction]
  );

  return debouncedFunction;
}
