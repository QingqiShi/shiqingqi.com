(() => {
  const VARIANTS = [
    ["a", "A 原样：贴顶 + dvh"],
    ["b", "B 贴顶 + svh"],
    ["c", "C 贴底 + svh"],
    ["d", "D 贴底 + dvh"],
    ["e", "E 侧栏 fixed，top/bottom"],
    ["f", "F 底部区 fixed，bottom"],
    ["g", "G 文档不滚，内容区滚"],
  ];
  const current = document.body.dataset.variant;

  const merchants = [
    ["盒马鲜生", "日用"], ["滴滴出行", "交通"], ["瑞幸咖啡", "餐饮"], ["国家电网", "水电"],
    ["京东", "购物"], ["美团外卖", "餐饮"], ["中国移动", "通讯"], ["山姆会员店", "日用"],
    ["地铁", "交通"], ["喜茶", "餐饮"], ["物业费", "住房"], ["优衣库", "服饰"],
  ];
  const rows = [];
  for (let i = 0; i < 160; i++) {
    const [name, cat] = merchants[(i * 7) % merchants.length];
    const day = 30 - Math.floor(i / 6);
    const amt = (((i * 37) % 900) + 12.4 + (i % 3) * 0.35).toFixed(2);
    rows.push(
      `<li><div class="who">${name}<small>9月${day > 0 ? day : 1}日 · ${cat}</small></div><div class="amt">−${amt}</div></li>`,
    );
  }

  const label = VARIANTS.find(([k]) => k === current)?.[1] ?? "";
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div class="shell">
      <aside class="rail">
        <div class="rail-head">家庭账本<small>日常</small></div>
        <nav class="rail-nav">
          <a href="#">概览</a><a href="#" aria-current="page">交易</a><a href="#">预算</a><a href="#">账户</a><a href="#">设置</a>
        </nav>
        <div class="rail-foot">
          <div class="sync">☁︎ 已同步 23:23</div>
          <div class="member"><div class="avatar">老</div><div><b>老公</b><span>日常</span></div><span class="out" aria-hidden="true">⇥</span></div>
        </div>
      </aside>
      <main>
        <div class="frame-warn" hidden>这一页嵌在框架里，Safari 工具栏不会收起，测不出问题。<a href="${location.href}" target="_blank" rel="noopener">在新标签页单独打开</a></div>
        <h1>${label}</h1>
        <p class="lede">在 iPad Safari 里上下滚动，看左下角的同步状态和成员，以及卡片上下的空白。</p>
        <ul class="tx-list">${rows.join("")}</ul>
      </main>
    </div>
    <div class="probe" data-unit="dvh" style="height:100dvh"></div>
    <div class="probe" data-unit="svh" style="height:100svh"></div>
    <div class="probe" data-unit="lvh" style="height:100lvh"></div>`,
  );

  let framed = true;
  try { framed = window.top !== window.self; } catch { framed = true; }
  if (framed) document.querySelector(".frame-warn").hidden = false;

  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <div class="bar">
      <select id="variant" aria-label="切换方案">${VARIANTS.map(
        ([k, l]) => `<option value="${k}"${k === current ? " selected" : ""}>${l}</option>`,
      ).join("")}</select>
      <button type="button" id="reset">清零</button>
      <button type="button" id="min" aria-label="收起读数">–</button>
    </div>
    <div class="body"></div>`;
  document.body.append(hud);
  hud.querySelector("#variant").addEventListener("change", (e) => {
    location.href = `${e.target.value}.html`;
  });
  hud.querySelector("#min").addEventListener("click", () => {
    hud.toggleAttribute("data-min");
  });

  const rail = document.querySelector(".rail");
  const foot = document.querySelector(".rail-foot");
  const body = hud.querySelector(".body");
  const probes = [...document.querySelectorAll(".probe")];
  let range;
  const reset = () => { range = { footMin: Infinity, footMax: -Infinity, topMin: Infinity, topMax: -Infinity, botMax: -Infinity }; };
  reset();
  hud.querySelector("#reset").addEventListener("click", reset);

  const px = (n) => `${Math.round(n)}px`;
  const tick = () => {
    const vh = window.innerHeight;
    const r = rail.getBoundingClientRect();
    const f = foot.getBoundingClientRect();
    const footGap = vh - f.bottom;
    const topGap = r.top;
    const botGap = vh - r.bottom;
    range.footMin = Math.min(range.footMin, footGap);
    range.footMax = Math.max(range.footMax, footGap);
    range.topMin = Math.min(range.topMin, topGap);
    range.topMax = Math.max(range.topMax, topGap);
    range.botMax = Math.max(range.botMax, botGap);
    const vv = window.visualViewport;
    const footMoved = range.footMax - range.footMin;
    const topMoved = range.topMax - range.topMin;
    body.innerHTML = [
      ["顶层页面", framed ? "否（框架）" : "是", framed],
      ["innerHeight", px(vh)],
      ["visualViewport", vv ? `${px(vv.height)} @${px(vv.offsetTop)}` : "—"],
      ...probes.map((p) => [p.dataset.unit, px(p.offsetHeight)]),
      ["卡片上方空白", px(topGap)],
      ["卡片下方空白", px(botGap)],
      ["底部区离底", px(footGap)],
      ["底部区移动范围", px(footMoved), footMoved > 1],
      ["卡片顶移动范围", px(topMoved), topMoved > 1],
      ["下方最大空白", px(range.botMax), range.botMax > 16],
    ]
      .map(([k, v, hot]) => `<div class="row"><span>${k}</span><b${hot ? ' class="hot"' : ""}>${v}</b></div>`)
      .join("");
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
