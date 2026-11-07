You are being run non-interactively. Keep usage minimal: make exactly ONE built-in image_gen call (no retries, no variants), then copy the generated file to ./raw.png in the current directory and print its path. Do not write code or edit anything else.

Use case: game sprite sheet (animation frames)
Asset type: retro pixel-art animation sheet for a small virtual pet (tamagotchi-like): one looping action, jump (a happy hop straight up, in place).
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

Action: jump, 6 frames, a looping hop. Draw every frame standing in place on the ground line (code lifts the airborne frames), so only the shape of the body, legs and tail tells the phase. Legs: the "near" legs are the two on the viewer's side (drawn in front, fully visible); the "far" legs are the two on the other side (drawn behind, partly hidden, a little darker). Forward means toward the LEFT, where the kitten faces.

- Frame 1 (crouch): body squashed low and wide, all four legs bent deeply, paws on the ground, tail low behind.
- Frame 2 (take-off): hind legs pushing straight and long, hind paws still on the ground, front legs lifting and reaching up and forward, body stretched taller; tail swinging up.
- Frame 3 (rise): body stretched tall, front paws raised up in front of the chest, hind legs hanging straight down behind, tail up.
- Frame 4 (apex): body round and compact, all four paws tucked under the belly, tail curled up behind.
- Frame 5 (fall): front legs reaching straight down toward the ground, hind legs tucked, tail up high.
- Frame 6 (land): front paws and then hind paws on the ground, legs bent to absorb the landing, body a little squashed, tail up.

Pixel art rules (strict):

- The same pixel scale as Image 2: one sprite pixel is about 6x6 screen pixels, all aligned to one grid across the whole image, so the kitten in its idle pose would be about 64 sprite pixels (390 px) wide and 71 sprite pixels (430 px) tall. Do not draw it bigger or smaller in any frame.
- Use only the colours of Image 2. Flat colour per pixel: no anti-aliasing, no gradients, no blur, no soft shading, no dithering noise, no glow.
- A clean 1-pixel dark brown outline around the kitten, as in Image 2.
- Background: one flat solid pure magenta #FF00FF everywhere, the same in every cell, no ground, no shadow, no vignette, no grid lines, no borders, no motion lines, no dust.
  Avoid: text, labels, numbers, frame borders, grid lines, extra characters, props, a ground shadow, speed lines, a tilted or different head, a different-looking kitten between cells.
