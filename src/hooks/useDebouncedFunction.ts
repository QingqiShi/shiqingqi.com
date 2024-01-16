import debounce, { DebounceSettings } from "lodash-es/debounce";
import useEventCallback from "@mui/utils/useEventCallback";
import { useEffect, useMemo } from "react";

export function useDebouncedFunction<T extends (...args: any) => any>(
  callback: T,
  delay: number,
  options: DebounceSettings
) {
  const stableCallback = useEventCallback(callback);
  const getOptions = useEventCallback(() => options);

  const debouncedFunction = useMemo(
    () => debounce(stableCallback, delay, getOptions()),
    [stableCallback, delay, getOptions]
  );
  useEffect(() => {
    return () => {
      debouncedFunction.cancel();
    };
  }, [debouncedFunction]);

  return debouncedFunction;
}
