"""Shared helpers for layers.py and actions.py: grid detection, palette and pixel cleanup."""
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from sklearn.cluster import KMeans


def key_distance(im, border=6):
    """Background colour sampled from the image border, and each pixel's distance from it."""
    edge = np.concatenate([im[:border].reshape(-1, 3), im[-border:].reshape(-1, 3),
                           im[:, :border].reshape(-1, 3), im[:, -border:].reshape(-1, 3)])
    bg = np.median(edge, 0)
    return bg, np.linalg.norm(im - bg, axis=2)


def frame_boxes(fg, nframes):
    """Bounding boxes of the nframes biggest blobs, sorted in reading order."""
    lab, n = ndi.label(ndi.binary_dilation(fg, iterations=8))
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.argsort(sizes)[::-1][:nframes] + 1
    boxes = []
    for k in keep:
        ys, xs = np.nonzero((lab == k) & fg)
        boxes.append((ys.min(), ys.max() + 1, xs.min(), xs.max() + 1))
    rowh = np.median([b[1] - b[0] for b in boxes])
    boxes.sort(key=lambda b: (round(b[0] / rowh), b[2]))
    return boxes


def edge_profile(crop, axis):
    d = np.abs(np.diff(crop, axis=axis)).sum(2)
    prof = d.sum(1 - axis)
    return np.concatenate([[0], prof, [0]])  # prof[i] = edge strength before index i


def comb_fit(prof, pmin=5.8, pmax=7.0):
    best = (-1, 0, 0)
    n = len(prof)
    for p in np.arange(pmin, pmax, 0.01):
        for ph in np.arange(0, p, 0.1):
            idx = np.round(np.arange(ph, n, p)).astype(int)
            idx = idx[idx < n]
            s = prof[idx].mean()
            if s > best[0]:
                best = (s, p, ph)
    return best[1], best[2]


def dp_cuts(prof, p, ph, slack=2, lam_s=0.6, lam_d=0.15):
    """Cut k sits near ph + k*p (+-slack), snapped to strong edges, spacing kept near p."""
    n = len(prof)
    g = prof / (prof.mean() + 1e-6)
    ks = []
    k = 0
    while ph + k * p < n + p:
        ks.append(ph + k * p)
        k += 1
    offs = np.arange(-slack, slack + 1)
    K = len(ks)
    score = np.full((K, len(offs)), -1e9)
    back = np.zeros((K, len(offs)), int)
    pos = lambda k, j: int(round(ks[k])) + offs[j]
    def val(x):
        return g[x] if 0 <= x < n else 0.0
    for j in range(len(offs)):
        score[0, j] = val(pos(0, j)) - lam_d * offs[j] ** 2
    for k in range(1, K):
        for j in range(len(offs)):
            x = pos(k, j)
            cand = [score[k - 1, i] - lam_s * ((x - pos(k - 1, i)) - p) ** 2 for i in range(len(offs))]
            i = int(np.argmax(cand))
            score[k, j] = cand[i] + val(x) - lam_d * offs[j] ** 2
            back[k, j] = i
    j = int(np.argmax(score[-1]))
    cuts = []
    for k in range(K - 1, -1, -1):
        cuts.append(pos(k, j))
        j = back[k, j]
    cuts = sorted(set(c for c in cuts))
    return [c for c in cuts if 0 <= c <= n - 1] if cuts else cuts


def phase_fit(prof, p):
    n = len(prof)
    best = (-1, 0)
    for ph in np.arange(0, p, 0.1):
        idx = np.round(np.arange(ph, n, p)).astype(int)
        s = prof[idx[idx < n]].mean()
        if s > best[0]:
            best = (s, ph)
    return best[1]


def to_lab(rgb):
    a = np.clip(rgb, 0, 255).astype(np.uint8).reshape(-1, 1, 3)
    return cv2.cvtColor(a, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)


def merge_palette(pal, counts, thresh):
    pal = list(pal); counts = list(counts)
    while len(pal) > 1:
        L = to_lab(np.array(pal))
        D = np.linalg.norm(L[:, None] - L[None], axis=2)
        np.fill_diagonal(D, 1e9)
        i, j = np.unravel_index(np.argmin(D), D.shape)
        if D[i, j] > thresh:
            break
        keep, drop = (i, j) if counts[i] >= counts[j] else (j, i)
        counts[keep] += counts[drop]
        del pal[drop]; del counts[drop]
    return np.array(pal), np.array(counts)


def is_bg_blend(c, bg):
    """True if c leans toward the key colour, which the creature never uses (an edge fringe)."""
    key = bg - bg.min()
    tint = np.dot(c - c.min(), key) / (np.linalg.norm(key) * (np.linalg.norm(c - c.min()) + 1e-6))
    return tint > 0.85 and min(c[0] - c[1], c[2] - c[1]) > 30


def neighbours8(a, y, x):
    h, w = a.shape
    vals = []
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            yy, xx = y + dy, x + dx
            vals.append(a[yy, xx] if 0 <= yy < h and 0 <= xx < w else -1)
    return vals


def cleanup(a, outline, pal_lab, min_island=6, max_hole=2, diagonal=False):
    """Remove specks and stray pixels, fill pinholes and, unless outline is None, force the outline."""
    a = a.copy()
    # drop tiny opaque islands
    lab_, n_ = ndi.label(a >= 0, structure=np.ones((3, 3)) if diagonal else None)
    for k in range(1, n_ + 1):
        if (lab_ == k).sum() < min_island:
            a[lab_ == k] = -1
    # fill pinholes
    holes = ndi.binary_fill_holes(a >= 0) & (a < 0)
    hl, hn = ndi.label(holes)
    for k in range(1, hn + 1):
        if (hl == k).sum() > max_hole:
            holes[hl == k] = False  # a real gap (e.g. between tail and body) stays open
    for y, x in zip(*np.nonzero(holes)):
        nb = [v for v in neighbours8(a, y, x) if v >= 0]
        a[y, x] = np.bincount(nb).argmax()
    # stray pixels: unlike all 4-neighbours, close in colour to the local majority
    h, w = a.shape
    for _ in range(2):
        b = a.copy()
        for y in range(h):
            for x in range(w):
                v = a[y, x]
                if v < 0:
                    continue
                n4 = [a[yy, xx] if 0 <= yy < h and 0 <= xx < w else -1
                      for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))]
                if v in n4:
                    continue
                op = [u for u in neighbours8(a, y, x) if u >= 0]
                if len(op) < 6:
                    continue
                maj = np.bincount(op).argmax()
                if (np.array(op) == maj).sum() >= 5 and np.linalg.norm(pal_lab[v] - pal_lab[maj]) < 28:
                    b[y, x] = maj
        a = b
    if outline is None:
        return a
    # outline: every opaque pixel that touches the background becomes outline
    opaque = a >= 0
    edge = opaque & ~ndi.binary_erosion(opaque, structure=ndi.generate_binary_structure(2, 1), border_value=0)
    a[edge] = outline
    return a


def load_rgb(path, key=(255, 0, 255)):
    """The image as float RGB. A transparent background becomes the flat key colour."""
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        a = np.asarray(im.convert("RGBA")).astype(np.float32)
        alpha = a[..., 3:] / 255
        return a[..., :3] * alpha + np.array(key, np.float32) * (1 - alpha)
    return np.asarray(im.convert("RGB")).astype(np.float32)


def cell_samples(crop, cx, cy, bg, inset=0.22):
    """Per grid cell: the centre pixels and which of them are background."""
    cdist = np.linalg.norm(crop - bg, axis=2)
    cells = []
    for j in range(len(cy) - 1):
        row = []
        for i in range(len(cx) - 1):
            a, b = cy[j], cy[j + 1]
            c, d = cx[i], cx[i + 1]
            ia = int(round(a + (b - a) * inset)); ib = max(ia + 1, int(round(b - (b - a) * inset)))
            ic = int(round(c + (d - c) * inset)); id_ = max(ic + 1, int(round(d - (d - c) * inset)))
            px = crop[ia:ib, ic:id_].reshape(-1, 3)
            isbg = cdist[ia:ib, ic:id_].reshape(-1) < 80
            row.append((px, isbg))
        cells.append(row)
    return cells


def sheet_palette(frames_cells, bg, nk=28):
    """One shared palette: k-means in Lab over cell medians (one sample per cell, so small details count)."""
    med = []
    for cells in frames_cells:
        for row in cells:
            for px, isbg in row:
                if (~isbg).sum() > isbg.sum():
                    med.append(np.median(px[~isbg], 0))
    med = np.array(med)
    km = KMeans(nk, n_init=6, random_state=0).fit(to_lab(med))
    # palette colour = median RGB of members (not the centroid, so it stays a real colour)
    pal = []
    for k in range(nk):
        m = km.labels_ == k
        pal.append(np.median(med[m], 0) if m.any() else np.zeros(3))
    pal = np.array(pal)
    counts = np.bincount(km.labels_, minlength=nk)
    pal, counts = merge_palette(pal, counts, thresh=9.0)

    # rescue rare but distinct colours (eye highlights, mouth) that k-means on medians absorbed
    allpx = np.concatenate([px[~isbg] for cells in frames_cells for row in cells for px, isbg in row if (~isbg).any()])
    L_all = to_lab(allpx)
    pl = to_lab(pal)
    dmin = np.min([np.linalg.norm(L_all - c, axis=1) for c in pl], axis=0)
    far = dmin > 16
    print("far pixels", far.sum(), "of", len(far))
    if far.sum() > 60:
        k2 = KMeans(14, n_init=3, random_state=0).fit(L_all[far])
        for k in range(14):
            m = k2.labels_ == k
            members = allpx[far][m]
            spread = np.median(np.linalg.norm(L_all[far][m] - k2.cluster_centers_[k], axis=1))
            colour = np.median(members, 0)
            print("  cand", colour.astype(int), m.sum(), round(float(spread), 1))
            if m.sum() >= 60 and spread < 12 and not is_bg_blend(colour, bg):
                pal = np.vstack([pal, colour])
                counts = np.append(counts, m.sum() // 20)
                print("rescued colour", colour.astype(int), "from", m.sum(), "pixels, spread", round(float(spread), 1))
    pal, counts = merge_palette(pal, counts, thresh=9.0)
    fringe = [k for k in range(len(pal)) if is_bg_blend(pal[k], bg)]
    print("dropping fringe colours", [pal[k].astype(int).tolist() for k in fringe])
    pal = np.delete(pal, fringe, 0)
    print("palette size", len(pal))
    return pal


def nearest(rgb, pal_lab):
    L = to_lab(rgb)
    return np.argmin(np.linalg.norm(L[:, None] - pal_lab[None], axis=2), axis=1)


def vote_weights(pal_lab, dark_w, light_w):
    """Lines and highlights are thinner than a cell in the raw art; give them extra weight so they survive."""
    w = np.ones(len(pal_lab))
    w[pal_lab[:, 0] < 40 * 255 / 100] = dark_w
    w[pal_lab[:, 0] > 96 * 255 / 100] = light_w
    return w


def vote(cells, pal_lab, weights):
    """Mode of palette indices over each cell's pixels; -1 where the cell is mostly background."""
    rows = []
    for row in cells:
        out = []
        for px, isbg in row:
            if isbg.sum() * 2 >= len(isbg):
                out.append(-1)
            else:
                idx = nearest(px[~isbg], pal_lab)
                out.append(int(np.bincount(idx, weights=weights[idx]).argmax()))
        rows.append(out)
    return np.array(rows)
