import type { Day } from "../types";

export const gbDays0To1: Day[] = [
  {
    n: 0,
    date: "2026-06-18",
    dateLabel: "6月18日",
    weekday: "周四",
    title: "抵达伦敦 · 取车 · Omakase",
    route: "Gatwick 取车 → Mayfair → Chingford",
    weather: { temp: "15–22°C", summary: "晴，注意倒时差", note: "注意倒时差" },
    coords: { lat: 51.5074, lon: -0.1278 }, // 伦敦 London
    anchors: [
      {
        time: "06:30",
        label: "大雨 CA851 落地 Gatwick North Terminal",
        kind: "flight",
      },
      {
        time: "06:45",
        label: "石头从 N17 去 Gatwick 接大雨（地铁约 1h15）",
        kind: "transit",
        query: "Gatwick Airport North Terminal",
        mode: "transit",
      },
      {
        time: "09:00",
        label: "Sixt 取车（大雨名下 · 转 South Terminal 取车）",
        kind: "pickup",
        query: "Sixt Gatwick Airport South Terminal",
        mode: "walking",
      },
      {
        time: "17:30",
        label: "Maru Omakase 晚餐 · Mayfair（2 人已订）",
        kind: "reservation",
        query: "Maru, 18 Shepherd Market, London W1J 7QH",
        mode: "transit",
      },
    ],
    nav: [
      {
        label: "石头去接大雨（N17 → Gatwick）",
        from: "N17 9LX, London",
        to: "Gatwick Airport North Terminal",
        mode: "transit",
        note: "地铁 / 火车约 1h15，到 North Terminal 接机，此时还没取车",
        time: "06:45",
      },
      {
        label: "Gatwick → N17（取车后开回家停一天）",
        from: "Gatwick Airport South Terminal",
        to: "N17 9LX, London",
        mode: "driving",
        note: "M23 → M25 约 1h15，车停 N17 附近，白天不开进市区",
        time: "白天",
      },
      {
        label: "N17 → 市区（Tottenham Hale → Liverpool Street）",
        from: "Tottenham Hale Station, London",
        to: "Liverpool Street Station, London",
        mode: "transit",
        note: "Greater Anglia 直达约 13min，到 Liverpool St 换 Elizabeth 线去各处",
        time: "下午",
      },
      {
        label: "前往 Maru · Mayfair（Elizabeth 线 → Bond St）",
        from: "Liverpool Street Station, London",
        to: "Maru, 18 Shepherd Market, London W1J 7QH",
        mode: "transit",
        note: "Liverpool St 坐 Elizabeth 线到 Bond Street 约 8min，步行 10min 到 Shepherd Market",
        time: "17:30",
      },
      {
        label: "回 Chingford 酒店过夜（N17 取车开过去）",
        from: "N17 9LX, London",
        to: "Holiday Inn Express London Chingford",
        mode: "driving",
        note: "晚饭后坐火车回 Tottenham Hale 取车，开去 Chingford 约 15min",
        time: "晚上",
      },
    ],
    timeline: [
      {
        time: "白天",
        text: "抵达伦敦，Gatwick 机场取车（租期 6.18–6.30，共 13 天）",
      },
      {
        time: "下午",
        text: "把车停在 N17，从 Tottenham Hale 坐火车 / 地铁进城自由活动 — 博物馆 / 公园 / 南岸随意逛（见下方想去的地方）",
      },
      {
        time: "17:30",
        text: "Maru Omakase 晚餐 — Shepherd Market, Mayfair，约 18 道江户前 omakase（2 人已预订）",
      },
      {
        time: "晚上",
        text: "坐车回 Tottenham Hale 取车，开去入住 Holiday Inn Express Chingford，为明早出发休整",
      },
    ],
    flights: [
      {
        number: "CA851",
        airline: "中国国际航空",
        passenger: "大雨",
        from: { code: "PEK", city: "北京 首都" },
        to: {
          code: "LGW",
          city: "伦敦 盖特威克",
          time: "06:30",
          terminal: "North",
        },
        track: "https://www.flightradar24.com/data/flights/ca851",
        note: "国航直飞北京，落地 North Terminal；石头从 N17 来接，点「实时追踪」查实时进度与到达口。",
        time: "06:30",
      },
    ],
    places: [
      {
        name: "大英博物馆 British Museum",
        query: "British Museum, London",
        note: "免费",
        time: "下午",
      },
      { name: "海德公园 Hyde Park", query: "Hyde Park, London", time: "下午" },
      {
        name: "Tate Modern · 南岸",
        query: "Tate Modern, London",
        note: "免费",
        time: "下午",
      },
      {
        name: "自然历史博物馆",
        query: "Natural History Museum, London",
        note: "免费",
        time: "下午",
      },
    ],
    restaurants: [
      {
        name: "Maru Omakase",
        area: "伦敦 · Mayfair",
        query: "Maru, 18 Shepherd Market, London W1J 7QH",
        tag: "Omakase · 约 18 道",
        status: "booked",
        time: "17:30",
        description:
          "MARU London 的主厨发办江户前 omakase，约 18 道。位于 Mayfair 的 Shepherd Market，Green Park 站步行 5min。每晚两席 17:30 / 20:30。",
        website: "https://www.marulondon.com/",
        booking: {
          date: "6.18 周四",
          time: "17:30",
          party: "2 人",
          by: "Qingqi Shi",
          note: "确认号 #1940 · OpenTable",
        },
      },
    ],
    checklists: [
      {
        title: "大雨入境 · 取车",
        items: [
          "人工通道入境（中国护照，早高峰排队约 30–45min）",
          "提取托运行李",
          "落地 North，乘免费航站楼列车转 South Terminal 找 Sixt 柜台",
          "取车：检查外观 / 油量，拍照留底",
          "适应右舵左行，停车场先开 5–10min 找感觉",
        ],
        note: "大雨名下预订租车，租期 6.18–6.30 共 13 天，Gatwick 取还。",
        time: "白天",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "白天把车停在 N17：路段是 CPZ 就当天用 RingGo 买一张 Haringey 住户访客券（最省事，停家门附近）；有自家车道或路段不管制则免费。想要稳妥也可提前在 JustPark / YourParkingSpace 订车位（约 £6–8/天）。别贪 Tottenham Hale 零售公园的免费 3 小时（超时罚款很重）。晚上再开去 Chingford，酒店停车免费。",
        time: "下午",
      },
      {
        kind: "drive",
        text: "ULEZ：租来的新车 Euro 6+ 全达标，不产生费用。",
      },
      {
        kind: "money",
        text: "全程不进 Congestion Charge Zone（N17 / Chingford / Gatwick 均在区外），省 £18/天。",
      },
      {
        kind: "info",
        text: "伦敦 6 月日落约 21:20，白天很长；长途飞机后注意倒时差。",
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
    weather: { temp: "17–24°C", summary: "晴，热浪开局", note: "热浪开局" },
    coords: { lat: 52.9548, lon: -1.1581 }, // 诺丁汉 Nottingham
    anchors: [
      {
        time: "08:20",
        label: "Jim CX255 落地 Heathrow T3（延误约 2h，原 06:20）",
        kind: "flight",
      },
      {
        time: "09:20",
        label: "Heathrow T3 接 Jim（落地约 1h 后，看现场排队再定）",
        kind: "pickup",
        query: "Heathrow Terminal 3 Arrivals",
        mode: "driving",
      },
      {
        time: "11:00",
        label: "剑桥 · 康河撑篙（约 1.5–2h）",
        kind: "drive",
        query: "Castle Hill Car Park, Cambridge",
        mode: "driving",
      },
      {
        time: "15:00",
        label: "入住 Crowne Plaza 诺丁汉",
        kind: "checkin",
        query: "Crowne Plaza Nottingham",
      },
    ],
    nav: [
      {
        label: "Chingford 酒店 → N17 接石头",
        from: "Holiday Inn Express London Chingford",
        to: "N17 9LX, London",
        mode: "driving",
        note: "Jim 延误 2h（08:20 落地），接机留 1h 缓冲，按此往回推 07:30 出发，先到 N17 接石头上车",
        time: "07:30",
      },
      {
        label: "N17 → Heathrow T3 接 Jim",
        from: "N17 9LX, London",
        to: "Heathrow Terminal 3 Arrivals",
        mode: "driving",
        note: "约 08:55 到机场附近候着，Jim 出关发消息后再开进 Short Stay；落地前用「实时追踪」核对到达口",
        time: "07:55",
      },
      {
        label: "Heathrow → 剑桥 Castle Hill 停车场",
        from: "Heathrow Terminal 3 Arrivals",
        to: "Castle Hill Car Park, Cambridge",
        mode: "driving",
        note: "M25 → M11 北上；停 Castle Hill Car Park，离市中心更近，步行进城",
        time: "09:20",
      },
      {
        label: "Castle Hill 停车场 → 市中心 King's College",
        from: "Castle Hill Car Park, Cambridge",
        to: "King's College, Cambridge",
        mode: "walking",
        note: "停好车步行约 10 分钟进城，撑篙 + 学院",
        time: "11:00",
      },
      {
        label: "剑桥 → 诺丁汉 Crowne Plaza",
        from: "Castle Hill Car Park, Cambridge",
        to: "Crowne Plaza Nottingham",
        mode: "driving",
        note: "午餐后出发，约 2.5h",
        time: "13:00",
      },
    ],
    timeline: [
      {
        time: "07:30",
        text: "从 Chingford 出发（Jim 的航班 CX255 延误约 2h，预计 08:20 落地 T3，接机留 1h 缓冲，可多睡约 1h）",
      },
      { time: "07:55", text: "到 N17 接石头上车" },
      {
        time: "08:55",
        text: "到 Heathrow 附近候着，等 Jim 出关（落地后约 1h；同时段到港航班多则顺延）",
      },
      { time: "09:20", text: "接到 Jim，三人出发，M4 → M25 → M11 北上" },
      {
        time: "11:00",
        text: "剑桥 — 康河撑篙、国王学院、三一学院（约 1.5–2 小时）",
      },
      { time: "13:00", text: "午餐后出发前往诺丁汉" },
      { time: "15:00", text: "抵达诺丁汉，Crowne Plaza 入住" },
      { time: "16:00", text: "沃莱顿大厅 — 蝙蝠侠韦恩庄园取景地，花园散步" },
      { time: "19:00", text: "诺丁汉市区晚餐 — 下方任选一家" },
    ],
    flights: [
      {
        number: "CX255",
        airline: "国泰航空",
        passenger: "Jim",
        statusLabel: "延误约 2 小时",
        from: { code: "HKG", city: "香港", time: "00:05" },
        to: {
          code: "LHR",
          city: "伦敦 希思罗",
          time: "08:20",
          scheduledTime: "06:20",
          terminal: "T3",
        },
        track: "https://www.flightradar24.com/data/flights/cx255",
        note: "⚠️ 目前显示延误约 2 小时，预计 08:20 落地（原 06:20）。接机按落地后约 1h 留缓冲（约 09:20 接到），同时段到港航班多则排队更久，到时看现场情况再调整；剑桥小压缩，诺丁汉傍晚基本不受影响。点「实时追踪」盯落地与到达口。",
        time: "08:20",
      },
    ],
    places: [
      {
        name: "国王学院 King's College",
        query: "King's College, Cambridge",
        time: "11:00",
      },
      {
        name: "三一学院 Trinity College",
        query: "Trinity College, Cambridge",
        time: "11:00",
      },
      {
        name: "沃莱顿大厅 Wollaton Hall",
        query: "Wollaton Hall, Nottingham",
        time: "16:00",
      },
    ],
    restaurants: [
      {
        name: "Restaurant Sat Bains",
        area: "诺丁汉",
        time: "19:00",
        query: "Restaurant Sat Bains, Lenton Lane, Nottingham NG7 2SA",
        tag: "创意料理",
        michelin: 2,
        description:
          "英国顶级创意料理，10 道式 tasting menu，食材来自自家菜园。需提前数周预订。",
        price: "~£165/人",
        website: "https://www.restaurantsatbains.com",
      },
      {
        name: "Alchemilla",
        area: "诺丁汉",
        time: "19:00",
        query: "Alchemilla, 192a Derby Road, Nottingham NG7 1NF",
        tag: "现代欧洲",
        michelin: 1,
        description:
          "旧马车房改建的餐厅，氛围绝佳；蔬菜为主的创意菜单，米其林一星。",
        price: "~£65–80/人",
        website: "https://www.alchemillarestaurant.uk",
      },
      {
        name: "Ye Olde Trip to Jerusalem",
        area: "诺丁汉",
        time: "19:00",
        query:
          "Ye Olde Trip to Jerusalem, 1 Brewhouse Yard, Nottingham NG1 6AD",
        tag: "历史酒吧 · 1189",
        description:
          "号称建于 1189 年、自称全英最古老酒吧之一（说法有争议），洞穴氛围独特，适合轻松一杯配 pub food。",
        price: "~£15–25/人",
      },
      {
        name: "MemSaab",
        area: "诺丁汉",
        time: "19:00",
        query: "MemSaab, 12-14 Maid Marian Way, Nottingham NG1 6HS",
        tag: "印度菜",
        description: "多次获奖的印度餐厅，Tandoori 和 Biryani 极佳。",
        price: "~£25–35/人",
        website: "https://www.mem-saab.co.uk",
      },
      {
        name: "Kushi-ya",
        area: "诺丁汉",
        time: "19:00",
        query: "Kushi-ya, 14a Low Pavement, Nottingham NG1 7DL",
        tag: "日式居酒屋",
        description:
          "Hockley 区人气日料，炭火串烧 + 清酒。小店氛围好，适合喝酒撸串。",
        price: "~£30–40/人",
        website: "https://www.kushi-ya.co.uk",
      },
      {
        name: "Sexy Mamma Love Spaghetti",
        area: "诺丁汉",
        time: "19:00",
        query:
          "Sexy Mamma Love Spaghetti, 3 Heathcoat Street, Nottingham NG1 3AF",
        tag: "意大利面",
        description: "Hockley 区排队名店，手工意面 + 意式肉酱。",
        price: "~£15–22/人",
      },
    ],
    checklists: [
      {
        title: "接机要点",
        items: [
          "出发前给 Jim、石头发实时定位",
          "航班延误约 2h（08:20 落地），落地前用「实时追踪」确认到达时间与到达口",
          "Jim（香港护照）走人工通道，按落地后约 1h 留缓冲，预计约 09:20 出关",
          "同时段到港航班多则排队更久，现场看入境大厅情况调整接机时间",
          "Jim 出关发消息后再开进 Short Stay 接人",
          "三人到齐，M4 北上",
        ],
        time: "08:55",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "Heathrow 接机省钱：让 Jim 出关后发消息再开进 Short Stay（£7–17 / 1–1.5h）。延误已留 1h 缓冲，到机场附近先候着，别提前进场空等；同时段到港航班多就多等会儿。",
        time: "08:55",
      },
      {
        kind: "parking",
        text: "剑桥停 Castle Hill Car Park：离市中心更近，步行约 10 分钟到国王学院与撑篙码头，省去 Park & Ride 转巴士。车位不多，早到为宜。",
        time: "11:00",
      },
      {
        kind: "parking",
        text: "Crowne Plaza 诺丁汉停车约 £10–15/晚。",
        time: "15:00",
      },
      {
        kind: "drive",
        text: "热浪开局，伦敦出发可达 29°C，短袖即可；日落约 21:20。",
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
          note: "住客：WONG JIM、大雨",
          status: "booked",
        },
      ],
    },
  },
];
