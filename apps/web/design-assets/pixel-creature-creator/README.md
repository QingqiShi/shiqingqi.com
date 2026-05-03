# Pixel Creature Creator — design assets

Working source files (sprite sheets, design references) for the Pixel Creature
Creator feature. **Nothing here is bundled by Next.js or imported by the app.**
The shipped sprite PNGs live under `apps/web/src/components/pixel-creature-creator/`
and are committed alongside their imports.

## Layout

```
species/
  sheet-color.png         Master 4×4 sprite sheet (1254×1254). Each ~313 px
                          cell is one of the 16 species in idle pose.
  sheet-silhouettes.png   Silhouette pass of the same 4×4 grid; reference
                          for shape proofreading.
variants/
  example-{1,2,3}.png     Concept references for the variants follow-up PR
                          (per-species emotion / accessory / palette
                          variants). Not yet wired into extraction.
```

## Extraction → shipped sprites

`species/sheet-color.png` is the source of truth for the 16 PNGs in
`apps/web/src/components/pixel-creature-creator/sprite/species/*.png`
(42×42 each, transparent background). Extraction is currently manual — slice
each cell, downsample, and clean up cream sheet-background pixels at the
silhouette boundary.

If you re-extract or re-clean, replace the 16 sprite PNGs in-place; the
species registry (`species/index.ts`) imports them by filename.

## Why these aren't under `src/`

- Next.js / tsc / eslint don't scan outside `src/`, so design sources don't
  slow the toolchain or risk accidental bundling.
- Mirrors the `public/` (runtime static) ↔ `design-assets/` (design-time
  source) split.
- Artists can drop new sheets here without navigating the React component
  tree.
