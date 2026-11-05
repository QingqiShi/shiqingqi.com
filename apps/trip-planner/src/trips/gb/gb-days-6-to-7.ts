import type { Day } from "../types";

export const gbDays6To7: Day[] = [
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
    driving: "约 3 小时（Grasmere→伯明翰单程 3h / 165mi）",
    weather: { temp: "10–18°C", summary: "湖区偏凉有雨" },
    coords: { lat: 52.4862, lon: -1.8904 }, // 伯明翰 Birmingham
    anchors: [
      {
        time: "09:00",
        label: "退房 · Woodlands（窗口 09:00–10:30）",
        kind: "checkout",
        query: "Woodlands, New Road, Windermere LA23 2EE",
      },
      {
        time: "09:30",
        label: "温德米尔湖蒸汽游船 Bowness → Ambleside",
        kind: "transit",
        query: "Bowness-on-Windermere pier",
        mode: "driving",
      },
      {
        time: "14:45",
        label: "出发前往伯明翰（先入住放行李）",
        kind: "drive",
        query: "Aloft Birmingham Eastside",
        mode: "driving",
      },
      {
        time: "17:50",
        label: "入住 Aloft · 放行李",
        kind: "checkin",
        query: "Aloft Birmingham Eastside",
      },
      {
        time: "19:00",
        label: "Albatross Death Cult 晚餐（3 人已订）",
        kind: "reservation",
        query: "Albatross, Newhall Square, Birmingham B3 1RU",
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
        note: "时间紧：姜饼店 + 华兹华斯故居快速一看",
        time: "13:00",
      },
      {
        label: "Grasmere → 伯明翰 Aloft",
        from: "Sarah Nelson Grasmere Gingerbread",
        to: "Aloft Birmingham Eastside",
        mode: "driving",
        note: "14:45 出发，M6 南下约 3h / 165mi（高峰约 3h20），约 17:50 到酒店先入住放行李。",
        time: "14:45",
      },
      {
        label: "Aloft → Albatross Death Cult",
        from: "Aloft Birmingham Eastside",
        to: "Albatross, Newhall Square, Birmingham B3 1RU",
        mode: "driving",
        note: "放好行李后跨城约 10min 去吃晚饭。",
        time: "18:30",
      },
    ],
    timeline: [
      { time: "09:30", text: "温德米尔湖蒸汽游船 Bowness → Ambleside" },
      { time: "11:30", text: "彼得兔世界 或 Hill Top 农场（作者故居）" },
      { time: "12:30", text: "午餐" },
      {
        time: "13:30",
        text: "Grasmere — Sarah Nelson's 姜饼店 + 华兹华斯故居（时间有限，快速一看）",
      },
      { time: "14:45", text: "出发前往伯明翰（M6 南下约 3h）" },
      {
        time: "17:50",
        text: "抵达伯明翰，先到 Aloft 入住放行李",
      },
      {
        time: "18:30",
        text: "前往 Albatross Death Cult（跨城约 10min），19:00 晚餐（已预订）",
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
        time: "13:30",
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
        query: "Albatross, Newhall Square, Birmingham B3 1RU",
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
        text: "Grasmere→伯明翰实测约 3h / 165mi（M6 南下，高峰约 3h20），不是 2 小时；14:45 出发，约 17:50 先到 Aloft 入住放行李，再去 19:00 晚餐，途中 M6 Tebay、Charnock Richard 等服务区可按需歇脚。",
        time: "14:45",
      },
      {
        kind: "parking",
        text: "Aloft Birmingham 酒店停车约 £10–15；先停好、行李上楼，晚餐后车留酒店。",
        time: "17:50",
      },
      {
        kind: "info",
        text: "Grasmere 别错过 Sarah Nelson's 1854 年姜饼店。",
        time: "13:30",
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
          checkIn: "6.25 周四 15:00 起（当天约 17:50 到，先放行李再去晚餐）",
          checkOut: "6.26 周五 12:00",
          note: "住客：大雨。",
          status: "booked",
        },
      ],
    },
  },
];
