"use client";

import * as stylex from "@stylexjs/stylex";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useTheme } from "#src/hooks/use-theme.ts";
import { color, layer } from "#src/tokens.stylex.ts";
import { init, start } from "./loop";
import fs from "./shaders/fs.glsl";
import vs from "./shaders/vs.glsl";

export function FlowGradient() {
  const [theme] = useTheme();
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const isDark = theme === "system" ? preferDark : theme === "dark";

  return (
    <canvas
      ref={(el) => {
        if (el) {
          const context = init(el, vs, fs);
          if (context) {
            return start(
              context,
              isDark
                ? { colorBackground: [0, 0, 0] }
                : {
                    colorBackground: [1, 1, 1],
                    colorTop: [0.6, 0.5, 0.7],
                    colorBottom: [0.4, 0.4, 1],
                    colorAltTop: [1, 0.3, 0.3],
                    colorAltBottom: [1, 0.3, 0.3],
                  },
            );
          }
        }
      }}
      css={styles.canvas}
    />
  );
}

const styles = stylex.create({
  canvas: {
    width: "100%",
    height: "100%",
    backgroundColor: color.backgroundMain,
    willChange: "transform",
    zIndex: layer.base,
  },
});
