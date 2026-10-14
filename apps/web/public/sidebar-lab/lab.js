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
  const NAVS = [["short", "导航：短（家庭账本）"], ["long", "导航：长，要滚动"]];
  const FOOTS = [["finance", "底部：家庭账本"], ["ds", "底部：设计系统（浮动）"]];
  const current = document.body.dataset.variant;
  const params = new URLSearchParams(location.search);
  const nav = params.get("nav") === "long" ? "long" : "short";
  const foot = params.get("foot") === "ds" ? "ds" : "finance";
  document.body.dataset.nav = nav;
  document.body.dataset.foot = foot;

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

  const longNav = [
    ["基础", ["颜色", "字体", "间距", "圆角", "阴影", "动效", "图层", "断点"]],
    ["原语", ["弹性布局", "网格", "页面栏", "焦点环", "滚动条", "无障碍"]],
    ["组件", ["按钮", "输入框", "选择器", "开关", "标签栏", "抽屉", "弹出层", "对话框", "提示", "表格", "卡片", "徽章", "头像", "进度条", "滚动遮罩", "侧栏布局"]],
  ];
  const navHtml =
    nav === "long"
      ? longNav
          .map(([g, links], gi) => `<div class="group">${g}</div>${links
            .map((l, li) => `<a href="#"${gi === 2 && li === 0 ? ' aria-current="page"' : ""}>${l}</a>`)
            .join("")}`)
          .join("")
      : `<a href="#">概览</a><a href="#" aria-current="page">交易</a><a href="#">预算</a><a href="#">账户</a><a href="#">设置</a>`;
  const footHtml =
    foot === "ds"
      ? `<div class="foot-inner controls">
          <button type="button" class="ctl" id="lang" aria-expanded="false">中文 ▾</button>
          <button type="button" class="ctl round" aria-label="切换主题">◐</button>
          <div class="menu" id="lang-menu" hidden><a href="#">English</a><a href="#">中文</a></div>
        </div>`
      : `<div class="foot-inner">
          <div class="sync">☁︎ 已同步 23:23</div>
          <div class="member"><div class="avatar">老</div><div><b>老公</b><span>日常</span></div><span class="out" aria-hidden="true">⇥</span></div>
        </div>`;
  const headHtml = foot === "ds" ? "设计系统<small>石清琪</small>" : "家庭账本<small>日常</small>";

  const label = VARIANTS.find(([k]) => k === current)?.[1] ?? "";
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div class="shell">
      <aside class="rail">
        <div class="scroller">
          <div class="rail-head">${headHtml}</div>
          <nav class="rail-nav">${navHtml}</nav>
          <div class="rail-foot">${footHtml}</div>
        </div>
      </aside>
      <main>
        <div class="frame-warn" hidden>这一页嵌在框架里，Safari 工具栏不会收起，测不出问题。<a href="${location.href}" target="_blank" rel="noopener">在新标签页单独打开</a></div>
        <h1>${label}</h1>
        <p class="lede">在 iPad Safari 里上下滚动右边的列表，看侧栏底部和卡片上下的空白。长导航时，也滚一滚侧栏本身。</p>
        <ul class="tx-list">${rows.join("")}</ul>
      </main>
    </div>
    <div class="probe" data-unit="dvh" style="height:100dvh"></div>
    <div class="probe" data-unit="svh" style="height:100svh"></div>
    <div class="probe" data-unit="lvh" style="height:100lvh"></div>`,
  );

  const lang = document.getElementById("lang");
  if (lang) {
    const menu = document.getElementById("lang-menu");
    lang.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
      lang.setAttribute("aria-expanded", String(!menu.hidden));
    });
  }

  let framed = true;
  try { framed = window.top !== window.self; } catch { framed = true; }
  if (framed) document.querySelector(".frame-warn").hidden = false;

  const options = (list, value) =>
    list.map(([k, l]) => `<option value="${k}"${k === value ? " selected" : ""}>${l}</option>`).join("");
  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <div class="bar">
      <select id="variant" aria-label="切换方案">${options(VARIANTS, current)}</select>
      <button type="button" id="reset">清零</button>
      <button type="button" id="min" aria-label="收起读数">–</button>
    </div>
    <div class="bar opts">
      <select id="nav" aria-label="导航长度">${options(NAVS, nav)}</select>
      <select id="foot" aria-label="底部样式">${options(FOOTS, foot)}</select>
    </div>
    <div class="body"></div>`;
  document.body.append(hud);
  const go = () => {
    const v = hud.querySelector("#variant").value;
    const q = new URLSearchParams({ nav: hud.querySelector("#nav").value, foot: hud.querySelector("#foot").value });
    location.href = `${v}.html?${q}`;
  };
  for (const id of ["#variant", "#nav", "#foot"]) hud.querySelector(id).addEventListener("change", go);
  hud.querySelector("#min").addEventListener("click", () => {
    hud.toggleAttribute("data-min");
  });

  const rail = document.querySelector(".rail");
  const footEl = document.querySelector(".rail-foot");
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--foot-h", `${footEl.offsetHeight}px`);
  }).observe(footEl);

  const body = hud.querySelector(".body");
  const probes = [...document.querySelectorAll(".probe")];
  let range;
  const reset = () => { range = { footMin: Infinity, footMax: -Infinity, topMin: Infinity, topMax: -Infinity, botMax: -Infinity, sepMax: -Infinity }; };
  reset();
  hud.querySelector("#reset").addEventListener("click", reset);

  const px = (n) => `${Math.round(n)}px`;
  const tick = () => {
    const vh = window.innerHeight;
    const r = rail.getBoundingClientRect();
    const f = footEl.getBoundingClientRect();
    const footGap = vh - f.bottom;
    const topGap = r.top;
    const botGap = vh - r.bottom;
    // How far the footer's bottom and the card's bottom edge are apart.
    const sep = Math.abs(f.bottom - r.bottom);
    range.footMin = Math.min(range.footMin, footGap);
    range.footMax = Math.max(range.footMax, footGap);
    range.topMin = Math.min(range.topMin, topGap);
    range.topMax = Math.max(range.topMax, topGap);
    range.botMax = Math.max(range.botMax, botGap);
    range.sepMax = Math.max(range.sepMax, sep);
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
      ["底部区与卡片底错开", px(range.sepMax), range.sepMax > 1],
    ]
      .map(([k, v, hot]) => `<div class="row"><span>${k}</span><b${hot ? ' class="hot"' : ""}>${v}</b></div>`)
      .join("");
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
