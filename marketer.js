/* ===================== Kia Rice — Marketer Panel ===================== */

const MARKETER_PAGES = {
  dashboard: renderMkDashboard,
  catalog: renderMkCatalog,
  newCustomer: renderMkNewCustomer,
  newOrder: renderMkNewOrder,
  myCustomers: renderMkMyCustomers,
  myOrders: renderMkMyOrders,
  notifications: renderMkNotifications,
  profile: renderMkProfile,
};

function me() {
  return marketerById(CURRENT_USER.id);
}

/* ============ Dashboard ============ */
function renderMkDashboard(el) {
  const m = me();
  const myOrders = ordersOf(m.id);
  const today = new Date();
  const todaysOrders = myOrders.filter((o) => isSameDay(o.createdAt, today));
  const todaysSales = todaysOrders.reduce((s, o) => s + o.total, 0);
  const myCust = customersOf(m.id);
  const pending = myOrders.filter((o) => o.status === "pending").length;
  const monthOrders = myOrders.filter((o) => isSameMonth(o.createdAt, today));
  const commission = estimateCommission(m, myOrders);
  const lastCust = [...myCust].sort((a, b) => b.createdAt - a.createdAt)[0];
  const lastOrder = [...myOrders].sort((a, b) => b.createdAt - a.createdAt)[0];
  const lastNotif = myNotifications()[0];

  el.innerHTML = `
    <div class="panel" style="margin-bottom:20px">
      <div style="font-size:15px">سلام، ${escapeHtml(m.firstName)} 👋</div>
      <div style="color:var(--text-dim);font-size:12.5px;margin-top:4px">${jalaliDateString()} — ساعت ${timeString()}</div>
    </div>
    <div class="stat-grid">
      ${statCard("سفارش‌های امروز", toFaDigits(todaysOrders.length))}
      ${statCard("فروش امروز", formatMoney(todaysSales), true)}
      ${statCard("مشتریان ثبت‌شده", toFaDigits(myCust.length))}
      ${statCard("سفارش‌های در انتظار", toFaDigits(pending))}
      ${statCard("سفارش‌های این ماه", toFaDigits(monthOrders.length))}
      ${statCard("پورسانت تقریبی", formatMoney(commission), true)}
    </div>
    <div class="section-title"><h3>آخرین فعالیت‌ها</h3></div>
    <div class="panel" style="display:flex;flex-direction:column;gap:10px;font-size:13px;color:var(--text-dim)">
      <div>🏪 آخرین مشتری ثبت‌شده: ${lastCust ? escapeHtml(lastCust.shopName) : "—"}</div>
      <div>🧾 آخرین سفارش: ${lastOrder ? lastOrder.orderNumber + " — " + formatMoney(lastOrder.total) : "—"}</div>
      <div>🔔 آخرین اعلان مدیر: ${lastNotif ? escapeHtml(lastNotif.title) : "—"}</div>
    </div>
    <div class="toolbar" style="margin-top:20px">
      <button class="btn" onclick="navigate('newOrder')">+ ثبت سفارش جدید</button>
      <button class="btn ghost" onclick="navigate('newCustomer')">+ ثبت مشتری جدید</button>
    </div>
  `;
}

/* ============ Catalog ============ */
function renderMkCatalog(el) {
  el.innerHTML = `
    <div class="toolbar">
      <input class="grow" id="catSearch" placeholder="جستجو در کاتالوگ...">
      <select id="catCatFilter"><option value="">همه دسته‌ها</option>
        ${Object.entries(CATEGORY_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
      </select>
      <select id="catOfferFilter"><option value="">همه محصولات</option><option value="offer">فقط دارای آفر</option></select>
    </div>
    <div class="catalog-grid" id="catalogGrid"></div>
  `;
  const s = document.getElementById("catSearch"),
    c = document.getElementById("catCatFilter"),
    o = document.getElementById("catOfferFilter");
  [s, c, o].forEach((x) => x.addEventListener("input", draw));
  draw();

  function draw() {
    const q = s.value.trim().toLowerCase();
    let list = activeProducts();
    if (c.value) list = list.filter((p) => p.category === c.value);
    if (o.value === "offer") list = list.filter((p) => p.offerPrice);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    const grid = document.getElementById("catalogGrid");
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ic">🌾</div>محصولی یافت نشد.</div>`;
      return;
    }
    grid.innerHTML = list
      .map(
        (p) => `<div class="p-card" data-view="${p.id}">
        <div class="img" style="${p.image ? `background-image:url('${escapeHtml(p.image)}')` : ""}">${p.image ? "" : "بدون تصویر"}</div>
        <div class="body">
          <div class="cat">${CATEGORY_LABELS[p.category] || ""}</div>
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="type">${escapeHtml(p.type || "")} · ${toFaDigits(p.weight)} کیلویی</div>
          <div class="prices">
            ${p.offerPrice ? `<span class="c">${formatMoney(p.consumerPrice)}</span> <span class="co">${formatMoney(p.offerPrice)}</span>` : `<span class="co">${formatMoney(p.consumerPrice)}</span>`}
            <div style="color:var(--text-dim);font-size:11px">همکاری: ${formatMoney(p.coopPrice)}</div>
          </div>
          ${p.stock <= (p.lowStockThreshold || 50) ? `<div class="stock-off">موجودی محدود</div>` : ""}
        </div>
      </div>`
      )
      .join("");
    grid.querySelectorAll("[data-view]").forEach((card) => (card.onclick = () => openProductDetail(card.dataset.view)));
  }
}

function openProductDetail(id) {
  const p = productById(id);
  openModal(`
    <h3>${escapeHtml(p.name)}</h3>
    ${p.image ? `<div class="img" style="height:160px;border-radius:10px;background:#101012 center/cover no-repeat;background-image:url('${escapeHtml(p.image)}');margin-bottom:12px"></div>` : ""}
    <div style="font-size:13px;color:var(--text-dim);line-height:2">
      نوع: ${escapeHtml(p.type || "—")}<br>
      وزن بسته: ${toFaDigits(p.weight)} کیلوگرم<br>
      ${p.fullDesc ? `توضیحات: ${escapeHtml(p.fullDesc)}<br>` : ""}
      ${p.features ? `ویژگی‌ها: ${escapeHtml(p.features)}<br>` : ""}
    </div>
    <div class="panel" style="margin-top:12px">
      <div class="summary-row"><span>قیمت مصرف‌کننده</span><span>${formatMoney(p.consumerPrice)}</span></div>
      <div class="summary-row"><span>قیمت همکاری / تناژ</span><span>${formatMoney(p.coopPrice)}</span></div>
      ${p.offerPrice ? `<div class="summary-row total"><span>قیمت آفر</span><span>${formatMoney(p.offerPrice)}</span></div>` : ""}
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">بستن</button>
      <button class="btn" onclick="closeModal(); navigate('newOrder')">ثبت سفارش برای این محصول</button>
    </div>
  `);
}

/* ============ New Customer ============ */
function renderMkNewCustomer(el) {
  el.innerHTML = `
    <div class="panel">
      <div class="form-grid">
        <div class="field"><label>نام فروشگاه</label><input id="f_shop"></div>
        <div class="field"><label>نام صاحب فروشگاه</label><input id="f_owner"></div>
        <div class="field"><label>شماره تماس</label><input id="f_phone1"></div>
        <div class="field"><label>شماره دوم (اختیاری)</label><input id="f_phone2"></div>
        <div class="field"><label>استان</label><input id="f_province"></div>
        <div class="field"><label>شهر</label><input id="f_city"></div>
        <div class="field full"><label>آدرس</label><input id="f_addr"></div>
        <div class="field full"><label>توضیحات</label><textarea id="f_notes" rows="2"></textarea></div>
      </div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn" id="saveCustBtn">ثبت مشتری</button>
      </div>
    </div>
  `;
  document.getElementById("saveCustBtn").onclick = () => {
    const shopName = document.getElementById("f_shop").value.trim();
    const phone = document.getElementById("f_phone1").value.trim();
    if (!shopName || !phone) return toast("نام فروشگاه و شماره تماس الزامی است.", "error");
    const c = {
      id: uid("cu"),
      marketerId: CURRENT_USER.id,
      shopName,
      ownerName: document.getElementById("f_owner").value.trim(),
      phone,
      phone2: document.getElementById("f_phone2").value.trim(),
      province: document.getElementById("f_province").value.trim(),
      city: document.getElementById("f_city").value.trim(),
      address: document.getElementById("f_addr").value.trim(),
      notes: document.getElementById("f_notes").value.trim(),
      photo: "",
      createdAt: Date.now(),
    };
    DB.customers.push(c);
    notify("admin", "مشتری جدید", `${escapeHtml(CURRENT_USER.name)} مشتری «${shopName}» را ثبت کرد.`, "customer");
    logActivity(CURRENT_USER.name, "ثبت مشتری جدید", shopName);
    persist();
    toast("مشتری با موفقیت ثبت شد.", "success");
    navigate("myCustomers");
  };
}

/* ============ New Order (wizard) ============ */
let ORDER_DRAFT = null;

function renderMkNewOrder(el) {
  ORDER_DRAFT = { customerId: null, items: {}, payment: "cash", step: 1 };
  drawOrderStep(el);
}

function drawOrderStep(el) {
  const steps = ["مشتری", "محصولات", "تعداد", "محاسبه", "پرداخت", "ثبت"];
  el.innerHTML = `
    <div class="order-steps">${steps.map((s, i) => `<span class="${ORDER_DRAFT.step === i + 1 ? "active" : ""}">${toFaDigits(i + 1)}. ${s}</span>`).join("")}</div>
    <div id="orderStepBody"></div>
  `;
  const body = document.getElementById("orderStepBody");

  if (ORDER_DRAFT.step === 1) {
    const myCust = customersOf(CURRENT_USER.id);
    body.innerHTML = `
      <div class="panel">
        <div class="field"><label>انتخاب مشتری</label>
          <select id="f_custSel"><option value="">— انتخاب کنید —</option>
            ${myCust.map((c) => `<option value="${c.id}">${escapeHtml(c.shopName)} — ${escapeHtml(c.phone)}</option>`).join("")}
          </select>
        </div>
        <div style="color:var(--text-dim);font-size:12px;margin:8px 0">مشتری مورد نظر را ندارید؟</div>
        <button class="btn ghost sm" onclick="navigate('newCustomer')">+ ثبت مشتری جدید</button>
      </div>
      <div class="modal-actions"><button class="btn" id="nextBtn1">ادامه</button></div>
    `;
    document.getElementById("nextBtn1").onclick = () => {
      const v = document.getElementById("f_custSel").value;
      if (!v) return toast("یک مشتری انتخاب کنید.", "error");
      ORDER_DRAFT.customerId = v;
      ORDER_DRAFT.step = 2;
      drawOrderStep(el);
    };
  }

  if (ORDER_DRAFT.step === 2) {
    const list = activeProducts();
    body.innerHTML = `
      <div class="catalog-grid">
        ${list
          .map(
            (p) => `<div class="p-card" data-pick="${p.id}" style="${ORDER_DRAFT.items[p.id] ? "border-color:var(--gold)" : ""}">
          <div class="img" style="${p.image ? `background-image:url('${escapeHtml(p.image)}')` : ""}">${p.image ? "" : "بدون تصویر"}</div>
          <div class="body">
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="type">${formatMoney(effectivePrice(p))}</div>
            ${ORDER_DRAFT.items[p.id] ? `<div class="badge gold">انتخاب شده: ${toFaDigits(ORDER_DRAFT.items[p.id])}</div>` : ""}
          </div>
        </div>`
          )
          .join("")}
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="backBtn2">بازگشت</button>
        <button class="btn" id="nextBtn2">ادامه</button>
      </div>
    `;
    body.querySelectorAll("[data-pick]").forEach(
      (c) =>
        (c.onclick = () => {
          const id = c.dataset.pick;
          ORDER_DRAFT.items[id] = (ORDER_DRAFT.items[id] || 0) + 1;
          drawOrderStep(el);
        })
    );
    document.getElementById("backBtn2").onclick = () => {
      ORDER_DRAFT.step = 1;
      drawOrderStep(el);
    };
    document.getElementById("nextBtn2").onclick = () => {
      if (!Object.keys(ORDER_DRAFT.items).length) return toast("حداقل یک محصول انتخاب کنید.", "error");
      ORDER_DRAFT.step = 3;
      drawOrderStep(el);
    };
  }

  if (ORDER_DRAFT.step === 3) {
    const rows = Object.entries(ORDER_DRAFT.items)
      .map(([pid, qty]) => {
        const p = productById(pid);
        return `<div class="qty-row">
          <div>${escapeHtml(p.name)}<div style="color:var(--text-dim);font-size:11px">${formatMoney(effectivePrice(p))} × ${toFaDigits(qty)}</div></div>
          <div class="qty-ctrl">
            <button data-dec="${pid}">−</button><span>${toFaDigits(qty)}</span><button data-inc="${pid}">+</button>
            <button class="icon-btn" data-rm="${pid}">🗑</button>
          </div>
        </div>`;
      })
      .join("");
    body.innerHTML = `<div class="panel">${rows}</div>
      <div class="modal-actions">
        <button class="btn ghost" id="backBtn3">بازگشت</button>
        <button class="btn" id="nextBtn3">ادامه</button>
      </div>`;
    body.querySelectorAll("[data-inc]").forEach((b) => (b.onclick = () => { ORDER_DRAFT.items[b.dataset.inc]++; drawOrderStep(el); }));
    body.querySelectorAll("[data-dec]").forEach(
      (b) =>
        (b.onclick = () => {
          ORDER_DRAFT.items[b.dataset.dec]--;
          if (ORDER_DRAFT.items[b.dataset.dec] <= 0) delete ORDER_DRAFT.items[b.dataset.dec];
          drawOrderStep(el);
        })
    );
    body.querySelectorAll("[data-rm]").forEach(
      (b) =>
        (b.onclick = () => {
          delete ORDER_DRAFT.items[b.dataset.rm];
          drawOrderStep(el);
        })
    );
    document.getElementById("backBtn3").onclick = () => { ORDER_DRAFT.step = 2; drawOrderStep(el); };
    document.getElementById("nextBtn3").onclick = () => {
      if (!Object.keys(ORDER_DRAFT.items).length) return toast("سبد سفارش خالی است.", "error");
      ORDER_DRAFT.step = 4;
      drawOrderStep(el);
    };
  }

  if (ORDER_DRAFT.step === 4) {
    const calc = calcOrderTotals();
    body.innerHTML = `
      <div class="panel">
        <div class="summary-row"><span>جمع کل</span><span>${formatMoney(calc.subtotal)}</span></div>
        <div class="summary-row"><span>تخفیف</span><span>${formatMoney(calc.discount)}</span></div>
        <div class="summary-row"><span>هزینه ارسال</span><span>${formatMoney(calc.shipping)}</span></div>
        <div class="summary-row total"><span>مبلغ قابل پرداخت</span><span>${formatMoney(calc.total)}</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="backBtn4">بازگشت</button>
        <button class="btn" id="nextBtn4">ادامه</button>
      </div>`;
    document.getElementById("backBtn4").onclick = () => { ORDER_DRAFT.step = 3; drawOrderStep(el); };
    document.getElementById("nextBtn4").onclick = () => { ORDER_DRAFT.step = 5; drawOrderStep(el); };
  }

  if (ORDER_DRAFT.step === 5) {
    body.innerHTML = `
      <div class="panel">
        <div class="field"><label>روش پرداخت</label>
          <select id="f_pay">${PAYMENT_METHODS.map((p) => `<option value="${p.key}">${p.label}</option>`).join("")}</select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="backBtn5">بازگشت</button>
        <button class="btn" id="nextBtn5">ثبت نهایی سفارش</button>
      </div>`;
    document.getElementById("backBtn5").onclick = () => { ORDER_DRAFT.step = 4; drawOrderStep(el); };
    document.getElementById("nextBtn5").onclick = () => {
      ORDER_DRAFT.payment = document.getElementById("f_pay").value;
      finalizeOrder(el);
    };
  }
}

function calcOrderTotals() {
  let subtotal = 0,
    discount = 0;
  Object.entries(ORDER_DRAFT.items).forEach(([pid, qty]) => {
    const p = productById(pid);
    const price = effectivePrice(p);
    subtotal += price * qty;
    if (p.consumerPrice && price < p.consumerPrice) discount += (p.consumerPrice - price) * qty;
  });
  const shipping = subtotal > 0 && subtotal < 3000 ? 150 : 0; // simple example shipping rule (هزار تومان)
  return { subtotal, discount, shipping, total: subtotal + shipping };
}

function finalizeOrder(el) {
  const calc = calcOrderTotals();
  const order = {
    id: uid("ord"),
    orderNumber: genOrderNumber(DB.orders),
    customerId: ORDER_DRAFT.customerId,
    marketerId: CURRENT_USER.id,
    items: Object.entries(ORDER_DRAFT.items).map(([pid, qty]) => ({ productId: pid, qty, price: effectivePrice(productById(pid)) })),
    subtotal: calc.subtotal,
    discount: calc.discount,
    shipping: calc.shipping,
    total: calc.total,
    paymentMethod: ORDER_DRAFT.payment,
    status: "pending",
    statusHistory: [{ status: "pending", at: Date.now(), by: CURRENT_USER.name }],
    createdAt: Date.now(),
  };
  DB.orders.push(order);
  // decrement stock
  order.items.forEach((it) => {
    const p = productById(it.productId);
    if (p) p.stock = Math.max(0, (p.stock || 0) - it.qty);
  });
  const cust = customerById(order.customerId);
  notify("admin", "سفارش جدید", `سفارش ${order.orderNumber} توسط ${escapeHtml(CURRENT_USER.name)} برای «${cust ? escapeHtml(cust.shopName) : ""}» ثبت شد.`, "order");
  logActivity(CURRENT_USER.name, "ثبت سفارش", order.orderNumber);
  persist();

  document.getElementById("orderStepBody").innerHTML = `
    <div class="empty">
      <div class="ic">✅</div>
      سفارش با موفقیت ثبت شد.<br>
      <div style="margin-top:8px;font-size:15px;color:var(--gold-bright);font-weight:800">${order.orderNumber}</div>
      <button class="btn" style="margin-top:16px" onclick="navigate('myOrders')">مشاهده سفارش‌های من</button>
    </div>
  `;
  toast("سفارش ثبت شد.", "success");
}

/* ============ My Customers ============ */
function renderMkMyCustomers(el) {
  const list = customersOf(CURRENT_USER.id);
  el.innerHTML = `
    <div class="toolbar"><input class="grow" id="mcSearch" placeholder="جستجو..."></div>
    <div id="mcHost"></div>
  `;
  document.getElementById("mcSearch").addEventListener("input", draw);
  draw();
  function draw() {
    const q = document.getElementById("mcSearch").value.trim().toLowerCase();
    const filtered = list.filter((c) => (c.shopName + c.city + c.phone).toLowerCase().includes(q));
    document.getElementById("mcHost").innerHTML = filtered.length
      ? `<div class="table-wrap"><table><thead><tr><th>فروشگاه</th><th>شهر</th><th>تماس</th><th>سفارش‌ها</th><th>مبلغ خرید</th><th>آخرین خرید</th><th></th></tr></thead><tbody>
        ${filtered
          .map((c) => {
            const co = (DB.orders || []).filter((o) => o.customerId === c.id);
            const total = co.reduce((s, o) => s + o.total, 0);
            const last = co.length ? Math.max(...co.map((o) => o.createdAt)) : null;
            return `<tr>
            <td>${escapeHtml(c.shopName)}</td><td>${escapeHtml(c.city || "—")}</td><td>${escapeHtml(c.phone)}</td>
            <td>${toFaDigits(co.length)}</td><td>${formatMoney(total)}</td><td>${last ? jalaliDateShort(last) : "—"}</td>
            <td><div class="row-actions">
              <a class="icon-btn" href="tel:${escapeHtml(c.phone)}" title="تماس">📞</a>
              <button class="icon-btn" data-order="${c.id}" title="ثبت سفارش">🧾</button>
            </div></td>
          </tr>`;
          })
          .join("")}
      </tbody></table></div>`
      : `<div class="empty"><div class="ic">👥</div>هنوز مشتری‌ای ثبت نکرده‌اید.</div>`;
    document.querySelectorAll("[data-order]").forEach(
      (b) =>
        (b.onclick = () => {
          navigate("newOrder");
          ORDER_DRAFT.customerId = b.dataset.order;
          ORDER_DRAFT.step = 2;
          drawOrderStep(document.getElementById("pageContent"));
        })
    );
  }
}

/* ============ My Orders ============ */
function renderMkMyOrders(el) {
  const list = [...ordersOf(CURRENT_USER.id)].sort((a, b) => b.createdAt - a.createdAt);
  el.innerHTML = list.length
    ? `<div class="table-wrap"><table><thead><tr><th>شماره</th><th>مشتری</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th><th></th></tr></thead><tbody>
      ${list
        .map((o) => {
          const cust = customerById(o.customerId);
          const st = ORDER_STATUSES.find((s) => s.key === o.status) || ORDER_STATUSES[0];
          return `<tr><td>${o.orderNumber}</td><td>${cust ? escapeHtml(cust.shopName) : "—"}</td><td>${formatMoney(o.total)}</td><td>${statusBadge(st)}</td><td>${jalaliDateShort(o.createdAt)}</td>
          <td><button class="icon-btn" data-view="${o.id}">👁</button></td></tr>`;
        })
        .join("")}
    </tbody></table></div>`
    : `<div class="empty"><div class="ic">📦</div>هنوز سفارشی ثبت نکرده‌اید.</div>`;
  el.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => openOrderDetail(b.dataset.view)));
}

/* ============ Notifications + contact manager ============ */
function renderMkNotifications(el) {
  const notifs = myNotifications();
  notifs.forEach((n) => (n.read = true));
  persist();
  refreshBell();

  const myMsgs = (DB.messages || []).filter((m) => m.marketerId === CURRENT_USER.id);

  el.innerHTML = `
    <div class="section-title"><h3>اعلان‌ها</h3></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
      ${
        notifs.length
          ? notifs.map((n) => `<div class="panel" style="display:flex;justify-content:space-between;gap:10px"><div><b style="font-size:13px">${escapeHtml(n.title)}</b><div style="color:var(--text-dim);font-size:12.5px;margin-top:4px">${escapeHtml(n.message)}</div></div><div style="color:var(--text-faint);font-size:11px;white-space:nowrap">${jalaliDateShort(n.createdAt)}</div></div>`).join("")
          : `<div class="empty"><div class="ic">🔔</div>اعلانی وجود ندارد.</div>`
      }
    </div>

    <div class="section-title"><h3>ارتباط با مدیر</h3></div>
    <div class="panel">
      <div class="chat-box" id="chatBox">
        ${
          myMsgs.length
            ? myMsgs.map((m) => `<div class="msg ${m.from === "marketer" ? "out" : "in"}">${escapeHtml(m.text)}<div class="t">${jalaliDateShort(m.createdAt)} ${timeString(m.createdAt)}</div></div>`).join("")
            : `<div style="color:var(--text-dim);font-size:12.5px">هنوز پیامی رد و بدل نشده است.</div>`
        }
      </div>
      <div class="toolbar" style="margin-top:14px;margin-bottom:0">
        <select id="msgType" style="width:150px">
          <option value="general">پیام عمومی</option>
          <option value="price">درخواست تغییر قیمت</option>
          <option value="issue">گزارش مشکل</option>
          <option value="suggestion">پیشنهاد محصول جدید</option>
          <option value="support">درخواست پشتیبانی</option>
        </select>
        <input class="grow" id="msgText" placeholder="پیام خود را بنویسید...">
        <button class="btn sm" id="sendMsgBtn">ارسال</button>
      </div>
    </div>
  `;
  document.getElementById("sendMsgBtn").onclick = () => {
    const text = document.getElementById("msgText").value.trim();
    if (!text) return;
    const type = document.getElementById("msgType").value;
    DB.messages = DB.messages || [];
    DB.messages.push({ id: uid("msg"), marketerId: CURRENT_USER.id, from: "marketer", type, text, createdAt: Date.now() });
    notify("admin", "پیام جدید از بازاریاب", `${escapeHtml(CURRENT_USER.name)}: ${text}`, "message");
    logActivity(CURRENT_USER.name, "ارسال پیام به مدیر", type);
    persist();
    rerender();
  };
}

/* ============ Profile ============ */
function renderMkProfile(el) {
  const m = me();
  const mo = ordersOf(m.id);
  const commission = estimateCommission(m, mo);
  el.innerHTML = `
    <div class="panel">
      <div class="form-grid">
        <div class="field"><label>نام</label><input value="${escapeHtml(m.firstName)}" disabled></div>
        <div class="field"><label>نام خانوادگی</label><input value="${escapeHtml(m.lastName)}" disabled></div>
        <div class="field"><label>نام کاربری</label><input value="${escapeHtml(m.username)}" disabled></div>
        <div class="field"><label>شماره تماس</label><input id="f_myphone" value="${escapeHtml(m.phone || "")}"></div>
      </div>
      <div style="color:var(--text-dim);font-size:11.5px;margin-top:8px">تغییر نام کاربری فقط توسط مدیر امکان‌پذیر است.</div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn ghost" id="savePhoneBtn">ذخیره شماره تماس</button>
      </div>
    </div>

    <div class="section-title"><h3>تغییر رمز عبور</h3></div>
    <div class="panel">
      <div class="field"><label>رمز عبور جدید</label><input id="f_mypass" type="text"></div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn ghost" id="saveMyPassBtn">ذخیره رمز جدید</button>
      </div>
    </div>

    <div class="section-title"><h3>عملکرد من</h3></div>
    <div class="stat-grid">
      ${statCard("تعداد کل سفارش‌ها", toFaDigits(mo.length))}
      ${statCard("مجموع فروش", formatMoney(mo.reduce((s, o) => s + o.total, 0)))}
      ${statCard("پورسانت تقریبی این ماه", formatMoney(commission))}
    </div>
  `;
  document.getElementById("savePhoneBtn").onclick = () => {
    m.phone = document.getElementById("f_myphone").value.trim();
    persist();
    toast("شماره تماس ذخیره شد.", "success");
  };
  document.getElementById("saveMyPassBtn").onclick = () => {
    const np = document.getElementById("f_mypass").value;
    if (!np) return toast("رمز جدید را وارد کنید.", "error");
    m.password = np;
    logActivity(CURRENT_USER.name, "تغییر رمز شخصی", "");
    persist();
    document.getElementById("f_mypass").value = "";
    toast("رمز عبور تغییر کرد.", "success");
  };
}
