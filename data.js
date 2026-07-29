/* ===================== Kia Rice — Seed / Default Data =====================
   This is written to Firestore (appdata/main) the very first time the app
   runs and finds no existing document. After that, Firestore is always the
   source of truth — this file is only a starting point.
============================================================================ */

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const CATEGORY_LABELS = {
  iranian: "برنج ایرانی",
  pakistani: "برنج پاکستانی",
  indian: "برنج هندی",
  thai: "برنج تایلندی",
};

const ORDER_STATUSES = [
  { key: "pending", label: "در انتظار بررسی", color: "#3b9dfd" },
  { key: "confirmed", label: "تایید شد", color: "#3b9dfd" },
  { key: "ready", label: "آماده ارسال", color: "#e0b94a" },
  { key: "shipped", label: "در حال ارسال", color: "#e0b94a" },
  { key: "delivered", label: "تحویل شد", color: "#3ddc84" },
  { key: "cancelled", label: "لغو شد", color: "#e05353" },
];

const PAYMENT_METHODS = [
  { key: "cash", label: "نقدی" },
  { key: "card", label: "کارت" },
  { key: "cheque", label: "چک" },
  { key: "credit", label: "اعتباری" },
];

function seedProducts() {
  const rows = [
    // [name, code, category, type, priceConsumer, priceCoop, weightKg]
    ["خاطره هندی", "IN-001", "indian", "باسماتی ۱۱۲۱ درجه بالا", 316, 310, 10],
    ["طبیعت هندی", "IN-002", "indian", "باسماتی ۱۱۲۱ درجه خوب", 304, 298, 10],
    ["محسن هندی", "IN-003", "indian", "باسماتی ۱۱۲۱ درجه میانی", 296, 290, 10],
    ["توپولی هندی", "IN-004", "indian", "باسماتی ۱۱۲۱ (محصول هندوستان)", 285, 279, 10],
    ["شهروز هندی", "IN-005", "indian", "باسماتی هندی ۱۷۱۸", 280, 274, 10],
    ["شهرخاطرات سفید هندی", "IN-006", "indian", "باسماتی درجه پایین‌تر", 256, 251, 10],
    ["کارن برنج سفید هندی", "IN-007", "indian", "برنج سفید هندی غیرباسماتی", 249, 244, 10],
    ["رزکویر برنج سفید هندی", "IN-008", "indian", "برنج سفید هندی غیرباسماتی", 245, 240, 10],
    ["سونا صبح محسن ۱۰ک", "IN-009", "indian", "سونامسوری", 225, 220, 10],
    ["سونا بخیر محسن ۲۰ک", "IN-010", "indian", "سونامسوری", 223, 218, 20],
    ["سونامسوری خوشه ۲۰ک", "IN-011", "indian", "سونامسوری", 212, 208, 20],

    ["نفیس پاکستانی", "PK-001", "pakistani", "سوپرکرنل / ۱۱۲۱ درجه ممتاز", 338, 331, 10],
    ["پرچم سوپرکرنل", "PK-002", "pakistani", "سوپرکرنل", 326, 319, 10],
    ["زروان سوپرکرنل", "PK-003", "pakistani", "سوپرکرنل", 304, 298, 10],
    ["علادین سوپرکرنل", "PK-004", "pakistani", "سوپرکرنل", 302, 296, 10],
    ["رزکویر ۱۱۲۱ پاکستان", "PK-005", "pakistani", "باسماتی ۱۱۲۱", 296, 290, 10],
    ["دیلا ۳۸۶ پاکستان", "PK-006", "pakistani", "رقم ۳۸۶ (غیرباسماتی معطر)", 230, 225, 10],
    ["پاکستان ۳۸۶ سوناستار", "PK-007", "pakistani", "رقم ۳۸۶", 228, 223, 10],
    ["آر۶ صبح محسن ۱۰ک", "PK-008", "pakistani", "آر۶ / IRRI-6 غیرباسماتی", 172, 169, 10],
    ["آر۶ برند امروز ۴۰ کیلویی", "PK-009", "pakistani", "آر۶", 160, 157, 40],
    ["آر۶ شیراز ۳۵ کیلویی", "PK-010", "pakistani", "آر۶", 156, 153, 35],
    ["روحان ۳۸۶", "PK-011", "pakistani", "رقم ۳۸۶ (منتظر اعلام قیمت)", null, null, 10],

    ["عیانی پرچمدار", "IR-001", "iranian", "عیانی (رقم ممتاز شمال)", 537, 526, 10],
    ["دمسیاه پرچمدار", "IR-002", "iranian", "دمسیاه", 485, 475, 10],
    ["هاشمی پرچمدار فیمس", "IR-003", "iranian", "هاشمی (گیلان)", 475, 466, 10],
    ["فجر پرچمدار", "IR-004", "iranian", "فجر درجه یک — کم‌چسب و راحت‌پز", 382, 374, 10],
    ["فجر گرگان ۱۰ کیلویی", "IR-005", "iranian", "فجر", 361, 354, 10],
    ["فجر ۵۰ کیلویی", "IR-006", "iranian", "فجر (بسته عمده)", 351, 344, 50],
    ["شیرودی درجه یک", "IR-007", "iranian", "شیرودی (مازندران)", 356, 349, 10],
    ["ندا پرچمدار", "IR-008", "iranian", "ندا (رقم اقتصادی شمال)", 340, 333, 10],
    ["عنبربو توپولی", "IR-009", "iranian", "عنبربو (جنوب) دانه کلفت‌تر", 372, 365, 10],
    ["عنبربو جنوب", "IR-010", "iranian", "عنبربو", 356, 349, 10],
  ];

  return rows.map((r) => ({
    id: uid("p"),
    name: r[0],
    code: r[1],
    category: r[2],
    type: r[3],
    shortDesc: r[3],
    fullDesc: "",
    features: "",
    packaging: "کیسه " + r[6] + " کیلویی",
    weight: r[6],
    consumerPrice: r[4], // هزار تومان
    coopPrice: r[5], // هزار تومان
    offerPrice: null,
    discountPercent: 0,
    stock: 500,
    lowStockThreshold: 50,
    active: true,
    image: "",
    priceHistory: [],
  }));
}

const DEFAULT_DATA = {
  meta: { version: "2.0.0", createdAt: Date.now() },

  settings: {
    companyName: "پخش برنج کیارایس",
    managerName: "آقای رحیمی",
    phone: "09187600292",
    address: "استان مرکزی، جاده میقان، بالاتر از رستوران کویر",
    coverage: "کل استان مرکزی",
    logo: "",
    themeColor: "#e0b94a",
    loginText: "ورود به سامانه مدیریت فروش برنج",
    version: "2.0.0",
  },

  users: {
    admin: {
      username: "Kiasharahimy",
      password: "Kiaricemanager2007",
      name: "کیا شراهیمی",
      role: "admin",
    },
    marketers: [
      {
        id: uid("mk"),
        firstName: "کیاشا",
        lastName: "رحیمی",
        username: "Kiasharahimy_bazaryab",
        password: "KiaGod2007",
        phone: "",
        nationalId: "",
        active: true,
        joinedAt: Date.now(),
        commissionTier1: 2, // % up to 5 tons/month
        commissionTier2: 3, // % beyond 5 tons/month
        lastLogin: null,
      },
    ],
  },

  products: seedProducts(),
  customers: [],
  orders: [],
  expenses: [],
  notifications: [],
  messages: [],
  activityLog: [],
};
