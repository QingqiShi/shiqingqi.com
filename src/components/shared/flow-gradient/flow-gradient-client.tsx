"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "@/hooks/use-theme";
import { init, start } from "./loop";

interface FlowGradientClientProps {
  vs: string;
  fs: string;
}

export function FlowGradientClient({ vs, fs }: FlowGradientClientProps) {
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
                    colorTop: [0.3, 0.3, 0.5],
                    colorBottom: [0.3, 0.3, 1],
                    colorAltTop: [1, 0.3, 0.3],
                    colorAltBottom: [1, 0.3, 0.3],
                  },
            );
          }
        }
      }}
      className="w-full h-full surface-main will-change-transform z-base"
    />
  );
}
