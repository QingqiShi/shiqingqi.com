You are being run non-interactively. Keep usage minimal: make exactly ONE built-in image_gen call (no retries, no variants), then copy the generated file to ./raw.png in the current directory and print its path. Do not write code or edit anything else.

Use case: game sprite sheet (animation frames)
Asset type: retro pixel-art animation sheet for a small virtual pet (tamagotchi-like): one looping action, walk (a slow, bouncy walk in place).
Input images:

- Image 1 (style-ref.png): CHARACTER AND CHARM REFERENCE. The kitten we are drawing. Keep its cuteness above all.
- Image 2 (ref-sprite.png): THE EXACT PIXEL SPRITE of this kitten, shown magnified on magenta. Every frame must be this same pixel character: same pixel size, same pixel count, same palette, same outline, same head.

Subject: the same chibi calico kitten in every frame: cream fur, soft apricot/orange patches (one on the top of the head, one on the back, one on the hip), pale mint tail tip, pink inner ears, very big round dark eyes with a teal iris and a white highlight, tiny pink nose, thin dark whiskers on both cheeks, soft pink blush.
Proportions (key for cuteness): very big round head, about as big as the whole body; short round bean body; short stubby legs; tall pointed triangular ears.
View: the body faces LEFT, exactly as in Image 2: side view, the kitten moves toward the left of the image and its tail is behind it on the right. The head is turned toward the viewer in three-quarter view, exactly as in Image 2.

The head (strict): in every frame the head is the head of Image 2, copied pixel for pixel: same size, same shape, same ears, same fur patches, same neutral face (big open eyes, small open smiling mouth). Keep it UPRIGHT: never tilt, rotate, turn or squash it. The head may move up, down, forward or back by a few pixels with the body; only the body, legs and tail change between frames. Nothing (paw, tail) covers the face.

Layout (strict, so code can cut it up):

- One image, 1024x1024 square, split into an invisible regular grid of 2 columns x 2 rows; every cell is exactly 512x512.
- One kitten per cell, frames in reading order (left to right, then the next row). Each kitten is centred horizontally in its cell, at the same size in every cell, and its lowest pixel sits on the same ground line 40 px above the bottom of the cell, in every frame. Leave empty margin around every kitten; nothing crosses a cell edge.

Action: walk, 4 frames, a looping cat walk in place. Look only at the two NEAR legs (the front leg and the hind leg on the viewer's side, drawn in front and fully visible); draw the two far legs behind them, doing the opposite, as a walking cat would. Forward means toward the LEFT, where the kitten faces.

- Frame 1: near front paw stepped far FORWARD (to the left), on the ground; near hind paw far BACK (to the right), on the ground. Legs spread wide. Body 1 pixel lower.
- Frame 2: near front leg and near hind leg both straight under the body, close together; the near hind paw is lifted and bent, passing forward. Body 1 pixel higher.
- Frame 3: the opposite of frame 1, with front and back swapped: near front paw far BACK (to the right, under the belly), on the ground; near hind paw far FORWARD (to the left, under the belly), on the ground. Body 1 pixel lower.
- Frame 4: near front leg and near hind leg both straight under the body, close together; the near front paw is lifted and bent, passing forward. Body 1 pixel higher.

Frames 1 and 3 must look clearly different: in frame 1 the near legs point away from each other, in frame 3 they point toward each other. The tail is up behind, and its tip sways a little from frame to frame.

Pixel art rules (strict):

- The same pixel scale as Image 2: one sprite pixel is about 6x6 screen pixels, all aligned to one grid across the whole image, so the kitten in its idle pose would be about 64 sprite pixels (390 px) wide and 71 sprite pixels (430 px) tall. Do not draw it bigger or smaller in any frame.
- Use only the colours of Image 2. Flat colour per pixel: no anti-aliasing, no gradients, no blur, no soft shading, no dithering noise, no glow.
- A clean 1-pixel dark brown outline around the kitten, as in Image 2.
- Background: one flat solid pure magenta #FF00FF everywhere, the same in every cell, no ground, no shadow, no vignette, no grid lines, no borders, no motion lines, no dust.
  Avoid: text, labels, numbers, frame borders, grid lines, extra characters, props, a ground shadow, speed lines, a tilted or different head, a different-looking kitten between cells.
