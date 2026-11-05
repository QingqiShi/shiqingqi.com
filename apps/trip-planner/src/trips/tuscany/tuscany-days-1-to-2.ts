import type { Day } from "../types";

export const tuscanyDays1To2: Day[] = [
  {
    n: 1,
    date: "2026-06-12",
    dateLabel: "6月12日",
    weekday: "周五",
    title: "San Gimignano · Arnolfo 纪念日午餐 · Siena",
    route: "San Gimignano → Colle di Val d'Elsa → Siena → Baccoleno 丝柏",
    driving: "约 3h50 自驾",
    weather: { temp: "16–31°C", summary: "晴热，午后偶有热雷雨" },
    coords: { lat: 43.3186, lon: 11.3306 }, // Siena
    anchors: [
      {
        time: "08:30",
        label: "出发去 San Gimignano（约 1h30）",
        kind: "drive",
      },
      {
        time: "13:00",
        label: "Arnolfo 纪念日午餐（米其林二星 · 已订）",
        kind: "reservation",
        query: "Arnolfo Ristorante, Colle di Val d'Elsa",
        mode: "driving",
      },
    ],
    nav: [
      {
        label: "酒店 → San Gimignano P2 停车场",
        to: "Parcheggio Montemaggio P2, San Gimignano",
        mode: "driving",
        note: "约 1h30，走 Siena 方向的快速路（免费）。",
        time: "08:30",
      },
      {
        label: "San Gimignano → Arnolfo（Colle di Val d'Elsa）",
        to: "Arnolfo Ristorante, Colle di Val d'Elsa",
        mode: "driving",
        note: "约 25 分钟，留足余量，别让纪念日午餐迟到。",
        time: "12:25",
      },
      {
        label: "Colle di Val d'Elsa → Siena Santa Caterina 停车场",
        to: "Parcheggio Santa Caterina, Siena",
        mode: "driving",
        note: "约 30 分钟。停车场有自动扶梯直上老城。",
        time: "16:00",
      },
      {
        label: "Siena → Agriturismo Baccoleno（S 型丝柏路）",
        to: "Agriturismo Baccoleno, Asciano",
        mode: "driving",
        note: "约 50 分钟，走 SS438 Crete Senesi 风景线，一路丘陵麦田。",
        time: "18:35",
      },
      {
        label: "Baccoleno → Villa Vignacce（回酒店）",
        to: "Villa Vignacce, Bettolle",
        from: "Agriturismo Baccoleno, Asciano",
        mode: "driving",
        note: "约 40 分钟。",
        time: "20:15",
      },
    ],
    timeline: [
      { time: "08:30", text: "出发去 San Gimignano（约 1h30）" },
      {
        time: "10:15",
        text: "San Gimignano：P2 停车步行进城。中世纪「曼哈顿」塔楼天际线、Piazza della Cisterna；有体力可登 Torre Grossa 看全景",
      },
      {
        time: "11:45",
        text: "Dondoli 冰淇淋（拿过世界冠军的 gelato，就在水井广场），买完往城门溜达",
      },
      { time: "12:25", text: "出发去 Colle di Val d'Elsa（约 25 分钟）" },
      {
        time: "13:00",
        text: "🎉 Arnolfo 纪念日午餐 —— 米其林二星，tasting menu 约 2.5–3 小时，慢慢享受",
      },
      {
        time: "16:00",
        text: "去 Siena（约 30 分钟）：Piazza del Campo 贝壳广场、主教座堂（外观或快速入内），老城巷子随便钻",
      },
      {
        time: "18:35",
        text: "走 Crete Senesi 风景线去 Baccoleno（约 50 分钟），路上就很出片",
      },
      {
        time: "19:30",
        text: "Agriturismo Baccoleno：山脊上的 S 型丝柏车道，金色斜阳是最佳光线（日落约 20:50）",
      },
      {
        time: "20:15",
        text: "返回 Villa Vignacce（约 40 分钟）。中午吃了大餐，晚上回酒店附近简单解决就好",
      },
    ],
    places: [
      {
        name: "Piazza della Cisterna",
        query: "Piazza della Cisterna, San Gimignano",
        note: "水井广场，San Gimignano 中心",
        time: "10:15",
      },
      {
        name: "Torre Grossa 登塔",
        query: "Torre Grossa, San Gimignano",
        note: "全城最高塔，看塔楼天际线",
        time: "10:15",
      },
      {
        name: "Rocca di Montestaffoli",
        query: "Rocca di Montestaffoli, San Gimignano",
        note: "免费的城堡高点，拍塔楼天际线最好的位置",
        time: "10:15",
      },
      {
        name: "Piazza del Campo",
        query: "Piazza del Campo, Siena",
        note: "贝壳形大广场，赛马节场地",
        time: "16:00",
      },
      {
        name: "Siena 主教座堂",
        query: "Duomo di Siena",
        note: "黑白条纹大理石，周五 10:00–19:00；著名大理石地板 6.27 才揭幕，此行看不到",
        time: "16:00",
      },
      {
        name: "晚餐 · 酒店周边（现场挑）",
        query: "ristorante, Bettolle",
        note: "一键搜周边馆子，评分 4.3+ 即可",
        time: "20:15",
      },
    ],
    restaurants: [
      {
        name: "Arnolfo",
        area: "Colle di Val d'Elsa",
        query: "Arnolfo Ristorante, Colle di Val d'Elsa",
        tag: "米其林二星 · 纪念日午餐",
        michelin: 2,
        status: "booked",
        time: "13:00",
        description:
          "Gaetano Trovato 主理的米其林二星（Viale della Rimembranza 24），山顶玻璃房俯瞰山谷，托斯卡纳食材的当代料理。着装 smart casual 即可。",
        website: "https://arnolfo.com/",
        booking: {
          date: "6.12 周五",
          time: "13:00",
          party: "2 人",
          note: "在一起纪念日午餐 🎉",
        },
      },
      {
        name: "Gelateria Dondoli",
        area: "San Gimignano",
        query: "Gelateria Dondoli, San Gimignano",
        tag: "Gelato · 世界冠军",
        time: "11:45",
        description:
          "Sergio Dondoli 的冰淇淋店，Gelato World Cup 冠军，招牌 Crema di Santa Fina（藏红花松子）。队再长也值得排。",
      },
    ],
    tips: [
      {
        kind: "parking",
        text: "San Gimignano 停 P2 Montemaggio（Porta San Giovanni 城门步行 10 分钟；P1 Giubileo 离城门更近，可先试）；周五上午人流开始多，尽量 10:30 前到。",
        time: "10:15",
      },
      {
        kind: "info",
        text: "Arnolfo 午餐节奏慢，吃到 15:30–16:00 很正常——这是今天的主角，Siena 行程留弹性。",
        time: "13:00",
      },
      {
        kind: "parking",
        text: "Siena 老城 ZTL 范围很大且全天抓拍，一定停 Santa Caterina / Fontebranda 这类城下停车场，坐扶梯上去。",
        time: "16:00",
      },
      {
        kind: "warn",
        text: "Baccoleno 是私人农庄：S 型车道只能在公路边拍，不要把车开进私家路，也别堵在路中间停车。",
        time: "19:30",
      },
      {
        kind: "info",
        text: "今天很满，唯一的铁律是 13:00 的 Arnolfo（已订）。来不及就把 San Gimignano 整个挪去 D3（启用 Plan B 放弃海滩日）：上午睡饱直接去 Arnolfo，下午 Siena + Baccoleno 慢慢逛。",
      },
    ],
    stay: {
      summary: "Villa Vignacce（同 D0）",
      lodging: [],
      ref: { dayN: 0, label: "同 D0 · Villa Vignacce" },
    },
  },
  {
    n: 2,
    date: "2026-06-13",
    dateLabel: "6月13日",
    weekday: "周六",
    title: "Val d'Orcia 经典环线",
    route: "Montepulciano → Monticchiello → Pienza → San Quirico → Montalcino",
    driving: "约 3h 自驾",
    weather: { temp: "16–31°C", summary: "晴热，紫外线强" },
    coords: { lat: 43.0769, lon: 11.6789 }, // Pienza
    anchors: [
      {
        time: "09:00",
        label: "出发跑 Val d'Orcia 环线（顺时针）",
        kind: "drive",
        query: "Montepulciano",
        mode: "driving",
      },
    ],
    nav: [
      {
        label: "酒店 → Montepulciano",
        to: "Montepulciano",
        mode: "driving",
        note: "约 35 分钟。停城外环路停车场（P1 离 Porta al Prato 城门近）。",
        time: "09:00",
      },
      {
        label: "Montepulciano → Monticchiello（Z 型丝柏弯道）",
        to: "Monticchiello",
        mode: "driving",
        note: "约 15 分钟。村子不通车——停村外免费停车场步行进去；上山之字弯从村口观景点和对面公路边拍。",
        time: "11:45",
      },
      {
        label: "Monticchiello → Pienza",
        to: "Pienza",
        mode: "driving",
        note: "约 20 分钟。",
        time: "14:00",
      },
      {
        label: "Pienza → Vitaleta 小教堂",
        to: "Cappella della Madonna di Vitaleta",
        mode: "driving",
        note: "SP146 旁，停车后沿白色碎石路步行约 10 分钟；铁门锁车不锁人（旁边有行人缺口）。",
        time: "16:00",
      },
      {
        label: "Vitaleta → San Quirico d'Orcia",
        to: "San Quirico d'Orcia",
        mode: "driving",
        note: "约 10 分钟。",
        time: "16:45",
      },
      {
        label: "San Quirico → Montalcino",
        to: "Fortezza di Montalcino",
        mode: "driving",
        note: "约 25 分钟，一路上坡进 Brunello 产区。",
        time: "17:45",
      },
      {
        label: "Montalcino → Villa Vignacce（回酒店）",
        to: "Villa Vignacce, Bettolle",
        from: "Fortezza di Montalcino",
        mode: "driving",
        note: "约 1h10。",
        time: "19:00",
      },
    ],
    timeline: [
      {
        time: "09:00",
        text: "出发去 Montepulciano（约 35 分钟），周六人多，赶早错峰",
      },
      {
        time: "09:45",
        text: "Montepulciano：爬主街到 Piazza Grande，钻一家历史酒窖（Contucci / De' Ricci 的地下酒窖可免费参观），Vino Nobile 带一两瓶",
      },
      {
        time: "11:45",
        text: "Monticchiello：车停村外免费停车场步行进村（村内不通车，走一圈 10 分钟）；Z 型丝柏弯道从村口观景点拍",
      },
      {
        time: "12:30",
        text: "午餐：Osteria La Porta 露台（建议提前订）或村里随便吃",
      },
      {
        time: "14:00",
        text: "Pienza：文艺复兴「理想之城」，Corso Rossellino 主街、城墙观景步道（Via dell'Amore / Via del Bacio），买 pecorino di Pienza 羊酪",
      },
      {
        time: "16:00",
        text: "Vitaleta 小教堂：Val d'Orcia 最上镜的明信片机位，步行往返约 25 分钟。教堂内部常年锁门（只办仪式才开）——本来就是拍外观的",
      },
      {
        time: "16:45",
        text: "San Quirico d'Orcia：Horti Leonini 花园和老街快速一逛；镇北 SR2 边就是经典的丝柏树环",
      },
      {
        time: "17:45",
        text: "Montalcino：要塞城墙 + 镇上酒铺尝 Brunello（司机浅尝或买回去喝）",
      },
      {
        time: "19:00",
        text: "返回 Villa Vignacce（约 1h10），晚餐可在 Bettolle / Montepulciano 方向顺路解决",
      },
    ],
    places: [
      {
        name: "Piazza Grande",
        query: "Piazza Grande, Montepulciano",
        note: "山城之巅的主广场",
        time: "09:45",
      },
      {
        name: "Cantina De' Ricci 酒窖",
        query: "Cantine De' Ricci, Montepulciano",
        note: "教堂一样的地下酒窖",
        time: "09:45",
      },
      {
        name: "Cantina Contucci 酒窖",
        query: "Cantina Contucci, Montepulciano",
        note: "Piazza Grande 旁的百年家族酒窖，免费逛",
        time: "09:45",
      },
      {
        name: "Z 型丝柏弯道",
        query: "Monticchiello cypress road",
        note: "上山之字弯，村口拍全景",
        time: "11:45",
      },
      {
        name: "La Foce 之字丝柏路（最经典机位）",
        query: "La Foce winding road viewpoint",
        note: "明信片上的之字丝柏其实是 La Foce 庄园的私家路——不能开进去，公路边观景位拍；离 Monticchiello 约 15 分钟，顺路值得绕",
        time: "11:45",
      },
      {
        name: "Pienza 城墙观景步道",
        query: "Via dell'Amore, Pienza",
        note: "俯瞰整个 Val d'Orcia",
        time: "14:00",
      },
      {
        name: "San Quirico 丝柏树环",
        query: "Cipressi di San Quirico d'Orcia",
        note: "SR2 路边经典机位，停 layby 拍",
        time: "16:45",
      },
      {
        name: "Fortezza di Montalcino",
        query: "Fortezza di Montalcino",
        note: "14 世纪要塞，里面就是酒铺",
        time: "17:45",
      },
    ],
    restaurants: [
      {
        name: "Osteria La Porta",
        area: "Monticchiello",
        query: "Osteria La Porta, Monticchiello",
        tag: "托斯卡纳菜 · 景观露台 · 首选",
        time: "12:30",
        description:
          "就在 Monticchiello 村门口，小露台正对 Val d'Orcia。位置少，想吃露台要提前打电话订。",
      },
      {
        name: "La Cantina della Porta",
        area: "Monticchiello",
        query: "La Cantina della Porta, Monticchiello",
        tag: "同村备选",
        time: "12:30",
        description:
          "同一个村里的另一家，托斯卡纳家常 + 本地酒，La Porta 满了就来这家。",
      },
      {
        name: "Trattoria Latte di Luna",
        area: "Pienza",
        query: "Trattoria Latte di Luna, Pienza",
        tag: "Pici · 烤乳猪 · 备选",
        time: "12:30",
        description:
          "Pienza 城门口的老牌小馆，手搓 pici 和 maialino（烤乳猪）出名。Monticchiello 没吃上就忍到 Pienza 吃这家。",
      },
      {
        name: "Osteria Acquacheta",
        area: "Montepulciano",
        query: "Osteria Acquacheta, Montepulciano",
        tag: "Bistecca 名店 · 晚餐备选",
        time: "19:00",
        description:
          "Montepulciano 老城的牛排名店（Via del Teatro 22），bistecca 按重量卖、老板亲自展示肉块。晚市只有 19:30 / 21:15 两轮且常提前几天订满——想吃就上午逛 Montepulciano 时顺路去订；订不上回 Bettolle 随便吃。",
      },
    ],
    tips: [
      {
        kind: "drive",
        text: "司机注意：意大利酒驾上限 0.5‰（约一小杯酒），品酒浅尝即止，想多喝就买回酒店喝。",
      },
      {
        kind: "parking",
        text: "每个小镇都停城外：蓝线=收费（咪表，备硬币或 EasyPark App），白线=免费，黄线=居民专用。城墙内全是 ZTL。",
      },
      {
        kind: "info",
        text: "周六是 Val d'Orcia 最挤的一天，按 Montepulciano → Montalcino 顺时针跑可以一路错峰；拍照黄金光线在 17 点以后。",
      },
      {
        kind: "info",
        text: "环线赶不完不用硬赶：漏掉的镇子挪去明天补（D3 启用 Plan B，放弃海滩日，和 San Gimignano 一起收尾）。",
      },
      {
        kind: "info",
        text: "若昨天没去成 Baccoleno，今天从 Montalcino 收尾后绕去只要 35 分钟，正好赶日落。",
        time: "17:45",
      },
    ],
    stay: {
      summary: "Villa Vignacce（同 D0）",
      lodging: [],
      ref: { dayN: 0, label: "同 D0 · Villa Vignacce" },
    },
  },
];
