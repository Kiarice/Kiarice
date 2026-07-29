/* ===================== Kia Rice — Admin Panel ===================== */

const ADMIN_PAGES = {
  dashboard: renderAdminDashboard,
  products: renderAdminProducts,
  marketers: renderAdminMarketers,
  customers: renderAdminCustomers,
  orders: renderAdminOrders,
  accounting: renderAdminAccounting,
  reports: renderAdminReports,
  ai: renderAdminAI,
  settings: renderAdminSettings,
};

/* ============ 0. Dashboard ============ */
function renderAdminDashboard(el) {
  const today = new Date();
  const orders = DB.orders || [];
  const todaysOrders = orders.filter((o) => isSameDay(o.createdAt, today));
  const todaysSales = todaysOrders.reduce((s, o) => s + (o.total || 0), 0);
  const activeMarketers = (DB.users.marketers || []).filter((m) => m.active !== false).length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const shipped = orders.filter((o) => o.status === "shipped" || o.status === "delivered").length;
  const stock = (DB.products || []).reduce((s, p) => s + (p.stock || 0), 0);
  const newNotifs = (DB.notifications || []).filter((n) => n.to === "admin" && !n.read).length;

  el.innerHTML = `
    <div class="panel" style="margin-bottom:20px">
      <div style="font-size:15px">سلام، ${escapeHtml(CURRENT_USER.name)} 👋</div>
      <div style="color:var(--text-dim);font-size:12.5px;margin-top:4px">امروز ${jalaliDateString()} — ساعت ${timeString()}</div>
    </div>

    <div class="stat-grid">
      ${statCard("سفارش‌های امروز", toFaDigits(todaysOrders.length))}
      ${statCard("فروش امروز", formatMoney(todaysSales), true)}
      ${statCard("مشتریان ثبت‌شده", toFaDigits((DB.customers || []).length))}
      ${statCard("بازاریاب‌های فعال", toFaDigits(activeMarketers))}
      ${statCard("سفارش‌های در انتظار", toFaDigits(pending))}
      ${statCard("سفارش‌های ارسال‌شده", toFaDigits(shipped))}
      ${statCard("موجودی انبار (کیسه)", toFaDigits(stock))}
      ${statCard("اعلان‌های جدید", toFaDigits(newNotifs))}
    </div>

    <div class="section-title"><h3>آخرین سفارش‌ها</h3></div>
    ${renderOrdersTable(orders.slice(0, 6), true)}

    <div class="section-title"><h3>محصولات رو به اتمام</h3></div>
    ${renderLowStockList()}
  `;
  wireOrderActions(el);
}

function statCard(label, value, small) {
  return `<div class="stat-card"><div class="label">${label}</div><div class="value${small ? " small" : ""}">${value}</div></div>`;
}

function renderLowStockList() {
  const low = (DB.products || []).filter((p) => p.active !== false && p.stock <= (p.lowStockThreshold || 50));
  if (!low.length) return `<div class="empty" style="padding:24px"><div class="ic">✅</div>موجودی همه محصولات مناسب است.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>محصول</th><th>موجودی</th><th>حد هشدار</th></tr></thead><tbody>
    ${low.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td><span class="badge red">${toFaDigits(p.stock)}</span></td><td>${toFaDigits(p.lowStockThreshold || 50)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

/* ============ 1. Products ============ */
function renderAdminProducts(el) {
  el.innerHTML = `
    <div class="toolbar">
      <input class="grow" id="prodSearch" placeholder="جستجوی محصول...">
      <select id="prodCatFilter">
        <option value="">همه دسته‌ها</option>
        ${Object.entries(CATEGORY_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
      </select>
      <select id="prodStatusFilter">
        <option value="">همه وضعیت‌ها</option>
        <option value="active">فعال</option>
        <option value="inactive">غیرفعال</option>
        <option value="offer">دارای آفر</option>
      </select>
      <button class="btn" id="addProductBtn">+ افزودن محصول</button>
    </div>
    <div id="prodTableHost"></div>
  `;
  document.getElementById("addProductBtn").onclick = () => openProductModal(null);
  const search = document.getElementById("prodSearch");
  const catF = document.getElementById("prodCatFilter");
  const stF = document.getElementById("prodStatusFilter");
  [search, catF, stF].forEach((x) => x.addEventListener("input", renderProdTable));
  renderProdTable();

  function renderProdTable() {
    const q = search.value.trim().toLowerCase();
    const cat = catF.value;
    const st = stF.value;
    let list = DB.products || [];
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q));
    if (cat) list = list.filter((p) => p.category === cat);
    if (st === "active") list = list.filter((p) => p.active !== false);
    if (st === "inactive") list = list.filter((p) => p.active === false);
    if (st === "offer") list = list.filter((p) => p.offerPrice);

    document.getElementById("prodTableHost").innerHTML = `
      <div class="table-wrap"><table><thead><tr>
        <th>نام</th><th>کد</th><th>دسته</th><th>قیمت مصرف‌کننده</th><th>قیمت همکاری</th><th>آفر</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th>
      </tr></thead><tbody>
      ${
        list.length
          ? list
              .map(
                (p) => `<tr>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.code || "—")}</td>
          <td>${CATEGORY_LABELS[p.category] || "—"}</td>
          <td>${formatMoney(p.consumerPrice)}</td>
          <td>${formatMoney(p.coopPrice)}</td>
          <td>${p.offerPrice ? `<span class="badge gold">${formatMoney(p.offerPrice)}</span>` : "—"}</td>
          <td>${p.stock <= (p.lowStockThreshold || 50) ? `<span class="badge red">${toFaDigits(p.stock)}</span>` : toFaDigits(p.stock)}</td>
          <td>${p.active !== false ? `<span class="badge green">فعال</span>` : `<span class="badge red">غیرفعال</span>`}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit="${p.id}" title="ویرایش">✎</button>
            <button class="icon-btn" data-toggle="${p.id}" title="فعال/غیرفعال">⏻</button>
            <button class="icon-btn" data-del="${p.id}" title="حذف">🗑</button>
          </div></td>
        </tr>`
              )
              .join("")
          : `<tr><td colspan="9"><div class="empty">محصولی یافت نشد.</div></td></tr>`
      }
      </tbody></table></div>
    `;
    document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openProductModal(b.dataset.edit)));
    document.querySelectorAll("[data-toggle]").forEach(
      (b) =>
        (b.onclick = () => {
          const p = productById(b.dataset.toggle);
          p.active = p.active === false ? true : false;
          logActivity(CURRENT_USER.name, "تغییر وضعیت محصول", p.name);
          persist();
          renderProdTable();
          toast("وضعیت محصول به‌روزرسانی شد.", "success");
        })
    );
    document.querySelectorAll("[data-del]").forEach(
      (b) =>
        (b.onclick = () =>
          confirmDialog("این محصول برای همیشه حذف شود؟", () => {
            DB.products = DB.products.filter((p) => p.id !== b.dataset.del);
            logActivity(CURRENT_USER.name, "حذف محصول", b.dataset.del);
            persist();
            renderProdTable();
            toast("محصول حذف شد.", "success");
          }))
    );
  }
}

function openProductModal(id) {
  const p = id ? productById(id) : null;
  openModal(`
    <h3>${p ? "ویرایش محصول" : "افزودن محصول جدید"}</h3>
    <div class="form-grid">
      <div class="field full"><label>نام محصول</label><input id="f_name" value="${p ? escapeHtml(p.name) : ""}"></div>
      <div class="field"><label>کد محصول</label><input id="f_code" value="${p ? escapeHtml(p.code || "") : ""}"></div>
      <div class="field"><label>دسته‌بندی (مبدأ)</label>
        <select id="f_cat">${Object.entries(CATEGORY_LABELS).map(([k, v]) => `<option value="${k}" ${p && p.category === k ? "selected" : ""}>${v}</option>`).join("")}</select>
      </div>
      <div class="field full"><label>نوع / رقم برنج</label><input id="f_type" value="${p ? escapeHtml(p.type || "") : ""}"></div>
      <div class="field"><label>وزن بسته (کیلوگرم)</label><input id="f_weight" type="number" value="${p ? p.weight || "" : "10"}"></div>
      <div class="field"><label>موجودی انبار</label><input id="f_stock" type="number" value="${p ? p.stock ?? 0 : 0}"></div>
      <div class="field"><label>قیمت مصرف‌کننده (هزار تومان)</label><input id="f_price" type="number" value="${p ? p.consumerPrice ?? "" : ""}"></div>
      <div class="field"><label>قیمت همکاری/تناژ (هزار تومان)</label><input id="f_coop" type="number" value="${p ? p.coopPrice ?? "" : ""}"></div>
      <div class="field"><label>قیمت آفر (اختیاری)</label><input id="f_offer" type="number" value="${p && p.offerPrice ? p.offerPrice : ""}"></div>
      <div class="field"><label>درصد تخفیف</label><input id="f_disc" type="number" value="${p ? p.discountPercent || 0 : 0}"></div>
      <div class="field full"><label>توضیح کوتاه</label><input id="f_short" value="${p ? escapeHtml(p.shortDesc || "") : ""}"></div>
      <div class="field full"><label>توضیح کامل</label><textarea id="f_full" rows="2">${p ? escapeHtml(p.fullDesc || "") : ""}</textarea></div>
      <div class="field full"><label>ویژگی‌های محصول</label><textarea id="f_feat" rows="2">${p ? escapeHtml(p.features || "") : ""}</textarea></div>
      <div class="field full"><label>لینک تصویر محصول (اختیاری)</label><input id="f_img" value="${p ? escapeHtml(p.image || "") : ""}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">انصراف</button>
      <button class="btn" id="saveProductBtn">${p ? "ذخیره تغییرات" : "افزودن محصول"}</button>
    </div>
  `);

  document.getElementById("saveProductBtn").onclick = () => {
    const name = document.getElementById("f_name").value.trim();
    if (!name) return toast("نام محصول را وارد کنید.", "error");
    const newPrice = numOrNull(document.getElementById("f_price").value);
    const newOffer = numOrNull(document.getElementById("f_offer").value);

    if (p) {
      if (p.consumerPrice !== newPrice || p.offerPrice !== newOffer) {
        p.priceHistory = p.priceHistory || [];
        p.priceHistory.unshift({ at: Date.now(), consumerPrice: newPrice, offerPrice: newOffer, by: CURRENT_USER.name });
        notify("all", "تغییر قیمت محصول", `قیمت «${name}» به‌روزرسانی شد.`, "price");
      }
      p.name = name;
      p.code = document.getElementById("f_code").value.trim();
      p.category = document.getElementById("f_cat").value;
      p.type = document.getElementById("f_type").value.trim();
      p.weight = numOrNull(document.getElementById("f_weight").value) || 10;
      p.stock = numOrNull(document.getElementById("f_stock").value) || 0;
      p.consumerPrice = newPrice;
      p.coopPrice = numOrNull(document.getElementById("f_coop").value);
      p.offerPrice = newOffer;
      p.discountPercent = numOrNull(document.getElementById("f_disc").value) || 0;
      p.shortDesc = document.getElementById("f_short").value.trim();
      p.fullDesc = document.getElementById("f_full").value.trim();
      p.features = document.getElementById("f_feat").value.trim();
      p.image = document.getElementById("f_img").value.trim();
      logActivity(CURRENT_USER.name, "ویرایش محصول", name);
      toast("محصول ویرایش شد.", "success");
    } else {
      DB.products.push({
        id: uid("p"),
        name,
        code: document.getElementById("f_code").value.trim(),
        category: document.getElementById("f_cat").value,
        type: document.getElementById("f_type").value.trim(),
        weight: numOrNull(document.getElementById("f_weight").value) || 10,
        stock: numOrNull(document.getElementById("f_stock").value) || 0,
        consumerPrice: newPrice,
        coopPrice: numOrNull(document.getElementById("f_coop").value),
        offerPrice: newOffer,
        discountPercent: numOrNull(document.getElementById("f_disc").value) || 0,
        shortDesc: document.getElementById("f_short").value.trim(),
        fullDesc: document.getElementById("f_full").value.trim(),
        features: document.getElementById("f_feat").value.trim(),
        packaging: "",
        image: document.getElementById("f_img").value.trim(),
        active: true,
        lowStockThreshold: 50,
        priceHistory: [],
      });
      logActivity(CURRENT_USER.name, "افزودن محصول", name);
      toast("محصول افزوده شد.", "success");
    }
    persist();
    closeModal();
    rerender();
  };
}
function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/* ============ 2. Marketers ============ */
function renderAdminMarketers(el) {
  const list = DB.users.marketers || [];
  el.innerHTML = `
    <div class="toolbar"><div class="grow"></div><button class="btn" id="addMkBtn">+ افزودن بازاریاب</button></div>
    <div class="table-wrap"><table><thead><tr>
      <th>نام</th><th>نام کاربری</th><th>تعداد سفارش</th><th>مبلغ فروش</th><th>پورسانت تقریبی</th><th>آخرین ورود</th><th>وضعیت</th><th>عملیات</th>
    </tr></thead><tbody>
    ${
      list.length
        ? list
            .map((m) => {
              const mo = ordersOf(m.id);
              const sales = mo.reduce((s, o) => s + (o.total || 0), 0);
              const commission = estimateCommission(m, mo);
              return `<tr>
          <td>${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</td>
          <td>${escapeHtml(m.username)}</td>
          <td>${toFaDigits(mo.length)}</td>
          <td>${formatMoney(sales)}</td>
          <td>${formatMoney(commission)}</td>
          <td>${m.lastLogin ? jalaliDateShort(m.lastLogin) : "—"}</td>
          <td>${m.active !== false ? `<span class="badge green">فعال</span>` : `<span class="badge red">غیرفعال</span>`}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit="${m.id}" title="ویرایش">✎</button>
            <button class="icon-btn" data-pw="${m.id}" title="تغییر رمز">🔑</button>
            <button class="icon-btn" data-toggle="${m.id}" title="فعال/غیرفعال">⏻</button>
            <button class="icon-btn" data-del="${m.id}" title="حذف">🗑</button>
          </div></td>
        </tr>`;
            })
            .join("")
        : `<tr><td colspan="8"><div class="empty">بازاریابی ثبت نشده است.</div></td></tr>`
    }
    </tbody></table></div>
  `;
  document.getElementById("addMkBtn").onclick = () => openMarketerModal(null);
  document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openMarketerModal(b.dataset.edit)));
  document.querySelectorAll("[data-pw]").forEach((b) => (b.onclick = () => openChangePasswordModal(b.dataset.pw)));
  document.querySelectorAll("[data-toggle]").forEach(
    (b) =>
      (b.onclick = () => {
        const m = marketerById(b.dataset.toggle);
        m.active = m.active === false ? true : false;
        logActivity(CURRENT_USER.name, "تغییر وضعیت بازاریاب", m.username);
        persist();
        rerender();
      })
  );
  document.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () =>
        confirmDialog("این بازاریاب حذف شود؟ (سفارش‌ها و مشتریان ثبت‌شده حذف نمی‌شوند)", () => {
          DB.users.marketers = DB.users.marketers.filter((m) => m.id !== b.dataset.del);
          persist();
          rerender();
          toast("بازاریاب حذف شد.", "success");
        }))
  );
}

function estimateCommission(m, orders) {
  const now = new Date();
  const monthOrders = orders.filter((o) => isSameMonth(o.createdAt, now));
  const monthTonnage = monthOrders.reduce((s, o) => s + (o.items || []).reduce((a, it) => a + (it.qty * (productById(it.productId)?.weight || 10)) / 1000, 0), 0);
  const monthSales = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const rate = monthTonnage > 5 ? (m.commissionTier2 || 3) : (m.commissionTier1 || 2);
  return (monthSales * rate) / 100;
}

function openMarketerModal(id) {
  const m = id ? marketerById(id) : null;
  openModal(`
    <h3>${m ? "ویرایش بازاریاب" : "افزودن بازاریاب جدید"}</h3>
    <div class="form-grid">
      <div class="field"><label>نام</label><input id="f_fn" value="${m ? escapeHtml(m.firstName) : ""}"></div>
      <div class="field"><label>نام خانوادگی</label><input id="f_ln" value="${m ? escapeHtml(m.lastName) : ""}"></div>
      <div class="field"><label>شماره تماس</label><input id="f_phone" value="${m ? escapeHtml(m.phone || "") : ""}"></div>
      <div class="field"><label>کد ملی (اختیاری)</label><input id="f_nid" value="${m ? escapeHtml(m.nationalId || "") : ""}"></div>
      <div class="field"><label>نام کاربری</label><input id="f_user" value="${m ? escapeHtml(m.username) : ""}" ${m ? "disabled" : ""}></div>
      ${m ? "" : `<div class="field"><label>رمز عبور</label><input id="f_pass" type="text"></div>`}
      <div class="field"><label>پورسانت پایه (٪ تا ۵ تن)</label><input id="f_c1" type="number" value="${m ? m.commissionTier1 : 2}"></div>
      <div class="field"><label>پورسانت بالای ۵ تن (٪)</label><input id="f_c2" type="number" value="${m ? m.commissionTier2 : 3}"></div>
    </div>
    ${m ? `<div style="color:var(--text-dim);font-size:11.5px;margin-top:8px">تغییر نام کاربری فقط برای امنیت غیرفعال شده؛ در صورت نیاز بازاریاب را حذف و دوباره اضافه کنید.</div>` : ""}
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">انصراف</button>
      <button class="btn" id="saveMkBtn">${m ? "ذخیره تغییرات" : "افزودن بازاریاب"}</button>
    </div>
  `);
  document.getElementById("saveMkBtn").onclick = () => {
    const fn = document.getElementById("f_fn").value.trim();
    const ln = document.getElementById("f_ln").value.trim();
    if (!fn || !ln) return toast("نام و نام خانوادگی را وارد کنید.", "error");
    if (m) {
      m.firstName = fn;
      m.lastName = ln;
      m.phone = document.getElementById("f_phone").value.trim();
      m.nationalId = document.getElementById("f_nid").value.trim();
      m.commissionTier1 = numOrNull(document.getElementById("f_c1").value) || 2;
      m.commissionTier2 = numOrNull(document.getElementById("f_c2").value) || 3;
      logActivity(CURRENT_USER.name, "ویرایش بازاریاب", m.username);
      toast("اطلاعات بازاریاب ذخیره شد.", "success");
    } else {
      const username = document.getElementById("f_user").value.trim();
      const password = document.getElementById("f_pass").value;
      if (!username || !password) return toast("نام کاربری و رمز عبور را وارد کنید.", "error");
      if (findUser("marketer", username) || DB.users.admin.username === username) return toast("این نام کاربری قبلاً استفاده شده است.", "error");
      DB.users.marketers.push({
        id: uid("mk"),
        firstName: fn,
        lastName: ln,
        username,
        password,
        phone: document.getElementById("f_phone").value.trim(),
        nationalId: document.getElementById("f_nid").value.trim(),
        active: true,
        joinedAt: Date.now(),
        commissionTier1: numOrNull(document.getElementById("f_c1").value) || 2,
        commissionTier2: numOrNull(document.getElementById("f_c2").value) || 3,
        lastLogin: null,
      });
      logActivity(CURRENT_USER.name, "افزودن بازاریاب", username);
      toast("بازاریاب جدید اضافه شد.", "success");
    }
    persist();
    closeModal();
    rerender();
  };
}

function openChangePasswordModal(id) {
  const m = marketerById(id);
  openModal(`
    <h3>تغییر رمز عبور — ${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</h3>
    <div class="field"><label>رمز عبور جدید</label><input id="f_newpass" type="text"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">انصراف</button>
      <button class="btn" id="savePassBtn">ذخیره رمز جدید</button>
    </div>
  `);
  document.getElementById("savePassBtn").onclick = () => {
    const np = document.getElementById("f_newpass").value;
    if (!np) return toast("رمز جدید را وارد کنید.", "error");
    m.password = np;
    logActivity(CURRENT_USER.name, "تغییر رمز بازاریاب", m.username);
    persist();
    closeModal();
    toast("رمز عبور بازاریاب تغییر کرد.", "success");
  };
}

/* ============ 3. Customers ============ */
function renderAdminCustomers(el) {
  el.innerHTML = `
    <div class="toolbar">
      <input class="grow" id="custSearch" placeholder="جستجوی نام، شهر یا شماره...">
      <select id="custMkFilter"><option value="">همه بازاریاب‌ها</option>
        ${(DB.users.marketers || []).map((m) => `<option value="${m.id}">${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</option>`).join("")}
      </select>
    </div>
    <div id="custTableHost"></div>
  `;
  const s = document.getElementById("custSearch"),
    f = document.getElementById("custMkFilter");
  [s, f].forEach((x) => x.addEventListener("input", draw));
  draw();
  function draw() {
    const q = s.value.trim().toLowerCase();
    let list = DB.customers || [];
    if (f.value) list = list.filter((c) => c.marketerId === f.value);
    if (q) list = list.filter((c) => (c.shopName + c.city + c.phone).toLowerCase().includes(q));
    document.getElementById("custTableHost").innerHTML = `
      <div class="table-wrap"><table><thead><tr>
        <th>فروشگاه</th><th>شهر</th><th>تماس</th><th>بازاریاب</th><th>تعداد سفارش</th><th>مجموع خرید</th><th>عملیات</th>
      </tr></thead><tbody>
      ${
        list.length
          ? list
              .map((c) => {
                const co = (DB.orders || []).filter((o) => o.customerId === c.id);
                const total = co.reduce((s2, o) => s2 + (o.total || 0), 0);
                const mk = marketerById(c.marketerId);
                return `<tr>
            <td>${escapeHtml(c.shopName)}</td><td>${escapeHtml(c.city || "—")}</td><td>${escapeHtml(c.phone)}</td>
            <td>${mk ? escapeHtml(mk.firstName) + " " + escapeHtml(mk.lastName) : "—"}</td>
            <td>${toFaDigits(co.length)}</td><td>${formatMoney(total)}</td>
            <td><div class="row-actions">
              <button class="icon-btn" data-del="${c.id}" title="حذف">🗑</button>
            </div></td>
          </tr>`;
              })
              .join("")
          : `<tr><td colspan="7"><div class="empty">مشتری‌ای یافت نشد.</div></td></tr>`
      }
      </tbody></table></div>
    `;
    document.querySelectorAll("[data-del]").forEach(
      (b) =>
        (b.onclick = () =>
          confirmDialog("این مشتری حذف شود؟", () => {
            DB.customers = DB.customers.filter((c) => c.id !== b.dataset.del);
            persist();
            draw();
            toast("مشتری حذف شد.", "success");
          }))
    );
  }
}

/* ============ 4. Orders ============ */
function renderAdminOrders(el) {
  el.innerHTML = `
    <div class="toolbar">
      <select id="ordStatusFilter"><option value="">همه وضعیت‌ها</option>
        ${ORDER_STATUSES.map((s) => `<option value="${s.key}">${s.label}</option>`).join("")}
      </select>
      <select id="ordMkFilter"><option value="">همه بازاریاب‌ها</option>
        ${(DB.users.marketers || []).map((m) => `<option value="${m.id}">${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</option>`).join("")}
      </select>
    </div>
    <div id="ordTableHost"></div>
  `;
  const sf = document.getElementById("ordStatusFilter"),
    mf = document.getElementById("ordMkFilter");
  [sf, mf].forEach((x) => x.addEventListener("input", draw));
  draw();
  function draw() {
    let list = [...(DB.orders || [])].sort((a, b) => b.createdAt - a.createdAt);
    if (sf.value) list = list.filter((o) => o.status === sf.value);
    if (mf.value) list = list.filter((o) => o.marketerId === mf.value);
    document.getElementById("ordTableHost").innerHTML = renderOrdersTable(list, false);
    wireOrderActions(el);
  }
}

function renderOrdersTable(list, compact) {
  if (!list.length) return `<div class="empty"><div class="ic">📦</div>سفارشی ثبت نشده است.</div>`;
  return `<div class="table-wrap"><table><thead><tr>
      <th>شماره</th><th>مشتری</th><th>بازاریاب</th><th>مبلغ</th><th>پرداخت</th><th>وضعیت</th><th>تاریخ</th>${compact ? "" : "<th>عملیات</th>"}
    </tr></thead><tbody>
    ${list
      .map((o) => {
        const cust = customerById(o.customerId);
        const mk = marketerById(o.marketerId);
        const st = ORDER_STATUSES.find((s) => s.key === o.status) || ORDER_STATUSES[0];
        return `<tr>
        <td>${o.orderNumber}</td>
        <td>${cust ? escapeHtml(cust.shopName) : "—"}</td>
        <td>${mk ? escapeHtml(mk.firstName) : "—"}</td>
        <td>${formatMoney(o.total)}</td>
        <td>${PAYMENT_METHODS.find((p) => p.key === o.paymentMethod)?.label || "—"}</td>
        <td>${statusBadge(st)}</td>
        <td>${jalaliDateShort(o.createdAt)}</td>
        ${
          compact
            ? ""
            : `<td><div class="row-actions">
              <button class="icon-btn" data-view="${o.id}" title="جزئیات">👁</button>
              ${o.status !== "delivered" && o.status !== "cancelled" ? `<button class="icon-btn" data-status="${o.id}" title="تغییر وضعیت">🔄</button>` : ""}
            </div></td>`
        }
      </tr>`;
      })
      .join("")}
    </tbody></table></div>`;
}

function statusBadge(st) {
  const map = { pending: "blue", confirmed: "blue", ready: "gold", shipped: "gold", delivered: "green", cancelled: "red" };
  return `<span class="badge ${map[st.key]}">${st.label}</span>`;
}

function wireOrderActions(scopeEl) {
  scopeEl.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => openOrderDetail(b.dataset.view)));
  scopeEl.querySelectorAll("[data-status]").forEach((b) => (b.onclick = () => openStatusModal(b.dataset.status)));
}

function openOrderDetail(id) {
  const o = (DB.orders || []).find((x) => x.id === id);
  const cust = customerById(o.customerId);
  const mk = marketerById(o.marketerId);
  openModal(`
    <h3>سفارش ${o.orderNumber}</h3>
    <div style="font-size:13px;color:var(--text-dim);line-height:2">
      مشتری: ${cust ? escapeHtml(cust.shopName) : "—"} &nbsp;|&nbsp; بازاریاب: ${mk ? escapeHtml(mk.firstName) + " " + escapeHtml(mk.lastName) : "—"}<br>
      تاریخ: ${jalaliDateString(o.createdAt)} &nbsp;|&nbsp; پرداخت: ${PAYMENT_METHODS.find((p) => p.key === o.paymentMethod)?.label || "—"}
    </div>
    <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>محصول</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>
      ${o.items.map((it) => `<tr><td>${escapeHtml(productById(it.productId)?.name || "—")}</td><td>${toFaDigits(it.qty)}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.qty * it.price)}</td></tr>`).join("")}
    </tbody></table></div>
    <div style="margin-top:12px">
      <div class="summary-row"><span>جمع کل</span><span>${formatMoney(o.subtotal)}</span></div>
      <div class="summary-row"><span>تخفیف</span><span>${formatMoney(o.discount)}</span></div>
      <div class="summary-row"><span>هزینه ارسال</span><span>${formatMoney(o.shipping)}</span></div>
      <div class="summary-row total"><span>مبلغ نهایی</span><span>${formatMoney(o.total)}</span></div>
    </div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">بستن</button></div>
  `);
}

function openStatusModal(id) {
  const o = (DB.orders || []).find((x) => x.id === id);
  openModal(`
    <h3>تغییر وضعیت سفارش ${o.orderNumber}</h3>
    <div class="field"><label>وضعیت جدید</label>
      <select id="f_newstatus">${ORDER_STATUSES.map((s) => `<option value="${s.key}" ${o.status === s.key ? "selected" : ""}>${s.label}</option>`).join("")}</select>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">انصراف</button>
      <button class="btn" id="saveStatusBtn">ذخیره</button>
    </div>
  `);
  document.getElementById("saveStatusBtn").onclick = () => {
    const ns = document.getElementById("f_newstatus").value;
    o.status = ns;
    o.statusHistory = o.statusHistory || [];
    o.statusHistory.push({ status: ns, at: Date.now(), by: CURRENT_USER.name });
    notify(o.marketerId, "تغییر وضعیت سفارش", `سفارش ${o.orderNumber} به «${ORDER_STATUSES.find((s) => s.key === ns).label}» تغییر کرد.`, "order");
    logActivity(CURRENT_USER.name, "تغییر وضعیت سفارش", o.orderNumber);
    persist();
    closeModal();
    rerender();
    toast("وضعیت سفارش به‌روزرسانی شد.", "success");
  };
}

/* ============ 5. Accounting ============ */
function renderAdminAccounting(el) {
  const orders = DB.orders || [];
  const now = new Date();
  const dayIncome = orders.filter((o) => isSameDay(o.createdAt, now)).reduce((s, o) => s + o.total, 0);
  const monthIncome = orders.filter((o) => isSameMonth(o.createdAt, now)).reduce((s, o) => s + o.total, 0);
  const yearIncome = orders.filter((o) => new Date(o.createdAt).getFullYear() === now.getFullYear()).reduce((s, o) => s + o.total, 0);
  const totalDiscount = orders.reduce((s, o) => s + (o.discount || 0), 0);
  const expenses = DB.expenses || [];
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCommission = (DB.users.marketers || []).reduce((s, m) => s + estimateCommission(m, ordersOf(m.id)), 0);
  const profit = monthIncome - totalExpenses - totalCommission;

  el.innerHTML = `
    <div class="stat-grid">
      ${statCard("درآمد امروز", formatMoney(dayIncome))}
      ${statCard("درآمد این ماه", formatMoney(monthIncome))}
      ${statCard("درآمد امسال", formatMoney(yearIncome))}
      ${statCard("مجموع تخفیف‌ها", formatMoney(totalDiscount))}
      ${statCard("هزینه‌های ثبت‌شده", formatMoney(totalExpenses))}
      ${statCard("پورسانت بازاریاب‌ها (این ماه)", formatMoney(totalCommission))}
      ${statCard("سود تقریبی ماه", formatMoney(profit))}
    </div>

    <div class="section-title"><h3>هزینه‌ها</h3><button class="btn sm" id="addExpBtn">+ ثبت هزینه</button></div>
    <div class="table-wrap"><table><thead><tr><th>عنوان</th><th>دسته</th><th>مبلغ</th><th>تاریخ</th><th></th></tr></thead><tbody>
      ${
        expenses.length
          ? expenses
              .map(
                (e) => `<tr><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.category)}</td><td>${formatMoney(e.amount)}</td><td>${jalaliDateShort(e.date)}</td>
          <td><button class="icon-btn" data-delexp="${e.id}">🗑</button></td></tr>`
              )
              .join("")
          : `<tr><td colspan="5"><div class="empty">هزینه‌ای ثبت نشده است.</div></td></tr>`
      }
    </tbody></table></div>

    <div class="section-title"><h3>پورسانت بازاریاب‌ها</h3></div>
    <div class="table-wrap"><table><thead><tr><th>بازاریاب</th><th>فروش این ماه</th><th>پورسانت تقریبی</th></tr></thead><tbody>
      ${(DB.users.marketers || [])
        .map((m) => `<tr><td>${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</td><td>${formatMoney(ordersOf(m.id).filter((o) => isSameMonth(o.createdAt)).reduce((s, o) => s + o.total, 0))}</td><td>${formatMoney(estimateCommission(m, ordersOf(m.id)))}</td></tr>`)
        .join("")}
    </tbody></table></div>
    <div style="margin-top:14px;color:var(--text-dim);font-size:12px">خروجی PDF و Excel برای گزارش‌های مالی از بخش «گزارش‌ها» در دسترس است.</div>
  `;
  document.getElementById("addExpBtn").onclick = openExpenseModal;
  document.querySelectorAll("[data-delexp]").forEach(
    (b) =>
      (b.onclick = () => {
        DB.expenses = DB.expenses.filter((e) => e.id !== b.dataset.delexp);
        persist();
        rerender();
      })
  );
}

function openExpenseModal() {
  openModal(`
    <h3>ثبت هزینه جدید</h3>
    <div class="form-grid">
      <div class="field full"><label>عنوان هزینه</label><input id="f_etitle" placeholder="مثلاً حمل‌ونقل"></div>
      <div class="field"><label>دسته</label>
        <select id="f_ecat"><option>حمل‌ونقل</option><option>بسته‌بندی</option><option>تبلیغات</option><option>حقوق</option><option>سایر</option></select>
      </div>
      <div class="field"><label>مبلغ (هزار تومان)</label><input id="f_eamt" type="number"></div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">انصراف</button>
      <button class="btn" id="saveExpBtn">ثبت هزینه</button>
    </div>
  `);
  document.getElementById("saveExpBtn").onclick = () => {
    const title = document.getElementById("f_etitle").value.trim();
    const amount = numOrNull(document.getElementById("f_eamt").value);
    if (!title || !amount) return toast("عنوان و مبلغ را وارد کنید.", "error");
    DB.expenses.push({ id: uid("exp"), title, category: document.getElementById("f_ecat").value, amount, date: Date.now() });
    logActivity(CURRENT_USER.name, "ثبت هزینه", title);
    persist();
    closeModal();
    rerender();
    toast("هزینه ثبت شد.", "success");
  };
}

/* ============ 6. Reports ============ */
function renderAdminReports(el) {
  const orders = DB.orders || [];
  const byProduct = {};
  orders.forEach((o) => o.items.forEach((it) => (byProduct[it.productId] = (byProduct[it.productId] || 0) + it.qty)));
  const rank = Object.entries(byProduct)
    .map(([pid, qty]) => ({ p: productById(pid), qty }))
    .filter((r) => r.p)
    .sort((a, b) => b.qty - a.qty);
  const best = rank.slice(0, 5);
  const worst = [...rank].reverse().slice(0, 5);

  const byMk = {};
  (DB.users.marketers || []).forEach((m) => {
    const mo = ordersOf(m.id);
    byMk[m.id] = { m, count: mo.length, sales: mo.reduce((s, o) => s + o.total, 0) };
  });
  const mkRank = Object.values(byMk).sort((a, b) => b.sales - a.sales);

  const avgOrder = orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn ghost sm" onclick="window.print()">🖨 چاپ / خروجی PDF گزارش</button>
    </div>

    <div class="stat-grid">
      ${statCard("میانگین مبلغ سفارش", formatMoney(avgOrder))}
      ${statCard("سفارش‌های لغوشده", toFaDigits(cancelled))}
      ${statCard("تعداد کل سفارش‌ها", toFaDigits(orders.length))}
    </div>

    <div class="section-title"><h3>پرفروش‌ترین محصولات</h3></div>
    <div class="table-wrap"><table><thead><tr><th>محصول</th><th>تعداد فروخته‌شده</th></tr></thead><tbody>
      ${best.length ? best.map((r) => `<tr><td>${escapeHtml(r.p.name)}</td><td>${toFaDigits(r.qty)}</td></tr>`).join("") : `<tr><td colspan="2"><div class="empty">داده‌ای موجود نیست.</div></td></tr>`}
    </tbody></table></div>

    <div class="section-title"><h3>کم‌فروش‌ترین محصولات</h3></div>
    <div class="table-wrap"><table><thead><tr><th>محصول</th><th>تعداد فروخته‌شده</th></tr></thead><tbody>
      ${worst.length ? worst.map((r) => `<tr><td>${escapeHtml(r.p.name)}</td><td>${toFaDigits(r.qty)}</td></tr>`).join("") : `<tr><td colspan="2"><div class="empty">داده‌ای موجود نیست.</div></td></tr>`}
    </tbody></table></div>

    <div class="section-title"><h3>عملکرد بازاریاب‌ها</h3></div>
    <div class="table-wrap"><table><thead><tr><th>بازاریاب</th><th>تعداد سفارش</th><th>مبلغ فروش</th></tr></thead><tbody>
      ${mkRank.length ? mkRank.map((r) => `<tr><td>${escapeHtml(r.m.firstName)} ${escapeHtml(r.m.lastName)}</td><td>${toFaDigits(r.count)}</td><td>${formatMoney(r.sales)}</td></tr>`).join("") : `<tr><td colspan="3"><div class="empty">داده‌ای موجود نیست.</div></td></tr>`}
    </tbody></table></div>
    <div style="margin-top:10px;color:var(--text-dim);font-size:12px">برای خروجی Excel، جدول را انتخاب و کپی کرده و در Excel جای‌گذاری (Paste) کنید؛ یا از گزینه چاپ برای دریافت PDF استفاده کنید.</div>
  `;
}

/* ============ 7. AI Insights (rule-based, no paid API) ============ */
function renderAdminAI(el) {
  const insights = computeInsights();
  el.innerHTML = `
    <div class="panel" style="margin-bottom:18px;font-size:12.5px;color:var(--text-dim);line-height:1.9">
      این بخش بر پایه‌ی تحلیل قانون‌محور داده‌های واقعی سامانه کار می‌کند (بدون اتصال به سرویس هوش مصنوعی پولی)، دقیقاً طبق همان تصمیمی که قبلاً برای این پروژه گرفتیم. اگر در آینده بخواهید تحلیل زبانی و مکالمه‌ای واقعی هم اضافه شود، نیاز به فعال‌سازی کلید API هوش مصنوعی خواهد بود.
    </div>
    <div class="section-title"><h3>هشدارها و پیشنهادها</h3></div>
    ${
      insights.length
        ? `<div style="display:flex;flex-direction:column;gap:10px">` +
          insights.map((i) => `<div class="panel" style="display:flex;gap:10px;align-items:flex-start"><span style="font-size:18px">${i.ic}</span><div style="font-size:13px;line-height:1.8">${i.text}</div></div>`).join("") +
          `</div>`
        : `<div class="empty"><div class="ic">🧠</div>هنوز داده کافی برای تحلیل ثبت نشده است.</div>`
    }

    <div class="section-title"><h3>پرسش سریع</h3></div>
    <div class="panel">
      <div class="toolbar" style="margin-bottom:0">
        <input class="grow" id="aiQ" placeholder="مثلاً: امروز چه محصولی بیشترین فروش را داشته؟">
        <button class="btn sm" id="aiAskBtn">پرسیدن</button>
      </div>
      <div id="aiAnswer" style="margin-top:14px;font-size:13px;line-height:1.9;color:var(--text-dim)"></div>
    </div>
  `;
  document.getElementById("aiAskBtn").onclick = () => {
    const q = document.getElementById("aiQ").value.trim();
    document.getElementById("aiAnswer").innerHTML = answerAiQuestion(q);
  };
}

function computeInsights() {
  const out = [];
  const orders = DB.orders || [];
  const products = DB.products || [];

  products.forEach((p) => {
    if (p.active !== false && p.stock <= (p.lowStockThreshold || 50)) {
      out.push({ ic: "⚠️", text: `موجودی «${escapeHtml(p.name)}» رو به اتمام است (${toFaDigits(p.stock)} کیسه باقی مانده).` });
    }
  });

  // week over week per product
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;
  const byProdThis = {}, byProdLast = {};
  orders.forEach((o) => {
    const bucket = o.createdAt >= weekAgo ? byProdThis : o.createdAt >= twoWeeksAgo ? byProdLast : null;
    if (!bucket) return;
    o.items.forEach((it) => (bucket[it.productId] = (bucket[it.productId] || 0) + it.qty));
  });
  Object.keys(byProdLast).forEach((pid) => {
    const p = productById(pid);
    if (!p) return;
    const before = byProdLast[pid];
    const after = byProdThis[pid] || 0;
    if (before >= 3) {
      const change = Math.round(((after - before) / before) * 100);
      if (change <= -15) out.push({ ic: "📉", text: `فروش «${escapeHtml(p.name)}» نسبت به هفته گذشته ${toFaDigits(Math.abs(change))}٪ کاهش داشته است.` });
      if (change >= 25) out.push({ ic: "📈", text: `فروش «${escapeHtml(p.name)}» نسبت به هفته گذشته ${toFaDigits(change)}٪ رشد داشته است.` });
    }
  });

  // best marketer this week
  const mkSales = {};
  orders.filter((o) => o.createdAt >= weekAgo).forEach((o) => (mkSales[o.marketerId] = (mkSales[o.marketerId] || 0) + o.total));
  const bestMk = Object.entries(mkSales).sort((a, b) => b[1] - a[1])[0];
  if (bestMk) {
    const m = marketerById(bestMk[0]);
    if (m) out.push({ ic: "🏆", text: `بازاریاب برتر این هفته: ${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)} با فروش ${formatMoney(bestMk[1])}` });
  }

  // inactive customers (no order in 45 days)
  const cutoffInactive = now - 45 * 86400000;
  (DB.customers || []).forEach((c) => {
    const co = (DB.orders || []).filter((o) => o.customerId === c.id);
    if (!co.length) return;
    const last = Math.max(...co.map((o) => o.createdAt));
    if (last < cutoffInactive) out.push({ ic: "⏳", text: `مشتری «${escapeHtml(c.shopName)}» مدت زیادی است خرید نکرده است.` });
  });

  return out.slice(0, 12);
}

function answerAiQuestion(q) {
  const orders = DB.orders || [];
  const todays = orders.filter((o) => isSameDay(o.createdAt));
  if (!q) return "یک سؤال بنویسید تا بر اساس داده‌های واقعی سامانه پاسخ بدهم.";

  if (q.includes("امروز") && q.includes("فروش")) {
    const byP = {};
    todays.forEach((o) => o.items.forEach((it) => (byP[it.productId] = (byP[it.productId] || 0) + it.qty)));
    const top = Object.entries(byP).sort((a, b) => b[1] - a[1])[0];
    if (!top) return "امروز هنوز سفارشی ثبت نشده است.";
    return `بیشترین فروش امروز مربوط به «${escapeHtml(productById(top[0])?.name || "")}» با ${toFaDigits(top[1])} کیسه بوده است.`;
  }
  if (q.includes("ضعیف") && q.includes("بازاریاب")) {
    const mkSales = {};
    (DB.users.marketers || []).forEach((m) => (mkSales[m.id] = ordersOf(m.id).reduce((s, o) => s + o.total, 0)));
    const worst = Object.entries(mkSales).sort((a, b) => a[1] - b[1])[0];
    if (!worst) return "هنوز داده‌ای برای بازاریاب‌ها ثبت نشده است.";
    const m = marketerById(worst[0]);
    return `کمترین فروش تجمعی مربوط به ${m ? escapeHtml(m.firstName) + " " + escapeHtml(m.lastName) : "—"} است.`;
  }
  if (q.includes("مشتری") && (q.includes("نکرده") || q.includes("غیرفعال"))) {
    const now = Date.now();
    const cutoff = now - 45 * 86400000;
    const list = (DB.customers || []).filter((c) => {
      const co = (DB.orders || []).filter((o) => o.customerId === c.id);
      if (!co.length) return false;
      return Math.max(...co.map((o) => o.createdAt)) < cutoff;
    });
    if (!list.length) return "مشتری غیرفعال (بدون خرید بیش از ۴۵ روز) یافت نشد.";
    return "مشتریان غیرفعال: " + list.map((c) => escapeHtml(c.shopName)).join("، ");
  }
  if (q.includes("پیشنهاد") || q.includes("افزایش فروش")) {
    const insights = computeInsights();
    const sug = insights.find((i) => i.ic === "📉");
    return sug ? sug.text + " پیشنهاد می‌شود برای این محصول آفر موقت فعال شود." : "روند فروش در حال حاضر پایدار است؛ می‌توانید روی محصولات پرفروش کمپین تخفیف کوتاه‌مدت اجرا کنید.";
  }
  return "این سؤال هنوز در دایره‌ی پاسخ‌های آماده نیست؛ می‌توانید از بخش گزارش‌ها اطلاعات دقیق‌تر را بررسی کنید.";
}

/* ============ 8. Settings ============ */
function renderAdminSettings(el) {
  const s = DB.settings;
  el.innerHTML = `
    <div class="panel">
      <div class="form-grid">
        <div class="field full"><label>نام شرکت</label><input id="f_company" value="${escapeHtml(s.companyName)}"></div>
        <div class="field"><label>شماره تماس</label><input id="f_sphone" value="${escapeHtml(s.phone)}"></div>
        <div class="field"><label>محدوده پوشش</label><input id="f_coverage" value="${escapeHtml(s.coverage || "")}"></div>
        <div class="field full"><label>آدرس</label><input id="f_saddr" value="${escapeHtml(s.address)}"></div>
        <div class="field full"><label>متن صفحه ورود</label><input id="f_logintext" value="${escapeHtml(s.loginText)}"></div>
        <div class="field"><label>رنگ اصلی برنامه</label><input id="f_theme" type="color" value="${s.themeColor}"></div>
        <div class="field"><label>نسخه برنامه</label><input id="f_version" value="${escapeHtml(s.version)}" disabled></div>
      </div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn" id="saveSettingsBtn">ذخیره تنظیمات</button>
      </div>
    </div>

    <div class="section-title"><h3>تغییر رمز مدیر</h3></div>
    <div class="panel">
      <div class="field"><label>رمز عبور جدید</label><input id="f_adminpass" type="text"></div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn ghost" id="saveAdminPassBtn">ذخیره رمز جدید</button>
      </div>
    </div>

    <div class="section-title"><h3>پشتیبان‌گیری</h3></div>
    <div class="panel" style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn ghost sm" id="backupBtn">⬇ دریافت نسخه پشتیبان (JSON)</button>
      <label class="btn ghost sm" style="cursor:pointer">⬆ بازیابی از فایل پشتیبان
        <input type="file" id="restoreFile" accept="application/json" style="display:none">
      </label>
    </div>

    <div class="section-title"><h3>فعالیت‌های اخیر سیستم</h3></div>
    <div class="table-wrap"><table><thead><tr><th>کاربر</th><th>عملیات</th><th>جزئیات</th><th>زمان</th></tr></thead><tbody>
      ${(DB.activityLog || []).slice(0, 20).map((a) => `<tr><td>${escapeHtml(a.user)}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.detail)}</td><td>${jalaliDateShort(a.at)} ${timeString(a.at)}</td></tr>`).join("") || `<tr><td colspan="4"><div class="empty">فعالیتی ثبت نشده است.</div></td></tr>`}
    </tbody></table></div>
  `;

  document.getElementById("saveSettingsBtn").onclick = () => {
    s.companyName = document.getElementById("f_company").value.trim();
    s.phone = document.getElementById("f_sphone").value.trim();
    s.coverage = document.getElementById("f_coverage").value.trim();
    s.address = document.getElementById("f_saddr").value.trim();
    s.loginText = document.getElementById("f_logintext").value.trim();
    s.themeColor = document.getElementById("f_theme").value;
    logActivity(CURRENT_USER.name, "تغییر تنظیمات سیستم", "");
    persist();
    toast("تنظیمات ذخیره شد.", "success");
  };
  document.getElementById("saveAdminPassBtn").onclick = () => {
    const np = document.getElementById("f_adminpass").value;
    if (!np) return toast("رمز جدید را وارد کنید.", "error");
    DB.users.admin.password = np;
    logActivity(CURRENT_USER.name, "تغییر رمز مدیر", "");
    persist();
    toast("رمز مدیر تغییر کرد.", "success");
    document.getElementById("f_adminpass").value = "";
  };
  document.getElementById("backupBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kiarice-backup-" + Date.now() + ".json";
    a.click();
  };
  document.getElementById("restoreFile").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    confirmDialog("بازیابی نسخه پشتیبان، تمام اطلاعات فعلی را جایگزین می‌کند. ادامه می‌دهید؟", () => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          DB = parsed;
          persist();
          toast("بازیابی با موفقیت انجام شد.", "success");
          rerender();
        } catch (err) {
          toast("فایل پشتیبان معتبر نیست.", "error");
        }
      };
      reader.readAsText(file);
    });
  };
}
