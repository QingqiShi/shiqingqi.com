import type { Day } from "../types";

export const tuscanyDays3To4: Day[] = [
  {
    n: 3,
    date: "2026-06-14",
    dateLabel: "6月14日",
    weekday: "周日",
    title: "海滩日 · 白沙滩与 Maremma 海岸",
    route: "Spiagge Bianche → Castiglione della Pescaia",
    driving: "约 5h40 自驾",
    weather: { temp: "20–29°C", summary: "晴，海边风大，紫外线强" },
    coords: { lat: 42.7639, lon: 10.8806 }, // Castiglione della Pescaia
    anchors: [
      {
        time: "08:30",
        label: "出发去 Spiagge Bianche（约 2h15）",
        kind: "drive",
        query: "Spiagge Bianche, Rosignano Solvay",
        mode: "driving",
      },
    ],
    nav: [
      {
        label: "酒店 → Spiagge Bianche（白沙滩）",
        to: "Spiagge Bianche, Rosignano Solvay",
        mode: "driving",
        note: "约 2h15，经 Siena → SS68 往海边。",
        time: "08:30",
      },
      {
        label: "Spiagge Bianche → Castiglione della Pescaia",
        to: "Castiglione della Pescaia",
        mode: "driving",
        note: "约 1h25，沿海岸往南进 Maremma。",
        time: "14:30",
      },
      {
        label: "Castiglione → Villa Vignacce（回酒店）",
        to: "Villa Vignacce, Bettolle",
        from: "Castiglione della Pescaia",
        mode: "driving",
        note: "约 2 小时，夜路开慢点。",
        time: "21:00",
      },
    ],
    timeline: [
      {
        time: "08:30",
        text: "出发去 Spiagge Bianche（约 2h15），带好泳衣防晒",
      },
      {
        time: "11:00",
        text: "Spiagge Bianche：全段公共免费白沙滩，海水蓝得不真实；拍照游泳，部分区域没有设施，自备水和伞",
      },
      {
        time: "13:00",
        text: "简单午餐：Vada 或 Rosignano 镇上的海边小馆 / 外带",
      },
      { time: "14:30", text: "出发去 Castiglione della Pescaia（约 1h25）" },
      {
        time: "16:00",
        text: "Castiglione della Pescaia：先上老城——爬到城堡区俯瞰海岸线，再下来海滩游泳（公共段 + 付费浴场都有）",
      },
      { time: "19:30", text: "港口边海鲜晚餐，看渔船回港" },
      {
        time: "21:00",
        text: "回 Villa Vignacce（约 2 小时）。到酒店后记得：Ryanair App 给明天 FR1412 网上值机、存好登机牌",
      },
    ],
    places: [
      {
        name: "Spiagge Bianche",
        query: "Spiagge Bianche, Rosignano Solvay",
        note: "「加勒比」白沙滩，全段公共免费",
        time: "11:00",
      },
      {
        name: "午餐 · Vada 海边小馆（现场挑）",
        query: "ristorante, Vada",
        note: "一键搜 Vada 镇上的馆子，海边外带也行",
        time: "13:00",
      },
      {
        name: "Castiglione 老城与城堡",
        query: "Castello di Castiglione della Pescaia",
        note: "石巷爬上去，城墙看海",
        time: "16:00",
      },
      {
        name: "Castiglione 海滩",
        query: "Spiaggia di Levante, Castiglione della Pescaia",
        note: "免费公共段 + 付费浴场",
        time: "16:00",
      },
      {
        name: "海鲜晚餐 · 港口边（现场挑）",
        query: "ristorante di pesce, Castiglione della Pescaia",
        note: "一键搜港口海鲜馆，挑本地人多的",
        time: "19:30",
      },
    ],
    restaurants: [],
    tips: [
      {
        kind: "warn",
        text: "Plan B：如果 D1 / D2 有没去成的（San Gimignano 或 Val d'Orcia 漏掉的镇子），今天整天放弃海滩改去补——San Gimignano 早上先去（约 1h30 车程，周日人也多尽量早到），下午回程顺路把漏的镇子收掉，还省下海滩日 5 个半小时的来回车。",
      },
      {
        kind: "info",
        text: "Spiagge Bianche 的「加勒比白」来自旁边 Solvay 碱厂的碳酸钙排放——拍照绝美，但污染是真的：排水口附近重金属超标，出水口 100 米内禁止游泳。要下水就往南走远一点，或只拍照、留到 Castiglione 再游。",
        time: "11:00",
      },
      {
        kind: "warn",
        text: "6 月的周日海边是本地人主场，停车位紧张——尽量 11 点前到白沙滩；水、伞、防晒自备。",
      },
      {
        kind: "money",
        text: "Castiglione 海滩分免费公共段（spiaggia libera）和付费浴场（stabilimento，两椅一伞约 €20–35，含淋浴更衣）。",
        time: "16:00",
      },
      {
        kind: "info",
        text: "今天来回要开约 5 个半小时——嫌多就二选一：想拍照游泳选白沙滩，想小镇 + 傍晚海鲜选 Castiglione。",
      },
      {
        kind: "info",
        text: "港口边海鲜馆子不用提前定死，到了沿港口挑一家本地人多的就行。",
        time: "19:30",
      },
    ],
    stay: {
      summary: "Villa Vignacce（同 D0）",
      lodging: [],
      ref: { dayN: 0, label: "同 D0 · Villa Vignacce" },
      note: "明早 9 点退房出发去 Pisa（约 2 小时）——今晚别太晚回。",
    },
  },
  {
    n: 4,
    date: "2026-06-15",
    dateLabel: "6月15日",
    weekday: "周一",
    title: "还车 · 飞回伦敦",
    route: "Villa Vignacce → Pisa 机场 ✈ Stansted",
    driving: "约 2h 自驾",
    weather: { temp: "17–30°C", summary: "晴" },
    coords: { lat: 43.6839, lon: 10.3927 }, // Pisa 机场
    anchors: [
      {
        time: "09:15",
        label: "退房出发（check-out 9:00–10:00 · 去机场约 2h）",
        kind: "checkout",
      },
      {
        time: "11:30",
        label: "Avis 还车（先加满油）",
        kind: "dropoff",
        query: "Avis, Pisa Airport",
        mode: "driving",
      },
      {
        time: "13:40",
        label: "FR1412 起飞 · 飞 Stansted（2h20）",
        kind: "flight",
      },
    ],
    nav: [
      {
        label: "Villa Vignacce → Pisa 机场（先加油）",
        to: "Pisa International Airport",
        mode: "driving",
        note: "约 2 小时：A1 北上转 FI-PI-LI。快到时导航搜「benzinaio」找机场附近加油站，加满留小票再进还车场。",
        time: "09:15",
      },
      {
        label: "Stansted → 家（Navigation Point）",
        to: "Navigation Point, London N17 9LX",
        from: "London Stansted Airport",
        mode: "transit",
        note: "Stansted Express 直达 Tottenham Hale 约 35 分钟，出站步行到家；累了就 Uber。",
        time: "15:00",
      },
    ],
    timeline: [
      {
        time: "09:15",
        text: "早餐收拾，9 点一过退房出发去 Pisa（check-out 窗口 9:00–10:00，路程约 2 小时）",
      },
      { time: "11:05", text: "机场附近加油站把油加满、留小票" },
      { time: "11:30", text: "Avis 还车：拍照留底，确认无新增费用" },
      {
        time: "11:50",
        text: "PSA 机场很小，安检快；行李托运截止一般为起飞前 40 分钟",
      },
      { time: "13:40", text: "FR1412（Ryanair）起飞 · 飞行 2h20" },
      {
        time: "15:00",
        text: "落地 Stansted（英国时间）· Stansted Express 直达 Tottenham Hale 约 35 分钟，到家很顺",
      },
    ],
    checklists: [
      {
        title: "还车检查",
        items: [
          "加满油并保留加油小票",
          "清空车内随身物品（墨镜 / 充电线 / 停车票）",
          "绕车拍照录像留底",
          "Telepass 设备按取车时的说明处理",
          "记下还车时的里程和油表读数",
        ],
        time: "11:30",
      },
    ],
    places: [],
    restaurants: [],
    tips: [
      {
        kind: "fuel",
        text: "Full-to-full 还车：机场 3km 内的加油站略贵但省事；「Fai da te」自助比「Servito」人工便宜不少。",
        time: "11:05",
      },
      {
        kind: "info",
        text: "PSA 是小机场，起飞前 2 小时到绰绰有余；过了安检吃的不多，早饭吃饱再来。",
      },
      {
        kind: "warn",
        text: "Ryanair 必须提前网上值机（最晚起飞前 2 小时关闭），到柜台再办要收约 €55/人——前一天晚上就在 App 里办好、存好登机牌。",
      },
    ],
    stay: {
      summary: "回家 · 返程航班",
      lodging: [],
      note: "FR1412（Ryanair）13:40 自 Pisa 起飞，约 15:00（英国时间）落地 Stansted。",
    },
  },
];
