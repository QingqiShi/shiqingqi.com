"""Show a layers.py result: composites, compare.png, ref-sprite.png and a self-contained preview.html.

usage: python layers_preview.py layers_outdir outdir
needs: numpy pillow

compare.png shows the head of every face at the same display size: the raw crop, the face voted at the
sprite grid, and the body with the face layer at each scale. ref-sprite.png is the base sprite (base face at
the largest scale) at REF_ZOOM screen pixels per sprite pixel on the magenta key: Image 2 of every action brief.
"""
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
meta = json.load(open(SRC / "meta.json"))
names, scales, FW, FH = meta["names"], meta["scales"], meta["frame_w"], meta["frame_h"]
(ax, ay), (fw, fh) = meta["face"]["anchor"], meta["face"]["size"]
BGC = (246, 240, 228, 255)
D = 6
REF_ZOOM, REF_MARGIN = 12, 4  # REF_MARGIN is in sprite pixels
body = Image.open(SRC / "body.png").convert("RGBA")
faces = {(n, k): Image.open(SRC / f"face-{n}-x{k}.png").convert("RGBA") for n in names for k in scales}


def composite(n, k):
    """Body and face layer at k pixels per sprite pixel, as an app would draw them."""
    im = body.resize((FW * k, FH * k), Image.NEAREST)
    im.alpha_composite(faces[n, k], (ax * k, ay * k))
    return im


def shown(im):
    """im scaled to the display size D px per sprite pixel, on the page colour."""
    out = Image.new("RGBA", (FW * D, FH * D), BGC)
    resample = Image.LANCZOS if im.size[0] > FW * 4 else Image.NEAREST
    out.alpha_composite(im.resize((FW * D, FH * D), resample))
    return out


for n in names:
    for k in scales:
        composite(n, k).save(OUT / f"comp-{n}-x{k}.png")

ref = Image.new("RGBA", ((FW + 2 * REF_MARGIN) * REF_ZOOM, (FH + 2 * REF_MARGIN) * REF_ZOOM), (255, 0, 255, 255))
ref.alpha_composite(composite(meta["base"], scales[-1]).resize((FW * REF_ZOOM, FH * REF_ZOOM), Image.NEAREST),
                    (REF_MARGIN * REF_ZOOM, REF_MARGIN * REF_ZOOM))
ref.convert("RGB").save(OUT / "ref-sprite.png")

cols = [("raw (AI output)", lambda n: Image.open(SRC / f"raw-{n}.png").convert("RGBA")),
        ("at sprite grid", lambda n: Image.open(SRC / f"at-grid-{n}.png").convert("RGBA"))]
cols += [(f"body + face at {k}x", lambda n, k=k: composite(n, k)) for k in scales]

# compare.png: the head region of every face, one row per face
x0, y0, x1, y1 = (v * D for v in meta["head_box"])
PAD, TOP, LEFT = 10, 28, 90
tw, th = x1 - x0, y1 - y0
sheet = Image.new("RGB", (LEFT + len(cols) * (tw + PAD), TOP + len(names) * (th + PAD)), (40, 40, 48))
d = ImageDraw.Draw(sheet)
for c, (label, _) in enumerate(cols):
    d.text((LEFT + c * (tw + PAD) + 4, 8), label, fill=(240, 240, 240))
for r, n in enumerate(names):
    d.text((8, TOP + r * (th + PAD) + th // 2), n, fill=(240, 240, 240))
    for c, (_, make) in enumerate(cols):
        sheet.paste(shown(make(n)).crop((x0, y0, x1, y1)).convert("RGB"), (LEFT + c * (tw + PAD), TOP + r * (th + PAD)))
sheet.save(OUT / "compare.png")


def data_url(im):
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


urls = {"body": data_url(body)}
for n in names:
    urls[f"raw-{n}"] = data_url(Image.open(SRC / f"raw-{n}.png"))
    urls[f"grid-{n}"] = data_url(Image.open(SRC / f"at-grid-{n}.png"))
    for k in scales:
        urls[f"face-{n}-{k}"] = data_url(faces[n, k])
labels = [label for label, _ in cols]

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kitten face layers</title>
<style>
:root {{ --bg:#f6f0e4; --ink:#3a2a24; --muted:#7a6a60; --tile:#f6f0e4; --line:#e2d8c8 }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#221d1a; --ink:#efe6dc; --muted:#a8998d; --line:#3a322c }} }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:15px/1.45 system-ui,sans-serif; padding:24px 16px }}
h1 {{ font-size:20px; margin:0 0 4px }} h2 {{ font-size:16px; margin:28px 0 8px }}
p {{ color:var(--muted); margin:0 0 12px; max-width:70ch }}
.scroll {{ overflow-x:auto }}
table {{ border-collapse:collapse }} th, td {{ padding:6px; text-align:left; vertical-align:top; border-bottom:1px solid var(--line) }}
th {{ font-weight:600; font-size:13px; color:var(--muted) }}
canvas {{ image-rendering:pixelated; display:block; background:var(--tile); border-radius:6px; max-width:none }}
.row {{ display:flex; flex-wrap:wrap; gap:16px }} .row figure {{ margin:0 }} figcaption {{ font-size:13px; color:var(--muted) }}
</style></head><body>
<h1>Kitten base sprite: one body, face layers on top</h1>
<p>Every sprite is drawn at {D} screen pixels per sprite pixel. The face layers hold {" or ".join(map(str, scales))} pixels per
sprite pixel and are drawn at their anchor ({ax}, {ay}) on the body, the way an app would draw them.</p>
<h2>Idle: neutral with a blink</h2>
<div class="row">{"".join(f'<figure><canvas id="idle{k}" width="{FW * D}" height="{FH * D}"></canvas><figcaption>face at {k}x</figcaption></figure>' for k in scales)}
<figure><canvas id="cycle" width="{FW * D}" height="{FH * D}"></canvas><figcaption id="cyclecap">every face, at {scales[-1]}x</figcaption></figure></div>
<h2>Every face</h2>
<div class="scroll"><table><thead><tr><th></th>{"".join(f"<th>{l}</th>" for l in labels)}</tr></thead><tbody>
{"".join(f'<tr><th>{n}</th>' + "".join(f'<td><canvas id="t-{n}-{c}" width="{FW * D}" height="{FH * D}"></canvas></td>' for c in range(len(cols))) + '</tr>' for n in names)}
</tbody></table></div>
<script>
const FW={FW}, FH={FH}, D={D}, AX={ax}, AY={ay}, FWF={fw}, FHF={fh}, SCALES={json.dumps(scales)}, NAMES={json.dumps(names)};
const URLS={json.dumps(urls)};
const imgs={{}};
function ctx(id) {{ const c=document.getElementById(id).getContext('2d'); c.imageSmoothingEnabled=false; return c; }}
function sprite(c, name, k) {{
  c.clearRect(0,0,FW*D,FH*D);
  c.drawImage(imgs.body,0,0,FW*D,FH*D);
  c.drawImage(imgs[`face-${{name}}-${{k}}`],AX*D,AY*D,FWF*D,FHF*D);
}}
function draw() {{
  NAMES.forEach(n => {{
    let c=ctx(`t-${{n}}-0`); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; c.drawImage(imgs[`raw-${{n}}`],0,0,FW*D,FH*D);
    c=ctx(`t-${{n}}-1`); c.drawImage(imgs[`grid-${{n}}`],0,0,FW*D,FH*D);
    SCALES.forEach((k,i) => sprite(ctx(`t-${{n}}-${{i+2}}`), n, k));
  }});
  const IDLE=[['neutral',2200],['blink',130],['neutral',1400],['blink',120],['neutral',140],['blink',120]];
  SCALES.forEach(k => {{
    const c=ctx(`idle${{k}}`); let i=0;
    (function tick() {{ const [n,ms]=IDLE[i++ % IDLE.length]; sprite(c,n,k); setTimeout(tick,ms); }})();
  }});
  const cc=ctx('cycle'), cap=document.getElementById('cyclecap'); let j=0;
  (function tick() {{ const n=NAMES[j++ % NAMES.length]; sprite(cc,n,SCALES[SCALES.length-1]); cap.textContent=`${{n}}, at ${{SCALES[SCALES.length-1]}}x`; setTimeout(tick,1100); }})();
}}
let left=Object.keys(URLS).length;
for (const [k,u] of Object.entries(URLS)) {{ const im=new Image(); im.onload=()=>{{ if(--left===0) draw(); }}; im.src=u; imgs[k]=im; }}
</script></body></html>
"""
(OUT / "preview.html").write_text(html)
print("done", OUT)
