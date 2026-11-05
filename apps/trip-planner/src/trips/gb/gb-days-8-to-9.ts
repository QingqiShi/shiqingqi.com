import type { Day } from "../types";

export const gbDays8To9: Day[] = [
  {
    n: 8,
    date: "2026-06-26",
    dateLabel: "6月26日",
    weekday: "周五",
    title: "送机 · 布里斯托",
    route: "伯明翰 → 希思罗 → 布里斯托",
    driving: "约 3.5 小时",
    weather: { temp: "12–17°C", summary: "多云，偶有小雨" },
    coords: { lat: 51.4545, lon: -2.5879 }, // 布里斯托 Bristol
    anchors: [
      {
        time: "10:00",
        label: "退房出发（只需 1.5h 到机场）",
        kind: "checkout",
        query: "Aloft Birmingham Eastside",
      },
      {
        time: "11:30",
        label: "Heathrow T3 送 Jim 值机（航班 17:00）",
        kind: "dropoff",
        query: "Heathrow Terminal 3 Departures",
        mode: "driving",
      },
      {
        time: "14:30",
        label: "入住 Hilton Garden Inn Bristol",
        kind: "checkin",
        query: "Hilton Garden Inn Bristol City Centre",
      },
    ],
    nav: [
      {
        label: "伯明翰 → Heathrow T3 送 Jim",
        from: "Aloft Birmingham Eastside",
        to: "Heathrow Terminal 3 Departures",
        mode: "driving",
        note: "约 1.5h；Jim 航班 17:00，时间充裕",
        time: "10:00",
      },
      {
        label: "Heathrow → 布里斯托",
        from: "Heathrow Terminal 3 Departures",
        to: "Hilton Garden Inn Bristol City Centre",
        mode: "driving",
        note: "送完 Jim 后 M4 西行约 1.5h",
        time: "12:30",
      },
    ],
    timeline: [
      { time: "10:00", text: "伯明翰出发（只需 1.5h 到机场）" },
      {
        time: "11:30",
        text: "抵达希思罗，送 Jim 值机（航班 17:00，时间超充裕）",
      },
      { time: "12:30", text: "离开机场，M4 西行" },
      { time: "14:30", text: "抵达布里斯托，入住休息" },
      { time: "16:00", text: "克利夫顿悬索桥 — Clifton Village 散步喝咖啡" },
      { time: "19:00", text: "Harbourside 晚餐" },
    ],
    places: [
      {
        name: "克利夫顿悬索桥",
        query: "Clifton Suspension Bridge",
        time: "16:00",
      },
      {
        name: "Clifton Village",
        query: "Clifton Village, Bristol",
        time: "16:00",
      },
      {
        name: "Bristol Harbourside",
        query: "Bristol Harbourside",
        time: "19:00",
      },
    ],
    restaurants: [
      {
        name: "Wilsons",
        area: "Bristol · Redland",
        time: "19:00",
        query: "Wilsons, 24 Chandos Road, Bristol BS6 6PF",
        tag: "现代英式 · 自家菜园",
        michelin: 1,
        description:
          "主厨夫妇经营的 24 座小馆，食材几乎全来自自家两英亩菜园，同时摘得米其林一星与绿星。",
        price: "Tasting ~£78/人",
        website: "https://www.wilsonsbristol.co.uk",
      },
      {
        name: "Harbour House",
        area: "Bristol · 港畔",
        time: "19:00",
        query: "Harbour House, The Grove, Bristol BS1 4RB",
        tag: "海鲜 · 港畔露台",
        description:
          "坐落于 Brunel 1843 年的船屋，浮动港畔有长露台正对水景，主打西南海鲜与时令料理。",
        price: "~£35–45/人",
        website: "https://hhbristol.com",
      },
      {
        name: "COR",
        area: "Bristol · Bedminster",
        time: "19:00",
        query: "COR, 81 North Street, Bedminster, Bristol BS3 1ES",
        tag: "现代英式 · 小盘菜",
        description:
          "夫妻档主理的街区小馆，连续四年米其林必比登，Bristol 最受欢迎的餐厅之一。",
        price: "~£45–50/人",
        website: "https://www.correstaurant.com",
      },
      {
        name: "The Ox",
        area: "Bristol · Corn St",
        time: "19:00",
        query: "The Ox, 43 Corn Street, Bristol BS1 1HT",
        tag: "牛排馆 · 干式熟成",
        description:
          "Corn Street 地下的人气牛排馆，主打干式熟成牛排，氛围复古亲密。",
        price: "~£45–60/人",
      },
      {
        name: "Wapping Wharf 美食街",
        area: "Bristol · 港畔",
        time: "19:00",
        query: "Wapping Wharf, Gaol Ferry Steps, Bristol BS1 6GW",
        tag: "集装箱美食聚落",
        description: "各种风格随性逛吃，Box-E、Cargo Cantina 等。",
        price: "~£15–25/人",
      },
    ],
    checklists: [
      {
        title: "退房收拾",
        items: [
          "充电器 / 数据线 / 充电宝",
          "浴室洗漱用品",
          "床头柜 / 抽屉 / 衣柜检查",
          "退房还房卡，确认无遗留",
        ],
        time: "10:00",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "送机省钱：直接在 T3 Departures 路边 Drop-off（限 5min，下车即走）= £0。",
        time: "11:30",
      },
      {
        kind: "parking",
        text: "Hilton Garden Inn Bristol 停车约 £10–15/晚。",
        time: "14:30",
      },
      {
        kind: "info",
        text: "Cathay 在希思罗 T3（Jim 航班 17:00，出发前再确认航站楼）。",
        time: "11:30",
      },
    ],
    stay: {
      summary: "Hilton Bristol",
      lodging: [
        {
          name: "Hilton Garden Inn Bristol City Centre",
          query: "Hilton Garden Inn Bristol City Centre",
          address: "Temple Way, Bristol BS1 6BF",
          checkIn: "6.26 周五",
          checkOut: "6.28 周日",
          room: "Twin Room（2 单人床）· 连住 2 晚",
          note: "市中心位置，步行可达 Harbourside 和 Temple Meads 火车站。",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 9,
    date: "2026-06-27",
    dateLabel: "6月27日",
    weekday: "周六",
    title: "巴斯一日",
    route: "布里斯托 ↔ 巴斯",
    driving: "约 0.5 小时",
    weather: {
      temp: "10–17°C",
      summary: "多云间晴，泡温泉舒适",
      note: "泡温泉舒适",
    },
    coords: { lat: 51.3811, lon: -2.359 }, // 巴斯 Bath
    anchors: [
      {
        time: "10:00",
        label: "古罗马浴场 Roman Baths",
        kind: "drive",
        query: "Roman Baths, Bath",
        mode: "driving",
      },
      {
        time: "15:30",
        label: "Clifton 悬索桥 + Clifton Village",
        kind: "drive",
        query: "Clifton Suspension Bridge",
        mode: "driving",
      },
      {
        time: "19:00",
        label: "Bristol 晚餐（研究生毕业纪念）",
        kind: "reservation",
        query: "Wilsons, 24 Chandos Road, Bristol BS6 6PF",
        mode: "transit",
      },
    ],
    nav: [
      {
        label: "布里斯托 → 巴斯 Lansdown P&R",
        from: "Hilton Garden Inn Bristol City Centre",
        to: "Lansdown Park and Ride, Bath",
        mode: "driving",
        note: "P&R 停车 £4 全天，巴士 15min 进城",
        time: "09:30",
      },
      {
        label: "巴斯 P&R → 布里斯托（返回）",
        from: "Lansdown Park and Ride, Bath",
        to: "Hilton Garden Inn Bristol City Centre",
        mode: "driving",
        note: "约 20min 返程",
        time: "17:00",
      },
    ],
    timeline: [
      { time: "09:30", text: "前往巴斯（约 30 分钟）" },
      { time: "10:00", text: "古罗马浴场 — 2000 年温泉遗址，语音导览精彩" },
      { time: "12:00", text: "皇家新月楼 Royal Crescent — 乔治亚建筑典范" },
      { time: "13:00", text: "午餐" },
      {
        time: "14:30",
        text: "Thermae Bath Spa（可选）— 天然温泉屋顶泳池，俯瞰巴斯天际线",
      },
      { time: "17:00", text: "返回布里斯托 或 继续逛巴斯" },
    ],
    places: [
      {
        name: "古罗马浴场 Roman Baths",
        query: "Roman Baths, Bath",
        time: "10:00",
      },
      {
        name: "皇家新月楼 Royal Crescent",
        query: "Royal Crescent, Bath",
        time: "12:00",
      },
      {
        name: "Thermae Bath Spa",
        query: "Thermae Bath Spa",
        note: "可选",
        time: "14:30",
      },
    ],
    restaurants: [
      {
        name: "The Pump Room",
        area: "巴斯",
        time: "13:00",
        query: "The Pump Room, Stall Street, Bath BA1 1LZ",
        tag: "18 世纪历史茶室",
        description:
          "罗马浴场旁，简·奥斯汀笔下的社交场所，早午餐 + 品尝温泉水。",
        price: "~£30–45/人",
        website: "https://www.romanbaths.co.uk/pump-room-restaurant",
      },
      {
        name: "Menu Gordon Jones",
        area: "巴斯",
        time: "13:00",
        query: "Menu Gordon Jones, 2 Wellsway, Bath BA2 3AQ",
        tag: "盲盒 tasting menu",
        description:
          "每天菜单不同，入座前不知道吃什么，6 道式惊喜午餐，非常有趣。",
        price: "午餐 ~£55/人",
        website: "https://www.menugordonjones.co.uk",
      },
      {
        name: "Sally Lunn's",
        area: "巴斯",
        time: "13:00",
        query: "Sally Lunn's, 4 North Parade Passage, Bath BA1 1NX",
        tag: "巴斯最古老建筑之一 · 1482",
        description: "巨型圆面包 Sally Lunn Bun 闻名，下午茶首选。",
        price: "~£15–20/人",
      },
      {
        name: "The Circus Restaurant",
        area: "巴斯",
        time: "13:00",
        query: "The Circus Restaurant, 34 Brock Street, Bath BA1 2LN",
        tag: "圆形广场旁 · 现代英式",
        description: "Bath 本地农场食材，晚餐氛围温馨。",
        price: "~£40–55/人",
        website: "https://www.thecircusrestaurant.co.uk",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "Bath 一定用 Park & Ride（Lansdown / Odd Down，£4 全天）— 市中心停车 £3–4/h 且车位难找。",
        time: "09:30",
      },
      {
        kind: "info",
        text: "休闲日，睡到自然醒；Thermae Bath Spa 屋顶温泉泳池可选，记得带泳裤。",
      },
    ],
    stay: {
      summary: "连住 · Hilton Bristol",
      lodging: [],
      ref: { dayN: 8, label: "同 Day 8 · 布里斯托 Hilton，连住第 2 晚" },
    },
  },
];
