---
name: pixel-sprites
description: How to make cute pixel-art creature sprites for qingqi.dev in three gated stages. An image model draws an HD concept, then one expression sheet that the scripts split into a faceless body, a locked palette and high-density face layers, then one sheet per action that the scripts snap to that body. Use when you make or change a creature, a species, a pet sprite, a face or an animation; when you generate a sprite sheet with Codex or another image model; or when you need to clean AI pixel art that does not sit on a pixel grid.
---

# Pixel sprites

The goal is a tamagotchi-like chibi creature that is as cute as `references/kitten/concept.png`. The image model draws the character. Code only cleans it, locks it and plays the frames.

## Why this approach

Each of these approaches was tried and dropped. Do not try them again without a new idea:

- **Code draws the art** (procedural blobs, hand-written SVG, a bezier ink engine, raymarched 3D SDF bodies). The results were never cute enough. The 3D chibi with anime eyes on a solid head looked creepy.
- **HD image-model art cut into parts and rigged.** The rest pose was good, but separately drawn parts did not line up, and the walk looked bad.
- **One sheet with all poses, cleaned at the sprite grid.** Details that the model draws smaller than its own pixel, such as round eyes and whiskers, became flat. The model drew the head a little differently in each frame, so about 40% of the head pixels changed between walk frames and the head shimmered.

The current approach keeps one body and one head for all frames, and puts the face on a separate layer at 3× the body grid. Pixel art hides small differences between frames, and a palette swap gives a new coat without a new generation.

## Gates

Each stage ends with the user's approval of its result. Do not start the next stage before that.

Image generation is expensive. Make one generation per sheet. If a result is off-brief, a tool fails, or you think a second generation is necessary, stop and report to the user before you do anything else. A sub-agent never works around such a problem, for example by changing the model or the command.

## Setup

```bash
cd .claude/skills/pixel-sprites
python3 -m venv "$WORK/venv" && "$WORK/venv/bin/pip" install -r scripts/requirements.txt
```

`$WORK` is an empty work folder outside the repo. Run every command below from the skill folder with that venv's `python`. Generated output stays in `$WORK`; do not commit it.

Generation uses Codex image generation. Use a recent Codex CLI: 0.144.5 failed with "model not supported", and 0.166.0 works with the default model of the config. Do not give `-m`.

## Stage 0: HD concept

Make one generation of the creature as a high-definition chibi illustration: very big round head, about as big as the body, a short round body, stubby legs and big eyes set low and wide apart. The user approves it. It is the character and charm reference for all later stages. For the kitten it is `references/kitten/concept.png`. Copy the approved concept to `$WORK/style-ref.png`.

## Stage 1: base sheet and layers

One generation: the same idle pose in every cell of a 4×2 grid, and only the face changes. Start from `references/kitten/base-brief.md`, change the subject and the faces, save it as `$WORK/brief.md`, then:

```bash
codex exec --skip-git-repo-check -s workspace-write -C "$WORK" -i "$WORK/style-ref.png" -o "$WORK/codex-last.txt" - < "$WORK/brief.md"
python scripts/layers.py "$WORK/base-raw.png" "$WORK/layers"
python scripts/layers_preview.py "$WORK/layers" "$WORK"
```

These parts of the brief make the cleanup possible. Keep them:

- A fixed grid of cells, one creature per cell, the same size, on one ground line.
- A flat key background (`#FF00FF`) in a colour the creature does not use.
- A 1px dark outline, a limited palette, and no anti-aliasing, gradients or dithering.

`layers.py` gives:

- `body.png`: the faceless body at the sprite grid (the face area is filled with the fur under it).
- `palette.json`: the locked body palette, the fur colours, the outline colour, and the face palette.
- `face-<name>-x3.png` (and `x2`): one face layer per cell, at 3× the body grid. Each layer is cut from the same raw along the base cell's grid, so it aligns with the body without an offset. The user chose 3× over 2×: at 3× the eyes stay round and the whiskers show.
- `meta.json`: the face anchor and size, the head box, and the measured pixel size.
- `dbg-face-mask.png`: the face cells (red), the face layer's area (blue) and the head box (green). Look at it before you trust a result.

`layers_preview.py` writes `compare.png` (each face: raw, voted at the sprite grid, body plus face layer at each scale), `preview.html`, and `ref-sprite.png`, the base sprite with the neutral face at 12 screen pixels per sprite pixel on the key. The user approves the preview.

## Stage 2: one generation per action

One generation per action, in its own folder `$WORK/actions/<action>/`. The kitten has walk (4 frames), run (6), jump (6), cute (6) and battle-ready (4). Start from `references/kitten/actions/<action>/brief.md`. In every brief, update the sprite size line from `meta.json` (`frame_w`, `frame_h`, `pixel`). Copy `ref-sprite.png` to `$WORK/actions/ref-sprite.png`, then for each action:

```bash
A="$WORK/actions/walk"
codex exec --skip-git-repo-check -s workspace-write -C "$A" -i "$WORK/style-ref.png" -i "$WORK/actions/ref-sprite.png" -o "$A/codex-last.txt" - < "$A/brief.md"
```

When all sheets are in, set the actions in `ACTIONS` in `scripts/actions.py` and run:

```bash
python scripts/actions.py "$WORK/layers" "$WORK/actions"
python scripts/actions_preview.py "$WORK/actions"
```

`actions.py`, for each frame:

1. Maps the frame to the locked palette on its own pixel grid. If the head is more than 4% wider or narrower than the base head, it votes the sheet again at a scaled pixel size.
2. Registers the frame's head on the base head and pastes the faceless base head back. This stops the head shimmer.
3. Adds the action's face layer at the face anchor.
4. Puts every frame of every action on one canvas, with one ground row and one horizontal anchor (the head), so a change of action does not jump.
5. Adds the height of jump and flight frames in code (`lift`). The model draws every frame on the ground.

It writes `frame-<i>.png` and `raw-<i>.png` per action, and `actions.json` with the canvas, each frame's face and face position, its duration, and `head_changed`, the part of the frame's own head that the base head replaced. A high value means that the model drew a different head. `actions_preview.py` writes `strip.png` and `compare.png` per action, `overview.png` and `preview.html`. The user approves the preview.

## What the model does

- It does not obey the stated pixel size. It drew the kitten's pixels at 6 to 8 screen pixels instead of 8, and the grid phase drifts by up to ±3 screen pixels. The scripts measure the pixel size from the image.
- It drew the base body facing LEFT although the brief said right. Every action brief says "the body faces LEFT, exactly as in Image 2". The app mirrors the sprite to walk right.
- A 6-frame walk with all four legs described came back as 3 poses drawn two times. The 4-frame brief that describes only the two near legs worked. Even so, its frame 3 is a middle stance, not an exact swap of frame 1.
- In the cute sheet it drew the head about 7% bigger and put the paw over the cheek, although the brief asked for the paw below and beside the face. Ask for limbs to stay well clear of the head: the pasted base head covers what overlaps it.
- It may return a transparent background or a 1254×1254 image instead of the requested size. The scripts accept both.
- Details smaller than its own pixel become simpler at the sprite grid. Fix a few pixels by hand, once, rather than generating again.

`proper-pixel-art` picked the wrong scale on some frames and shifted colours. `unfake` left a fringe of key colour. The voting in `pixelgrid.py` gave the cleanest result.

## Values tuned to the kitten

Check these for a new creature:

- `pixelgrid.py`: the period search range in `comb_fit` (5.8 to 7.0 screen pixels, which `layers.py` uses); `is_bg_blend` expects the magenta key.
- `layers.py`: `NAMES` (the faces in cell order) and `BASE`; `SCALES`; the top 60% of a cell as the head template for registration; `FACE_REACH_X`, `FACE_REACH_UP`, `FACE_REACH_DOWN` (3, 1, 3); the fur test (Lab lightness above 65, hue 62° to 100°, chroma above 6); `CHANGE_DE` (35); `SAME_AS_BODY_DE` (24); 14 face palette clusters.
- `layers_preview.py`: `REF_ZOOM` (12) and `REF_MARGIN` (4) of `ref-sprite.png`; the page title.
- `actions.py`: `ACTIONS` (grid, faces, `lift`, durations per frame); `CELL` (512) and `PIXEL` (6.1); the head width rows (8 to 24 under the top of the ears); `KEY_LEAN` (40, for the magenta key); `CLEAR_RING`, `NECK_KEEP`, `REMNANT_REACH`, `REMNANT_MAX`; `SCALE_TOLERANCE` (0.04); `face_scale` 3; the idle durations (2400 and 140 ms).
- `actions_preview.py`: the page title.

## Kitten references

`references/kitten/` holds every input of the calico kitten, so the pipeline runs again without a generation: `concept.png`, `base-brief.md`, `base-raw.png`, `ref-sprite.png`, and `actions/<action>/brief.md` and `raw.png`. To run it again, copy `references/kitten/actions` to `$WORK/actions` (`actions.py` writes into that folder), then run the Stage 1 and Stage 2 scripts on `references/kitten/base-raw.png`. The result is a 64×71 base sprite with 32 body colours and 23 face colours, and an 83×74 canvas for all actions. `result-faces.png` (Stage 1 `compare.png`) and `result-actions.png` (Stage 2 `overview.png`) show the approved result at half size.
