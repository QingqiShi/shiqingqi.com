"use client";

import { useCallback, useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { ErrorBoundary } from "react-error-boundary";
import { tokens } from "../../tokens.stylex";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useTheme } from "../../hooks/use-theme";
import { init, start } from "./loop";

interface FlowGradientClientProps {
  vs: string;
  fs: string;
}

export function FlowGradientClient({ vs, fs }: FlowGradientClientProps) {
  return (
    <ErrorBoundary fallbackRender={() => null}>
      <Internal vs={vs} fs={fs} />
    </ErrorBoundary>
  );
}

function Internal({ vs, fs }: FlowGradientClientProps) {
  const [theme] = useTheme();
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const isDark = theme === "system" ? preferDark : theme === "dark";

  const [context, setContext] = useState<ReturnType<typeof init>>(undefined);

  useEffect(() => {
    if (context) {
      return start(
        context,
        isDark ? { colorBackground: [0, 0, 0] } : { colorBackground: [1, 1, 1] }
      );
    }
  }, [vs, fs, isDark, context]);

  return (
    <canvas
      ref={useCallback(
        (el: HTMLCanvasElement) => {
          if (el) {
            setContext(init(el, vs, fs));
          }
        },
        [fs, vs]
      )}
      {...stylex.props(styles.canvas)}
    />
  );
}

const styles = stylex.create({
  canvas: {
    width: "100%",
    height: "100%",
    backgroundColor: tokens.backgroundMain,
  },
});
