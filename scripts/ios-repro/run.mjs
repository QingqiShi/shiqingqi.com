// Temporary: drives Safari in an iPad simulator with real touches (idb), and
// reads the page through a proxy that injects a logger and a command channel.
import { execFileSync } from "node:child_process";
import http from "node:http";

const UDID = process.env.UDID;
const APP = process.env.APP_URL ?? "http://localhost:3000";
const PORT = 3100;
const ORIGIN = `http://localhost:${PORT}`;
const PAGE = "/design-system/contents";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    console.log(`${cmd} ${args.join(" ")} failed: ${String(error.stderr || error.message).slice(0, 300)}`);
    return "";
  }
};

const INJECTED = `<script>(() => {
  const d = e => e && e.tagName ? e.tagName + '[' + (e.getAttribute('aria-label') || e.getAttribute('role') || (e.className && e.className.slice ? e.className.slice(0, 16) : '')) + ']' : String(e);
  let buffer = [];
  const log = line => buffer.push(Math.round(performance.now()) + ' ' + line);
  const flush = () => { if (buffer.length) { navigator.sendBeacon('/__log', buffer.join('\\n')); buffer = []; } };
  setInterval(flush, 150);
  addEventListener('pagehide', () => { log('pagehide'); flush(); });
  const exp = () => document.querySelector('[aria-haspopup=menu]')?.getAttribute('aria-expanded');
  for (const t of ['pointerdown','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel','mouseover','mousemove','mousedown','mouseup','focusout','focusin','click','contextmenu','selectstart'])
    document.addEventListener(t, e => {
      if (window.__block) { if (t === 'pointerdown') (window.__calib ||= []).push([e.clientX, e.clientY]); if (t === 'click') e.preventDefault(); e.stopImmediatePropagation(); return; }
      log(t + ' ' + d(e.target) + (t.startsWith('focus') ? ' rel=' + d(e.relatedTarget) : '') + (e.clientX !== undefined ? ' @' + Math.round(e.clientX) + ',' + Math.round(e.clientY) : '') + (e.defaultPrevented ? ' PREVENTED' : '') + ' exp=' + exp());
    }, true);
  for (const t of ['click','touchmove','touchend','mousedown'])
    window.addEventListener(t, e => { if (e.defaultPrevented) log('  ' + t + ' was default-prevented by the page'); });
  document.addEventListener('scroll', e => log('scroll ' + d(e.target === document ? document.documentElement : e.target) + ' y=' + Math.round(scrollY)), true);
  for (const t of ['transitionrun','animationstart'])
    document.addEventListener(t, e => log('    ' + t + ' ' + d(e.target) + ' ' + (e.propertyName || e.animationName)), true);
  new MutationObserver(list => { for (const m of list) log('    mut ' + m.type + ' ' + d(m.target) + ' ' + (m.attributeName || '+' + m.addedNodes.length + ' -' + m.removedNodes.length)); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  window.__state = () => {
    const out = ['state: ' + location.pathname + ' lang=' + document.documentElement.lang + ' w=' + innerWidth + 'x' + innerHeight + ' scrollY=' + Math.round(scrollY) + ' vv=' + Math.round(visualViewport.offsetTop) + ',' + Math.round(visualViewport.height) + ' active=' + d(document.activeElement) + ' expanded=' + exp()];
    for (const a of document.querySelectorAll('[aria-haspopup=menu], [role=menuitem]')) {
      const r = a.getBoundingClientRect();
      out.push('  ' + d(a) + ' rect=' + [r.x, r.y, r.width, r.height].map(Math.round).join(',') + ' stack=' + document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2).slice(0, 4).map(d).join('>'));
    }
    let sc = document.querySelector('[aria-haspopup=menu]');
    while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    out.push('  sidebar scroller=' + d(sc) + (sc ? ' top=' + Math.round(sc.scrollTop) + ' of ' + (sc.scrollHeight - sc.clientHeight) : ''));
    return out.join('\\n');
  };
  const poll = async () => {
    try {
      const res = await fetch('/__cmd');
      if (res.status === 200) {
        const { id, js } = await res.json();
        let value;
        try { value = await (0, eval)(js); } catch (error) { value = 'ERROR ' + error.message; }
        await fetch('/__res', { method: 'POST', body: JSON.stringify({ id, value }) });
      }
    } catch {}
    setTimeout(poll, 150);
  };
  poll();
  log('hello ' + location.pathname);
})();</script>`;

const queue = [];
const waiting = new Map();
let nextId = 1;
const body = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
http
  .createServer(async (req, res) => {
    if (req.url === "/__log") {
      for (const line of (await body(req)).split("\n")) console.log(`  | ${line}`);
      res.writeHead(204).end();
      return;
    }
    if (req.url === "/__cmd") {
      const cmd = queue.shift();
      if (!cmd) return void res.writeHead(204).end();
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(cmd));
      return;
    }
    if (req.url === "/__res") {
      const { id, value } = JSON.parse(await body(req));
      waiting.get(id)?.(value);
      waiting.delete(id);
      res.writeHead(204).end();
      return;
    }
    const headers = { ...req.headers, host: "localhost:3000" };
    delete headers["accept-encoding"];
    const upstream = await fetch(APP + req.url, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await body(req),
      redirect: "manual",
    });
    const out = {};
    upstream.headers.forEach((value, key) => {
      if (!["content-length", "content-encoding", "transfer-encoding", "connection"].includes(key)) out[key] = value;
    });
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) out["set-cookie"] = cookies;
    if (out.location) out.location = out.location.replace(APP, ORIGIN);
    if ((upstream.headers.get("content-type") || "").includes("text/html")) {
      const html = await upstream.text();
      res.writeHead(upstream.status, out).end(html.replace(/<head[^>]*>/, (m) => m + INJECTED));
    } else {
      res.writeHead(upstream.status, out).end(Buffer.from(await upstream.arrayBuffer()));
    }
  })
  .listen(PORT);

const exec = (js, timeout = 8000) =>
  new Promise((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    queue.push({ id, js });
    setTimeout(() => {
      if (waiting.delete(id)) resolve("(no answer)");
    }, timeout);
  });
const state = async (label) => console.log(`--- ${label}\n${await exec("window.__state()")}`);
const shot = (name) => sh("xcrun", ["simctl", "io", UDID, "screenshot", `ios-repro-${name}.png`]);
const idbTap = (x, y) => sh("idb", ["ui", "tap", "--udid", UDID, String(Math.round(x)), String(Math.round(y))]);
const idbSwipe = (x1, y1, x2, y2) =>
  sh("idb", ["ui", "swipe", "--udid", UDID, "--duration", "0.4", ...[x1, y1, x2, y2].map((n) => String(Math.round(n)))]);

// Client point = origin + the screen point, with the axes swapped and
// mirrored as the calibration finds them.
let map = null;
const P1 = [700, 300];
const P2 = [500, 450];
const calibrate = async () => {
  await exec("window.__calib = []; window.__block = true; 1");
  idbTap(...P1);
  await sleep(1500);
  idbTap(...P2);
  await sleep(1500);
  const hits = await exec("window.__block = false; window.__calib");
  if (!Array.isArray(hits) || hits.length < 2) {
    console.log(`calibration failed: ${JSON.stringify(hits)}`);
    return false;
  }
  const [c1, c2] = [hits[0], hits.at(-1)];
  const dcx = c2[0] - c1[0];
  const dcy = c2[1] - c1[1];
  const dsx = P2[0] - P1[0];
  const dsy = P2[1] - P1[1];
  const swapped = Math.abs(Math.abs(dcx) - Math.abs(dsy)) < Math.abs(Math.abs(dcx) - Math.abs(dsx));
  map = swapped ? { swapped, kx: Math.sign(dcx / dsy), ky: Math.sign(dcy / dsx), c1 } : { swapped, kx: Math.sign(dcx / dsx), ky: Math.sign(dcy / dsy), c1 };
  console.log(`calibration: ${JSON.stringify(P1)}->${c1.map(Math.round)} ${JSON.stringify(P2)}->${c2.map(Math.round)} ${JSON.stringify(map)}`);
  return true;
};
const toScreen = ([cx, cy]) => {
  const { swapped, kx, ky, c1 } = map;
  const dx = (cx - c1[0]) / kx;
  const dy = (cy - c1[1]) / ky;
  return swapped ? [P1[0] + dy, P1[1] + dx] : [P1[0] + dx, P1[1] + dy];
};
const centreOf = (css) =>
  exec(`(() => { const e = document.querySelector(${JSON.stringify(css)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
const tap = async (css, label) => {
  const centre = await centreOf(css);
  if (!Array.isArray(centre)) return console.log(`${label}: no element ${css}`);
  console.log(`>>> ${label}: real touch on ${css} at client ${centre.map(Math.round).join(",")}`);
  idbTap(...toScreen(centre));
  await sleep(3000);
  await state(`after ${label}`);
};
const swipeClient = (from, to) => idbSwipe(...toScreen(from), ...toScreen(to));

const TRIGGER = "button[aria-haspopup=menu]";
const OTHER = "a[role=menuitem]:not([aria-current])";
let first = true;
const load = async (path) => {
  if (first) sh("xcrun", ["simctl", "openurl", UDID, ORIGIN + path]);
  else await exec(`document.cookie = 'NEXT_LOCALE=; path=/; max-age=0'; history.scrollRestoration = 'manual'; location.href = ${JSON.stringify(path)}; 1`);
  first = false;
  await sleep(9000);
};
const fillSidebar = () => exec("for (const b of document.querySelectorAll('button[aria-expanded=false]:not([aria-haspopup])')) b.click(); 1");
const sidebarToEnd = () =>
  exec(`(() => { let sc = document.querySelector('[aria-haspopup=menu]'); while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement; if (sc) sc.scrollTop = sc.scrollHeight; return 1; })()`);
const pageTo = (y) => () => exec(`window.scrollTo(0, ${y}); 1`);
const swipeSidebar = () => swipeClient([150, 500], [150, 200]);
const swipePage = () => swipeClient([460, 600], [460, 200]);

const jitterTap = async (css, label, dx, dy) => {
  const centre = await centreOf(css);
  if (!Array.isArray(centre)) return console.log(`${label}: no element ${css}`);
  console.log(`>>> ${label}: real touch on ${css} at client ${centre.map(Math.round).join(",")} that moves by ${dx},${dy}`);
  const from = toScreen(centre);
  const to = toScreen([centre[0] + dx, centre[1] + dy]);
  sh("idb", ["ui", "swipe", "--udid", UDID, "--duration", "0.12", "--delta", "1", ...[...from, ...to].map((n) => String(Math.round(n)))]);
  await sleep(3000);
  await state(`after ${label}`);
};
const scenario = async (name, path, press) => {
  console.log(`\n======== ${name}`);
  await load(path);
  if (!(await calibrate())) return;
  await tap(TRIGGER, `${name} trigger`);
  await press(`${name} item`);
  shot(name);
};

const dragClient = async (label, from, to) => {
  console.log(`>>> ${label}: drag from client ${from} to ${to}`);
  sh("idb", ["ui", "swipe", "--udid", UDID, "--duration", "0.5", "--delta", "4", ...[...toScreen(from), ...toScreen(to)].map((n) => String(Math.round(n)))]);
  await sleep(2500);
  await state(`after ${label}`);
};

await load(PAGE);
first = false;
await scenario("N1-move-1px-en", PAGE, (label) => jitterTap(OTHER, label, 0, 1));
await scenario("N2-move-3px-down-en", PAGE, (label) => jitterTap(OTHER, label, 0, 3));
await scenario("N3-move-3px-side-zh", `/zh${PAGE}`, (label) => jitterTap(OTHER, label, 3, 0));
await scenario("N4-move-2px-up-en", PAGE, (label) => jitterTap(OTHER, label, 0, -2));

console.log("\n======== N5 lock: with the menu open, drags must not scroll the page");
await load(PAGE);
await calibrate();
await exec("window.scrollTo(0, 300); 1");
await sleep(1000);
await calibrate();
await tap(TRIGGER, "N5 trigger");
await dragClient("N5 drag on the page content under the backdrop", [600, 800], [600, 400]);
await dragClient("N5 drag that starts on a menu item", [111, 1040], [111, 700]);
await dragClient("N5 slow short drag on the content", [600, 700], [600, 640]);
shot("N5-lock");
process.exit(0);
