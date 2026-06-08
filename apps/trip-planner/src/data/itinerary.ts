/**
 * Great Britain 2026 road-trip itinerary — hard-coded, read-only content.
 *
 * Extracted from the trip plan. All copy is Chinese (the app is zh-only).
 * Locations carry a Google Maps search `query`; restaurants and lodgings add
 * websites/booking details where known.
 */

/** A place worth visiting on a given day. `query` opens Google Maps. */
export interface MapPlace {
  name: string;
  query: string;
  note?: string;
}

/** A confirmed booking attached to a restaurant. */
export interface Booking {
  date?: string;
  time?: string;
  party?: string;
  by?: string;
  contact?: string;
  note?: string;
}

export interface Restaurant {
  name: string;
  query: string;
  tag: string;
  description: string;
  price?: string;
  website?: string;
  /** Michelin stars, when starred. */
  michelin?: 1 | 3;
  /** "booked" = confirmed reservation, "pick" = the planned choice. */
  status?: "booked" | "pick";
  booking?: Booking;
}

export interface Lodging {
  name: string;
  query?: string;
  address?: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  room?: string;
  note?: string;
  status: "booked" | "option" | "pending";
  recommended?: boolean;
}

export interface Stay {
  /** One-line summary for the overview list. */
  summary: string;
  /** Lodgings for this night. Empty when `ref` points at an earlier night. */
  lodging: Lodging[];
  /** Same bed as an earlier day (consecutive nights). */
  ref?: { dayN: number; label: string };
  note?: string;
  bookingUrl?: string;
}

export interface TimelineItem {
  time: string;
  text: string;
}

export interface Weather {
  temp: string;
  summary: string;
}

export interface Day {
  n: number;
  /** ISO date, e.g. "2026-06-19". */
  date: string;
  dateLabel: string;
  weekday: string;
  title: string;
  route: string;
  driving?: string;
  weather?: Weather;
  timeline: TimelineItem[];
  places: MapPlace[];
  restaurants: Restaurant[];
  stay: Stay;
}

export interface Trip {
  title: string;
  subtitle: string;
  dateRange: string;
  party: string;
  days: Day[];
}

const days: Day[] = [
  {
    n: 0,
    date: "2026-06-18",
    dateLabel: "6月18日",
    weekday: "周四",
    title: "抵达伦敦 · 取车 · Omakase",
    route: "Gatwick 取车 → Mayfair → Chingford",
    timeline: [
      {
        time: "白天",
        text: "抵达伦敦，Gatwick 机场取车（租期 6.18–6.30，共 13 天）",
      },
      {
        time: "17:30",
        text: "Maru Omakase 晚餐 — Shepherd Market, Mayfair，18+ 道江户前 omakase（2 人已预订）",
      },
      {
        time: "晚上",
        text: "入住 Holiday Inn Express Chingford，为明早出发休整",
      },
    ],
    places: [],
    restaurants: [
      {
        name: "Maru Omakase",
        query: "Maru, 18 Shepherd Market, London W1J 7QH",
        tag: "Omakase · 18+ 道",
        status: "booked",
        description:
          "MARU London 的主厨发办江户前 omakase，18 道以上。位于 Mayfair 的 Shepherd Market。",
        booking: {
          date: "6.18 周四",
          time: "17:30",
          party: "2 人",
          by: "Qingqi Shi",
          note: "确认号 #1940 · OpenTable",
        },
      },
    ],
    stay: {
      summary: "Holiday Inn Chingford",
      lodging: [
        {
          name: "Holiday Inn Express London - Chingford",
          query: "Holiday Inn Express London Chingford",
          address: "Chingford, London E4",
          note: "免费停车，6.19 一早从这里出发接机。",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 1,
    date: "2026-06-19",
    dateLabel: "6月19日",
    weekday: "周五",
    title: "抵达英国 · 剑桥 · 诺丁汉",
    route: "希思罗接机 → 剑桥 → 诺丁汉",
    driving: "约 4 小时",
    weather: { temp: "17–24°C", summary: "晴，热浪开局" },
    timeline: [
      { time: "06:30", text: "从 Chingford 出发（Jim 的航班 06:20 落地 T3）" },
      { time: "06:55", text: "到 N17 接石头上车" },
      { time: "07:55", text: "抵达 Heathrow T3，等 Jim 出关" },
      { time: "08:30", text: "接到 Jim，三人出发，M4 → M25 → M11 北上" },
      {
        time: "10:00",
        text: "剑桥 — 康河撑篙、国王学院、三一学院（约 2.5 小时）",
      },
      { time: "13:00", text: "午餐后出发前往诺丁汉" },
      { time: "15:00", text: "抵达诺丁汉，Crowne Plaza 入住" },
      { time: "16:00", text: "沃莱顿大厅 — 蝙蝠侠韦恩庄园取景地，花园散步" },
    ],
    places: [
      { name: "国王学院 King's College", query: "King's College, Cambridge" },
      { name: "三一学院 Trinity College", query: "Trinity College, Cambridge" },
      { name: "沃莱顿大厅 Wollaton Hall", query: "Wollaton Hall, Nottingham" },
    ],
    restaurants: [
      {
        name: "Restaurant Sat Bains",
        query: "Restaurant Sat Bains, Lenton Lane, Nottingham NG7 2SA",
        tag: "创意料理",
        michelin: 3,
        description:
          "英国顶级创意料理，10 道式 tasting menu，食材来自自家菜园。需提前数周预订。",
        price: "~£165/人",
        website: "https://www.restaurantsatbains.com",
      },
      {
        name: "Alchemilla",
        query: "Alchemilla, 192a Derby Road, Nottingham NG7 1NF",
        tag: "现代欧洲",
        description:
          "教堂改建的餐厅，氛围绝佳。蔬菜为主的创意菜单，性价比极高。",
        price: "~£65–80/人",
        website: "https://www.alchemillarestaurant.uk",
      },
      {
        name: "Ye Olde Trip to Jerusalem",
        query:
          "Ye Olde Trip to Jerusalem, 1 Brewhouse Yard, Nottingham NG1 6AD",
        tag: "历史酒吧 · 1189",
        description:
          "全英最古老的洞穴酒吧，氛围独特，适合轻松一杯配 pub food。",
        price: "~£15–25/人",
      },
      {
        name: "MemSaab",
        query: "MemSaab, 12-14 Maid Marian Way, Nottingham NG1 6HS",
        tag: "印度菜",
        description: "多次获奖的印度餐厅，Tandoori 和 Biryani 极佳。",
        price: "~£25–35/人",
        website: "https://www.mem-saab.co.uk",
      },
      {
        name: "Kushi-ya",
        query: "Kushi-ya, 14a Low Pavement, Nottingham NG1 7DL",
        tag: "日式居酒屋",
        description:
          "Hockley 区人气日料，炭火串烧 + 清酒。小店氛围好，适合喝酒撸串。",
        price: "~£30–40/人",
        website: "https://www.kushi-ya.co.uk",
      },
      {
        name: "Sexy Mama Loves Spaghetti",
        query:
          "Sexy Mamma Love Spaghetti, 3 Heathcoat Street, Nottingham NG1 3AF",
        tag: "意大利面",
        description: "Hockley 区排队名店，手工意面 + 意式肉酱。",
        price: "~£15–22/人",
      },
    ],
    stay: {
      summary: "Crowne Plaza 诺丁汉",
      lodging: [
        {
          name: "Crowne Plaza 诺丁汉",
          query: "Crowne Plaza Nottingham",
          address: "Wollaton St, NG1 5RH",
          phone: "+44 115 936 9988",
          checkIn: "6.19 周五 15:00",
          checkOut: "6.21 周日 12:00",
          room: "2 间双床房 · 连住 2 晚",
          note: "住客：WONG JIM、Yang Muyu",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 2,
    date: "2026-06-20",
    dateLabel: "6月20日",
    weekday: "周六",
    title: "诺丁汉大学 · 毕业十周年",
    route: "诺丁汉市内（无需驾车）",
    driving: "无需驾车",
    weather: { temp: "15–28°C", summary: "晴，高温防晒" },
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
      },
      {
        name: "Jubilee 校区",
        query: "Jubilee Campus University of Nottingham",
      },
      {
        name: "老集市广场 Old Market Square",
        query: "Old Market Square, Nottingham",
      },
      { name: "Hockley 区", query: "Hockley, Nottingham" },
    ],
    restaurants: [
      {
        name: "喜得宝 Mandarin Restaurant",
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
        query: "Shanghai Shanghai, 15 Goose Gate, Nottingham NG1 1FE",
        tag: "沪菜",
        description:
          "Hockley 区人气中餐，点菜制菜量足，适合多人聚餐点一桌配酒。",
        price: "~£25–35/人",
      },
      {
        name: "Orient Restaurant",
        query: "Orient Chinese Restaurant Nottingham",
        tag: "粤菜",
        description: "诺丁汉老牌中餐厅，传统粤菜，港式点心和烧腊。",
        price: "~£25–35/人",
      },
      {
        name: "Chino Latino",
        query: "Chino Latino, 41 Maid Marian Way, Nottingham NG1 6GD",
        tag: "泛亚洲 · 鸡尾酒",
        description:
          "Park Plaza 酒店内，氛围好鸡尾酒出色，适合喝酒吃饭一体的夜晚。",
        price: "~£35–50/人",
      },
      {
        name: "Rock City",
        query: "Rock City, 8 Talbot Street, Nottingham NG1 5GG",
        tag: "传奇夜店",
        description:
          "诺丁汉地标级音乐场所，学生时代回忆杀，周六有 club night。",
      },
      {
        name: "Bodega",
        query: "The Bodega, 23 Pelham Street, Nottingham NG1 2ED",
        tag: "现场音乐酒吧",
        description: "Rock City 楼下的小酒吧，气氛好，适合微醺聊天。",
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
    weather: { temp: "11–19°C", summary: "有阵雨，北上渐凉" },
    timeline: [
      { time: "12:00", text: "自然醒退房出发，M1 → A1 → M90 → A9 一路北上" },
      { time: "15:00", text: "Perth 附近服务区休息（咖啡 + 换人开）" },
      { time: "15:30", text: "继续 A9，穿越凯恩戈姆国家公园，风景渐壮丽" },
      { time: "18:30", text: "抵达因弗内斯，尼斯河畔散步" },
      { time: "19:30", text: "晚餐 The Mustard Seed（河景餐厅）" },
      { time: "21:00", text: "Castle Tavern 威士忌热身，为明天酒厂日预热" },
    ],
    places: [
      {
        name: "凯恩戈姆国家公园 Cairngorms",
        query: "Cairngorms National Park",
      },
      { name: "尼斯河畔 River Ness", query: "River Ness, Inverness" },
    ],
    restaurants: [
      {
        name: "The Mustard Seed",
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
        query: "Castle Tavern, 1-2 View Place, Inverness IV2 4SA",
        tag: "威士忌吧",
        description:
          "因弗内斯城堡正下方，本地人最爱，100+ 种单麦，晚上热身必去。",
        price: "Dram £5–15",
      },
      {
        name: "Rocpool Restaurant",
        query: "Rocpool Restaurant, 1 Ness Walk, Inverness IV3 5NE",
        tag: "现代苏格兰 · fine dining",
        description:
          "Inverness 最佳 fine dining，苏格兰牛排和海鲜，河畔位置服务好。",
        price: "~£45–60/人",
        website: "https://www.rocpoolrestaurant.com",
      },
      {
        name: "The Malt Room",
        query: "The Malt Room, 34 Church Street, Inverness IV1 1EH",
        tag: "威士忌品鉴吧",
        description:
          "200+ 种苏格兰单麦，专业品鉴套餐可选，比 Castle Tavern 更安静专注。",
        price: "品鉴 ~£20–40/人",
      },
      {
        name: "Hootananny",
        query: "Hootananny, 67 Church Street, Inverness IV1 1ES",
        tag: "现场音乐酒吧",
        description:
          "苏格兰传统音乐现场，每晚有 live music（凯尔特 / 民谣），吃喝一体。",
        price: "~£15–25/人",
      },
      {
        name: "Moulin Hotel（Pitlochry 途中午餐）",
        query: "Moulin Hotel, Moulin, Pitlochry PH16 5EW",
        tag: "1695 高地酒馆",
        description:
          "苏格兰最古老酒馆之一，自酿 Moulin Ale，Haggis 和牛肉派，途中歇脚午餐绝佳。",
        price: "~£15–25/人",
      },
    ],
    stay: {
      summary: "因弗内斯独栋",
      lodging: [
        {
          name: "Modern 2 Bedroom Semi-detached House",
          query: "41 Essichs Gardens Inverness IV2 6BW",
          address: "41 Essichs Gardens, Inverness, IV2 6BW",
          checkIn: "6.21 周日 16:00",
          checkOut: "6.23 周二 10:00",
          room: "独栋 2 居室 · 连住 2 晚 · 带私人车位",
          note: "Booking.com ⭐9.6。门口密码锁箱取钥匙，密码到达前 24h 发送。",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 4,
    date: "2026-06-22",
    dateLabel: "6月22日",
    weekday: "周一",
    title: "Speyside 威士忌酒厂日",
    route: "因弗内斯 ↔ Speyside（往返）",
    driving: "约 2.5 小时",
    weather: { temp: "10–17°C", summary: "高地有雨，室内品酒无碍" },
    timeline: [
      {
        time: "09:00",
        text: "睡饱出发，因弗内斯 → Speyside 产区（A9 → A95，约 1h15）",
      },
      {
        time: "10:30",
        text: "The Macallan 酒厂参观 + 顶级品鉴（务必提前网上预约）",
      },
      {
        time: "12:30",
        text: "Craigellachie / Aberlour 村庄午餐（Speyside 核心）",
      },
      { time: "14:00", text: "Aberlour 酒厂 — 雪莉桶经典，深度品鉴" },
      { time: "16:00", text: "可选第三家：Balvenie 或 Cardhu" },
      { time: "17:00", text: "返回因弗内斯" },
      { time: "18:30", text: "晚餐 + Malt Room 威士忌品鉴收官" },
    ],
    places: [
      {
        name: "The Macallan Distillery",
        query: "The Macallan Distillery",
        note: "主访 · 网红建筑",
      },
      {
        name: "Aberlour Distillery",
        query: "Aberlour Distillery",
        note: "主访 · 雪莉桶",
      },
      {
        name: "Glenfiddich Distillery",
        query: "Glenfiddich Distillery",
        note: "备选",
      },
      {
        name: "The Glenlivet Distillery",
        query: "The Glenlivet Distillery",
        note: "备选",
      },
      {
        name: "The Balvenie",
        query: "Balvenie Distillery Dufftown",
        note: "备选 · 需预约",
      },
    ],
    restaurants: [
      {
        name: "The Highlander Inn（Craigellachie）",
        query: "The Highlander Inn, Victoria Street, Craigellachie AB38 9SR",
        tag: "威士忌旅馆 · 午餐",
        description:
          "Speyside 最著名的威士忌酒吧 / 旅馆，墙上挂满珍稀瓶子，午餐简单好吃。",
        price: "午餐 ~£15–25/人",
      },
      {
        name: "The Mash Tun（Aberlour）",
        query: "The Mash Tun, 8 Broomfield Square, Aberlour AB38 9QP",
        tag: "酒厂镇酒吧 · 午餐",
        description: "就在 Aberlour 酒厂旁，本地人午餐点，Haggis 配一杯好。",
        price: "~£15–20/人",
      },
      {
        name: "Rocpool Restaurant（因弗内斯晚餐）",
        query: "Rocpool Restaurant, 1 Ness Walk, Inverness IV3 5NE",
        tag: "现代苏格兰 · 当地最佳",
        description:
          "喝了一天酒，晚上来顿好的。苏格兰牛排和海鲜。Inverness 公认最佳 fine dining。",
        price: "~£45–60/人",
        website: "https://www.rocpoolrestaurant.com",
      },
    ],
    stay: {
      summary: "连住 · 因弗内斯独栋",
      lodging: [],
      ref: {
        dayN: 3,
        label: "同 Day 3 · 因弗内斯独栋，连住第 2 晚（行李放着出门浪）",
      },
    },
  },
  {
    n: 5,
    date: "2026-06-23",
    dateLabel: "6月23日",
    weekday: "周二",
    title: "尼斯湖 · 天空岛",
    route: "因弗内斯 → 尼斯湖 → 天空岛 → Ardgour",
    driving: "约 5 小时（分段）",
    weather: { temp: "10–16°C", summary: "阵雨，防风防水外套必备" },
    timeline: [
      { time: "08:00", text: "出发离开因弗内斯（今天行程丰富，早点出发）" },
      {
        time: "08:30",
        text: "Urquhart Castle / 尼斯湖畔观景台拍照（30–40min）",
      },
      {
        time: "10:30",
        text: "Eilean Donan Castle — 三湖交汇经典高地城堡（40min）",
      },
      { time: "12:00", text: "过 Skye Bridge 上岛，在 Portree 午餐" },
      { time: "13:00", text: "Old Man of Storr — 路边观景台拍摄（20min）" },
      {
        time: "13:45",
        text: "Kilt Rock & Mealt Falls — 海边悬崖瀑布（15min）",
      },
      { time: "14:15", text: "Quiraing — 壮丽山脊观景 / 短途步行（30–40min）" },
      {
        time: "15:20",
        text: "Portree 彩色港口 — 标志性彩色小屋 + 咖啡（30min）",
      },
      { time: "16:00", text: "可选 Fairy Pools 入口看一眼，或直接南下离岛" },
      {
        time: "17:00",
        text: "离开天空岛 → 经 A87 / A82 前往 Fort William 方向",
      },
      {
        time: "19:00",
        text: "抵达 Inn at Ardgour（经 Corran Ferry 5 分钟渡轮）",
      },
    ],
    places: [
      { name: "Urquhart Castle / 尼斯湖", query: "Urquhart Castle Loch Ness" },
      { name: "Eilean Donan Castle", query: "Eilean Donan Castle" },
      { name: "Old Man of Storr", query: "Old Man of Storr, Isle of Skye" },
      { name: "Kilt Rock & Mealt Falls", query: "Kilt Rock and Mealt Falls" },
      { name: "Quiraing", query: "Quiraing, Isle of Skye" },
      { name: "Portree 彩色港口", query: "Portree, Isle of Skye" },
      { name: "Fairy Pools", query: "Fairy Pools, Isle of Skye", note: "可选" },
    ],
    restaurants: [
      {
        name: "Sea Breezes（Portree 午餐）",
        query: "Sea Breezes, Quay Street, Portree IV51 9DE",
        tag: "港口海鲜 · 午餐",
        description:
          "Portree 港口海鲜馆，炸鱼薯条和扇贝，不用预约 walk-in 即可，适合午餐快吃。",
        price: "~£20–30/人",
      },
      {
        name: "Loch Bay（Stein）",
        query:
          "Loch Bay Restaurant, 1-2 MacLeod's Terrace, Stein, Isle of Skye IV55 8GA",
        tag: "海鲜 · 仅 6 桌",
        michelin: 1,
        description:
          "天空岛唯一米其林星！夫妻档经营仅 6 桌，手潜扇贝、笼捕龙虾。距 Portree 30min，仅周三–六晚餐，需预付。",
        price: "£160/人",
        website: "https://www.lochbay-restaurant.co.uk/booking/",
      },
      {
        name: "Dulse & Brose（Portree）",
        query: "Dulse & Brose, 13 Bosville Terrace, Portree IV51 9DG",
        tag: "现代苏格兰 · 港景",
        description:
          "Portree 最好的正餐之一，本地海鲜 + 高地牛肉，窗外就是彩色港口。",
        price: "~£35–50/人",
      },
      {
        name: "Scorrybreac（Portree）",
        query: "Scorrybreac, 7 Bosville Terrace, Portree IV51 9DG",
        tag: "精致海鲜",
        description:
          "港口旁小餐厅，主厨米其林背景，每日菜单取决于当天渔获，需预约。",
        price: "~£55–70/人",
        website: "https://www.scorrybreac.com",
      },
      {
        name: "The Old Inn（Carbost）",
        query: "The Old Inn, Carbost, Isle of Skye IV47 8SR",
        tag: "Talisker 酒厂旁酒吧",
        description:
          "紧邻 Talisker 威士忌酒厂，传统高地酒吧 + 海鲜，可顺路买瓶 Talisker。",
        price: "~£20–30/人",
      },
      {
        name: "Crannog Seafood（Fort William）",
        query: "Crannog, 4 Cameron Square, Fort William PH33 6AJ",
        tag: "水上海鲜餐厅",
        description:
          "建在码头栈桥上！Loch Linnhe 直供海鲜，扇贝和龙虾绝佳，当地 No.1，关门较晚。",
        price: "~£35–50/人",
        website: "https://www.crannog.net",
      },
    ],
    stay: {
      summary: "Ardgour / Fort William（二选一）",
      lodging: [
        {
          name: "Inn at Ardgour",
          query: "Inn at Ardgour",
          address: "Ardgour, Onich, PH33 7AA",
          checkIn: "15:00–22:00",
          checkOut: "08:00–11:00",
          room: "Family Suite · 3 人",
          note: "更近但需 Corran Ferry（末班 21:20），最晚 18:00 从天空岛出发。",
          status: "option",
        },
        {
          name: "Guisachan Guest House（Fort William）",
          query: "Guisachan Guest House Fort William",
          address: "Alma Road, Fort William, PH33 6HA",
          room: "3 人",
          note: "从 Portree 2h 直达无需渡轮，可在天空岛吃完晚饭再走（20:00 出发 → 22:00 到），第二天 Glencoe 仅 15min。",
          status: "option",
          recommended: true,
        },
      ],
      note: "两家均已预订、可免费取消，出发当天看状态再决定。",
    },
  },
  {
    n: 6,
    date: "2026-06-24",
    dateLabel: "6月24日",
    weekday: "周三",
    title: "格伦科 · 湖区",
    route: "Ardgour → 格伦科 → 温德米尔",
    driving: "约 3.5 小时",
    weather: { temp: "10–15°C", summary: "偏凉，可能小雨" },
    timeline: [
      { time: "09:00", text: "睡到自然醒，Inn at Ardgour 享受早餐 + 湖景" },
      { time: "10:00", text: "Corran Ferry 渡轮过湖（5min）→ A82 南下" },
      {
        time: "10:30",
        text: "格伦科 Glencoe — 007《天幕杀机》取景地，Three Sisters 观景拍照",
      },
      { time: "11:30", text: "Glencoe 村庄午餐 / 咖啡" },
      { time: "12:30", text: "A82 → M6 南下前往湖区（约 2.5h）" },
      { time: "15:00", text: "抵达湖区温德米尔，下午悠闲游湖" },
      { time: "17:00", text: "Bowness-on-Windermere 湖边散步 + 下午茶" },
    ],
    places: [
      { name: "格伦科 Three Sisters 观景点", query: "Three Sisters Glencoe" },
      { name: "Corran Ferry 渡口", query: "Corran Ferry", note: "渡轮" },
      { name: "Bowness-on-Windermere", query: "Bowness-on-Windermere" },
    ],
    restaurants: [
      {
        name: "The Clachaig Inn（Glencoe）",
        query: "The Clachaig Inn, Old Village Road, Glencoe PH49 4HX",
        tag: "高地经典酒吧 · 午餐",
        description:
          "峡谷中的传奇徒步者酒吧，壁炉旁吃派喝 ale，300+ 种威士忌。",
        price: "~£15–25/人",
        website: "https://www.clachaig.com",
      },
      {
        name: "SOURCE at Gilpin（Windermere）",
        query: "SOURCE at Gilpin Hotel, Crook Road, Windermere LA23 3NE",
        tag: "湖区食材 · tasting",
        michelin: 1,
        description:
          "原 HRiSHi 更名 SOURCE，新主厨 Ollie Bridgwater，湖区本地食材 tasting menu，距住处仅 5min。",
        price: "£115–140/人",
        website: "https://thegilpin.co.uk/eat-and-drink/source/",
      },
      {
        name: "Old Stamp House（Ambleside）",
        query: "Old Stamp House, Church Street, Ambleside LA22 0BU",
        tag: "Cumbrian · 连续 7 年星",
        michelin: 1,
        description:
          "Ryan Blackburn 主理，纯正 Cumbrian tasting menu，Herdwick 羊肉、Windermere 鲑鱼。10min 车程。",
        price: "~£105/人",
        website: "https://oldstamphouse.com",
      },
      {
        name: "Forest Side（Grasmere）",
        query: "The Forest Side, Keswick Road, Grasmere LA22 9RN",
        tag: "庄园 · tasting",
        michelin: 1,
        description:
          "维多利亚哥特庄园，自家厨房花园供应食材，4/8 道式 tasting menu。20min 车程。",
        price: "~£95–115/人",
        website: "https://www.theforestside.com",
      },
      {
        name: "The Drunken Duck Inn",
        query: "The Drunken Duck Inn, Barngates, Ambleside LA22 0NG",
        tag: "山坡美食酒吧",
        description: "隐藏在湖区山坡，自酿啤酒配精致乡村料理，景色一流。",
        price: "~£35–50/人",
        website: "https://www.drunkenduckinn.co.uk",
      },
      {
        name: "The Angel Inn（Bowness）",
        query: "The Angel Inn, Helm Road, Bowness-on-Windermere LA23 3BU",
        tag: "湖畔传统酒吧",
        description:
          "Bowness 湖边的传统英式酒吧，Fish & Chips，户外座看湖景日落。",
        price: "~£15–25/人",
      },
    ],
    stay: {
      summary: "Woodlands B&B",
      lodging: [
        {
          name: "Woodlands",
          query: "Woodlands Windermere New Road",
          address: "New Road, Windermere, LA23 2EE",
          checkIn: "6.24 周三 14:00",
          checkOut: "6.25 周四 09:00–10:30",
          room: "3 间房 · 3 人",
          note: "Booking.com Genius ★★★★，传统英式 B&B，步行可达湖边。",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 7,
    date: "2026-06-25",
    dateLabel: "6月25日",
    weekday: "周四",
    title: "湖区 · 前往伯明翰",
    route: "湖区 → 伯明翰",
    driving: "约 2 小时",
    weather: { temp: "10–18°C", summary: "湖区偏凉有雨" },
    timeline: [
      { time: "09:30", text: "温德米尔湖蒸汽游船 Bowness → Ambleside" },
      { time: "11:30", text: "彼得兔世界 或 Hill Top 农场（作者故居）" },
      { time: "13:00", text: "午餐" },
      {
        time: "14:30",
        text: "Grasmere — 华兹华斯故居 + Sarah Nelson's 姜饼店",
      },
      { time: "16:30", text: "出发前往伯明翰" },
      {
        time: "18:30",
        text: "抵达伯明翰，晚餐（已预订 Albatross Death Cult）",
      },
    ],
    places: [
      {
        name: "Hill Top 彼得兔故居",
        query: "Hill Top Beatrix Potter Near Sawrey",
      },
      { name: "Grasmere 华兹华斯故居", query: "Dove Cottage, Grasmere" },
      { name: "Ambleside（游船终点）", query: "Ambleside, Lake District" },
    ],
    restaurants: [
      {
        name: "Albatross Death Cult",
        query: "Albatross Death Cult, Newhall Square, Birmingham B3 1RU",
        tag: "创意料理",
        status: "booked",
        description: "暗黑风格创意餐厅，体验感满分。",
        booking: {
          date: "6.25 周四",
          time: "19:00",
          party: "3 人",
          by: "Qingqi Shi",
          contact: "hi@qingqi.dev",
        },
      },
      {
        name: "L'Enclume（Cartmel，绕路 30min 午餐）",
        query: "L'Enclume, Cavendish Street, Cartmel LA11 6QA",
        tag: "tasting · 北英唯一三星",
        michelin: 3,
        description:
          "Simon Rogan 旗舰，2022 年获三星，15 道式 tasting menu。如愿意绕路，午餐体验无与伦比，需提前数周预订。",
        price: "£265/人",
        website: "https://www.lenclume.co.uk/reservations",
      },
      {
        name: "Fellpack（湖区午餐）",
        query: "Fellpack, 34 Lake Road, Keswick CA12 5DQ",
        tag: "轻松 café · 午餐",
        description: "手工三明治和本地啤酒，氛围年轻舒适，适合简单午餐。",
        price: "~£15–20/人",
      },
    ],
    stay: {
      summary: "Aloft Birmingham",
      lodging: [
        {
          name: "Aloft by Marriott Birmingham Eastside",
          query: "Aloft Birmingham Eastside",
          address: "4 Woodcock Street, Birmingham",
          phone: "+44 121 820 6000",
          checkIn: "6.25 周四 15:00",
          checkOut: "6.26 周五 12:00",
          note: "住客：Yang Muyu。",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 8,
    date: "2026-06-26",
    dateLabel: "6月26日",
    weekday: "周五",
    title: "送机 · 布里斯托",
    route: "伯明翰 → 希思罗 → 布里斯托",
    driving: "约 3.5 小时",
    weather: { temp: "12–17°C", summary: "多云，偶有小雨" },
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
      { name: "克利夫顿悬索桥", query: "Clifton Suspension Bridge" },
      { name: "Clifton Village", query: "Clifton Village, Bristol" },
      { name: "Bristol Harbourside", query: "Bristol Harbourside" },
    ],
    restaurants: [
      {
        name: "Casamia",
        query: "Casamia Restaurant Bristol",
        tag: "极简创意 · tasting",
        michelin: 1,
        description: "Bristol 最佳，极简创意 tasting menu，食材本地有机。",
        price: "Tasting ~£100–115/人",
        website: "https://www.casamiarestaurant.co.uk",
      },
      {
        name: "Paco Tapas",
        query:
          "Paco Tapas, 3a The General, Lower Guinea Street, Bristol BS1 6FU",
        tag: "西班牙小食",
        michelin: 1,
        description: "Casamia 姊妹店，Iberico 火腿和 croquettes 必点。",
        price: "~£40–55/人",
        website: "https://www.pacotapas.co.uk",
      },
      {
        name: "The Ox",
        query: "The Ox, 43 Corn Street, Bristol BS1 1HT",
        tag: "牛排馆 · 港口景",
        description: "Harbourside 优质牛排馆，干式熟成，露台看港口夕阳。",
        price: "~£45–60/人",
      },
      {
        name: "Wapping Wharf 美食街",
        query: "Wapping Wharf, Gaol Ferry Steps, Bristol BS1 6GW",
        tag: "集装箱美食聚落",
        description: "各种风格随性逛吃，Box-E、Cargo Cantina 等。",
        price: "~£15–25/人",
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
    weather: { temp: "10–17°C", summary: "多云间晴，泡温泉舒适" },
    timeline: [
      { time: "09:30", text: "前往巴斯（仅 20 分钟）" },
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
      { name: "古罗马浴场 Roman Baths", query: "Roman Baths, Bath" },
      { name: "皇家新月楼 Royal Crescent", query: "Royal Crescent, Bath" },
      { name: "Thermae Bath Spa", query: "Thermae Bath Spa", note: "可选" },
    ],
    restaurants: [
      {
        name: "The Pump Room",
        query: "The Pump Room, Stall Street, Bath BA1 1LZ",
        tag: "18 世纪历史茶室",
        description:
          "罗马浴场旁，简·奥斯汀笔下的社交场所，早午餐 + 品尝温泉水。",
        price: "~£30–45/人",
        website: "https://www.romanbaths.co.uk/pump-room-restaurant",
      },
      {
        name: "Menu Gordon Jones",
        query: "Menu Gordon Jones, 2 Wellsway, Bath BA2 3AQ",
        tag: "盲盒 tasting menu",
        description:
          "每天菜单不同，入座前不知道吃什么，6 道式惊喜午餐，非常有趣。",
        price: "午餐 ~£55/人",
        website: "https://www.menugordonjones.co.uk",
      },
      {
        name: "Sally Lunn's",
        query: "Sally Lunn's, 4 North Parade Passage, Bath BA1 1NX",
        tag: "巴斯最古老建筑 · 1482",
        description: "巨型圆面包 Sally Lunn Bun 闻名，下午茶首选。",
        price: "~£15–20/人",
      },
      {
        name: "The Circus Restaurant",
        query: "The Circus Restaurant, 34 Brock Street, Bath BA1 2LN",
        tag: "圆形广场旁 · 现代英式",
        description: "Bath 本地农场食材，晚餐氛围温馨。",
        price: "~£40–55/人",
        website: "https://www.thecircusrestaurant.co.uk",
      },
    ],
    stay: {
      summary: "连住 · Hilton Bristol",
      lodging: [],
      ref: { dayN: 8, label: "同 Day 8 · 布里斯托 Hilton，连住第 2 晚" },
    },
  },
  {
    n: 10,
    date: "2026-06-28",
    dateLabel: "6月28日",
    weekday: "周日",
    title: "科茨沃尔德 · 牛津 · 伦敦",
    route: "布里斯托 → 科茨沃尔德 → 牛津 → 伦敦",
    driving: "约 3 小时",
    weather: { temp: "12–19°C", summary: "多云，伦敦回暖" },
    timeline: [
      { time: "09:00", text: "退房北上，进入科茨沃尔德" },
      {
        time: "10:00",
        text: "水上伯顿 Bourton-on-the-Water — “科茨沃尔德威尼斯”",
      },
      {
        time: "11:30",
        text: "拜伯里 Bibury — Arlington Row 蜜色石屋排，最美村庄",
      },
      { time: "13:00", text: "Cotswolds 村庄午餐" },
      {
        time: "14:30",
        text: "牛津 — 基督教会学院（哈利波特大厅）、叹息桥、Bodleian",
      },
      { time: "17:30", text: "返回伦敦（约 1.5h），还车" },
    ],
    places: [
      { name: "水上伯顿 Bourton-on-the-Water", query: "Bourton-on-the-Water" },
      { name: "拜伯里 Arlington Row", query: "Arlington Row, Bibury" },
      { name: "牛津 基督教会学院", query: "Christ Church, Oxford" },
      { name: "叹息桥 Bridge of Sighs", query: "Bridge of Sighs, Oxford" },
      { name: "Bodleian 图书馆", query: "Bodleian Library, Oxford" },
    ],
    restaurants: [
      {
        name: "The Wild Rabbit（Kingham）",
        query: "The Wild Rabbit, Church Street, Kingham OX7 6YA",
        tag: "Daylesford 乡村酒吧",
        description: "科茨沃尔德最精致 gastropub，有机农场直供。",
        price: "~£40–60/人",
        website: "https://www.thewildrabbit.co.uk",
      },
      {
        name: "The Lamb Inn（Burford）",
        query: "The Lamb Inn, Sheep Street, Burford OX18 4LR",
        tag: "15 世纪蜜石酒吧",
        description: "低矮橡木横梁，传统烤肉和本地 ale。",
        price: "~£25–35/人",
      },
      {
        name: "Cherwell Boathouse（牛津）",
        query: "Cherwell Boathouse, 50 Bardwell Road, Oxford OX2 6ST",
        tag: "河畔餐厅",
        description: "查韦尔河畔，边用餐边看学生划船，悠然英伦。",
        price: "~£35–50/人",
        website: "https://www.cherwellboathouse.co.uk",
      },
    ],
    stay: {
      summary: "伦敦 · 待定",
      lodging: [
        {
          name: "Generator London（Russell Square）",
          query: "Generator London Russell Square",
          note: "伦敦最潮设计青旅，有单 / 双人间，Russell Square 地铁站旁，位置极佳。单间约 £35–50/晚。",
          status: "option",
        },
        {
          name: "Wombat's City Hostel（Tower Hill）",
          query: "Wombat's City Hostel London Tower Hill",
          note: "塔桥附近，干净评价高，私人房约 £40–55/晚，可步行到 Borough Market。",
          status: "option",
        },
        {
          name: "Point A Hotel（多个位置）",
          query: "Point A Hotel London",
          note: "超紧凑日式胶囊风，King's Cross / Shoreditch / Westminster 多店，单间约 £40–55/晚。",
          status: "option",
        },
        {
          name: "Premier Inn Hub（Tower Bridge / Westminster）",
          query: "Premier Inn Hub London Tower Bridge",
          note: "Premier Inn 精简版，房小但设施齐全，£45–60/晚，app 控制灯光空调。",
          status: "option",
        },
      ],
      note: "自驾结束后独自在伦敦自由活动 2 天，预算 ≤£50/晚，尚未预订。",
      bookingUrl:
        "https://www.booking.com/searchresults.en-gb.html?ss=London%2C+United+Kingdom&checkin=2026-06-28&checkout=2026-06-30&group_adults=1&no_rooms=1&order=price&nflt=price%3DGBP-min-50-1",
    },
  },
];

export const trip: Trip = {
  title: "大不列颠自驾",
  subtitle: "10 天深度自驾 · 英格兰 · 苏格兰高地 · 湖区 · 西南英格兰",
  dateRange: "2026 年 6 月 18 – 30 日",
  party: "3 人自驾",
  days,
};

export type TripPhase = "before" | "during" | "after";

export interface ResolvedDay {
  index: number;
  phase: TripPhase;
  /** Whole days until the trip starts (only meaningful when phase is "before"). */
  daysUntil: number;
}

/** Work out which day to land on given "now", and where we are relative to the trip. */
export function resolveDay(now: Date, list: Day[] = days): ResolvedDay {
  const dayMs = 86_400_000;
  const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const first = toUtc(list[0].date);
  const last = toUtc(list[list.length - 1].date);

  if (today < first) {
    return {
      index: 0,
      phase: "before",
      daysUntil: Math.round((first - today) / dayMs),
    };
  }
  if (today > last) {
    return { index: list.length - 1, phase: "after", daysUntil: 0 };
  }
  const index = list.findIndex((d) => toUtc(d.date) === today);
  return { index: index < 0 ? 0 : index, phase: "during", daysUntil: 0 };
}
