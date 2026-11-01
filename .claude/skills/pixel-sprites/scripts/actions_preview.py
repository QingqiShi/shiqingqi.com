"""Show an actions.py result: one strip per action, overview.png and a self-contained preview.html.

usage: python actions_preview.py actions_dir
needs: numpy pillow

strip.png in each action folder shows the cleaned frames side by side at D screen pixels per sprite pixel,
drawn from the layers (body frame plus face layer) as an app would. compare.png puts the raw crop of each frame
over the cleaned frame at the same scale. overview.png stacks every strip. preview.html plays every action as a
loop, steps frames, and shows the raw crop next to the cleaned frame.
"""
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(sys.argv[1])
spec = json.load(open(OUT / "actions.json"))
LAYERS = Path(spec["layers"])
CW, CH = spec["canvas"]
K = spec["face_scale"]
FW, FH = spec["face_size"]
GROUND = spec["ground"]
D = 6
BGC = (246, 240, 228, 255)
GAP = 8
faces = {}


def face(n):
    if n not in faces:
        faces[n] = Image.open(LAYERS / f"face-{n}-x{K}.png").convert("RGBA")
    return faces[n]


def composite(item):
    """One frame at D screen pixels per sprite pixel, on the page colour, with the ground line."""
    im = Image.new("RGBA", (CW * D, CH * D), BGC)
    d = ImageDraw.Draw(im)
    d.line([(0, GROUND * D), (CW * D, GROUND * D)], fill=(214, 200, 180, 255), width=1)
    im.alpha_composite(Image.open(OUT / item["body"]).convert("RGBA").resize((CW * D, CH * D), Image.NEAREST))
    fx, fy = item["face_at"]
    im.alpha_composite(face(item["face"]).resize((FW * D, FH * D), Image.NEAREST), (fx * D, fy * D))
    return im


def raw_shown(item):
    """The raw crop scaled so that one of its pixels is D screen pixels, on the page colour."""
    raw = Image.open(OUT / item["raw"]).convert("RGBA")
    s = D / item["raw_pixel"]
    raw = raw.resize((round(raw.width * s), round(raw.height * s)), Image.LANCZOS)
    im = Image.new("RGBA", (CW * D, CH * D), BGC)
    im.alpha_composite(raw, ((CW * D - raw.width) // 2, CH * D - raw.height))
    return im


strips = {}
for name, items in spec["actions"].items():
    n = len(items)
    strip = Image.new("RGBA", (n * CW * D + (n - 1) * GAP, CH * D), (40, 40, 48, 255))
    for i, item in enumerate(items):
        strip.alpha_composite(composite(item), (i * (CW * D + GAP), 0))
    strip.save(OUT / name / "strip.png")
    strips[name] = strip
    if "raw" in items[0]:
        cmp_ = Image.new("RGBA", (strip.width, 2 * CH * D + GAP), (40, 40, 48, 255))
        for i, item in enumerate(items):
            cmp_.alpha_composite(raw_shown(item), (i * (CW * D + GAP), 0))
        cmp_.alpha_composite(strip, (0, CH * D + GAP))
        cmp_.save(OUT / name / "compare.png")

LABEL = 28
wmax = max(s.width for s in strips.values())
ov = Image.new("RGB", (wmax, sum(s.height + LABEL for s in strips.values())), (40, 40, 48))
d = ImageDraw.Draw(ov)
y = 0
for name, s in strips.items():
    d.text((6, y + 8), name, fill=(240, 240, 240))
    ov.paste(s.convert("RGB"), (0, y + LABEL))
    y += s.height + LABEL
ov.save(OUT / "overview.png")


def data_url(path):
    buf = io.BytesIO()
    Image.open(path).save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


urls = {}
for items in spec["actions"].values():
    for item in items:
        urls[item["body"]] = data_url(OUT / item["body"])
        if "raw" in item:
            urls[item["raw"]] = data_url(OUT / item["raw"])
        urls.setdefault(f"face-{item['face']}", data_url(LAYERS / f"face-{item['face']}-x{K}.png"))

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kitten actions</title>
<style>
:root {{ --bg:#f6f0e4; --ink:#3a2a24; --muted:#7a6a60; --tile:#f6f0e4; --line:#e2d8c8; --btn:#ebe2d2; --on:#3a2a24; --onink:#f6f0e4 }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#221d1a; --ink:#efe6dc; --muted:#a8998d; --line:#3a322c; --btn:#332b26; --on:#efe6dc; --onink:#221d1a }} }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:15px/1.45 system-ui,sans-serif; padding:24px 16px }}
h1 {{ font-size:20px; margin:0 0 4px }} h2 {{ font-size:16px; margin:24px 0 8px }}
p {{ color:var(--muted); margin:0 0 12px; max-width:70ch }}
canvas {{ image-rendering:pixelated; display:block; background:var(--tile); border-radius:6px; max-width:100%; height:auto }}
.bar {{ display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 12px }}
button {{ font:inherit; border:1px solid var(--line); background:var(--btn); color:var(--ink); border-radius:6px; padding:4px 10px; cursor:pointer }}
button[aria-pressed=true] {{ background:var(--on); color:var(--onink) }}
.row {{ display:flex; flex-wrap:wrap; gap:16px }} figure {{ margin:0 }} figcaption {{ font-size:13px; color:var(--muted) }}
.strip {{ display:flex; gap:8px; overflow-x:auto; padding-bottom:6px }} .strip canvas {{ width:{CW * 2}px; cursor:pointer }}
.strip canvas.cur {{ outline:2px solid var(--ink) }}
</style></head><body>
<h1>Kitten actions</h1>
<p>Each frame is the action's body layer with the base head pasted back and a face layer ({K}x) on top, drawn at
{D} screen pixels per sprite pixel. Every action shares one canvas ({CW}x{CH}), one ground line and one head anchor.</p>
<div class="bar" id="actions"></div>
<div class="bar"><button id="play">Pause</button><button id="prev">&larr; Frame</button><button id="next">Frame &rarr;</button>
<span id="info" style="align-self:center;color:var(--muted)"></span></div>
<div class="row">
<figure><canvas id="main" width="{CW * D}" height="{CH * D}"></canvas><figcaption>cleaned, from the layers</figcaption></figure>
<figure><canvas id="raw" width="{CW * D}" height="{CH * D}"></canvas><figcaption>raw cell (AI output), same scale</figcaption></figure>
</div>
<h2>Frames</h2>
<div class="strip" id="strip"></div>
<script>
const CW={CW}, CH={CH}, D={D}, FW={FW}, FH={FH}, GROUND={GROUND};
const SPEC={json.dumps(spec["actions"])};
const URLS={json.dumps(urls)};
const imgs={{}};
let act=Object.keys(SPEC)[1] || Object.keys(SPEC)[0], fi=0, playing=true, timer=null;
function ctx(c) {{ const x=c.getContext('2d'); x.imageSmoothingEnabled=false; return x; }}
function draw(c, it) {{
  const x=ctx(c); x.clearRect(0,0,c.width,c.height);
  x.strokeStyle='#d6c8b4'; x.beginPath(); x.moveTo(0,GROUND*D+0.5); x.lineTo(CW*D,GROUND*D+0.5); x.stroke();
  x.drawImage(imgs[it.body],0,0,CW*D,CH*D);
  x.drawImage(imgs['face-'+it.face],it.face_at[0]*D,it.face_at[1]*D,FW*D,FH*D);
}}
function drawRaw(it) {{
  const c=document.getElementById('raw'), x=c.getContext('2d'); x.clearRect(0,0,c.width,c.height);
  if (!it.raw) {{ x.fillStyle='#a8998d'; x.font='14px system-ui'; x.fillText('the base sprite (no action sheet)',12,24); return; }}
  const im=imgs[it.raw], s=D/it.raw_pixel, w=im.width*s, h=im.height*s;
  x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(im,(CW*D-w)/2,CH*D-h,w,h);
}}
function show() {{
  const items=SPEC[act], it=items[fi];
  draw(document.getElementById('main'), it); drawRaw(it);
  document.getElementById('info').textContent=`${{act}} · frame ${{fi+1}}/${{items.length}} · face ${{it.face}}`+(it.head_changed!==undefined?` · head px replaced ${{Math.round(it.head_changed*100)}}%`:'');
  document.querySelectorAll('#strip canvas').forEach((c,i)=>c.classList.toggle('cur',i===fi));
}}
function tick() {{ clearTimeout(timer); if (!playing) return; timer=setTimeout(()=>{{ fi=(fi+1)%SPEC[act].length; show(); tick(); }}, SPEC[act][fi].ms); }}
function pick(a) {{
  act=a; fi=0;
  document.querySelectorAll('#actions button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.a===a));
  const s=document.getElementById('strip'); s.innerHTML='';
  SPEC[a].forEach((it,i)=>{{ const c=document.createElement('canvas'); c.width=CW*D; c.height=CH*D; draw(c,it);
    c.onclick=()=>{{ playing=false; document.getElementById('play').textContent='Play'; fi=i; show(); clearTimeout(timer); }}; s.appendChild(c); }});
  show(); tick();
}}
function start() {{
  const bar=document.getElementById('actions');
  Object.keys(SPEC).forEach(a=>{{ const b=document.createElement('button'); b.textContent=a; b.dataset.a=a; b.onclick=()=>pick(a); bar.appendChild(b); }});
  document.getElementById('play').onclick=e=>{{ playing=!playing; e.target.textContent=playing?'Pause':'Play'; tick(); }};
  const step=d=>{{ playing=false; document.getElementById('play').textContent='Play'; clearTimeout(timer); fi=(fi+d+SPEC[act].length)%SPEC[act].length; show(); }};
  document.getElementById('prev').onclick=()=>step(-1); document.getElementById('next').onclick=()=>step(1);
  document.addEventListener('keydown',e=>{{ if(e.key==='ArrowLeft') step(-1); if(e.key==='ArrowRight') step(1); if(e.key===' '){{ e.preventDefault(); document.getElementById('play').click(); }} }});
  pick(act);
}}
let left=Object.keys(URLS).length;
for (const [k,u] of Object.entries(URLS)) {{ const im=new Image(); im.onload=()=>{{ if(--left===0) start(); }}; im.src=u; imgs[k]=im; }}
</script></body></html>
"""
(OUT / "preview.html").write_text(html)
print("done", OUT / "overview.png", OUT / "preview.html")
