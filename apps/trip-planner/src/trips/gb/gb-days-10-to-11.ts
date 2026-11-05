import type { Day } from "../types";

export const gbDays10To11: Day[] = [
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
];
