import type { Day } from "../types";

export const tuscanyDay0: Day[] = [
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
];
