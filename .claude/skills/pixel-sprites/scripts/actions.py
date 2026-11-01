"""Clean one AI action sheet per action into frames that reuse the base sprite's head and face layers.

usage: python actions.py layers_dir actions_dir
needs: numpy pillow scipy scikit-learn opencv-python-headless

layers_dir is the output of layers.py. actions_dir holds one folder per action in ACTIONS, each with the raw
sheet raw.png. Every frame is voted onto its own pixel grid with the locked body palette, the frame's head is
registered onto the base head, and the base head (faceless, from body.png) is pasted back, so the head never
shimmers. The face layer is drawn on top at its anchor. All frames of all actions share one canvas, one ground
line and one horizontal anchor (the head), so switching actions does not jump.

Writes, per action: frame-<i>.png (the body layer on the shared canvas) and raw-<i>.png (the raw crop); and
actions.json with the canvas, each frame's face layer and anchor, and how much of the frame's own head was replaced.
An "idle" action of the base sprite (neutral, blink) is added so that a player can switch to and from it.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from pixelgrid import (cell_samples, cleanup, comb_fit, dp_cuts, edge_profile, key_distance, load_rgb, phase_fit,
                       to_lab, vote, vote_weights)

LAYERS, OUT = Path(sys.argv[1]), Path(sys.argv[2])
# Tuned to the kitten. cells: grid of the sheet; faces: face layer per frame; lift: sprite pixels above the
# ground for frames the model drew standing in place, measured at the head from the action's grounded frames;
# ms: frame durations.
ACTIONS = {
    "walk": dict(cells=(2, 2), faces=["neutral"] * 4, lift=[0, 0, 0, 0], ms=[180] * 4),
    "run": dict(cells=(3, 2), faces=["happy"] * 6, lift=[0, 0, 3, 0, 0, 1], ms=[90] * 6),
    "jump": dict(cells=(3, 2), faces=["neutral", "happy", "happy", "happy", "happy", "blink"],
                 lift=[0, 0, 9, 14, 8, 0], ms=[260, 90, 110, 160, 110, 220]),
    "cute": dict(cells=(3, 2), faces=["wink"] * 6, lift=[0] * 6, ms=[170] * 6),
    "battle-ready": dict(cells=(2, 2), faces=["battle"] * 4, lift=[0] * 4, ms=[200] * 4),
}
CELL = 512  # the cell size asked for in the brief; the model may scale the whole sheet
PIXEL = 6.1  # the base sprite's pixel size in a sheet of 512 px cells
DARK_W, LIGHT_W = 1.6, 2.0
PAD = 10
M = 2
CLEAR_RING = 2  # sprite px around the pasted head where the frame's own head is cleared
NECK_KEEP = 4  # rows above the head's bottom where the frame's body is kept (the chest meets the head there)
REMNANT_REACH = 8  # sprite px around the pasted head where leftovers of the frame's own head are removed
REMNANT_MAX = 40  # leftovers are smaller than this; a paw or the tail is bigger
KEY_LEAN = 40
SCALE_TOLERANCE = 0.04  # head width error above which a sheet is voted again at a scaled period

meta = json.load(open(LAYERS / "meta.json"))
paldef = json.load(open(LAYERS / "palette.json"))
pal = np.array(paldef["body"], np.float32)
pal_lab = to_lab(pal)
OUTLINE = paldef["outline"]
weights = vote_weights(pal_lab, DARK_W, LIGHT_W)
rgba_pal = np.concatenate([np.clip(pal, 0, 255), np.full((len(pal), 1), 255)], 1).astype(np.uint8)
lut = {tuple(c): i for i, c in enumerate(rgba_pal.tolist())}


def load_idx(path):
    a = np.asarray(Image.open(path).convert("RGBA"))
    out = np.full(a.shape[:2], -1, int)
    for y, x in zip(*np.nonzero(a[..., 3] > 0)):
        out[y, x] = lut[tuple(a[y, x].tolist())]
    return out


def save_idx(a, path):
    img = np.zeros(a.shape + (4,), np.uint8)
    img[a >= 0] = rgba_pal[a[a >= 0]]
    Image.fromarray(img).save(path)


# the base head: the head component of body.png above the head box's bottom
body = load_idx(LAYERS / "body.png")
(fax, fay), (fw, fh) = meta["face"]["anchor"], meta["face"]["size"]
hx0, hy0, hx1, hy1 = meta["head_box"]
upper = body >= 0
upper[hy1:] = False
hl, _ = ndi.label(upper)
head = hl == hl[fay + fh // 2, fax + fw // 2]
head[:, :hx0] = head[:, hx1:] = False
HY, HX = np.nonzero(head)
hb = (HY.min(), HY.max() + 1, HX.min(), HX.max() + 1)
head_rows = head[hb[0]:hb[1], hb[2]:hb[3]]
head_lab = pal_lab[np.maximum(body, 0)][hb[0]:hb[1], hb[2]:hb[3]]
print("base head", int(head.sum()), "px, box", hb)


def register(a):
    """Offset (dy, dx) of body coordinates in frame a that best puts the base head on the frame's head."""
    big = np.pad(a, 40, constant_values=-1)
    lab = pal_lab[np.maximum(big, 0)]
    h, w = head_rows.shape
    best = (1e9, 0, 0)
    for y in range(0, big.shape[0] - h):
        for x in range(0, big.shape[1] - w):
            win = big[y:y + h, x:x + w]
            d = np.linalg.norm(lab[y:y + h, x:x + w] - head_lab, axis=2)
            cost = np.where(win < 0, 120.0, d)[head_rows].mean()
            if cost < best[0]:
                best = (cost, y, x)
    cost, y, x = best
    return y - 40 - hb[0], x - 40 - hb[2], cost


def paste_head(a, dy, dx):
    """a with its head replaced by the base head at offset (dy, dx)."""
    a = np.pad(a, 20, constant_values=-1)
    dy, dx = dy + 20, dx + 20
    P = np.zeros_like(a, bool)
    P[HY + dy, HX + dx] = True
    bottom = HY.max() + dy
    ring = ndi.binary_dilation(P, iterations=CLEAR_RING) & ~P
    ring[bottom - NECK_KEEP:] = False
    a[ring] = -1
    # When the frame's own head is bigger or sits a little off, pieces of its outline are left around the base
    # head. Once the ring is cleared they stand apart from the kitten: small blobs near the head go.
    reach = ndi.binary_dilation(P, iterations=REMNANT_REACH)
    lab_, n_ = ndi.label((a >= 0) & ~P, structure=np.ones((3, 3)))
    sizes = ndi.sum(np.ones_like(lab_), lab_, range(1, n_ + 1))
    for k in range(1, n_ + 1):
        if sizes[k - 1] < REMNANT_MAX and (reach & (lab_ == k)).all():
            a[lab_ == k] = -1
    canon = np.full_like(a, -1)
    canon[HY + dy, HX + dx] = body[HY, HX]
    a[P] = canon[P]
    a = cleanup(a, OUTLINE, pal_lab)
    a[P] = canon[P]  # cleanup must not touch the base head
    return a, P


def bbox(a):
    ys, xs = np.nonzero(a >= 0)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1


def head_widths(a, dx):
    """Width of the head's run through the face centre, on rows 8 to 24 under the top of the ears."""
    top = np.nonzero((a >= 0).any(1))[0][0]
    cx = dx + fax + fw // 2
    out = []
    for y in range(top + 8, top + 25):
        row = a[y] >= 0
        if not row[cx]:
            out.append(np.nan)
            continue
        l = cx
        while l > 0 and row[l - 1]:
            l -= 1
        r = cx
        while r < len(row) - 1 and row[r + 1]:
            r += 1
        out.append(r - l + 1)
    return np.array(out, float)


BASE_WIDTHS = head_widths(body, 0)


def cut_frames(im, cfg):
    """Each cell's crop, the frame's key mask, and the crop box, in reading order."""
    H, W, _ = im.shape
    cols, rows = cfg["cells"]
    BG, dist = key_distance(im)
    fg = dist > 80
    cw, ch = W / cols, H / rows
    out = []
    for i in range(cols * rows):
        r, c = divmod(i, cols)
        y0, x0 = int(r * ch), int(c * cw)
        cell = fg[y0:int((r + 1) * ch), x0:int((c + 1) * cw)]
        lab_, n_ = ndi.label(ndi.binary_dilation(cell, iterations=6))
        big = np.argmax(ndi.sum(np.ones_like(lab_), lab_, range(1, n_ + 1))) + 1
        ys, xs = np.nonzero((lab_ == big) & cell)
        by0, by1 = max(0, y0 + ys.min() - PAD), min(H, y0 + ys.max() + 1 + PAD)
        bx0, bx1 = max(0, x0 + xs.min() - PAD), min(W, x0 + xs.max() + 1 + PAD)
        crop = im[by0:by1, bx0:bx1].copy()
        # other blobs of the cell (specks) are keyed out
        keep = np.zeros_like(fg)
        keep[y0:int((r + 1) * ch), x0:int((c + 1) * cw)] = ndi.binary_dilation(lab_ == big, iterations=2)
        crop[~keep[by0:by1, bx0:bx1]] = BG
        # Tuned to the magenta key: the kitten has no colour with both red and blue well above green, so such a
        # pixel is a blend of the key into an edge. Left in, it votes for the nose red or the blush pink.
        crop[np.minimum(crop[..., 0] - crop[..., 1], crop[..., 2] - crop[..., 1]) > KEY_LEAN] = BG
        out.append((crop, keep[by0:by1, bx0:bx1] & fg[by0:by1, bx0:bx1], (by0, by1, bx0, bx1)))
    return BG, out


def vote_frame(crop, BG, px, py):
    cx = dp_cuts(edge_profile(crop, 1), px, phase_fit(edge_profile(crop, 1), px), slack=3)
    cy = dp_cuts(edge_profile(crop, 0), py, phase_fit(edge_profile(crop, 0), py), slack=3)
    voted = np.pad(vote(cell_samples(crop, cx, cy, BG), pal_lab, weights), M, constant_values=-1)
    return cleanup(voted, OUTLINE, pal_lab), (len(cx) - 1, len(cy) - 1)


frames = {}  # action -> list of dict(idx, oy, ox, face, lift, raw, voted)
for name, cfg in ACTIONS.items():
    raw_path = OUT / name / "raw.png"
    im = load_rgb(raw_path)
    rawrgb = np.asarray(Image.open(raw_path).convert("RGB"))
    H, W, _ = im.shape
    scale = W / (cfg["cells"][0] * CELL)
    PX, _ = comb_fit(edge_profile(im, 1), PIXEL * scale * 0.88, PIXEL * scale * 1.12)
    PY, _ = comb_fit(edge_profile(im, 0), PIXEL * scale * 0.88, PIXEL * scale * 1.12)
    BG, cuts = cut_frames(im, cfg)
    # The model may draw the kitten with more or fewer sprite pixels than the base. Then the head, measured
    # across its width, does not match the base head, and the sheet is voted again at a scaled period, so the
    # base head fits the body.
    ratios = []
    for crop, _, _ in cuts:
        voted, _ = vote_frame(crop, BG, PX, PY)
        _, dx, _ = register(voted)
        ratios.append(np.nanmedian(head_widths(voted, dx) / BASE_WIDTHS))
    ratio = float(np.median(ratios))
    if abs(ratio - 1) > SCALE_TOLERANCE:
        PX, PY = PX * ratio, PY * ratio
    print(f"{name}: sheet {W}x{H}, head width / base {ratio:.3f}, period x={PX:.2f} y={PY:.2f}")
    out = []
    for i, (crop, key, (by0, by1, bx0, bx1)) in enumerate(cuts):
        voted, grid = vote_frame(crop, BG, PX, PY)
        dy, dx, cost = register(voted)
        idx, P = paste_head(voted, dy, dx)
        # how much of the frame's own head the base head replaced (high: the model drew a different head)
        own = np.pad(voted, 20, constant_values=-1)[P]
        changed = float((own != idx[P]).mean())
        print(f"  frame {i + 1}: grid {grid[0]}x{grid[1]}, head at {dx},{dy}, cost {cost:.1f}, "
              f"head px changed {changed:.0%}")
        out.append(dict(idx=idx, oy=dy + 20, ox=dx + 20, face=cfg["faces"][i], lift=cfg["lift"][i],
                        raw=rawrgb[by0:by1, bx0:bx1], rawkey=key, voted=voted,
                        period=(PX + PY) / 2, cost=cost, changed=changed))
    frames[name] = out

# idle: the base sprite itself, so the preview can switch from it
frames = {"idle": [dict(idx=body, oy=0, ox=0, face=f, lift=0, raw=None) for f in ("neutral", "blink")], **frames}
ms = {"idle": [2400, 140], **{n: c["ms"] for n, c in ACTIONS.items()}}

# Vertical place of each frame, as the row of its top-left with the ground at row 0: the lowest pixel on the
# ground, except that an airborne frame's head goes lift pixels above where the action's grounded frames hold it.
for fs in frames.values():
    for f in fs:
        f["sy"] = -bbox(f["idx"])[1]
    head_y = np.median([f["sy"] + f["oy"] for f in fs if f["lift"] == 0])
    for f in fs:
        if f["lift"]:
            f["sy"] = min(f["sy"] - 1, int(round(head_y - f["lift"] - f["oy"])))

# one canvas: the base head's left edge at one column, one ground row
top = min(f["sy"] + bbox(f["idx"])[0] for fs in frames.values() for f in fs)
left = min(bbox(f["idx"])[2] - f["ox"] for fs in frames.values() for f in fs)
right = max(bbox(f["idx"])[3] - f["ox"] for fs in frames.values() for f in fs)
CW, CH = right - left + 2 * M, -top + 2 * M
GROUND = CH - M  # first row under the feet
ANCHOR_X = M - left  # canvas column of body x = 0
print("canvas", CW, "x", CH, "ground row", GROUND, "anchor column", ANCHOR_X)

D = 6
spec = dict(canvas=[int(CW), int(CH)], ground=int(GROUND), anchor_x=int(ANCHOR_X), face_scale=3,
            face_size=[fw, fh], layers=str(LAYERS), actions={})
for name, fs in frames.items():
    (OUT / name).mkdir(parents=True, exist_ok=True)
    items = []
    for i, f in enumerate(fs):
        sy = GROUND + f["sy"]
        sx = ANCHOR_X - f["ox"]
        canvas = np.full((CH, CW), -1, int)
        ys, xs = np.nonzero(f["idx"] >= 0)
        canvas[ys + sy, xs + sx] = f["idx"][ys, xs]
        save_idx(canvas, OUT / name / f"frame-{i + 1}.png")
        face_at = [int(fax + f["ox"] + sx), int(fay + f["oy"] + sy)]
        items.append(dict(body=f"{name}/frame-{i + 1}.png", face=f["face"], face_at=face_at, ms=ms[name][i]))
        f["canvas"], f["face_at"] = canvas, face_at
        if f["raw"] is not None:
            rawa = np.dstack([f["raw"], np.where(f["rawkey"], 255, 0).astype(np.uint8)])
            Image.fromarray(rawa).save(OUT / name / f"raw-{i + 1}.png")
            items[-1]["raw"] = f"{name}/raw-{i + 1}.png"
            items[-1]["raw_pixel"] = float(f["period"])
            items[-1]["head_cost"] = round(float(f["cost"]), 1)
            items[-1]["head_changed"] = round(f["changed"], 3)
    spec["actions"][name] = items
json.dump(spec, open(OUT / "actions.json", "w"), indent=1)
print("done", OUT / "actions.json")
