You are being run non-interactively. Keep usage minimal: make exactly ONE built-in image_gen call (no retries, no variants), then copy the generated file to ./raw.png in the current directory and print its path. Do not write code or edit anything else.

Use case: game sprite sheet (animation frames)
Asset type: retro pixel-art animation sheet for a small virtual pet (tamagotchi-like): one looping action, cute (a charming beckoning-paw wave, like a lucky cat).
Input images:

- Image 1 (style-ref.png): CHARACTER AND CHARM REFERENCE. The kitten we are drawing. Keep its cuteness above all.
- Image 2 (ref-sprite.png): THE EXACT PIXEL SPRITE of this kitten, shown magnified on magenta. Every frame must be this same pixel character: same pixel size, same pixel count, same palette, same outline, same head.

Subject: the same chibi calico kitten in every frame: cream fur, soft apricot/orange patches (one on the top of the head, one on the back, one on the hip), pale mint tail tip, pink inner ears, very big round dark eyes with a teal iris and a white highlight, tiny pink nose, thin dark whiskers on both cheeks, soft pink blush.
Proportions (key for cuteness): very big round head, about as big as the whole body; short round bean body; short stubby legs; tall pointed triangular ears.
View: the body faces LEFT, exactly as in Image 2: side view, the kitten moves toward the left of the image and its tail is behind it on the right. The head is turned toward the viewer in three-quarter view, exactly as in Image 2.

The head (strict): in every frame the head is the head of Image 2, copied pixel for pixel: same size, same shape, same ears, same fur patches, same neutral face (big open eyes, small open smiling mouth). Keep it UPRIGHT: never tilt, rotate, turn or squash it. The head may move up, down, forward or back by a few pixels with the body; only the body, legs and tail change between frames. Nothing (paw, tail) covers the face.

Layout (strict, so code can cut it up):

- One image, 1536x1024 landscape, split into an invisible regular grid of 3 columns x 2 rows; every cell is exactly 512x512.
- One kitten per cell, frames in reading order (left to right, then the next row). Each kitten is centred horizontally in its cell, at the same size in every cell, and its lowest pixel sits on the same ground line 40 px above the bottom of the cell, in every frame, also the airborne ones: code adds the height of a jump or flight later. Leave empty margin around every kitten; nothing crosses a cell edge.

Action: cute (show off / act cute), 6 frames, a looping beckoning wave like a Japanese lucky cat, with a small happy bounce. The kitten stands on both hind legs and the far front leg, as in Image 2; the near front paw does the waving. Legs: the "near" legs are the two on the viewer's side (drawn in front, fully visible); the "far" legs are the two on the other side (drawn behind, partly hidden, a little darker). Forward means toward the LEFT, where the kitten faces.
The near front paw stays BELOW and BESIDE the face, never in front of it: its highest point is level with the chin, at the left side of the head, where the raised paw is in Image 2. The tail swishes from side to side with a curl at the tip.

- Frame 1: near front paw raised to chest height, paw pad facing the viewer; body at rest; tail curved up to the left.
- Frame 2: near front paw up at chin height, paw bent forward at the wrist (beckoning); body bounced 2 pixels lower, legs slightly bent; tail upright.
- Frame 3: near front paw at chin height, wrist curled down; body back to rest; tail curved up to the right.
- Frame 4: near front paw down to chest height; body 1 pixel higher, legs straight; tail upright.
- Frame 5: near front paw up at chin height, paw bent forward at the wrist; body bounced 2 pixels lower; tail curved up to the left.
- Frame 6: near front paw at chin height, wrist curled down; body back to rest; tail upright with the tip curled.

Pixel art rules (strict):

- The same pixel scale as Image 2: one sprite pixel is about 6x6 screen pixels, all aligned to one grid across the whole image, so the kitten in its idle pose would be about 64 sprite pixels (390 px) wide and 71 sprite pixels (430 px) tall. Do not draw it bigger or smaller in any frame.
- Use only the colours of Image 2. Flat colour per pixel: no anti-aliasing, no gradients, no blur, no soft shading, no dithering noise, no glow.
- A clean 1-pixel dark brown outline around the kitten, as in Image 2.
- Background: one flat solid pure magenta #FF00FF everywhere, the same in every cell, no ground, no shadow, no vignette, no grid lines, no borders, no motion lines, no dust.
  Avoid: text, labels, numbers, frame borders, grid lines, extra characters, props, a ground shadow, speed lines, a tilted or different head, a different-looking kitten between cells.
