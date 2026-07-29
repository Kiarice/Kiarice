/* ===================== Kia Rice — App Core ===================== */

let DB = null;              // in-memory mirror of Firestore appdata/main
let CURRENT_USER = null;    // {role:'admin'|'marketer', id, name, username}
let CURRENT_PAGE = null;
let SAVE_TIMER = null;

/* ---------- Boot ---------- */
window.addEventListener("DOMContentLoaded", boot);

async function boot() {
  try {
    let data = await KiaDB.load();
    if (!data || !data.users) {
      data = DEFAULT_DATA;
      await KiaDB.save(data);
    }
    DB = data;
  } catch (e) {
    console.error(e);
    DB = DEFAULT_DATA;
  }

  setTimeout(() => {
    document.getElementById("splash").style.display = "none";
    tryRestoreSession();
  }, 2600);

  setInterval(updateClock, 1000 * 15);
}

function tryRestoreSession() {
  const saved = localStorage.getItem("kiarice_session");
  if (saved) {
    try {
      const s = JSON.parse(saved);
      const user = findUser(s.role, s.username);
      if (user) {
        loginSuccess(s.role, user);
        return;
      }
    } catch (e) {}
  }
  showLogin();
}

function showLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginTitle").textContent = DB.settings.loginText || "ورود به سامانه";
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("loginPass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
}

function findUser(role, username) {
  if (role === "admin") {
    return DB.users.admin.username === username ? DB.users.admin : null;
  }
  return (DB.users.marketers || []).find((m) => m.username === username && m.active !== false) || null;
}

function handleLogin() {
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";

  if (!username || !password) {
    errEl.textContent = "نام کاربری و رمز عبور را وارد کنید.";
    return;
  }

  if (DB.users.admin.username === username && DB.users.admin.password === password) {
    localStorage.setItem("kiarice_session", JSON.stringify({ role: "admin", username }));
    loginSuccess("admin", DB.users.admin);
    return;
  }

  const marketer = (DB.users.marketers || []).find((m) => m.username === username);
  if (marketer && marketer.active === false) {
    errEl.textContent = "حساب شما غیرفعال شده است. با مدیر تماس بگیرید.";
    return;
  }
  if (marketer && marketer.password === password) {
    localStorage.setItem("kiarice_session", JSON.stringify({ role: "marketer", username }));
    marketer.lastLogin = Date.now();
    persist();
    loginSuccess("marketer", marketer);
    return;
  }

  errEl.textContent = "نام کاربری یا رمز عبور اشتباه است.";
}

function loginSuccess(role, userObj) {
  CURRENT_USER =
    role === "admin"
      ? { role: "admin", id: "admin", name: userObj.name, username: userObj.username }
      : { role: "marketer", id: userObj.id, name: userObj.firstName + " " + userObj.lastName, username: userObj.username };

  logActivity(CURRENT_USER.name, "ورود به سامانه", role === "admin" ? "ورود مدیر" : "ورود بازاریاب");

  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.add("show");
  document.getElementById("sidebarRole").textContent = role === "admin" ? "پنل مدیریت" : "پنل بازاریاب";

  buildSidebar();
  updateClock();
  wireGlobalUi();
  navigate(role === "admin" ? "dashboard" : "dashboard");
}

function logout() {
  localStorage.removeItem("kiarice_session");
  CURRENT_USER = null;
  document.getElementById("app").classList.remove("show");
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("loginScreen").classList.remove("hidden");
}

function wireGlobalUi() {
  document.getElementById("logoutBtn").onclick = () => confirmDialog("از حساب کاربری خارج می‌شوید؟", logout);
  document.getElementById("menuToggle").onclick = () => document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("bellIcon").onclick = () => navigate(CURRENT_USER.role === "admin" ? "settings" : "notifications");
}

function updateClock() {
  const box = document.getElementById("clockBox");
  if (!box) return;
  box.innerHTML = `${jalaliDateShort()}<br>${timeString()}`;
}

/* ---------- Persistence ---------- */
function persist() {
  DB.meta.updatedAt = Date.now();
  clearTimeout(SAVE_TIMER);
  SAVE_TIMER = setTimeout(async () => {
    try {
      await KiaDB.save(DB);
    } catch (e) {
      toast("خطا در ذخیره‌سازی. اتصال اینترنت را بررسی کنید.", "error");
    }
  }, 350);
}

function logActivity(user, action, detail) {
  DB.activityLog = DB.activityLog || [];
  DB.activityLog.unshift({ id: uid("log"), user, action, detail: detail || "", at: Date.now() });
  DB.activityLog = DB.activityLog.slice(0, 300);
}

function notify(to, title, message, type) {
  DB.notifications = DB.notifications || [];
  DB.notifications.unshift({
    id: uid("ntf"),
    to, // 'admin' | 'all' | marketerId
    title,
    message,
    type: type || "info",
    read: false,
    createdAt: Date.now(),
  });
}

function myNotifications() {
  if (!DB.notifications) return [];
  if (CURRENT_USER.role === "admin") return DB.notifications.filter((n) => n.to === "admin");
  return DB.notifications.filter((n) => n.to === "all" || n.to === CURRENT_USER.id);
}

function refreshBell() {
  const unread = myNotifications().filter((n) => !n.read).length;
  document.getElementById("bellDot").classList.toggle("hidden", unread === 0);
}

/* ---------- Sidebar / Nav ---------- */
const ADMIN_NAV = [
  { key: "dashboard", label: "داشبورد", ic: "🏠" },
  { key: "products", label: "مدیریت محصولات", ic: "🌾" },
  { key: "marketers", label: "مدیریت بازاریاب‌ها", ic: "🧑‍💼" },
  { key: "customers", label: "مدیریت مشتریان", ic: "🏪" },
  { key: "orders", label: "مدیریت سفارش‌ها", ic: "📦" },
  { key: "accounting", label: "حسابداری", ic: "💰" },
  { key: "reports", label: "گزارش‌ها", ic: "📊" },
  { key: "ai", label: "هوش مصنوعی", ic: "🧠" },
  { key: "settings", label: "تنظیمات سیستم", ic: "⚙️" },
];

const MARKETER_NAV = [
  { key: "dashboard", label: "داشبورد", ic: "🏠" },
  { key: "catalog", label: "کاتالوگ محصولات", ic: "🌾" },
  { key: "newCustomer", label: "ثبت مشتری", ic: "🏪" },
  { key: "newOrder", label: "ثبت سفارش", ic: "🧾" },
  { key: "myCustomers", label: "مشتریان من", ic: "👥" },
  { key: "myOrders", label: "سفارش‌های من", ic: "📦" },
  { key: "notifications", label: "اعلان‌ها و ارتباط با مدیر", ic: "🔔" },
  { key: "profile", label: "پروفایل", ic: "👤" },
];

function buildSidebar() {
  const nav = CURRENT_USER.role === "admin" ? ADMIN_NAV : MARKETER_NAV;
  const host = document.getElementById("navList");
  host.innerHTML = nav
    .map(
      (n) => `<div class="nav-item" data-key="${n.key}"><span class="ic">${n.ic}</span> ${n.label}</div>`
    )
    .join("");
  host.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", () => {
      navigate(el.dataset.key);
      document.getElementById("sidebar").classList.remove("open");
    });
  });
}

function setActiveNav(key) {
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.key === key));
}

function navigate(key) {
  CURRENT_PAGE = key;
  setActiveNav(key);
  const nav = CURRENT_USER.role === "admin" ? ADMIN_NAV : MARKETER_NAV;
  const found = nav.find((n) => n.key === key);
  document.getElementById("pageTitle").textContent = found ? found.label : "";
  document.getElementById("pageSubtitle").textContent = jalaliDateString();
  refreshBell();

  const renderer = CURRENT_USER.role === "admin" ? ADMIN_PAGES[key] : MARKETER_PAGES[key];
  const el = document.getElementById("pageContent");
  if (renderer) {
    el.innerHTML = "";
    renderer(el);
  } else {
    el.innerHTML = `<div class="empty"><div class="ic">🚧</div>این بخش در دست ساخت است.</div>`;
  }
}

function rerender() {
  navigate(CURRENT_PAGE);
}

/* ---------- Shared query helpers ---------- */
function activeProducts() {
  return (DB.products || []).filter((p) => p.active !== false);
}
function productById(id) {
  return (DB.products || []).find((p) => p.id === id);
}
function customerById(id) {
  return (DB.customers || []).find((c) => c.id === id);
}
function marketerById(id) {
  return (DB.users.marketers || []).find((m) => m.id === id);
}
function ordersOf(marketerId) {
  return (DB.orders || []).filter((o) => o.marketerId === marketerId);
}
function customersOf(marketerId) {
  return (DB.customers || []).filter((c) => c.marketerId === marketerId);
}
function effectivePrice(product) {
  if (product.offerPrice) return product.offerPrice;
  return product.consumerPrice;
}
