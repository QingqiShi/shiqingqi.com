import { ImageResponse } from "next/og";
import { FEATURED_CREATURES } from "#src/components/pixel-creature-creator/featured-creatures.ts";
import { types } from "#src/components/pixel-creature-creator/sprite/sprites/index.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Next.js's opengraph-image convention only allows a single static `alt`
// export per file (not a function of the locale param). The per-locale
// title text is already rendered into the image itself, so the alt
// describes the image generically in English with a Chinese suffix so
// either-language crawlers get something readable.
export const alt =
  "Pixel Creature Creator — build a tiny pixel creature. 像素生物创造器。";

/**
 * Static OG image for the Pixel Creature Creator landing page.
 *
 * Tradeoff: rendering the actual pixel sprites inside `ImageResponse`
 * would require either embedding rasterized PNG data URLs (a build-time
 * step we can't run inside an edge route) or hand-drawing every tile via
 * SVG `<rect>` elements (verbose and brittle to keep in sync with the
 * sprite registry). For Phase 6 we ship a simpler card-grid: each
 * featured creature is represented by a coloured tile using its type's
 * `accentColor`, with the creature's name beneath. The site title plus
 * tagline anchor the composition. This stays self-contained, renders
 * fast on the edge, and still gives social cards a brand-coloured
 * preview.
 */
export default async function OpengraphImage(props: PageProps) {
  const { locale } = await props.params;
  validateLocale(locale);
  const isZh = locale === "zh";
  const title = isZh ? "像素生物创造器" : "Pixel Creature Creator";
  const subtitle = isZh
    ? "搭建一个小像素生物，给它取名，并召唤它的传说。"
    : "Build a tiny pixel creature, name it, and conjure its lore.";

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
          "radial-gradient(ellipse at top right, rgba(168,85,247,0.35), transparent 60%), radial-gradient(ellipse at bottom left, rgba(192,132,252,0.25), transparent 55%)",
        color: "#f5f3ff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "900px",
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
        <span
          style={{
            fontSize: "84px",
            fontWeight: 800,
            lineHeight: 1.05,
            color: "#ffffff",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: "32px",
            fontWeight: 400,
            color: "#d8d4f4",
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        {FEATURED_CREATURES.map((featured) => {
          const accent = types[featured.def.type]?.accentColor ?? "#c084fc";
          return (
            <div
              key={featured.labelKey}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                width: "240px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "180px",
                  height: "180px",
                  borderRadius: "32px",
                  backgroundColor: accent,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                }}
              />
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {featured.def.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>,
    size,
  );
}
