You are being run non-interactively. Keep usage minimal: make exactly ONE built-in image_gen call (no retries, no variants), then copy the generated file to ./base-raw.png in the current directory and print its path. Do not write code or edit anything else.

Use case: game sprite sheet (expression sheet)
Asset type: retro pixel-art expression sheet for a small virtual pet (tamagotchi-like). It is the base sprite: one pose, eight faces.
Input images: Image 1 (style-ref.png): CHARACTER AND CHARM REFERENCE. Draw this exact kitten, translated into pixel art. Keep its cuteness above all.
Subject: the same chibi calico kitten in every cell: cream fur, soft apricot/orange patches (one on the top of the head, one on the back, one on the hip), pale mint tail tip, pink inner ears, very big round dark eyes with a teal iris and a white highlight, tiny pink nose, thin dark whiskers on both cheeks, soft pink blush.
Proportions (key for cuteness): very big round head, about as big as the whole body; short round bean body; short stubby legs; tall pointed triangular ears; eyes big, wide apart and set low on the face.
View: body in side view facing RIGHT, head turned toward the viewer in three-quarter view (as in the reference) so both big eyes are visible in every cell.

Pose (identical in all eight cells): idle, standing on all four legs, tail up behind. The body, legs, tail, head shape, ears, fur patches and outline must be PIXEL-IDENTICAL in every cell, at the same position in the cell. Only the face changes: eyes, eyebrows, mouth, blush. Think of it as one sprite with eight face stickers.

Layout (strict, so code can cut it up):

- One image, 1536x1024 landscape, split into an invisible regular grid of 4 columns x 2 rows; every cell is exactly 384x512.
- One kitten per cell, centred horizontally, the same size in every cell, feet standing on the same ground line about 60 px above the bottom of each cell. Leave empty margin around every kitten; nothing crosses a cell edge.
- Row 1, left to right (faces):
  1 neutral: big round eyes open, teal iris, white highlight, small open smiling "w" mouth;
  2 blink: both eyes closed as soft curved lines, small closed smile, otherwise identical to cell 1;
  3 happy: eyes squeezed into "^ ^" arcs, wide open smiling mouth;
  4 battle-ready: determined, eyes slightly narrowed with a flat top lid and small angled brows, small firm frown.
- Row 2, left to right (faces):
  5 surprised: eyes extra wide and round with small pupils, small round "o" mouth;
  6 sleepy: half-closed droopy eyelids, tiny relaxed mouth;
  7 sad: big teary eyes looking up, tiny wobbly downturned mouth;
  8 cute (playful): one eye winking closed, the other open and sparkly, tongue poking out.

Pixel art rules (strict):

- True low-resolution pixel art: each kitten is drawn on a 48x64 grid of big square pixels, every pixel exactly 8x8 screen pixels, all aligned to one grid across the whole image.
- Limited palette of about 16 colours shared by all cells. Flat colour per pixel: no anti-aliasing, no gradients, no blur, no soft shading, no dithering noise, no glow.
- A clean 1-pixel dark brown outline around the kitten.
- Background: one flat solid pure magenta #FF00FF everywhere, the same in every cell, no ground, no shadow, no vignette, no grid lines, no borders.
  Avoid: text, labels, numbers, frame borders, grid lines, extra characters, props, a ground shadow, a different pose, body or tail between cells.
