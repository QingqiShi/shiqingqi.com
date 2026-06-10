/**
 * Tuscany 2026 anniversary road trip — hard-coded, read-only content.
 *
 * Built from the trip notes (Tuscany.md). 5 days out of Pisa, all four nights
 * at Villa Vignacce (Bettolle, right by the A1 Valdichiana exit): the San
 * Gimignano–Siena day with the Arnolfo anniversary lunch, the classic
 * Val d'Orcia loop, and a coast day before flying home.
 */

import type { Day, PersonSchedule, Trip } from "../types";

const days: Day[] = [
  {
    n: 0,
    date: "2026-06-11",
    dateLabel: "6月11日",
    weekday: "周四",
    title: "飞比萨 · 取车 · Cortona 晚餐",
    route: "Gatwick ✈ Pisa → 酒店休整 → Cortona",
    driving: "约 2h50 自驾",
    weather: { temp: "16–30°C", summary: "晴热，注意防晒补水" },
    coords: { lat: 43.2747, lon: 11.9847 }, // Cortona
    anchors: [
      {
        time: "06:15",
        label: "出发去 Gatwick（公共交通约 1h30，天气差就 Uber）",
        kind: "transit",
        query: "Gatwick Airport North Terminal",
        mode: "transit",
      },
      {
        time: "08:40",
        label: "EZY8315 登机口关闭 · Board Rear · 座位 22E / 22F",
        kind: "flight",
      },
      {
        time: "12:25",
        label: "落地 Pisa（当地时间，快 1 小时）",
        kind: "flight",
      },
      {
        time: "13:15",
        label: "Avis 取车（确认是否带 Telepass）",
        kind: "pickup",
        query: "Avis, Pisa Airport",
        mode: "walking",
      },
      {
        time: "16:00",
        label: "Villa Vignacce 入住（check-in 16:00–19:00）",
        kind: "checkin",
        query: "Villa Vignacce, Bettolle",
        mode: "driving",
      },
    ],
    nav: [
      {
        label: "家 → Gatwick North Terminal",
        to: "Gatwick Airport North Terminal",
        from: "Navigation Point, London N17 9LX",
        mode: "transit",
        note: "Tottenham Hale 出发，地铁 + 火车约 1h30；带行李赶时间或天气差就 Uber。",
        time: "06:15",
      },
      {
        label: "Pisa 机场 → Villa Vignacce（Bettolle）",
        to: "Villa Vignacce, Bettolle",
        from: "Pisa International Airport",
        mode: "driving",
        note: "约 2 小时（174km）：FI-PI-LI 快速路（免费）转 A1 南下，Valdichiana 出口就在 Bettolle。路上找超市买水和零食，顺便破开现金。",
        time: "14:00",
      },
      {
        label: "酒店 → Cortona 老城",
        to: "Parcheggio Santo Spirito, Cortona",
        mode: "driving",
        note: "约 25 分钟。停城墙外的 Santo Spirito 停车场（€1.5/h，有扶梯上 Piazza Garibaldi），别开进 ZTL。",
        time: "18:15",
      },
      {
        label: "Cortona → Villa Vignacce（回酒店）",
        to: "Villa Vignacce, Bettolle",
        from: "Parcheggio Santo Spirito, Cortona",
        mode: "driving",
        note: "约 25 分钟。乡间路没有路灯，开远光、慢慢开。",
        time: "21:00",
      },
    ],
    timeline: [
      {
        time: "06:15",
        text: "出发去 Gatwick North Terminal：Tottenham Hale 地铁 + 火车约 1h30（天气差就 Uber）",
      },
      {
        time: "07:45",
        text: "到机场：值机安检后买午饭带上飞机（easyJet 机上只有付费小食；行李托运 08:30 截止）",
      },
      {
        time: "08:40",
        text: "登机口关闭 · 从机尾登机（Board Rear）· 座位 22E / 22F",
      },
      { time: "09:10", text: "EZY8315 起飞 · 飞行约 2 小时" },
      {
        time: "12:25",
        text: "落地 Pisa（当地时间）。入境走 EES：会录指纹 + 拍照（已全面启用），6 月高峰多留排队时间 → 取行李",
      },
      {
        time: "13:15",
        text: "Avis 取车：绕车拍照、确认油品和还车要求、问清 Telepass；机场 ATM 取 €100 现金",
      },
      {
        time: "14:00",
        text: "出发去 Villa Vignacce（约 2 小时），途中超市停一下买水零食、破开现金",
      },
      {
        time: "16:00",
        text: "Villa Vignacce check-in（入住时间 16:00–19:00），休整一下；顺便问好早餐时间——明早 8:30 就要出发",
      },
      {
        time: "18:15",
        text: "开车去 Cortona（约 25 分钟），城外停车后步行进老城",
      },
      {
        time: "19:00",
        text: "Cortona 晚餐 + 老城散步：Piazza della Repubblica 一带，饭后去 Piazza Garibaldi 看 Val di Chiana 日落",
      },
      {
        time: "21:00",
        text: "看完日落开回 Villa Vignacce（约 25 分钟），明早 8:30 出发，早点休息",
      },
    ],
    checklists: [
      {
        title: "出发前检查",
        items: [
          "护照（两人）",
          "英国驾照（意大利承认英国驾照，无需国际驾照）",
          "Arnolfo 预订确认 + 酒店预订单截图",
          "可在欧洲免手续费刷卡的银行卡",
          "主驾名下的信用卡（Avis 押金预授权，借记卡可能不收）",
          "手机：确认欧盟漫游 / 装好 eSIM，下载托斯卡纳离线地图（乡间信号一般）",
          "GHIC 卡和旅行保险单截图",
          "防晒霜、墨镜、泳衣（6.14 海滩日）",
          "欧标转换插头",
          "在 Booking 上填预计到店时间（约 16:00）",
        ],
        time: "06:15",
      },
      {
        title: "Avis 取车检查",
        items: [
          "绕车拍照 / 录视频留底（划痕、轮毂、玻璃）",
          "确认油品：汽油 benzina 还是柴油 diesel",
          "问清是否带 Telepass、过路费怎么扣",
          "确认还车时间、地点和满油要求（full-to-full）",
          "拒绝不需要的保险升级和油卡 upsell",
          "左舵车：上路前在停车场先适应几分钟",
        ],
        time: "13:15",
      },
      {
        title: "上路前 · 手感恢复",
        items: [
          "调好座椅和三个后视镜，找到灯光 / 雨刷 / 喇叭（转向灯杆在方向盘左侧）",
          "自动挡：右脚管油门和刹车，左脚全程闲着——别下意识找离合",
          "在停车场慢速绕两圈：起步、刹车、倒车找回手感",
          "上路默念三句：靠右行驶 · 环岛逆时针 · 路口先看左边来车",
          "城外记得开近光灯：意大利市区外白天也必须开",
          "限速心里有数：高速 130 / 快速路 110 / 乡道 90 / 市区 50（雨天各降一档）",
          "后车贴得近是常态，别慌，按自己的节奏开",
        ],
        note: "久没开车 + 左舵右行，前 20 分钟慢慢来，高速上手最容易。",
        time: "14:00",
      },
    ],
    signSheets: [
      {
        title: "意大利路牌速记（飞机上过一遍）",
        time: "09:10",
        note: "其他常见词：Uscita 出口 · Rallentare 减速 · Tutte le Direzioni 所有方向。两小时航程正好过一遍，落地就要上路。",
        signs: [
          {
            glyph: "roadColors",
            name: "绿牌 = 高速 · 蓝牌 = 国道",
            meaning:
              "和英国正好反过来：绿色 autostrada 是收费高速，蓝色是普通国道。",
          },
          {
            glyph: "noEntry",
            name: "禁止驶入 Senso Vietato",
            meaning: "单行道的出口，千万别拐进去。",
          },
          {
            glyph: "oneWay",
            name: "单行道 Senso Unico",
            meaning: "蓝底白箭头，沿箭头方向走；老城里几乎全是单行。",
          },
          {
            glyph: "giveWay",
            name: "让行 Dare Precedenza",
            meaning: "意大利路口 STOP 少、让行多——见倒三角就减速看两边。",
          },
          {
            glyph: "priority",
            name: "干道优先权",
            meaning: "黄色菱形 = 你在干道上有优先权；画黑杠 = 优先权结束。",
          },
          {
            glyph: "noParking",
            name: "禁止停车 / 禁止停靠",
            meaning: "一道杠 = 禁止停车；交叉两道 = 连临时停靠都不行。",
          },
          {
            glyph: "ztl",
            name: "ZTL 限行区",
            meaning:
              "Zona a Traffico Limitato，摄像头抓拍。跟着「Centro」指示开常会中招，见到就绕开。",
          },
          {
            glyph: "speedLimit",
            name: "限速",
            meaning:
              "高速 130 · 快速路 110 · 乡道 90 · 市区 50，雨天各降一档。",
          },
          {
            glyph: "speedCamera",
            name: "测速 Autovelox / Tutor",
            meaning: "固定测速 / 区间测速提示牌，意大利测速点很多，见牌收油。",
          },
        ],
      },
    ],
    places: [
      {
        name: "途中超市补给（Conad / Coop）",
        query: "supermercato, Sinalunga",
        note: "下 A1 后顺路，买水零食、破开现金",
        time: "14:00",
      },
      {
        name: "Piazza della Repubblica（Cortona 主广场）",
        query: "Piazza della Repubblica, Cortona",
        note: "老城中心，市政厅台阶",
      },
      {
        name: "Piazza Garibaldi 观景台",
        query: "Piazza Garibaldi, Cortona",
        note: "俯瞰 Val di Chiana 平原，日落极美",
      },
    ],
    restaurants: [
      {
        name: "La Bucaccia",
        area: "Cortona",
        query: "La Bucaccia, Cortona",
        tag: "托斯卡纳传统 · 石窖餐厅",
        description:
          "13 世纪石窖里的家族餐厅，自家 pecorino 奶酪和 Chianina 牛排出名。位置很少，强烈建议起飞前打电话或网上订位。",
        website: "https://www.labucaccia.it/",
      },
      {
        name: "Osteria del Teatro",
        area: "Cortona",
        query: "Osteria del Teatro, Cortona",
        tag: "托斯卡纳家常 · 备选",
        description:
          "剧院旁的老牌 osteria，墙上挂满老剧照，野猪肉酱面和松露菜式可靠。订不到 La Bucaccia 就来这家。",
      },
      {
        name: "Trattoria Dardano",
        area: "Cortona",
        query: "Trattoria Dardano, Cortona",
        tag: "家常实惠 · 备选",
        description:
          "Via Dardano 老街上的本地家常馆子，手工面和烤肉实惠地道。前两家都没位就直接走进来试。",
      },
    ],
    tips: [
      {
        kind: "info",
        text: "去程 Gatwick、回程 Stansted 两个机场——回程 Stansted Express 直达 Tottenham Hale，到家很顺。",
      },
      {
        kind: "money",
        text: "€100 现金建议落地后用 Pisa 机场的 Bancomat（ATM）取，汇率比 Gatwick 换汇好；刷卡一律选 EUR 计价、拒绝 DCC。",
        time: "13:15",
      },
      {
        kind: "drive",
        text: "有 Telepass 走黄色 T 字车道自动扣费；没有就走白色「Biglietto」道取票，下高速人工 / 刷卡道缴费。A1 佛罗伦萨—Valdichiana 约 €7。",
        time: "14:00",
      },
      {
        kind: "drive",
        text: "意大利左舵右行，和英国相反——环岛逆时针、优先权方向都反过来，头一两天打起精神。",
      },
      {
        kind: "warn",
        text: "ZTL（限行区）！托斯卡纳几乎每个老城的城墙内都有摄像头限行区，导航再怎么指也别往城里开，一律停城外停车场。罚单会通过租车公司寄到家。",
        time: "18:15",
      },
      {
        kind: "info",
        text: "6 月托斯卡纳日落约 20:50，晚饭前后散步看日落正好。",
      },
      {
        kind: "info",
        text: "记好：欧盟紧急电话 112；车辆故障打租车合同上的 Avis 道路救援号。",
      },
    ],
    stay: {
      summary: "Villa Vignacce · Bettolle（4 晚）",
      lodging: [
        {
          name: "Villa Vignacce - Boutique Country Resort",
          query: "Villa Vignacce, Bettolle",
          address: "Loc. Vignacce 6, 53040 Bettolle",
          checkIn: "16:00–19:00",
          checkOut: "9:00–10:00",
          status: "booked",
          note: "Booking.com 订 4 晚（6.11–6.15）· 距 Cortona 约 25 分钟，就在 A1 Valdichiana 出口旁。",
        },
      ],
    },
  },
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

/** 两个人全程同进同出：D0 一起飞抵，D4 一起飞回。 */
const partySchedule: PersonSchedule[] = [
  {
    id: "shitou",
    name: "石头",
    initial: "石",
    range: [0, 4],
    markers: { 0: "arrive", 4: "depart" },
  },
  {
    id: "tong",
    name: "Tong",
    initial: "T",
    range: [0, 4],
    markers: { 0: "arrive", 4: "depart" },
  },
];

export const tuscany: Trip = {
  slug: "tuscany",
  title: "托斯卡纳自驾",
  subtitle:
    "5 天自驾 · 中世纪山城 · Val d'Orcia 丝柏 · 第勒尼安海滩 · 纪念日之旅",
  dateRange: "2026 年 6 月 11 – 15 日",
  party: "2 人自驾",
  partySchedule,
  days,
};
