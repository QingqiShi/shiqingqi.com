"use client";

import { useEffect, useState } from "react";
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
  const [ref, setRef] = useState<HTMLCanvasElement | null>(null);

  const [theme] = useTheme();
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const isDark = theme === "system" ? preferDark : theme === "dark";

  useEffect(() => {
    if (ref) {
      const context = init(ref, vs, fs);
      if (context) {
        return start(
          context,
          isDark
            ? { colorBackground: [0.161, 0.161, 0.161] }
            : { colorBackground: [0.953, 0.929, 0.929] }
        );
      }
    }
  }, [fs, ref, isDark, vs]);

  return <canvas ref={setRef} {...stylex.props(styles.canvas)} />;
}

const styles = stylex.create({
  canvas: {
    width: "100%",
    height: "100%",
    backgroundColor: tokens.backgroundMain,
  },
});
