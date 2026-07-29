/* ===================== Kia Rice — Utilities ===================== */

const FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
function toFaDigits(input) {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[d]);
}

function formatMoney(thousands) {
  if (thousands === null || thousands === undefined || isNaN(thousands)) return "—";
  const n = Math.round(thousands);
  const withCommas = n.toLocaleString("en-US");
  return toFaDigits(withCommas) + " هزار تومان";
}

function formatTomanFull(thousands) {
  if (thousands === null || thousands === undefined || isNaN(thousands)) return "—";
  return formatMoney(thousands);
}

function toast(msg, type) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

function openModal(html) {
  const host = document.getElementById("modalHost");
  host.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal">${html}</div></div>`;
  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
}
function closeModal() {
  document.getElementById("modalHost").innerHTML = "";
}

/* ---- Jalali (Shamsi) date conversion — pure JS, no library ---- */
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy;
  gy = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy + 8) / 4) -
    Math.floor((gy + 99) / 100) +
    Math.floor((gy + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

const JALALI_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const WEEKDAYS_FA = ["یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه","شنبه"];

function jalaliDateString(ts) {
  const d = ts ? new Date(ts) : new Date();
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${WEEKDAYS_FA[d.getDay()]} ${toFaDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toFaDigits(jy)}`;
}
function jalaliDateShort(ts) {
  const d = ts ? new Date(ts) : new Date();
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${toFaDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toFaDigits(jy)}`;
}
function timeString(ts) {
  const d = ts ? new Date(ts) : new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return toFaDigits(`${h}:${m}`);
}

function isSameDay(ts, ref) {
  const a = new Date(ts), b = ref || new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameMonth(ts, ref) {
  const a = new Date(ts), b = ref || new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function genOrderNumber(existingOrders) {
  const n = (existingOrders?.length || 0) + 1;
  return "KR-" + String(1000 + n);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function confirmDialog(message, onYes) {
  openModal(`
    <h3>تایید عملیات</h3>
    <p style="color:var(--text-dim);font-size:13.5px;line-height:1.8">${escapeHtml(message)}</p>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">انصراف</button>
      <button class="btn danger" id="confirmYesBtn">تایید و ادامه</button>
    </div>
  `);
  document.getElementById("confirmYesBtn").addEventListener("click", () => {
    closeModal();
    onYes();
  });
}
