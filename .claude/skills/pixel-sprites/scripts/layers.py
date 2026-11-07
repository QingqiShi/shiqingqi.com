"""Split an AI 'pixel art' expression sheet into one pixel body and higher-density face layers.

usage: python layers.py raw.png outdir
needs: numpy pillow scipy scikit-learn opencv-python-headless

The sheet shows one pose in every cell, and only the face changes. The base cell becomes body.png at
the sprite grid, with the face painted over in fur. Every cell gives one face layer per scale in
SCALES: it is cut from the raw along the base cell's grid, split SCALE times per sprite pixel, so it
sits on the body without an offset.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from sklearn.cluster import KMeans

from pixelgrid import (cell_samples, cleanup, comb_fit, dp_cuts, edge_profile, frame_boxes, key_distance, load_rgb,
                       merge_palette, nearest, phase_fit, sheet_palette, to_lab, vote, vote_weights)

RAW = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
NAMES = ["neutral", "blink", "happy", "battle", "surprised", "sleepy", "sad", "wink"]
BASE = 0
SCALES = (2, 3)
DARK_W, LIGHT_W = 1.6, 2.0
FACE_DARK_W, FACE_LIGHT_W = 1.3, 1.5
PAD = 10
M = 2
# Tuned to the kitten: how far around the changing cells (eyes, brows, mouth) the face reaches.
FACE_REACH_X, FACE_REACH_UP, FACE_REACH_DOWN = 3, 1, 3
SEARCH = 12
SAME_AS_BODY_DE = 24  # a fur-coloured face pixel nearer than this (Lab) to the body pixel under it is left out
CHANGE_DE = 35  # mean Lab distance (0-255 scale) at which a cell counts as changed between two faces

im = load_rgb(RAW)
H, W, _ = im.shape
BG, dist = key_distance(im)
fg = dist > 80
boxes = frame_boxes(fg, len(NAMES))
PX, _ = comb_fit(edge_profile(im, 1))
PY, _ = comb_fit(edge_profile(im, 0))
print(f"sheet period x={PX:.3f} y={PY:.3f}")

# 1. one window per cell, registered onto the base cell's head so every cell shares the base grid
E = PAD + SEARCH + 4
imp = np.empty((H + 2 * E, W + 2 * E, 3), np.float32); imp[:] = BG
imp[E:E + H, E:E + W] = im
fgp = np.zeros(imp.shape[:2], np.float32); fgp[E:E + H, E:E + W] = fg
by0, by1, bx0, bx1 = boxes[BASE]
wy0, wy1, wx0, wx1 = by0 - PAD + E, by1 + PAD + E, bx0 - PAD + E, bx1 + PAD + E
head_rows = int((by1 - by0) * 0.6) + PAD
templ = fgp[wy0:wy0 + head_rows, wx0:wx1]
offsets = []
for i, (y0, y1, x0, x1) in enumerate(boxes):
    gy, gx = wy0 + (y0 - by0), wx0 + (x0 - bx0)
    area = fgp[gy - SEARCH:gy + head_rows + SEARCH, gx - SEARCH:gx + (wx1 - wx0) + SEARCH]
    res = cv2.matchTemplate(area, templ, cv2.TM_SQDIFF)
    _, _, (mx, my), _ = cv2.minMaxLoc(res)
    offsets.append((gy - SEARCH + my - wy0, gx - SEARCH + mx - wx0))
windows = [imp[wy0 + oy:wy1 + oy, wx0 + ox:wx1 + ox] for oy, ox in offsets]
print("cell offsets from the base cell (raw px)", offsets)

base = windows[BASE]
cx = dp_cuts(edge_profile(base, 1), PX, phase_fit(edge_profile(base, 1), PX), slack=3)
cy = dp_cuts(edge_profile(base, 0), PY, phase_fit(edge_profile(base, 0), PY), slack=3)
print(f"base grid {len(cx) - 1}x{len(cy) - 1} cells")

# 2. one palette for the whole sheet and the vote of every cell at the sprite grid
cells = [cell_samples(w, cx, cy, BG) for w in windows]
pal = sheet_palette(cells, BG)
pal_lab = to_lab(pal)
weights = vote_weights(pal_lab, DARK_W, LIGHT_W)
logical = [np.pad(vote(c, pal_lab, weights), M, constant_values=-1) for c in cells]
edge_cols = []
for a in logical:
    opaque = a >= 0
    edge_cols.extend(a[opaque & ~ndi.binary_erosion(opaque, border_value=0)].tolist())
OUTLINE = int(np.bincount(edge_cols).argmax())
at_grid = [cleanup(a, OUTLINE, pal_lab) for a in logical]
GH, GW = logical[BASE].shape


def raw_edge(cuts, k, p):
    """Raw position of grid line k of the padded grid (k counts from the padded origin)."""
    k -= M
    if k < 0:
        return cuts[0] + k * p
    if k >= len(cuts):
        return cuts[-1] + (k - len(cuts) + 1) * p
    return cuts[k]


XE = [raw_edge(cx, k, PX) for k in range(GW + 1)]
YE = [raw_edge(cy, k, PY) for k in range(GH + 1)]

# 3. the face: cells that change between cells of the sheet, grown to the non-fur cells around them
S = at_grid[BASE] >= 0
inner = ndi.binary_erosion(S, border_value=0)
# Compare mean raw colours, not the votes: a vote flips on texture noise between two near colours.
cell_lab = np.array([np.pad([[to_lab(px).mean(0) for px, _ in row] for row in c], ((M, M), (M, M), (0, 0)))
                     for c in cells])
changes = (np.linalg.norm(cell_lab - cell_lab[BASE], axis=3) > CHANGE_DE).any(0) & inner
lab_, n_ = ndi.label(changes, structure=np.ones((3, 3)))
sizes = ndi.sum(np.ones_like(lab_), lab_, range(1, n_ + 1))
changes = np.isin(lab_, [k + 1 for k in range(n_) if sizes[k] >= 4])
ys, xs = np.nonzero(changes)
cy0, cy1, cx0, cx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
print("changing cells span rows", cy0, cy1, "cols", cx0, cx1)

# Tuned to the kitten: fur is light cream to orange (Lab hue 62-100 degrees). Blush, nose and inner ears are
# pinker, the eyes are dark, teal or white, and brow marks are mid brown.
hue = np.degrees(np.arctan2(pal_lab[:, 2] - 128, pal_lab[:, 1] - 128))
chroma = np.hypot(pal_lab[:, 1] - 128, pal_lab[:, 2] - 128)
fur = (pal_lab[:, 0] > 65 * 255 / 100) & (hue > 62) & (hue < 100) & (chroma > 6)
print("fur colours", pal[fur].astype(int).tolist())

reach = np.zeros_like(S)
reach[max(0, cy0 - FACE_REACH_UP):cy1 + FACE_REACH_DOWN, max(0, cx0 - FACE_REACH_X):cx1 + FACE_REACH_X] = True
nonfur = np.zeros_like(S)
for a in logical:
    nonfur |= (a >= 0) & ~fur[np.maximum(a, 0)]
# Lines that join the outline (the chin, the edge of an ear) belong to the body, not the face.
lab_, n_ = ndi.label(nonfur & reach & inner, structure=np.ones((3, 3)))
outline_ring = ndi.binary_dilation(S & ~inner, structure=np.ones((3, 3)))
features = np.isin(lab_, np.setdiff1d(np.unique(lab_[outline_ring]), [0]), invert=True) & (lab_ > 0)
face = (changes | features) & inner
face = ndi.binary_closing(face, structure=np.ones((3, 3))) & inner
fy, fx = np.nonzero(face)
print("face cells", int(face.sum()))

# 4. the body: the base cell with the face filled with the fur under it (seen in any cell) or around it
fur_idx = np.nonzero(fur)[0]
body = logical[BASE].copy()
todo = face.copy()
for y, x in zip(fy, fx):
    votes = []
    for w in windows:
        px = w[int(YE[y]):int(YE[y + 1]), int(XE[x]):int(XE[x + 1])].reshape(-1, 3)
        idx = nearest(px, pal_lab)
        if fur[idx].mean() >= 0.75:
            votes.extend(idx[fur[idx]].tolist())
    if votes:
        body[y, x] = np.bincount(votes).argmax()
        todo[y, x] = False
while todo.any():
    before = todo.sum()
    for y, x in zip(*np.nonzero(todo)):
        nb = [body[yy, xx] for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))
              if not todo[yy, xx] and body[yy, xx] >= 0 and fur[body[yy, xx]]]
        if nb:
            body[y, x] = np.bincount(nb).argmax()
            todo[y, x] = False
    if todo.sum() == before:
        sys.exit("a face cell has no fur around it to fill from")
body = cleanup(body, OUTLINE, pal_lab)

# 5. face palette: the non-fur colours of the raw face, over every cell
# The face layer may reach one body pixel past the face, but only over fur, so it never redraws a body line.
zone = face | (ndi.binary_dilation(face, structure=np.ones((3, 3))) & inner & fur[np.maximum(body, 0)])
zy, zx = np.nonzero(zone)
fy0, fy1, fx0, fx1 = zy.min(), zy.max() + 1, zx.min(), zx.max() + 1
samples = []
for w in windows:
    for y, x in zip(zy, zx):
        px = w[int(YE[y]):int(YE[y + 1]), int(XE[x]):int(XE[x + 1])].reshape(-1, 3)
        samples.append(px[~fur[nearest(px, pal_lab)]])
samples = np.concatenate(samples)
NFK = 14
km = KMeans(NFK, n_init=4, random_state=0).fit(to_lab(samples))
fpal = np.array([np.median(samples[km.labels_ == k], 0) for k in range(NFK)])
fcounts = np.bincount(km.labels_, minlength=NFK)
fpal, fcounts = merge_palette(fpal, fcounts, thresh=10.0)
fpal = fpal[fcounts >= 40]
print("face palette", len(fpal), fpal.astype(int).tolist())
# Fur colours stay in the vote. A fur pixel is transparent where the body under it has a near colour, so the
# body shows through; fur-coloured marks that the body lacks, such as light brow strokes, stay.
qpal = np.vstack([fpal, pal[fur_idx]])
q_lab = to_lab(qpal)
q_w = vote_weights(q_lab, FACE_DARK_W, FACE_LIGHT_W)
q_body_de = np.linalg.norm(q_lab[:, None] - pal_lab[None], axis=2)


def face_layer(w, k):
    out = np.full(((fy1 - fy0) * k, (fx1 - fx0) * k), -1, int)
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            if not zone[y, x]:
                continue
            for sy in range(k):
                ya = int(round(YE[y] + (YE[y + 1] - YE[y]) * sy / k))
                yb = max(ya + 1, int(round(YE[y] + (YE[y + 1] - YE[y]) * (sy + 1) / k)))
                for sx in range(k):
                    xa = int(round(XE[x] + (XE[x + 1] - XE[x]) * sx / k))
                    xb = max(xa + 1, int(round(XE[x] + (XE[x + 1] - XE[x]) * (sx + 1) / k)))
                    idx = nearest(w[ya:yb, xa:xb].reshape(-1, 3), q_lab)
                    v = int(np.bincount(idx, weights=q_w[idx]).argmax())
                    keep = v < len(fpal) or q_body_de[v, body[y, x]] > SAME_AS_BODY_DE
                    out[(y - fy0) * k + sy, (x - fx0) * k + sx] = v if keep else -1
    return cleanup(out, None, q_lab, min_island=k, max_hole=k - 1, diagonal=True)


# 6. write everything on a canvas cropped to the silhouette
ys, xs = np.nonzero(np.array(at_grid).max(0) >= 0)
oy, ox = ys.min() - M, xs.min() - M
FH, FW = ys.max() + M + 1 - oy, xs.max() + M + 1 - ox
rgba = lambda p: np.concatenate([np.clip(p, 0, 255), np.full((len(p), 1), 255)], 1).astype(np.uint8)
pal_rgba = rgba(pal)


def save_idx(a, p, path):
    img = np.zeros(a.shape + (4,), np.uint8)
    img[a >= 0] = p[a[a >= 0]]
    Image.fromarray(img).save(path)


crop = lambda a: a[oy:oy + FH, ox:ox + FW]
save_idx(crop(body), pal_rgba, OUT / "body.png")
for n, a in zip(NAMES, at_grid):
    save_idx(crop(a), pal_rgba, OUT / f"at-grid-{n}.png")
anchor = [int(fx0 - ox), int(fy0 - oy)]
layers = {(n, k): face_layer(w, k) for k in SCALES for n, w in zip(NAMES, windows)}
# the face palette keeps only the colours some layer uses
used = np.unique(np.concatenate([a[a >= 0] for a in layers.values()]))
remap = np.full(len(qpal), -1); remap[used] = np.arange(len(used))
fpal = qpal[used]
for (n, k), a in layers.items():
    save_idx(np.where(a >= 0, remap[np.maximum(a, 0)], -1), rgba(fpal), OUT / f"face-{n}-x{k}.png")
print("face palette", len(fpal), "colours")

# head: the part of the silhouette above the face's bottom that holds the face (so not the tail),
# down to one row under the face
upper = S.copy(); upper[fy1:] = False
hl, _ = ndi.label(upper)
head = hl == np.bincount(hl[face]).argmax()
hy, hx = np.nonzero(head)
head_box = [int(hx.min() - ox), int(hy.min() - oy), int(hx.max() + 1 - ox), int(fy1 + 1 - oy)]

# raw window of the canvas, per cell, with the raw's own alpha, for comparisons
raw_box = [float(XE[ox]), float(YE[oy]), float(XE[ox + FW]), float(YE[oy + FH])]
rawa = np.zeros((H + 2 * E, W + 2 * E, 4), np.uint8)
rawa[E:E + H, E:E + W] = np.asarray(Image.open(RAW).convert("RGBA"))
if rawa[E:E + H, E:E + W, 3].min() == 255:
    rawa[..., 3] = np.where(np.pad(fg, E), 255, 0)
x0, y0, x1, y1 = (int(round(v)) for v in raw_box)
for n, (dy, dx) in zip(NAMES, offsets):
    Image.fromarray(rawa[wy0 + dy + y0:wy0 + dy + y1, wx0 + dx + x0:wx0 + dx + x1]).save(OUT / f"raw-{n}.png")

json.dump(dict(fur=[int(i) for i in fur_idx], outline=OUTLINE,
               body=[list(map(int, c)) for c in pal], face=[list(map(int, c)) for c in fpal]),
          open(OUT / "palette.json", "w"), indent=1)
json.dump(dict(names=NAMES, base=NAMES[BASE], frame_w=int(FW), frame_h=int(FH), pixel=[float(PX), float(PY)],
               scales=list(SCALES),
               face=dict(anchor=anchor, size=[int(fx1 - fx0), int(fy1 - fy0)],
                         note="face-<name>-x<k>.png is size*k pixels; draw it at anchor, k times smaller than the body"),
               head_box=head_box, raw_box=raw_box,
               cell_offsets=[list(map(int, o)) for o in offsets],
               raw_cells=[list(map(int, b)) for b in boxes]),
          open(OUT / "meta.json", "w"), indent=1)

# debug: face cells red, the face layer's zone blue, the head box green
dbg = np.zeros((FH, FW, 4), np.uint8)
b = crop(body)
dbg[b >= 0] = pal_rgba[b[b >= 0]]
dbg = Image.fromarray(dbg).resize((FW * 10, FH * 10), Image.NEAREST)
over = np.zeros((FH * 10, FW * 10, 4), np.uint8)
over[np.kron(crop(zone), np.ones((10, 10), bool))] = (60, 90, 255, 70)
over[np.kron(crop(face), np.ones((10, 10), bool))] = (255, 40, 40, 110)
x0, y0, x1, y1 = (v * 10 for v in head_box)
over[y0:y1, [x0, x1 - 1]] = over[[y0, y1 - 1], x0:x1] = (0, 200, 0, 255)
dbg.alpha_composite(Image.fromarray(over))
dbg.save(OUT / "dbg-face-mask.png")
print("canvas", FW, "x", FH, "face anchor", anchor, "size", fx1 - fx0, fy1 - fy0, "head box", head_box)
