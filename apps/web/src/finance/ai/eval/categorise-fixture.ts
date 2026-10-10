/**
 * A synthetic labelling fixture: a generic bilingual-household category tree,
 * a short labelled history, and held-out UK bank strings with the categories
 * a person would pick. No real household data.
 */
export interface FixtureCategory {
  key: string;
  name: string;
  kind: "expense" | "income";
  parent?: string;
}

export interface FixtureCase {
  text: string;
  amountMinor: number;
  /** Category keys a person would accept; the first is the usual one. */
  categories: string[];
  /** Payee names a person would accept, compared without case or punctuation. */
  payees: string[];
}

export const categoriseFixture: {
  categories: FixtureCategory[];
  tags: string[];
  history: {
    payee: string;
    category: string;
    amountMinor: number;
    aliases?: string[];
  }[];
  cases: FixtureCase[];
} = {
  categories: [
    { key: "food", name: "餐饮", kind: "expense" },
    { key: "groceries", name: "超市", kind: "expense", parent: "food" },
    { key: "eating-out", name: "下馆子", kind: "expense", parent: "food" },
    { key: "takeaway", name: "外卖", kind: "expense", parent: "food" },
    { key: "coffee", name: "咖啡零食", kind: "expense", parent: "food" },
    { key: "transport", name: "出行", kind: "expense" },
    {
      key: "public-transport",
      name: "公共交通",
      kind: "expense",
      parent: "transport",
    },
    { key: "taxi", name: "打车", kind: "expense", parent: "transport" },
    {
      key: "fuel-parking",
      name: "加油停车",
      kind: "expense",
      parent: "transport",
    },
    { key: "travel", name: "旅行", kind: "expense" },
    { key: "subscriptions", name: "订阅", kind: "expense" },
    { key: "shopping", name: "购物", kind: "expense" },
    { key: "online", name: "网购", kind: "expense", parent: "shopping" },
    { key: "clothing", name: "服饰", kind: "expense", parent: "shopping" },
    { key: "home", name: "家居", kind: "expense", parent: "shopping" },
    { key: "bills", name: "生活缴费", kind: "expense" },
    { key: "utilities", name: "水电燃气", kind: "expense", parent: "bills" },
    { key: "telecom", name: "通讯网络", kind: "expense", parent: "bills" },
    { key: "council-tax", name: "市政税", kind: "expense", parent: "bills" },
    { key: "health", name: "健康", kind: "expense" },
    { key: "entertainment", name: "娱乐", kind: "expense" },
    { key: "insurance", name: "保险", kind: "expense" },
    { key: "uncategorised-expense", name: "Uncategorised", kind: "expense" },
    { key: "salary", name: "工资", kind: "income" },
    { key: "interest", name: "利息", kind: "income" },
    { key: "uncategorised-income", name: "Uncategorised", kind: "income" },
  ],
  tags: ["地铁", "火车", "请客"],
  history: [
    { payee: "Tesco", category: "groceries", amountMinor: -4210 },
    { payee: "Sainsbury's", category: "groceries", amountMinor: -3120 },
    {
      payee: "Ocado",
      category: "groceries",
      amountMinor: -8650,
      aliases: ["OCADO RETAIL LTD"],
    },
    { payee: "Deliveroo", category: "takeaway", amountMinor: -2380 },
    { payee: "Pret A Manger", category: "coffee", amountMinor: -495 },
    {
      payee: "TfL",
      category: "public-transport",
      amountMinor: -280,
      aliases: ["TFL TRAVEL CH"],
    },
    { payee: "Uber", category: "taxi", amountMinor: -1460 },
    { payee: "Netflix", category: "subscriptions", amountMinor: -1099 },
    { payee: "Spotify", category: "subscriptions", amountMinor: -1199 },
    { payee: "Amazon", category: "online", amountMinor: -2599 },
    { payee: "British Gas", category: "utilities", amountMinor: -9500 },
    { payee: "Nando's", category: "eating-out", amountMinor: -3650 },
  ],
  cases: [
    {
      text: "TESCO STORES 3297",
      amountMinor: -2345,
      categories: ["groceries"],
      payees: ["Tesco"],
    },
    {
      text: "SAINSBURYS S/MKT LONDON",
      amountMinor: -1870,
      categories: ["groceries"],
      payees: ["Sainsbury's"],
    },
    {
      text: "OCADO RETAIL LTD",
      amountMinor: -9120,
      categories: ["groceries"],
      payees: ["Ocado"],
    },
    {
      text: "ASDA SUPERSTORE 4521",
      amountMinor: -5630,
      categories: ["groceries"],
      payees: ["Asda"],
    },
    {
      text: "LIDL GB LONDON",
      amountMinor: -2210,
      categories: ["groceries"],
      payees: ["Lidl"],
    },
    {
      text: "ALDI 82 STORES",
      amountMinor: -3340,
      categories: ["groceries"],
      payees: ["Aldi"],
    },
    {
      text: "WAITROSE 1234",
      amountMinor: -4480,
      categories: ["groceries"],
      payees: ["Waitrose"],
    },
    {
      text: "M&S SIMPLY FOOD 0412",
      amountMinor: -1260,
      categories: ["groceries"],
      payees: [
        "M&S",
        "M&S Simply Food",
        "Marks & Spencer",
        "Marks and Spencer",
      ],
    },
    {
      text: "CO-OP GROUP FOOD 2210",
      amountMinor: -940,
      categories: ["groceries"],
      payees: ["Co-op", "Co-op Food", "The Co-operative"],
    },
    {
      text: "DELIVEROO*KFC",
      amountMinor: -2150,
      categories: ["takeaway"],
      payees: ["Deliveroo"],
    },
    {
      text: "UBER *EATS",
      amountMinor: -2790,
      categories: ["takeaway"],
      payees: ["Uber Eats"],
    },
    {
      text: "JUST EAT.CO.UK LTD",
      amountMinor: -3120,
      categories: ["takeaway"],
      payees: ["Just Eat"],
    },
    {
      text: "PRET A MANGER 2041",
      amountMinor: -485,
      categories: ["coffee"],
      payees: ["Pret A Manger", "Pret"],
    },
    {
      text: "STARBUCKS 1234 LONDON",
      amountMinor: -395,
      categories: ["coffee"],
      payees: ["Starbucks"],
    },
    {
      text: "COSTA COFFEE 43021",
      amountMinor: -360,
      categories: ["coffee"],
      payees: ["Costa Coffee", "Costa"],
    },
    {
      text: "CAFFE NERO 556",
      amountMinor: -340,
      categories: ["coffee"],
      payees: ["Caffè Nero", "Caffe Nero"],
    },
    {
      text: "NANDOS LONDON",
      amountMinor: -4120,
      categories: ["eating-out"],
      payees: ["Nando's"],
    },
    {
      text: "WAGAMAMA LTD",
      amountMinor: -3890,
      categories: ["eating-out"],
      payees: ["Wagamama"],
    },
    {
      text: "PIZZA EXPRESS 1234",
      amountMinor: -4650,
      categories: ["eating-out"],
      payees: ["PizzaExpress", "Pizza Express"],
    },
    {
      text: "DISHOOM KINGS CROSS",
      amountMinor: -6720,
      categories: ["eating-out"],
      payees: ["Dishoom"],
    },
    {
      text: "TFL TRAVEL CH",
      amountMinor: -280,
      categories: ["public-transport"],
      payees: ["TfL", "Transport for London"],
    },
    {
      text: "TFL.GOV.UK/CP",
      amountMinor: -720,
      categories: ["public-transport"],
      payees: ["TfL", "Transport for London"],
    },
    {
      text: "TRAINLINE.COM",
      amountMinor: -5640,
      categories: ["public-transport", "travel"],
      payees: ["Trainline"],
    },
    {
      text: "UBER *TRIP HELP.UBER.COM",
      amountMinor: -1380,
      categories: ["taxi"],
      payees: ["Uber"],
    },
    {
      text: "BOLT.EU/O/2308",
      amountMinor: -1150,
      categories: ["taxi"],
      payees: ["Bolt"],
    },
    {
      text: "ADDISON LEE LTD",
      amountMinor: -3200,
      categories: ["taxi"],
      payees: ["Addison Lee"],
    },
    {
      text: "SHELL KINGS LANGLEY",
      amountMinor: -6200,
      categories: ["fuel-parking"],
      payees: ["Shell"],
    },
    {
      text: "BP 1234 CONNECT",
      amountMinor: -5810,
      categories: ["fuel-parking"],
      payees: ["BP"],
    },
    {
      text: "RINGGO PARKING",
      amountMinor: -450,
      categories: ["fuel-parking"],
      payees: ["RingGo"],
    },
    {
      text: "NETFLIX.COM",
      amountMinor: -1099,
      categories: ["subscriptions"],
      payees: ["Netflix"],
    },
    {
      text: "SPOTIFY P1A2B3",
      amountMinor: -1199,
      categories: ["subscriptions"],
      payees: ["Spotify"],
    },
    {
      text: "DISNEY PLUS",
      amountMinor: -799,
      categories: ["subscriptions"],
      payees: ["Disney+", "Disney Plus"],
    },
    {
      text: "APPLE.COM/BILL",
      amountMinor: -299,
      categories: ["subscriptions"],
      payees: ["Apple", "Apple.com", "iCloud"],
    },
    {
      text: "AMAZON PRIME*2K4LM",
      amountMinor: -899,
      categories: ["subscriptions"],
      payees: ["Amazon Prime", "Amazon"],
    },
    {
      text: "GOOGLE *YOUTUBE PREMIUM",
      amountMinor: -1299,
      categories: ["subscriptions"],
      payees: ["YouTube Premium", "YouTube", "Google"],
    },
    {
      text: "AMZNMKTPLACE*2K4LM",
      amountMinor: -1899,
      categories: ["online"],
      payees: ["Amazon", "Amazon Marketplace"],
    },
    {
      text: "AMAZON.CO.UK*AB12C",
      amountMinor: -2499,
      categories: ["online"],
      payees: ["Amazon"],
    },
    {
      text: "EBAY O*12-34567",
      amountMinor: -1550,
      categories: ["online"],
      payees: ["eBay"],
    },
    {
      text: "ARGOS LTD",
      amountMinor: -3999,
      categories: ["online", "home", "shopping"],
      payees: ["Argos"],
    },
    {
      text: "IKEA LTD WEMBLEY",
      amountMinor: -12_450,
      categories: ["home"],
      payees: ["IKEA"],
    },
    {
      text: "JOHN LEWIS 123",
      amountMinor: -8900,
      categories: ["home", "clothing", "shopping"],
      payees: ["John Lewis"],
    },
    {
      text: "UNIQLO EUROPE LTD",
      amountMinor: -3990,
      categories: ["clothing"],
      payees: ["Uniqlo"],
    },
    {
      text: "ZARA UK",
      amountMinor: -5990,
      categories: ["clothing"],
      payees: ["Zara"],
    },
    {
      text: "H&M 123 OXFORD ST",
      amountMinor: -2499,
      categories: ["clothing"],
      payees: ["H&M"],
    },
    {
      text: "BRITISH GAS",
      amountMinor: -9500,
      categories: ["utilities"],
      payees: ["British Gas"],
    },
    {
      text: "OCTOPUS ENERGY",
      amountMinor: -11_200,
      categories: ["utilities"],
      payees: ["Octopus Energy", "Octopus"],
    },
    {
      text: "THAMES WATER",
      amountMinor: -4200,
      categories: ["utilities"],
      payees: ["Thames Water"],
    },
    {
      text: "EE LIMITED",
      amountMinor: -2500,
      categories: ["telecom"],
      payees: ["EE"],
    },
    {
      text: "VIRGIN MEDIA",
      amountMinor: -6200,
      categories: ["telecom"],
      payees: ["Virgin Media"],
    },
    {
      text: "GIFFGAFF",
      amountMinor: -1000,
      categories: ["telecom"],
      payees: ["giffgaff"],
    },
    {
      text: "LB CAMDEN COUNCIL TAX",
      amountMinor: -16_800,
      categories: ["council-tax"],
      payees: ["Camden Council", "LB Camden", "London Borough of Camden"],
    },
    {
      text: "BOOTS 1234",
      amountMinor: -1265,
      categories: ["health", "shopping"],
      payees: ["Boots"],
    },
    {
      text: "PUREGYM LTD",
      amountMinor: -2499,
      categories: ["health", "entertainment", "subscriptions"],
      payees: ["PureGym"],
    },
    {
      text: "VUE CINEMAS",
      amountMinor: -2400,
      categories: ["entertainment"],
      payees: ["Vue", "Vue Cinemas"],
    },
    {
      text: "ODEON CINEMAS",
      amountMinor: -2100,
      categories: ["entertainment"],
      payees: ["Odeon", "Odeon Cinemas"],
    },
    {
      text: "BRITISH AIRWAYS 125",
      amountMinor: -32_000,
      categories: ["travel"],
      payees: ["British Airways"],
    },
    {
      text: "EASYJET 1234",
      amountMinor: -14_500,
      categories: ["travel"],
      payees: ["easyJet"],
    },
    {
      text: "BOOKING.COM HOTEL",
      amountMinor: -21_000,
      categories: ["travel"],
      payees: ["Booking.com"],
    },
    {
      text: "AIRBNB * HMABC",
      amountMinor: -45_000,
      categories: ["travel"],
      payees: ["Airbnb"],
    },
    {
      text: "DIRECT LINE INSURANCE",
      amountMinor: -3500,
      categories: ["insurance"],
      payees: ["Direct Line"],
    },
    {
      text: "ACME LTD SALARY",
      amountMinor: 350_000,
      categories: ["salary"],
      payees: ["Acme", "Acme Ltd"],
    },
    {
      text: "INTEREST PAID",
      amountMinor: 1240,
      categories: ["interest"],
      payees: ["Interest", "Bank interest", "Bank", "Interest Paid"],
    },
    {
      text: "AMAZON.CO.UK REFUND",
      amountMinor: 2499,
      categories: ["online"],
      payees: ["Amazon"],
    },
  ],
};
