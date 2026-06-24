/**
 * Great Britain 2026 road-trip itinerary — hard-coded, read-only content.
 *
 * Extracted from the trip plan. All copy is Chinese (the app is zh-only).
 * Locations carry a Google Maps search `query`; restaurants and lodgings add
 * websites/booking details where known.
 */

import type { Day, PersonSchedule, Trip } from "../types";

const days: Day[] = [
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
  {
    n: 4,
    date: "2026-06-22",
    dateLabel: "6月22日",
    weekday: "周一",
    title: "Speyside 威士忌酒厂日（随到随品）",
    route: "因弗内斯 ↔ Speyside（往返）",
    driving: "约 2.5 小时",
    weather: {
      temp: "10–17°C",
      summary: "高地有雨，室内品酒无碍",
      note: "室内品酒无碍",
    },
    coords: { lat: 57.4778, lon: -4.2247 }, // 因弗内斯 Inverness
    anchors: [
      {
        time: "11:00",
        label: "Glenfiddich 随到随品 + 商店（无需预约）",
        kind: "drive",
        query: "Glenfiddich Distillery",
        mode: "driving",
      },
      {
        time: "18:30",
        label: "Malt Room 威士忌收官",
        kind: "reservation",
        query: "The Malt Room, 34 Church Street, Inverness IV1 1EH",
        mode: "walking",
      },
    ],
    nav: [
      {
        label: "因弗内斯 → Glenfiddich 酒厂（Speyside）",
        from: "41 Essich Gardens, Inverness IV2 6BW",
        to: "Glenfiddich Distillery",
        mode: "driving",
        note: "A9 → A95 约 1h15；Whisky Lounge / 商店随到随品，无需预约",
        time: "09:30",
      },
      {
        label: "Glenfiddich → Cooperage / Glen Grant",
        from: "Glenfiddich Distillery",
        to: "Speyside Cooperage, Dufftown Road, Craigellachie AB38 9RS",
        mode: "driving",
        note: "Speyside 核心几分钟车程；想看制桶选 Cooperage（须预约），想逛花园改搜 Glen Grant Distillery Rothes",
        time: "13:30",
      },
      {
        label: "返程顺路：Tomatin 酒厂",
        to: "Tomatin Distillery, Tomatin IV13 7YT",
        mode: "driving",
        note: "A9 南距因弗内斯 16 英里；吧台免费试一杯 Tomatin 12，7 天营业、无需预约",
        time: "16:30",
      },
      {
        label: "Tomatin → 因弗内斯（返回）",
        from: "Tomatin Distillery, Tomatin IV13 7YT",
        to: "41 Essich Gardens, Inverness IV2 6BW",
        mode: "driving",
        note: "A9 返程约 30 分钟",
        time: "17:30",
      },
    ],
    timeline: [
      {
        time: "09:30",
        text: "睡饱出发，因弗内斯 → Speyside 产区（A9 → A95，约 1h15）",
      },
      {
        time: "11:00",
        text: "Glenfiddich：Whisky Lounge / Malt Barn 点单杯或品鉴套杯，司机有无酒精选项；商店有酒厂限定瓶。随到随品，无需预约",
      },
      {
        time: "12:30",
        text: "Craigellachie / Aberlour 村庄午餐（Speyside 核心）",
      },
      {
        time: "13:30",
        text: "二选一：Speyside Cooperage 看制桶 + 4D 影片（须预约，不喝酒也好玩）/ Glen Grant 维多利亚花园 + 商店",
      },
      {
        time: "15:00",
        text: "顺路逛 Macallan / Aberlour 商店买瓶（参观与品鉴仅限预约、未约到，只买瓶不空跑）",
      },
      {
        time: "16:30",
        text: "返程 A9 顺路停 Tomatin 酒厂：吧台免费试一杯 Tomatin 12，可自助灌装单桶限定",
      },
      { time: "18:30", text: "晚餐 + Malt Room 威士忌品鉴收官" },
      {
        time: "备选",
        text: "完全不想自己开车：改报 Inverness 出发的 Speyside 一日游巴士团（约 £60–80/人，全程专职司机）；或就近去 Glen Ord（Muir of Ord，离因弗内斯约 15 英里，往天空岛方向顺路）吧台试饮 + 商店买瓶",
      },
    ],
    places: [
      {
        name: "Glenfiddich Distillery",
        query: "Glenfiddich Distillery",
        tier: "primary",
        when: "随到随品",
        note: "Whisky Lounge 9:30–17:00、Malt Barn 酒吧可点单杯与品鉴套杯，司机有无酒精选项；大商店含酒厂限定瓶。无需预约。",
      },
      {
        name: "Tomatin Distillery",
        query: "Tomatin Distillery, Tomatin IV13 7YT",
        tier: "backup",
        when: "返程顺路",
        note: "A9 南距因弗内斯 16 英里，吧台免费试一杯 Tomatin 12，商店可自助灌装单桶限定。7 天营业、无需预约。",
      },
      {
        name: "The Singleton of Glen Ord",
        query: "Singleton of Glen Ord Distillery, Muir of Ord IV6 7UJ",
        tier: "backup",
        when: "离因弗内斯最近",
        note: "约 15 英里、往天空岛方向顺路。2022 新参观中心得奖，吧台可试 dram 与鸡尾酒、有 deli 与商店买瓶。5–8 月 10:00–18:00。",
      },
      {
        name: "Glen Grant Distillery & Garden",
        query: "Glen Grant Distillery, Rothes AB38 7BS",
        tier: "backup",
        when: "想逛花园",
        note: "维多利亚花园 + 商店 + 品鉴区，40 分钟导览约 £10（需预约）。花园近期翻修，去前查官网是否开放。",
      },
      {
        name: "Speyside Cooperage",
        query: "Speyside Cooperage, Dufftown Road, Craigellachie AB38 9RS",
        tier: "fallback",
        when: "不喝酒 / 司机",
        note: "全英唯一可看制桶师现场箍桶，含 4D 影片、商店与木桶主题咖啡馆。周一–周五 9:00–15:00 整点，须预约。",
      },
      {
        name: "The Macallan 商店",
        query: "The Macallan Distillery",
        tier: "fallback",
        when: "只买瓶",
        note: "原计划主访、仅限预约、未约到：参观品鉴进不去，但商店照常开放，可去看瓶 / 买瓶，别空跑参观。",
      },
      {
        name: "Aberlour 商店",
        query: "Aberlour Distillery",
        tier: "fallback",
        when: "只买瓶",
        note: "原计划主访（限 8 人）、未约到，当前施工无产线参观。商店照常，可买瓶带走。",
      },
    ],
    restaurants: [
      {
        name: "The Highlander Inn",
        area: "Speyside · Craigellachie",
        time: "12:30",
        query: "The Highlander Inn, Victoria Street, Craigellachie AB38 9SR",
        tag: "威士忌旅馆 · 午餐",
        description:
          "Speyside 最著名的威士忌酒吧 / 旅馆，墙上挂满珍稀瓶子，午餐简单好吃。",
        price: "午餐 ~£15–25/人",
      },
      {
        name: "The Mash Tun",
        area: "Speyside · Aberlour",
        time: "12:30",
        query: "The Mash Tun, 8 Broomfield Square, Aberlour AB38 9QP",
        tag: "酒厂镇酒吧 · 午餐",
        description: "就在 Aberlour 酒厂旁，本地人午餐点，Haggis 配一杯好。",
        price: "~£15–20/人",
      },
      {
        name: "Rocpool Restaurant",
        area: "因弗内斯",
        time: "18:30",
        query: "Rocpool Restaurant, 1 Ness Walk, Inverness IV3 5NE",
        tag: "现代苏格兰 · 当地最佳",
        description:
          "喝了一天酒，晚上来顿好的。苏格兰牛排和海鲜。Inverness 公认最佳 fine dining。",
        price: "~£45–60/人",
        website: "https://www.rocpoolrestaurant.com",
      },
    ],
    tips: [
      {
        kind: "info",
        text: "没约到不要紧：本日改走「随到随品」路线——Glenfiddich、Tomatin、Glen Ord 的吧台 / 商店都无需预约，可现场点杯品鉴，或直接买瓶带走。",
        time: "11:00",
      },
      {
        kind: "parking",
        text: "所有酒厂均免费停车。",
        time: "11:00",
      },
      {
        kind: "drive",
        text: "指定 1 人当司机；多数酒厂提供 Driver's Dram，可打包带走回酒店再品。",
        time: "09:30",
      },
      {
        kind: "info",
        text: "不喝酒也有得玩：Speyside Cooperage 看制桶（周一–周五，须预约），或 Glen Grant 维多利亚花园（去前查是否翻修关闭）。",
        time: "13:30",
      },
      {
        kind: "warn",
        text: "Macallan / Aberlour 6 月旺季仅限预约、未约到；建议只逛商店买瓶，别空跑参观。",
        time: "15:00",
      },
      {
        kind: "info",
        text: "想三人都畅饮：可改报 Inverness 出发的 Speyside 一日游巴士团（约 £60–80/人，全程专职司机）。",
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
    route: "因弗内斯 → 尼斯湖 → 天空岛 → Fort William",
    driving: "约 5 小时（分段）",
    weather: {
      temp: "10–16°C",
      summary: "阵雨，防风防水外套必备",
      note: "防风防水外套必备",
    },
    coords: { lat: 56.8198, lon: -5.1052 }, // 威廉堡 Fort William
    anchors: [
      {
        time: "08:00",
        label: "出发离开因弗内斯（行程密集，早出发）",
        kind: "checkout",
        query: "41 Essich Gardens, Inverness IV2 6BW",
      },
      {
        time: "08:30",
        label: "Urquhart Castle / 尼斯湖观景",
        kind: "drive",
        query: "Urquhart Castle car park",
        mode: "driving",
      },
      {
        time: "10:30",
        label: "Eilean Donan Castle 拍照",
        kind: "drive",
        query: "Eilean Donan Castle",
        mode: "driving",
      },
      {
        time: "21:30",
        label: "入住 Guisachan Guest House · Fort William",
        kind: "checkin",
        query: "Guisachan Guest House Fort William",
      },
    ],
    nav: [
      {
        label: "因弗内斯 → Urquhart Castle",
        from: "41 Essich Gardens, Inverness IV2 6BW",
        to: "Urquhart Castle car park",
        mode: "driving",
        note: "尼斯湖畔观景台，30–40min",
        time: "08:00",
      },
      {
        label: "Urquhart Castle → Eilean Donan",
        from: "Urquhart Castle car park",
        to: "Eilean Donan Castle",
        mode: "driving",
        note: "三湖交汇经典高地城堡",
        time: "10:30",
      },
      {
        label: "Eilean Donan → Portree（午餐）",
        from: "Eilean Donan Castle",
        to: "Bayfield Car Park Portree",
        mode: "driving",
        note: "过 Skye Bridge 上岛，Portree 午餐",
        time: "12:00",
      },
      {
        label: "Portree → Old Man of Storr",
        from: "Bayfield Car Park Portree",
        to: "Old Man of Storr car park",
        mode: "driving",
        note: "路边观景台拍摄 20min",
        time: "13:00",
      },
      {
        label: "Old Man of Storr → Kilt Rock",
        from: "Old Man of Storr car park",
        to: "Kilt Rock viewpoint",
        mode: "driving",
        note: "海边悬崖瀑布 15min",
        time: "13:45",
      },
      {
        label: "Kilt Rock → Quiraing",
        from: "Kilt Rock viewpoint",
        to: "Quiraing car park",
        mode: "driving",
        note: "壮丽山脊观景 / 短途步行",
        time: "14:15",
      },
      {
        label: "Quiraing → Portree 港口",
        from: "Quiraing car park",
        to: "Portree Harbour",
        mode: "driving",
        note: "彩色港口 + 咖啡 30min",
        time: "15:20",
      },
      {
        label: "离岛南下：Portree → Fort William",
        from: "Portree, Isle of Skye",
        to: "Guisachan Guest House Fort William",
        mode: "driving",
        note: "A87 → A82 约 2h，无需渡轮；日落 22:15 天还亮",
        time: "17:00",
      },
    ],
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
        text: "离开天空岛 → 经 A87 / A82 直达 Fort William（无需渡轮）",
      },
      {
        time: "19:00",
        text: "抵达 Fort William · Guisachan Guest House，Crannog 海鲜晚餐",
      },
    ],
    places: [
      {
        name: "Urquhart Castle / 尼斯湖",
        query: "Urquhart Castle Loch Ness",
        time: "08:30",
      },
      {
        name: "Eilean Donan Castle",
        query: "Eilean Donan Castle",
        time: "10:30",
      },
      {
        name: "Old Man of Storr",
        query: "Old Man of Storr, Isle of Skye",
        time: "13:00",
      },
      {
        name: "Kilt Rock & Mealt Falls",
        query: "Kilt Rock and Mealt Falls",
        time: "13:45",
      },
      { name: "Quiraing", query: "Quiraing, Isle of Skye", time: "14:15" },
      {
        name: "Portree 彩色港口",
        query: "Portree, Isle of Skye",
        time: "15:20",
      },
      {
        name: "Fairy Pools",
        query: "Fairy Pools, Isle of Skye",
        note: "可选",
        time: "16:00",
      },
    ],
    restaurants: [
      {
        name: "Sea Breezes",
        area: "天空岛 · Portree",
        time: "12:00",
        query: "Sea Breezes, Quay Street, Portree IV51 9DE",
        tag: "港口海鲜 · 午餐",
        description:
          "Portree 港口海鲜馆，炸鱼薯条和扇贝出色；座位少，旺季需提前电话预约（不接受 walk-in）。",
        price: "~£20–30/人",
      },
      {
        name: "Loch Bay",
        area: "天空岛 · Stein",
        time: "19:00",
        query:
          "Loch Bay Restaurant, 1-2 MacLeod's Terrace, Stein, Isle of Skye IV55 8GA",
        tag: "海鲜 · 仅 6 桌",
        michelin: 1,
        description:
          "天空岛唯一米其林星！夫妻档经营仅 6 桌，手潜扇贝、笼捕龙虾。距 Portree 30min，仅周二–六晚餐，需预付。",
        price: "£160/人",
        website: "https://www.lochbay-restaurant.co.uk/booking/",
      },
      {
        name: "Dulse & Brose",
        area: "天空岛 · Portree",
        time: "12:00",
        query: "Dulse & Brose, 13 Bosville Terrace, Portree IV51 9DG",
        tag: "现代苏格兰 · 港景",
        description:
          "Portree 最好的正餐之一，本地海鲜 + 高地牛肉，窗外就是彩色港口。",
        price: "~£35–50/人",
      },
      {
        name: "Scorrybreac",
        area: "天空岛 · Portree",
        time: "12:00",
        query: "Scorrybreac, 7 Bosville Terrace, Portree IV51 9DG",
        tag: "精致海鲜",
        description:
          "港口旁小餐厅，主厨米其林背景，每日菜单取决于当天渔获，需预约。",
        price: "~£55–70/人",
        website: "https://www.scorrybreac.com",
      },
      {
        name: "The Old Inn",
        area: "天空岛 · Carbost",
        time: "16:00",
        query: "The Old Inn, Carbost, Isle of Skye IV47 8SR",
        tag: "Talisker 酒厂旁酒吧",
        description:
          "紧邻 Talisker 威士忌酒厂，传统高地酒吧 + 海鲜，可顺路买瓶 Talisker。",
        price: "~£20–30/人",
      },
      {
        name: "Crannog Seafood",
        area: "Fort William",
        time: "19:00",
        query: "Crannog, 4 Cameron Square, Fort William PH33 6AJ",
        tag: "水上海鲜餐厅",
        description:
          "原码头栈桥名店，现暂迁 Cameron Square（Garrison West）；Loch Linnhe 直供海鲜，扇贝和龙虾绝佳，当地 No.1。",
        price: "~£35–50/人",
        website: "https://www.crannog.net",
      },
    ],
    checklists: [
      {
        title: "退房收拾",
        items: [
          "充电器 / 数据线 / 充电宝",
          "浴室洗漱用品",
          "床头柜 / 抽屉 / 衣柜检查",
          "门口密码锁箱归还钥匙",
        ],
        time: "08:00",
      },
      {
        title: "高地出发前",
        items: [
          "油箱加满",
          "下载离线地图（高地 / Skye 信号差）",
          "防风防水外套 + Smidge 驱虫",
          "墨镜（高地晴天紫外线强）",
        ],
        note: "今天行程密集，08:00 前出发。",
        time: "08:00",
      },
    ],
    tips: [
      {
        kind: "fuel",
        text: "出发前加满油！Skye 岛上仅 Broadford 和 Portree 有加油站，高地油价贵约 5–10p/升。",
        time: "08:00",
      },
      {
        kind: "parking",
        text: "Old Man of Storr 停车约 £5，Quiraing 免费。",
        time: "13:00",
      },
      {
        kind: "warn",
        text: "带 Smidge 驱虫喷雾 — 苏格兰 6 月 midges 傍晚水边很烦。",
      },
      {
        kind: "drive",
        text: "高地单车道公路（Single Track），见 Passing Place 主动让车；信号差，提前下载离线地图。",
      },
    ],
    stay: {
      summary: "Guisachan Guest House · Fort William",
      lodging: [
        {
          name: "Guisachan Guest House",
          query: "Guisachan Guest House Fort William",
          address: "Alma Road, Fort William, PH33 6HA",
          checkIn: "6.23 周二 21:30",
          checkOut: "6.24 周三 10:00",
          room: "3 人 · 房间小、卫浴共用",
          note: "住客：大雨。Fort William 直达无需渡轮，晚餐就在镇上（Crannog）。早餐 9:00、退房 10:00；房间小、卫浴共用，早起轮流洗漱、先收拾好行李。第二天 A82 南下 15min 即到格伦科。",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 6,
    date: "2026-06-24",
    dateLabel: "6月24日",
    weekday: "周三",
    title: "格伦科 · 湖区",
    route: "Fort William → 格伦科 → 温德米尔",
    driving: "约 5 小时（格伦科→湖区单程 4h35 / 232mi）",
    weather: { temp: "10–15°C", summary: "偏凉，可能小雨" },
    coords: { lat: 54.3807, lon: -2.9063 }, // 温德米尔 Windermere
    anchors: [
      {
        time: "10:00",
        label: "退房 · Guisachan",
        kind: "checkout",
        query: "Guisachan Guest House Fort William",
      },
      {
        time: "10:35",
        label: "格伦科 Three Sisters 快速拍照（不久留）",
        kind: "drive",
        query: "Three Sisters viewpoint Glencoe",
        mode: "driving",
      },
      {
        time: "16:30",
        label: "抵达 · 入住 Woodlands B&B · 温德米尔",
        kind: "checkin",
        query: "Woodlands, New Road, Windermere LA23 2EE",
      },
      {
        time: "18:45",
        label: "Henrock by Simon Rogan 晚餐 · Linthwaite House（3 人已订）",
        kind: "reservation",
        query:
          "Henrock, Linthwaite House, Crook Road, Bowness-on-Windermere LA23 3JA",
        mode: "driving",
      },
    ],
    nav: [
      {
        label: "Fort William → 格伦科 Glencoe",
        from: "Guisachan Guest House Fort William",
        to: "Three Sisters viewpoint Glencoe",
        mode: "driving",
        note: "A82 南下约 35min / 21mi。",
        time: "10:00",
      },
      {
        label: "格伦科 → Tebay Services（午餐）",
        from: "Three Sisters viewpoint Glencoe",
        to: "Tebay Services southbound, M6, Cumbria",
        waypoints: [
          "The Green Welly Stop, Tyndrum",
          "Polmadie Services M74, Glasgow",
          "Welcome Break Abington Services",
          "Exelby Services Golden Fleece, M6 Junction 42, Carlisle",
        ],
        mode: "driving",
        note: "A82 → A74(M) → M6 一路向南约 4h 直达午餐点 Tebay。",
        time: "11:00",
      },
      {
        label: "Tebay Services → 温德米尔 Woodlands",
        from: "Tebay Services southbound, M6, Cumbria",
        to: "Woodlands, New Road, Windermere LA23 2EE",
        mode: "driving",
        note: "午餐后 M6 继续南下约 35min 即到住处。",
        time: "15:45",
      },
      {
        label: "前往 Henrock · Linthwaite House",
        from: "Woodlands, New Road, Windermere LA23 2EE",
        to: "Henrock, Linthwaite House, Crook Road, Bowness-on-Windermere LA23 3JA",
        mode: "driving",
        note: "Crook Road（B5284）旁 Linthwaite House，车程约 10min；18:45 的订位，18:25 出发留出停车 / 入座的余量",
        time: "18:25",
      },
    ],
    timeline: [
      {
        time: "08:00",
        text: "早起：Guisachan 房间小、卫浴共用，轮流洗漱、先收拾好行李",
      },
      { time: "09:00", text: "Guisachan Guest House 享用早餐（早餐 9:00）" },
      { time: "10:00", text: "退房出发，A82 南下，约 35min 到格伦科" },
      {
        time: "10:35",
        text: "格伦科 Glencoe — 007《天幕杀机》取景地，Three Sisters 快速拍照（约 20–25min，不久留）",
      },
      {
        time: "11:00",
        text: "上路前往湖区：一段导航直达午餐点 Tebay。途中的高速服务区可顺路歇脚，开过时自己决定停不停（见导航里的途经点）",
      },
      {
        time: "15:00",
        text: "Tebay Services 午餐 + 加油（约停 40min）；约 15:00 才到，早饿了就在 Green Welly（Tyndrum，约 11:45）先垫一顿",
      },
      {
        time: "16:30",
        text: "抵达温德米尔，入住 Woodlands B&B、放下行李（视沿途休息次数，约 16:30 前后到；路途确实长）",
      },
      {
        time: "16:45",
        text: "Bowness 逛礼品店（Jim 最爱）+ Windermere 的 Lakeland 旗舰店 — 晚饭前的重点，先把礼品店逛够",
      },
      {
        time: "18:00",
        text: "逛完回 Woodlands 梳洗、稍作休整",
      },
      {
        time: "18:25",
        text: "出发去 Henrock — Linthwaite House，Crook Road（车程约 10min，早几分钟出发留出停车时间）",
      },
      {
        time: "18:45",
        text: "Henrock by Simon Rogan 晚餐 — Linthwaite House，Simon Rogan 的湖区农场餐厅",
      },
      {
        time: "20:45",
        text: "晚餐后直接回 Woodlands 早点休息 — 连着 5 天长行程，今晚不安排兜风，好好睡一觉养足精神",
      },
    ],
    places: [
      {
        name: "格伦科 Three Sisters 观景点",
        query: "Three Sisters Glencoe",
        time: "10:35",
      },
      {
        name: "Tebay Services（午餐 / 休息）",
        query: "Tebay Services southbound, M6, Cumbria",
        note: "M6 农场超市服务区（Westmorland 家族自营，公认全英最好的服务区之一）：农场热食 + 熟食 / 烘焙 / 超市，值得专程停；离湖区约 35min",
        time: "15:00",
      },
      {
        name: "Lakeland 旗舰店 · Windermere",
        query: "Lakeland, Alexandra Buildings, Windermere LA23 1BQ",
        note: "Lakeland 家居总店，Jim 逛礼品",
        time: "16:45",
      },
      {
        name: "Bowness 湖边礼品店",
        query: "Lake Road, Bowness-on-Windermere",
        note: "纪念品 / 礼品店集中，Jim 慢慢逛",
        time: "16:45",
      },
    ],
    restaurants: [
      {
        name: "The Clachaig Inn",
        area: "格伦科 Glencoe",
        query: "The Clachaig Inn, Old Village Road, Glencoe PH49 4HX",
        tag: "高地经典酒吧 · 仅顺路歇脚",
        description:
          "峡谷中的传奇徒步者酒吧，壁炉旁吃派喝 ale，400+ 种威士忌。今天赶路去湖区、原则上不停；只在需要歇脚或上厕所时快速停一下，正餐留到温德米尔。",
        price: "~£15–25/人",
        website: "https://www.clachaig.com",
      },
      {
        name: "Henrock by Simon Rogan",
        area: "湖区 · Bowness-on-Windermere",
        time: "18:45",
        query:
          "Henrock, Linthwaite House, Crook Road, Bowness-on-Windermere LA23 3JA",
        tag: "湖区农场到餐桌 · set / tasting",
        status: "booked",
        description:
          "Simon Rogan 在 Linthwaite House 的轻松版餐厅，俯瞰温德米尔湖。食材多来自他在 Cartmel 山谷的自家 Our Farm，菜式融入其香港 / 马耳他 / 普吉餐厅的风味与技法。周三–周日晚餐供应。",
        price: "Choice £65 · Short £79 · Full £125/人",
        website: "https://www.henrock.co.uk",
        booking: {
          date: "6.24 周三",
          time: "18:45",
          party: "3 人",
          by: "Qingqi Shi",
          contact: "+44 15395 87766 · info@henrock.co.uk",
        },
      },
      {
        name: "SOURCE at Gilpin",
        area: "湖区 · Windermere",
        query: "SOURCE at Gilpin Hotel, Crook Road, Windermere LA23 3NE",
        tag: "湖区食材 · tasting",
        michelin: 1,
        description:
          "原 HRiSHi 更名 SOURCE，新主厨 Ollie Bridgwater，湖区本地食材 tasting menu，同在 Crook Road、距住处约 10min。",
        price: "£115–140/人",
        website: "https://thegilpin.co.uk/eat-and-drink/source/",
      },
      {
        name: "The Angel Inn",
        area: "湖区 · Bowness",
        query: "The Angel Inn, Helm Road, Bowness-on-Windermere LA23 3BU",
        tag: "湖畔传统酒吧",
        description:
          "Bowness 湖边的传统英式酒吧，Fish & Chips，户外座看湖景日落。",
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
          "退房还钥匙，确认无遗留",
        ],
        note: "房间小、卫浴共用：早起轮流洗漱，先收拾好行李再下楼，赶 9:00 早餐、10:00 退房。",
        time: "08:00",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "格伦科路边免费 / NTS 停车场 £5；Woodlands B&B 免费停车。",
        time: "10:35",
      },
      {
        kind: "drive",
        text: "长途驾驶日，全天净开车约 5 小时；按 9:00 早餐、10:00 退房准点出发，把时间留给路上和湖区。",
      },
      {
        kind: "fuel",
        text: "出发前在 Fort William 加满油；长途 + 高地油价贵，Tebay Services 可顺便补给。",
        time: "10:00",
      },
      {
        kind: "warn",
        text: "A82 经罗蒙湖一段弯多、限速低、旺季易堵，4h35 是顺畅估计，留出余量。",
        time: "11:00",
      },
    ],
    stay: {
      summary: "Woodlands B&B",
      lodging: [
        {
          name: "Woodlands",
          query: "Woodlands, New Road, Windermere LA23 2EE",
          address: "New Road, Windermere, LA23 2EE",
          checkIn: "6.24 周三 14:00 起（当天约 16:30 到）",
          checkOut: "6.25 周四 09:00–10:30",
          room: "3 间房 · 3 人",
          note: "Booking.com Genius ★★★★，传统英式 B&B，步行可达湖边。从苏格兰长途南下，预计约 16:30 到，晚于 14:00 的最早入住时间。",
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
    driving: "约 3 小时（Grasmere→伯明翰单程 2h50 / 166mi）",
    weather: { temp: "10–18°C", summary: "湖区偏凉有雨" },
    coords: { lat: 52.4862, lon: -1.8904 }, // 伯明翰 Birmingham
    anchors: [
      {
        time: "09:30",
        label: "温德米尔湖蒸汽游船 Bowness → Ambleside",
        kind: "transit",
        query: "Bowness-on-Windermere pier",
        mode: "driving",
      },
      {
        time: "09:00",
        label: "退房 · Woodlands（窗口 09:00–10:30）",
        kind: "checkout",
        query: "Woodlands, New Road, Windermere LA23 2EE",
      },
      {
        time: "15:45",
        label: "出发前往伯明翰（赶 19:00 晚餐）",
        kind: "drive",
        query: "Aloft Birmingham Eastside",
        mode: "driving",
      },
      {
        time: "19:00",
        label: "Albatross Death Cult 晚餐（3 人已订）",
        kind: "reservation",
        query: "Albatross Death Cult, Newhall Square, Birmingham B3 1RU",
        mode: "driving",
      },
    ],
    nav: [
      {
        label: "湖区住处 → Bowness 码头",
        from: "Woodlands, New Road, Windermere LA23 2EE",
        to: "Bowness-on-Windermere pier",
        mode: "driving",
        note: "蒸汽游船 Bowness ⇄ Ambleside",
        time: "09:30",
      },
      {
        label: "Ambleside → Grasmere",
        from: "Ambleside town centre",
        to: "Sarah Nelson Grasmere Gingerbread",
        mode: "driving",
        note: "华兹华斯故居 + 姜饼店",
        time: "14:30",
      },
      {
        label: "Grasmere → 伯明翰",
        from: "Sarah Nelson Grasmere Gingerbread",
        to: "Aloft Birmingham Eastside",
        mode: "driving",
        note: "15:45 出发，M6 南下约 2h50 / 166mi，留出余量赶 19:00 晚餐。",
        time: "15:45",
      },
    ],
    timeline: [
      { time: "09:30", text: "温德米尔湖蒸汽游船 Bowness → Ambleside" },
      { time: "11:30", text: "彼得兔世界 或 Hill Top 农场（作者故居）" },
      { time: "13:00", text: "午餐" },
      {
        time: "14:30",
        text: "Grasmere — 华兹华斯故居 + Sarah Nelson's 姜饼店",
      },
      { time: "15:45", text: "出发前往伯明翰（M6 南下约 2h50）" },
      {
        time: "18:45",
        text: "抵达伯明翰，晚餐（已预订 19:00 Albatross Death Cult）",
      },
    ],
    places: [
      {
        name: "Hill Top 彼得兔故居",
        query: "Hill Top Beatrix Potter Near Sawrey",
        time: "11:30",
      },
      {
        name: "Grasmere 华兹华斯故居",
        query: "Dove Cottage, Grasmere",
        time: "14:30",
      },
      {
        name: "Ambleside（游船终点）",
        query: "Ambleside, Lake District",
        time: "09:30",
      },
    ],
    restaurants: [
      {
        name: "Albatross Death Cult",
        area: "伯明翰",
        time: "18:30",
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
        name: "Opheem",
        area: "伯明翰",
        time: "18:30",
        query: "Opheem, 48 Summer Row, Birmingham B3 1JJ",
        tag: "现代印度料理",
        michelin: 2,
        description:
          "Aktar Islam 的旗舰，伯明翰首家米其林二星餐厅，以高度时令、技法驱动的 tasting menu 重新诠释印度传统。",
        price: "Tasting ~£135–175/人",
        website: "https://opheem.com",
      },
      {
        name: "Adam's",
        area: "伯明翰",
        time: "18:30",
        query: "Adam's, 16 Waterloo Street, Birmingham B2 5UG",
        tag: "现代英式 fine dining",
        michelin: 1,
        description:
          "Adam Stokes 主理，2013 年至今稳守一星，Waterloo Street 装饰艺术空间，精致现代英式、强调时令英国食材。",
        price: "Tasting ~£109–139/人",
        website: "https://www.adamsrestaurant.co.uk",
      },
      {
        name: "Tropea",
        area: "伯明翰 · Harborne",
        time: "18:30",
        query: "Tropea, 27 Lordswood Road, Harborne, Birmingham B17 9RP",
        tag: "意大利菜 · 必比登",
        description:
          "Harborne 街区小馆，米其林必比登，Good Food Guide 常年推荐，手工意面和 cicchetti，最适合多人轻松聚餐。",
        price: "~£35–45/人",
        website: "https://www.tropea.uk",
      },
      {
        name: "L'Enclume",
        query: "L'Enclume, Cavendish Street, Cartmel LA11 6QA",
        area: "湖区 · Cartmel",
        time: "13:00",
        tag: "三星午餐 · 需绕路",
        michelin: 3,
        description:
          "Simon Rogan 旗舰，北英唯一米其林三星，15 道式 tasting。离开湖区南下途中绕路 30min 的告别午餐，需提前数周预订。",
        price: "£275/人",
        website: "https://www.lenclume.co.uk/reservations",
      },
    ],
    checklists: [
      {
        title: "退房收拾",
        items: [
          "充电器 / 数据线 / 充电宝",
          "浴室洗漱用品",
          "床头柜 / 抽屉 / 衣柜检查",
          "退房还钥匙，确认无遗留",
        ],
        note: "Woodlands 退房窗口 09:00–10:30：早起收拾，行李先放车上，再去坐 09:30 游船。",
        time: "08:30",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "湖区景点停车：Bowness £5–8，Ambleside £3–5。",
        time: "09:30",
      },
      {
        kind: "drive",
        text: "Grasmere→伯明翰实测约 2h50 / 166mi（M6 南下），不是 2 小时；15:45 出发留足余量赶 19:00 晚餐，途中 M6 Tebay、Charnock Richard 等服务区可按需歇脚。",
        time: "15:45",
      },
      {
        kind: "parking",
        text: "Aloft Birmingham 酒店停车约 £10–15。",
        time: "18:30",
      },
      {
        kind: "info",
        text: "Grasmere 别错过 Sarah Nelson's 1854 年姜饼店。",
        time: "14:30",
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
          note: "住客：大雨。",
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
  {
    n: 10,
    date: "2026-06-28",
    dateLabel: "6月28日",
    weekday: "周日",
    title: "科茨沃尔德 · 牛津 · 伦敦",
    route: "布里斯托 → 科茨沃尔德 → 牛津 → 伦敦",
    driving: "约 3 小时",
    weather: { temp: "12–19°C", summary: "多云，伦敦回暖", note: "伦敦回暖" },
    coords: { lat: 51.752, lon: -1.2577 }, // 牛津 Oxford（当日主要户外行程）
    anchors: [
      {
        time: "09:00",
        label: "退房北上，进入科茨沃尔德",
        kind: "checkout",
        query: "Hilton Garden Inn Bristol City Centre",
      },
      {
        time: "10:00",
        label: "水上伯顿 Bourton-on-the-Water",
        kind: "drive",
        query: "Bourton-on-the-Water car park",
        mode: "driving",
      },
      {
        time: "15:30",
        label: "牛津 · 基督教会学院（哈利波特大厅）",
        kind: "drive",
        query: "Oxford Westgate car park",
        mode: "driving",
      },
      {
        time: "18:30",
        label: "入住 Moxy London Excel（大雨名下）",
        kind: "checkin",
        query: "Moxy London Excel",
      },
    ],
    nav: [
      {
        label: "布里斯托 → 水上伯顿 Bourton",
        from: "Hilton Garden Inn Bristol City Centre",
        to: "Bourton-on-the-Water car park",
        mode: "driving",
        note: "进入科茨沃尔德，“科茨沃尔德威尼斯”",
        time: "10:00",
      },
      {
        label: "Bourton → 拜伯里 Bibury",
        from: "Bourton-on-the-Water car park",
        to: "Bibury Arlington Row",
        mode: "driving",
        note: "Arlington Row 蜜色石屋排",
        time: "11:30",
      },
      {
        label: "Bibury → 牛津 Oxford",
        from: "Bibury Arlington Row",
        to: "Oxford Westgate car park",
        mode: "driving",
        note: "基督教会学院 + 叹息桥",
        time: "14:30",
      },
      {
        label: "牛津 → 伦敦 Moxy",
        from: "Oxford Westgate car park",
        to: "Moxy London Excel",
        mode: "driving",
        note: "约 1.5h（M40 → M25 → A13）",
        time: "17:30",
      },
    ],
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
      {
        name: "水上伯顿 Bourton-on-the-Water",
        query: "Bourton-on-the-Water",
        time: "10:00",
      },
      {
        name: "拜伯里 Arlington Row",
        query: "Arlington Row, Bibury",
        time: "11:30",
      },
      {
        name: "牛津 基督教会学院",
        query: "Christ Church, Oxford",
        time: "14:30",
      },
      {
        name: "叹息桥 Bridge of Sighs",
        query: "Bridge of Sighs, Oxford",
        time: "14:30",
      },
      {
        name: "Bodleian 图书馆",
        query: "Bodleian Library, Oxford",
        time: "14:30",
      },
    ],
    restaurants: [
      {
        name: "The Wild Rabbit",
        area: "科茨沃尔德 · Kingham",
        time: "13:00",
        query: "The Wild Rabbit, Church Street, Kingham OX7 6YA",
        tag: "Daylesford 乡村酒吧",
        description: "科茨沃尔德最精致 gastropub，有机农场直供。",
        price: "~£40–60/人",
        website: "https://www.thewildrabbit.co.uk",
      },
      {
        name: "The Lamb Inn",
        area: "科茨沃尔德 · Burford",
        time: "13:00",
        query: "The Lamb Inn, Sheep Street, Burford OX18 4LR",
        tag: "15 世纪蜜石酒吧",
        description: "低矮橡木横梁，传统烤肉和本地 ale。",
        price: "~£25–35/人",
      },
      {
        name: "Cherwell Boathouse",
        area: "牛津",
        time: "14:30",
        query: "Cherwell Boathouse, 50 Bardwell Road, Oxford OX2 6ST",
        tag: "河畔餐厅",
        description: "查韦尔河畔，边用餐边看学生划船，悠然英伦。",
        price: "~£35–50/人",
        website: "https://www.cherwellboathouse.co.uk",
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
        note: "今晚起大雨独自住 Moxy 两晚，Jim 已离队、石头回家。",
        time: "09:00",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "Cotswolds 村庄停车免费；Oxford 用 Westgate / Park & Ride（£3–5）。",
        time: "10:00",
      },
      {
        kind: "parking",
        text: "Moxy London Excel 有停车场，伦敦 Zone 5–6 停车便宜。",
        time: "17:30",
      },
      {
        kind: "info",
        text: "可选 Bicester Village 打折村（150+ 品牌），逛 2–2.5h，搜 Bicester Village car park。",
      },
    ],
    stay: {
      summary: "Moxy London Excel",
      lodging: [
        {
          name: "Moxy London Excel",
          query: "Moxy London Excel",
          address: "Royal Victoria Dock, London E16",
          checkIn: "6.28 周日",
          checkOut: "6.30 周二",
          room: "独自入住 · 连住 2 晚",
          note: "大雨名下预订。Custom House 站约 15min 步行 / 公交 5min（Elizabeth Line）→ Liverpool Street 15min / West End 25min。酒店有停车场，6.29 车停这里坐地铁玩，6.30 一早开去 Gatwick 还车约 1h。",
          status: "booked",
        },
      ],
    },
  },
  {
    n: 11,
    date: "2026-06-29",
    dateLabel: "6月29日",
    weekday: "周一",
    title: "伦敦 · 独自自由活动",
    route: "全天地铁出行（车停 Moxy）",
    driving: "无需驾车",
    weather: { temp: "15–19°C", summary: "多云间晴" },
    coords: { lat: 51.5074, lon: -0.1278 }, // 伦敦 London
    anchors: [
      {
        time: "09:30",
        label: "Custom House 坐 Elizabeth Line 进城",
        kind: "transit",
        query: "Custom House Station, London",
        mode: "transit",
      },
      {
        time: "19:00",
        label: "晚餐后早点回酒店收行李（明早还车）",
        kind: "reservation",
        query: "Dishoom Shoreditch, 7 Boundary Street, London E2 7JE",
        mode: "transit",
      },
    ],
    nav: [
      {
        label: "Shoreditch / Brick Lane",
        from: "Custom House Station, London",
        to: "Brick Lane, London",
        mode: "transit",
        note: "Elizabeth Line → Liverpool Street 出",
        time: "10:00",
      },
      {
        label: "South Bank（Tate Modern / Tower Bridge）",
        // Use the Bankside area, not "Tate Modern" — the museum geocodes to a
        // building Google can't snap as a routable waypoint, which blanks the
        // day-overview route. The Tate Modern place-pill below still links the
        // museum directly.
        to: "Bankside, London",
        mode: "transit",
        note: "Tate Modern → 千禧桥 → Tower Bridge（Borough Market 周一休市）",
        time: "12:00",
      },
      {
        label: "West End（Oxford St / Covent Garden）",
        to: "Covent Garden, London",
        mode: "transit",
        note: "Tottenham Court Road 下，步行 10min",
        time: "14:00",
      },
      {
        label: "Harrods · 骑士桥",
        to: "Harrods, London",
        mode: "transit",
        note: "Food Hall 买手信好",
        time: "14:00",
      },
    ],
    timeline: [
      {
        time: "09:30",
        text: "睡到自然醒，酒店早餐，Custom House 坐 Elizabeth Line 进城",
      },
      {
        time: "10:00",
        text: "Shoreditch / Brick Lane — 街头艺术、vintage 市集、咖喱一条街",
      },
      {
        time: "12:00",
        text: "South Bank 漫步 — Tate Modern（免费）→ 千禧桥 → Tower Bridge（Borough Market 周一休市，午餐另选）",
      },
      {
        time: "14:00",
        text: "West End — Oxford Street / Soho / Chinatown / Covent Garden 逛街扫货",
      },
      {
        time: "17:00",
        text: "可选 Camden Market（朋克 / 潮流 / street food）",
      },
      {
        time: "19:00",
        text: "晚餐（见推荐），早点回酒店收行李——明早还车",
      },
    ],
    places: [
      {
        name: "Shoreditch · Brick Lane",
        query: "Brick Lane, London",
        note: "潮牌 / vintage",
        time: "10:00",
      },
      {
        name: "South Bank · Tate Modern",
        query: "Tate Modern, London",
        note: "免费 · 河岸漫步（Borough Market 周一休市）",
        time: "12:00",
      },
      {
        name: "Covent Garden · Seven Dials",
        query: "Covent Garden, London",
        note: "英伦品牌",
        time: "14:00",
      },
      {
        name: "牛津街 Oxford Street",
        query: "Oxford Street, London",
        note: "扫货",
        time: "14:00",
      },
      {
        name: "Harrods · 骑士桥",
        query: "Harrods, London",
        note: "顶奢 · Food Hall 手信",
        time: "14:00",
      },
      {
        name: "Camden Market",
        query: "Camden Market, London",
        note: "可选",
        time: "17:00",
      },
    ],
    restaurants: [
      {
        name: "Dishoom",
        area: "伦敦 · Shoreditch / King's Cross",
        time: "19:00",
        query: "Dishoom Shoreditch, 7 Boundary Street, London E2 7JE",
        tag: "孟买风印度菜 · 排队名店",
        description:
          "伦敦人气第一的复古孟买 café，Black Daal、Bacon Naan Roll 必点。以排队为主，但 6 人以上晚餐可预约；建议 11:30 前或 17:00 前到避高峰。",
        price: "~£25–40/人",
        website: "https://www.dishoom.com",
      },
      {
        name: "BAO Soho",
        area: "伦敦 · Soho",
        time: "19:00",
        query: "BAO Soho, 53 Lexington Street, London W1F 9AS",
        tag: "台湾刈包 · 小吃",
        description:
          "台式刈包 + 小吃 + 清酒鸡尾酒，经典 Pork Bao 必点。小店排队文化，Soho 店最有氛围。",
        price: "~£30–45/人",
        website: "https://baolondon.com",
      },
      {
        name: "Flat Iron",
        area: "伦敦 · 多店",
        time: "19:00",
        query:
          "Flat Iron Covent Garden, 17-18 Henrietta Street, London WC2E 8QH",
        tag: "牛排 · 性价比之王",
        description:
          "只卖一种 Flat Iron 牛排，配无限沙拉和 creamed spinach，伦敦最良心牛排店，每家都排队。",
        price: "~£20–30/人",
        website: "https://flatironsteak.co.uk",
      },
      {
        name: "Duck & Waffle",
        area: "伦敦 · Liverpool Street",
        time: "19:00",
        query: "Duck & Waffle, 110 Bishopsgate, London EC2N 4AY",
        tag: "高空景观 · 24h 营业",
        description:
          "Heron Tower 40 层无敌夜景，招牌 Duck & Waffle（鸭腿 + 华夫饼），24 小时营业，日出早餐也热门。",
        price: "~£50–70/人",
        website: "https://duckandwaffle.com",
      },
      {
        name: "Hawksmoor",
        area: "伦敦 · Seven Dials",
        time: "19:00",
        query: "Hawksmoor Seven Dials, 11 Langley Street, London WC2H 9JG",
        tag: "英国最佳牛排馆",
        description:
          "35 天干式熟成英国本土牛肉，Bone-in Ribeye 和 T-bone 招牌，环境像高级酒窖，Sunday Roast 也绝。",
        price: "~£60–90/人",
        website: "https://www.thehawksmoor.com",
      },
      {
        name: "Gymkhana",
        area: "伦敦 · Mayfair",
        time: "19:00",
        query: "Gymkhana, 42 Albemarle Street, London W1S 4JH",
        tag: "现代印度料理",
        michelin: 2,
        description:
          "殖民地俱乐部风装潢，北印度精致料理，Wild Muntjac Biryani、Tandoori 鹿肉，伦敦最好的高端印度菜之一。",
        price: "~£80–120/人",
        website: "https://www.gymkhanalondon.com",
      },
      {
        name: "The Clove Club",
        area: "伦敦 · Shoreditch",
        time: "19:00",
        query:
          "The Clove Club, Shoreditch Town Hall, 380 Old Street, London EC1V 9LT",
        tag: "现代英国 · tasting",
        michelin: 2,
        description:
          "Shoreditch Town Hall 里的 fine dining，创意英式 tasting menu，曾位列世界 50 最佳餐厅，轻松不端着。",
        price: "Tasting ~£150–180/人",
        website: "https://www.thecloveclub.com",
      },
      {
        name: "Borough Market",
        area: "伦敦 · London Bridge",
        time: "19:00",
        query: "Borough Market, 8 Southwark Street, London SE1 1TL",
        tag: "美食市集 · 逛吃逛吃",
        description:
          "伦敦最著名美食集市，Raclette 芝士、Scotch Eggs、生蚝、Padella 手工意面（排队王），边走边吃。⚠️ 周一休市（周二–周日营业）——今天是周一，午餐请另选。",
        price: "~£15–30/人",
      },
    ],
    checklists: [
      {
        title: "今晚收行李 · 还车前",
        items: [
          "行李收拾打包",
          "确认油量（如今天开过车，明天路上加油）",
          "充电设备整理",
          "设好闹钟，明早 07:00 起",
        ],
        note: "明早 07:45 出发去 Gatwick 还车，别玩太晚。",
        time: "19:00",
      },
    ],
    tips: [
      {
        kind: "transit",
        text: "车停 Moxy，全天 Elizabeth Line：Oyster 或银行卡 contactless 直接刷，每日 £10.50 封顶（Zone 1–3）。",
        time: "09:30",
      },
      {
        kind: "transit",
        text: "Custom House → Liverpool Street 15min / Tottenham Court Road 20min / Paddington 22min。",
        time: "09:30",
      },
      {
        kind: "warn",
        text: "明早 07:45 就要出发去 Gatwick 还车：今晚提前收好行李、确认油量。",
        time: "19:00",
      },
    ],
    stay: {
      summary: "连住 · Moxy London Excel",
      lodging: [],
      ref: { dayN: 10, label: "同 Day 10 · Moxy London Excel，连住第 2 晚" },
    },
  },
  {
    n: 12,
    date: "2026-06-30",
    dateLabel: "6月30日",
    weekday: "周二",
    title: "还车 · 返程回国",
    route: "Moxy → M25 → Gatwick 还车 → CA852 回国",
    driving: "约 1 小时",
    anchors: [
      {
        time: "07:45",
        label: "退房出发，Moxy → M25 → M23 南下",
        kind: "checkout",
        query: "Moxy London Excel",
      },
      {
        time: "08:30",
        label: "Pease Pottage 加满油（还车前最后便宜油站）",
        kind: "drive",
        query: "Pease Pottage Services M23",
        mode: "driving",
      },
      {
        time: "09:00",
        label: "Sixt 还车 · Gatwick South Terminal",
        kind: "dropoff",
        query: "Sixt Gatwick South Terminal",
        mode: "driving",
      },
      {
        time: "12:35",
        label: "CA852 起飞回国",
        kind: "flight",
      },
    ],
    nav: [
      {
        label: "Moxy → Pease Pottage 加满油",
        from: "Moxy London Excel",
        to: "Pease Pottage Services M23",
        mode: "driving",
        note: "⚠️ Sixt full-to-full，还车前最后加油点",
        time: "07:45",
      },
      {
        label: "Pease Pottage → Gatwick 还车",
        from: "Pease Pottage Services M23",
        to: "Sixt Gatwick South Terminal",
        mode: "driving",
        note: "距机场约 8–10min（J11 在机场以南），跟 Car Rental Return 标志",
        time: "08:45",
      },
    ],
    timeline: [
      { time: "07:00", text: "起床退房，行李上车" },
      { time: "07:45", text: "出发，Moxy → A2 → M25 → M23 南下" },
      {
        time: "08:30",
        text: "Pease Pottage Services（M23 J11）加满油——Sixt full-to-full，距机场约 8–10min（J11 在机场以南）",
      },
      {
        time: "08:45",
        text: "抵达 Gatwick South Terminal，跟着 Car Rental Return 标志走",
      },
      {
        time: "09:00",
        text: "Sixt 还车（外观 / 油量 / 里程检查，拍照留底，拿还车确认单）",
      },
      {
        time: "09:30",
        text: "转免费航站楼列车到 North Terminal 值机托运（国航 CA 柜台）+ 过安检",
      },
      { time: "12:35", text: "CA852 起飞，再见英国 🇬🇧 → 🇨🇳" },
    ],
    flights: [
      {
        number: "CA852",
        airline: "中国国际航空",
        passenger: "大雨",
        from: {
          code: "LGW",
          city: "伦敦 盖特威克",
          time: "12:35",
          terminal: "North",
        },
        to: {
          code: "PEK",
          city: "北京 首都",
          time: "04:52",
          terminal: "T3",
          dayOffset: 1,
        },
        track: "https://www.flightradar24.com/data/flights/ca852",
        note: "国航回北京，North Terminal 的 CA 柜台值机；次日凌晨 04:52 抵达首都 T3，点「实时追踪」看实时状态。",
        time: "12:35",
      },
    ],
    places: [],
    restaurants: [],
    checklists: [
      {
        title: "还车 Checklist",
        items: [
          "Pease Pottage 加满油，保留加油小票",
          "检查车内无个人物品（后备箱 / 杂物箱 / 座位下）",
          "拍照记录还车时车辆外观",
          "拿到还车确认单 / 邮件",
          "转 North Terminal，CA 国航柜台值机托运 + 过安检",
        ],
        time: "09:00",
      },
    ],
    tips: [
      {
        kind: "fuel",
        text: "必须在 Pease Pottage Services（M23 J11）加满油 — Sixt full-to-full，不加满按约 £2.5/升代加（正常 £1.5），距机场约 8–10min（J11 在机场以南）。",
        time: "08:30",
      },
      {
        kind: "info",
        text: "CA852 12:35 起飞，时间充裕；过安检后约 1.5h 可逛免税店。",
        time: "09:30",
      },
    ],
    stay: {
      summary: "夜宿 · 返程航班",
      lodging: [],
      note: "今晚在飞机上 · CA852 12:35 自 Gatwick 起飞回国。",
    },
  },
];

/**
 * Single source of truth for who is on the trip and when. 石头 is the UK-based
 * host; 大雨 and Jim are guests who fly in and out; Ed drives over for a weekend.
 *   大雨 — lands Day 0 (CA851), flies home Day 12 (CA852); around the whole trip.
 *   Jim  — lands Day 1 (CX255, Heathrow), flies home Day 8; leaves first.
 *   Ed   — drives over from Ipswich for the weekend, Day 2 (Sat) to Day 3 (Sun).
 *   石头 — heads home the night of Day 10, sits out the Day 11 solo day, then
 *          returns Day 12 to see 大雨 off at Gatwick.
 */
const partySchedule: PersonSchedule[] = [
  {
    id: "shitou",
    name: "石头",
    initial: "石",
    range: [0, 12],
    away: [11],
    markers: { 10: "home" },
  },
  {
    id: "dayu",
    name: "大雨",
    initial: "雨",
    range: [0, 12],
    markers: { 0: "arrive", 12: "depart" },
  },
  {
    id: "jim",
    name: "Jim",
    initial: "J",
    range: [1, 8],
    markers: { 1: "arrive", 8: "depart" },
  },
  {
    id: "ed",
    name: "Ed",
    initial: "E",
    range: [2, 3],
    via: "ground",
    markers: { 2: "arrive", 3: "depart" },
  },
];

export const gb: Trip = {
  slug: "gb",
  title: "大不列颠自驾",
  subtitle: "13 天深度自驾 · 英格兰 · 苏格兰高地 · 湖区 · 西南英格兰",
  dateRange: "2026 年 6 月 18 – 30 日",
  party: "3 人自驾",
  partySchedule,
  days,
};
