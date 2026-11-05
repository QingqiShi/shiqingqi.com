import type { Day } from "../types";

export const gbDays4To5: Day[] = [
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
];
