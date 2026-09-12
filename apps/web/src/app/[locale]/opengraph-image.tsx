import { ImageResponse } from "next/og";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// The opengraph-image convention exports a single static `alt` string per
// file (Next.js doesn't pass `params` to it), so the alt text describes the
// image generically in both languages — the rendered card itself adapts to
// the locale via the default export below.
export const alt = "Qingqi Shi — Software Engineer. 石清琪 — 软件工程师。";

/**
 * Site-wide Open Graph / Twitter card.
 *
 * Lives at the `[locale]` segment so every route under it inherits this
 * image automatically — Next.js resolves the closest ancestor's
 * `opengraph-image` convention, which means deeper segments (e.g. the
 * existing `pixel-creature-creator/opengraph-image.tsx`) keep their
 * bespoke override and everywhere else falls back to this branded card.
 *
 * No external assets: rendered inline with `ImageResponse` so it works
 * in the edge runtime without bundling fonts or images.
 */
export default async function OpengraphImage(props: PageProps) {
  const { locale } = await props.params;
  validateLocale(locale);
  const isZh = locale === "zh";
  const name = isZh ? "石清琪" : "Qingqi Shi";
  const role = isZh ? "软件工程师" : "Software Engineer";
  const tagline = isZh
    ? "信奉匠人精神，专注 React、TypeScript 与 Web 开发。"
    : "Embracing the craftsman's spirit — React, TypeScript, and the web.";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        backgroundColor: "#0f0a1a",
        backgroundImage:
          "radial-gradient(ellipse at top right, rgba(168,85,247,0.35), transparent 60%), radial-gradient(ellipse at bottom left, rgba(126,16,194,0.3), transparent 55%)",
        color: "#f5f3ff",
        fontFamily: "sans-serif",
      }}
    >
      <span
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: "#c084fc",
          textTransform: "uppercase",
          letterSpacing: "4px",
        }}
      >
        qingqi.dev
      </span>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "1000px",
        }}
      >
        <span
          style={{
            fontSize: "120px",
            fontWeight: 800,
            lineHeight: 1.0,
            color: "#ffffff",
            letterSpacing: "-2px",
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: "48px",
            fontWeight: 600,
            color: "#c084fc",
            lineHeight: 1.1,
          }}
        >
          {role}
        </span>
        <span
          style={{
            fontSize: "32px",
            fontWeight: 400,
            color: "#d8d4f4",
            lineHeight: 1.3,
            marginTop: "12px",
          }}
        >
          {tagline}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          height: "8px",
          width: "100%",
          backgroundImage:
            "linear-gradient(90deg, #7e10c2 0%, #c084fc 50%, #38bdf8 100%)",
          borderRadius: "4px",
        }}
      />
    </div>,
    size,
  );
}
