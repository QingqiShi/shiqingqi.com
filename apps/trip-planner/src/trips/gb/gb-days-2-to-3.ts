import type { Day } from "../types";

export const gbDays2To3: Day[] = [
  {
    n: 2,
    date: "2026-06-20",
    dateLabel: "6月20日",
    weekday: "周六",
    title: "诺丁汉大学 · 毕业十周年",
    route: "诺丁汉市内（无需驾车）",
    driving: "无需驾车",
    weather: { temp: "15–28°C", summary: "晴，高温防晒", note: "高温防晒" },
    coords: { lat: 52.9548, lon: -1.1581 }, // 诺丁汉 Nottingham
    anchors: [
      {
        time: "09:30",
        label: "诺丁汉大学 University Park · 毕业十周年打卡",
        kind: "transit",
        query: "University of Nottingham University Park",
        mode: "driving",
      },
      {
        time: "19:00",
        label: "中餐馆聚餐 + 喝大酒（首选 喜得宝）",
        kind: "reservation",
        query: "Mandarin Restaurant, 42 Belward Street, Nottingham NG1 1JZ",
        mode: "transit",
      },
    ],
    nav: [
      {
        label: "酒店 → University Park 校区",
        from: "Crowne Plaza Nottingham",
        to: "University of Nottingham University Park",
        mode: "driving",
        note: "约 10min；也可打车，校园日车可停酒店",
        time: "09:30",
      },
      {
        label: "前往 喜得宝（聚餐）",
        to: "Mandarin Restaurant, 42 Belward Street, Nottingham NG1 1JZ",
        mode: "transit",
        time: "19:00",
      },
    ],
    timeline: [
      {
        time: "09:30",
        text: "University Park 校区 — Trent Building 打卡、湖边散步",
      },
      { time: "11:30", text: "Jubilee 校区 — 看看扩建，湖边现代建筑群" },
      { time: "13:00", text: "校园 / 市区午餐，去当年常吃的地方怀旧" },
      { time: "14:30", text: "市区漫步 — Old Market Square、Hockley 区" },
      { time: "16:30", text: "自由活动 / 回酒店休息" },
      { time: "19:00", text: "中餐馆聚餐 + 喝大酒！毕业十年，干杯" },
      { time: "21:30", text: "转场酒吧 — Rock City / Bodega / Hockley" },
    ],
    places: [
      {
        name: "诺丁汉大学 University Park",
        query: "University of Nottingham University Park",
        time: "09:30",
      },
      {
        name: "Jubilee 校区",
        query: "Jubilee Campus University of Nottingham",
        time: "11:30",
      },
      {
        name: "老集市广场 Old Market Square",
        query: "Old Market Square, Nottingham",
        time: "14:30",
      },
      { name: "Hockley 区", query: "Hockley, Nottingham", time: "14:30" },
    ],
    restaurants: [
      {
        name: "喜得宝 Mandarin Restaurant",
        area: "诺丁汉",
        time: "19:00",
        query: "Mandarin Restaurant, 42 Belward Street, Nottingham NG1 1JZ",
        tag: "粤菜 · 点心",
        status: "pick",
        description:
          "诺丁汉华人圈公认好馆子，60+ 款点心，烧鸭和明炉烧味一流。1994 年老店。",
        price: "~£25–35/人",
        website: "https://www.mandarin-restaurant.co.uk",
      },
      {
        name: "Shanghai Shanghai",
        area: "诺丁汉",
        time: "19:00",
        query: "Shanghai Shanghai, 15 Goose Gate, Nottingham NG1 1FE",
        tag: "粤菜 · 港式",
        description:
          "Hockley 区人气中餐，点菜制菜量足，适合多人聚餐点一桌配酒。",
        price: "~£25–35/人",
      },
      {
        name: "Mayfair Chinese Restaurant",
        area: "诺丁汉",
        time: "19:00",
        query:
          "Mayfair Chinese Restaurant, 79 Mansfield Road, Nottingham NG1 3FN",
        tag: "粤菜 · 川菜 · 自带酒水",
        description:
          "30 年家族老店，TripAdvisor 4.5 星。自带酒水免开瓶费（隔壁就是酒铺），能容纳 18+ 人点一桌粤川小炒，仅收现金。",
        price: "~£15–25/人",
      },
      {
        name: "Four Seasons 火锅",
        area: "诺丁汉",
        time: "19:00",
        query: "Four Seasons Hot Pot, 148 Mansfield Road, Nottingham NG1 3HW",
        tag: "火锅 · 烧烤 · 自助",
        description:
          "自助火锅 + 桌上烧烤，天生适合一群人热闹聚餐，含无限软饮，和其他几家风格完全不同。",
        price: "~£29–35/人",
      },
      {
        name: "Chino Latino",
        area: "诺丁汉",
        time: "19:00",
        query: "Chino Latino, 41 Maid Marian Way, Nottingham NG1 6GD",
        tag: "泛亚洲 · 鸡尾酒",
        description:
          "Park Plaza 酒店内，氛围好鸡尾酒出色，适合喝酒吃饭一体的夜晚。",
        price: "~£35–50/人",
      },
      {
        name: "Rock City",
        area: "诺丁汉",
        time: "21:30",
        query: "Rock City, 8 Talbot Street, Nottingham NG1 5GG",
        tag: "传奇夜店",
        description:
          "诺丁汉地标级音乐场所，学生时代回忆杀，周六有 club night。",
      },
      {
        name: "Bodega",
        area: "诺丁汉",
        time: "21:30",
        query: "The Bodega, 23 Pelham Street, Nottingham NG1 2ED",
        tag: "现场音乐酒吧",
        description:
          "和 Rock City 同属 DHP 的现场音乐小酒吧（Pelham Street），气氛好，适合微醺聊天。",
      },
    ],
    tips: [
      {
        kind: "drive",
        text: "校园日预测高温 28°C，注意防晒补水；晚上喝酒约 15°C，带件薄外套。",
      },
      {
        kind: "money",
        text: "部分中餐馆收现金 / 可自带酒水（如 Mayfair Chinese 隔壁就是酒铺），带点现金。",
        time: "19:00",
      },
      {
        kind: "info",
        text: "城内步行 / 打车为主，车停酒店即可，毕业十年好好喝一场。",
      },
    ],
    stay: {
      summary: "连住 · Crowne Plaza",
      lodging: [],
      ref: { dayN: 1, label: "同 Day 1 · Crowne Plaza 诺丁汉，连住第 2 晚" },
    },
  },
  {
    n: 3,
    date: "2026-06-21",
    dateLabel: "6月21日",
    weekday: "周日",
    title: "北上苏格兰 · 因弗内斯",
    route: "诺丁汉 → A9 → 因弗内斯",
    driving: "约 6.5 小时",
    weather: { temp: "11–19°C", summary: "有阵雨，北上渐凉", note: "北上渐凉" },
    coords: { lat: 57.4778, lon: -4.2247 }, // 因弗内斯 Inverness
    anchors: [
      {
        time: "10:00",
        label: "退房出发，A1(M) 北上",
        kind: "checkout",
        query: "Crowne Plaza Nottingham",
      },
      {
        time: "12:00",
        label: "Angel of the North 拍照（15min）",
        kind: "drive",
        query: "Angel of the North car park",
        mode: "driving",
      },
      {
        time: "13:30",
        label: "Forth Bridge 观景 + 午餐",
        kind: "drive",
        query: "Queensferry High Street, South Queensferry",
        mode: "driving",
      },
      {
        time: "18:30",
        label: "入住因弗内斯独栋",
        kind: "checkin",
        query: "41 Essich Gardens, Inverness IV2 6BW",
      },
    ],
    nav: [
      {
        label: "诺丁汉 → Angel of the North",
        from: "Crowne Plaza Nottingham",
        to: "Angel of the North car park",
        mode: "driving",
        note: "M1 → A1(M) 约 2h；免费停车拍照",
        time: "10:00",
      },
      {
        label: "Angel of the North → Forth Bridge",
        from: "Angel of the North car park",
        to: "Queensferry High Street, South Queensferry",
        mode: "driving",
        note: "A1(M) 北上，三桥并排 + 快速午餐",
        time: "12:00",
      },
      {
        label: "Forth Bridge → Pitlochry",
        from: "Queensferry High Street, South Queensferry",
        to: "Pitlochry town centre",
        mode: "driving",
        note: "M90 → A9 进入高地，歇脚 20min",
        time: "14:15",
      },
      {
        label: "Pitlochry → 因弗内斯",
        from: "Pitlochry town centre",
        to: "41 Essich Gardens, Inverness IV2 6BW",
        mode: "driving",
        note: "A9 穿凯恩戈姆，layby 随时停拍",
        time: "15:30",
      },
    ],
    timeline: [
      { time: "10:00", text: "退房出发，M1 → A1(M) 一路北上" },
      {
        time: "12:00",
        text: "Angel of the North — A1(M) J65 旁 20m 巨型天使雕塑，免费停车拍照 15min",
      },
      {
        time: "13:30",
        text: "Forth Bridge — South Queensferry 看三桥并排（红色铁路桥=世界遗产）+ 快速午餐",
      },
      { time: "14:15", text: "过 Forth Bridge → M90 → A9 进入苏格兰高地" },
      {
        time: "15:00",
        text: "Pitlochry — 高地门户小镇，歇脚 20min（三文鱼阶梯 / 咖啡）",
      },
      { time: "15:30", text: "继续 A9 北上，穿越凯恩戈姆国家公园，风景渐壮丽" },
      { time: "18:30", text: "抵达因弗内斯，尼斯河畔散步" },
      { time: "19:30", text: "晚餐 The Mustard Seed（河景餐厅）" },
      { time: "21:00", text: "Castle Tavern 威士忌热身，为明天酒厂日预热" },
    ],
    places: [
      {
        name: "Angel of the North",
        query: "Angel of the North",
        note: "A1 旁 · 拍照",
        time: "12:00",
      },
      {
        name: "Forth Bridge · South Queensferry",
        query: "Queensferry High Street, South Queensferry",
        note: "三桥并排",
        time: "13:30",
      },
      {
        name: "Pitlochry",
        query: "Pitlochry town centre",
        note: "高地门户 · 歇脚",
        time: "15:00",
      },
      {
        name: "凯恩戈姆国家公园 Cairngorms",
        query: "Cairngorms National Park",
        time: "15:30",
      },
      {
        name: "尼斯河畔 River Ness",
        query: "River Ness, Inverness",
        time: "18:30",
      },
    ],
    restaurants: [
      {
        name: "The Mustard Seed",
        area: "因弗内斯",
        time: "19:30",
        query: "The Mustard Seed, 16 Fraser Street, Inverness IV1 1DW",
        tag: "尼斯河景 · 苏格兰料理",
        status: "pick",
        description:
          "老教堂改建，苏格兰本地食材，河景位极佳，性价比高，当地人气第一。",
        price: "~£30–45/人",
        website: "https://www.mustardseedrestaurant.co.uk",
      },
      {
        name: "Castle Tavern",
        area: "因弗内斯",
        time: "21:00",
        query: "Castle Tavern, 1-2 View Place, Inverness IV2 4SA",
        tag: "威士忌吧",
        description:
          "因弗内斯城堡正下方，本地人最爱，100+ 种单麦，晚上热身必去。",
        price: "Dram £5–15",
      },
      {
        name: "Rocpool Restaurant",
        area: "因弗内斯",
        time: "19:30",
        query: "Rocpool Restaurant, 1 Ness Walk, Inverness IV3 5NE",
        tag: "现代苏格兰 · fine dining",
        description:
          "Inverness 最佳 fine dining，苏格兰牛排和海鲜，河畔位置服务好。",
        price: "~£45–60/人",
        website: "https://www.rocpoolrestaurant.com",
      },
      {
        name: "The Malt Room",
        area: "因弗内斯",
        time: "21:00",
        query: "The Malt Room, 34 Church Street, Inverness IV1 1EH",
        tag: "威士忌品鉴吧",
        description:
          "200+ 种苏格兰单麦，专业品鉴套餐可选，比 Castle Tavern 更安静专注。",
        price: "品鉴 ~£20–40/人",
      },
      {
        name: "Hootananny",
        area: "因弗内斯",
        time: "21:00",
        query: "Hootananny, 67 Church Street, Inverness IV1 1ES",
        tag: "现场音乐酒吧",
        description:
          "苏格兰传统音乐现场，每晚有 live music（凯尔特 / 民谣），吃喝一体。",
        price: "~£15–25/人",
      },
      {
        name: "Moulin Hotel",
        area: "Pitlochry · 途中午餐",
        time: "15:00",
        query: "Moulin Hotel, Moulin, Pitlochry PH16 5EH",
        tag: "1695 高地酒馆",
        description:
          "苏格兰最古老酒馆之一，自酿啤酒（Old Remedial / Ale of Atholl 等），Haggis 和牛肉派，途中歇脚午餐绝佳。",
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
        kind: "drive",
        text: "A9 Tomatin–Moy 段限速 40mph（施工至 2028），最后半小时会慢一点。",
        time: "15:30",
      },
      {
        kind: "drive",
        text: "过 Perth 后进入高地，路边 layby 随时停车拍荒野风光。",
        time: "14:15",
      },
      {
        kind: "fuel",
        text: "Inverness 之后加油站渐少，出发前 / 沿途加满。",
      },
      {
        kind: "info",
        text: "高地日落约 22:15，傍晚仍亮；昨晚的酒今早应该醒了。",
      },
    ],
    stay: {
      summary: "因弗内斯独栋",
      lodging: [
        {
          name: "Modern 2 Bedroom Semi-detached House",
          query: "41 Essich Gardens Inverness IV2 6BW",
          address: "41 Essich Gardens, Inverness, IV2 6BW",
          checkIn: "6.21 周日 16:00",
          checkOut: "6.23 周二 10:00",
          room: "独栋 2 居室 · 连住 2 晚 · 带私人车位",
          note: "Booking.com ⭐9.6。门口密码锁箱取钥匙，密码到达前 24h 发送。",
          status: "booked",
        },
      ],
    },
  },
];
