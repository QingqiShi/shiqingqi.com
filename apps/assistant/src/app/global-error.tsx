"use client";

import { gray } from "@tuja/ui/palette/gray.stylex";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { CANVAS_COLORS } from "#src/theme/canvas-colors.ts";

const copy = {
  en: {
    heading: "Something went wrong",
    text: "The assistant could not load. Try again.",
    retry: "Try again",
  },
  zh: {
    heading: "出了点问题",
    text: "邮件助手无法加载，请重试。",
    retry: "重试",
  },
};

/**
 * Catches an error in the `[locale]` layout itself. It replaces that layout,
 * so the StyleX stylesheet and the theme may be missing: the styles are
 * inline, and they take the colours from the palette.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const locale = useParams().locale === "zh" ? "zh" : "en";
  const strings = copy[locale];

  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang={locale}>
      <body
        style={{
          colorScheme: "light dark",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          minHeight: "100dvh",
          margin: 0,
          padding: "1rem",
          textAlign: "center",
          fontFamily:
            "Haffer, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          backgroundColor: `light-dark(${CANVAS_COLORS.light}, ${CANVAS_COLORS.dark})`,
          color: `light-dark(${gray._13}, ${gray._92})`,
        }}
      >
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>{strings.heading}</h1>
        <p
          style={{
            margin: 0,
            color: `light-dark(${gray._30}, ${gray._80})`,
          }}
        >
          {strings.text}
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "none",
            borderRadius: "1e5px",
            backgroundColor: `light-dark(${gray._13}, ${gray._92})`,
            color: `light-dark(${gray._100}, ${gray._0})`,
            cursor: "pointer",
          }}
        >
          {strings.retry}
        </button>
      </body>
    </html>
  );
}
