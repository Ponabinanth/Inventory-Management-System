let products = [];
let stream = null;
let lastAlertSig = "";
let filters = { query: "", status: "all", sort: "updated" };

const byId = (id) => document.getElementById(id);
const money = (n) => `$${Number(n).toFixed(2)}`;

function toast(msg, type = "success") {
  const box = byId("messageBox");
  const base = "p-3 rounded-xl shadow-2xl text-white text-sm fixed top-5 right-5 z-50 transition-all duration-300 transform translate-x-10 opacity-0";
  box.textContent = msg;
  box.className = `${base} ${type === "error" ? "bg-red-600" : type === "info" ? "bg-sky-600" : "bg-green-500"}`;
  setTimeout(() => box.classList.add("translate-x-0", "opacity-100"), 10);
  setTimeout(() => {
    box.classList.remove("translate-x-0", "opacity-100");
    box.classList.add("translate-x-10", "opacity-0");
  }, 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) {
    let err = "Request failed";
    try { err = (await response.json()).error || err; } catch {}
    throw new Error(err);
  }
  return response.status === 204 ? null : response.json();
}

function sorted(list) {
  const copy = [...list];
  if (filters.sort === "name") copy.sort((a, b) => a.productName.localeCompare(b.productName));
  else if (filters.sort === "price") copy.sort((a, b) => b.price - a.price);
  else if (filters.sort === "qty") copy.sort((a, b) => a.quantity - b.quantity);
  else copy.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return copy;
}

function filtered() {
  const q = filters.query;
  const f = products.filter((p) => {
    const matchQ = !q || p.productId.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q);
    const matchS = filters.status === "all" || (filters.status === "low" && p.quantity < 5) || (filters.status === "healthy" && p.quantity >= 5);
    return matchQ && matchS;
  });
  return sorted(f);
}

function renderStats() {
  byId("totalItems").textContent = String(products.length);
  byId("totalValue").textContent = money(products.reduce((s, p) => s + (p.price * p.quantity), 0));
  byId("lowStockCount").textContent = String(products.filter((p) => p.quantity < 5).length);
  byId("avgPrice").textContent = money(products.length ? products.reduce((s, p) => s + p.price, 0) / products.length : 0);
}

function renderTable(list) {
  const tb = byId("inventoryTableBody");
  tb.innerHTML = "";
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="8" class="empty">No products found for this filter.</td></tr>';
    return;
  }

  for (const p of list) {
    const cls = p.quantity < 5 ? "stock-low" : "stock-ok";
    const txt = p.quantity < 5 ? "Low" : "Healthy";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.productId}</td><td><strong>${p.productName}</strong></td><td>${p.category}</td>
      <td class='text-right'>${money(p.price)}</td>
      <td class='text-right'><span class='${cls}'>${txt}</span> ${p.quantity}</td>
      <td>${p.supplier}</td><td>${p.manufacturingDate}</td>
      <td><div class='row-actions'>
        <button class='btn-light' data-a='edit' data-id='${p.id}'>Edit</button>
        <button class='btn-light' data-a='restock' data-id='${p.id}'>+1</button>
        <button class='btn-danger' data-a='delete' data-id='${p.id}' data-name='${p.productName}'>Delete</button>
      </div></td>`;
    tb.appendChild(tr);
  }
}

function renderAlerts(payload) {
  const list = byId("alertsList");
  const summary = byId("alertsSummary");
  const items = payload.lowStockItems || [];
  if (!items.length) {
    summary.textContent = "No active alerts";
    list.innerHTML = '<p class="empty">No low-stock alerts right now.</p>';
    return;
  }
  summary.textContent = `${payload.lowStockCount} low-stock, ${payload.outOfStockCount} out-of-stock`;
  list.innerHTML = "";
  for (const item of items.slice(0, 6)) {
    const el = document.createElement("div");
    el.className = "alert-item";
    el.innerHTML = `<div><strong>${item.productName}</strong> (${item.productId}) is low: <strong>${item.quantity}</strong></div><button class='btn-primary' data-a='alert-restock' data-id='${item.id}'>Quick Restock +5</button>`;
    list.appendChild(el);
  }

  const sig = JSON.stringify(items.map((i) => `${i.id}:${i.quantity}`));
  if (lastAlertSig && sig !== lastAlertSig) toast("Action alert updated.", "info");
  lastAlertSig = sig;
}

function refreshView() {
  renderStats();
  renderTable(filtered());
}

async function loadProducts(showToast = false) {
  const data = await api("/api/products");
  products = data.products || [];
  refreshView();
  if (showToast) toast("Data refreshed.");
}

async function loadAlerts() {
  renderAlerts(await api("/api/alerts"));
}

function buildLowStockMessage() {
  const low = products.filter((p) => p.quantity < 5);
  if (!low.length) return "No low stock items right now.";
  const summary = low.slice(0, 5).map((p) => `${p.productName}(${p.quantity})`).join(", ");
  return `Low stock alert: ${summary}${low.length > 5 ? ", ..." : ""}.`;
}

function renderNotificationHistory(items) {
  const summary = byId("notificationSummary");
  const list = byId("notificationsList");
  if (!items.length) {
    summary.textContent = "No notifications sent";
    list.innerHTML = '<p class="empty">No notification history.</p>';
    return;
  }
  summary.textContent = `${items.length} recent notifications`;
  list.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "history-item";
    row.textContent = `${item.channel.toUpperCase()} to ${item.recipient} | ${item.delivered ? "Delivered" : "Logged"} | ${new Date(item.createdAt).toLocaleString()}`;
    list.appendChild(row);
  }
}

async function loadNotifications() {
  const data = await api("/api/notifications?limit=8");
  renderNotificationHistory(data.notifications || []);
}

async function sendNotification(channel) {
  const recipient = channel === "email" ? byId("emailRecipient").value.trim() : byId("smsRecipient").value.trim();
  if (!recipient) {
    toast(`Please enter a ${channel.toUpperCase()} recipient.`, "error");
    return;
  }
  await api("/api/alerts/notify", {
    method: "POST",
    body: JSON.stringify({
      channel,
      recipient,
      subject: "Inventory Alert Summary",
      message: buildLowStockMessage()
    })
  });
  toast(`${channel.toUpperCase()} alert sent.`);
  await loadNotifications();
}

function openModal(edit = false, p = null) {
  byId("productForm").reset();
  byId("productDocId").value = "";
  byId("productIdInput").disabled = false;
  byId("formTitle").textContent = "Add New Product";
  if (edit && p) {
    byId("productDocId").value = p.id;
    byId("formTitle").textContent = "Edit Product";
    byId("productIdInput").value = p.productId;
    byId("productIdInput").disabled = true;
    byId("productNameInput").value = p.productName;
    byId("categoryInput").value = p.category;
    byId("supplierInput").value = p.supplier;
    byId("priceInput").value = p.price;
    byId("quantityInput").value = p.quantity;
    byId("manufacturingDateInput").value = p.manufacturingDate;
  }
  byId("inventoryModal").classList.remove("hidden");
}

function closeModal() { byId("inventoryModal").classList.add("hidden"); }
function closeDelete() { byId("deleteConfirmationModal").classList.add("hidden"); }

async function saveForm(e) {
  e.preventDefault();
  const docId = byId("productDocId").value;
  const body = {
    productId: byId("productIdInput").value.trim(),
    productName: byId("productNameInput").value.trim(),
    category: byId("categoryInput").value.trim(),
    supplier: byId("supplierInput").value.trim(),
    price: parseNumeric(byId("priceInput").value),
    quantity: Math.round(parseNumeric(byId("quantityInput").value) || 0),
    manufacturingDate: byId("manufacturingDateInput").value
  };

  if (!body.productId || !body.productName || !body.category || !body.supplier || !body.manufacturingDate || !(body.price > 0) || body.quantity < 0) {
    toast("Please fill valid values.", "error");
    return;
  }

  if (docId) {
    await api(`/api/products/${encodeURIComponent(docId)}`, { method: "PUT", body: JSON.stringify(body) });
    toast("Product updated.");
  } else {
    await api("/api/products", { method: "POST", body: JSON.stringify(body) });
    toast("Product added.");
  }
  closeModal();
  await Promise.all([loadProducts(), loadAlerts()]);
}

function parseNumeric(v) {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

async function removeProduct(id, name) {
  closeDelete();
  await api(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  toast(`Deleted ${name}.`);
  await Promise.all([loadProducts(), loadAlerts()]);
}

async function restock(id, delta) {
  await api(`/api/products/${encodeURIComponent(id)}/restock`, { method: "PATCH", body: JSON.stringify({ delta }) });
  toast(`Restocked by ${delta}.`);
  await Promise.all([loadProducts(), loadAlerts()]);
}

function connectLive() {
  if (stream) stream.close();
  stream = new EventSource("/api/stream");
  stream.onopen = () => { byId("liveChip").textContent = "Live API: Connected"; byId("liveChip").classList.remove("offline"); byId("liveChip").classList.add("online"); };
  stream.onerror = () => { byId("liveChip").textContent = "Live API: Reconnecting..."; byId("liveChip").classList.remove("online"); byId("liveChip").classList.add("offline"); };
  const sync = async () => { await Promise.all([loadProducts(), loadAlerts(), loadNotifications()]); };
  stream.onmessage = sync;
  ["product_created", "product_updated", "product_deleted", "product_restocked"].forEach((e) => stream.addEventListener(e, sync));
  stream.addEventListener("notification_sent", sync);
}

function bind() {
  byId("todayDate").textContent = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  byId("displayUserId").textContent = "local-admin";

  byId("openAddButton").addEventListener("click", () => openModal());
  byId("cancelModalButton").addEventListener("click", closeModal);
  byId("cancelDeleteButton").addEventListener("click", closeDelete);
  byId("refreshButton").addEventListener("click", async () => Promise.all([loadProducts(true), loadAlerts()]));
  byId("sendEmailAlertButton").addEventListener("click", async () => {
    try { await sendNotification("email"); } catch (e) { toast(`Email failed: ${e.message}`, "error"); }
  });
  byId("sendSmsAlertButton").addEventListener("click", async () => {
    try { await sendNotification("sms"); } catch (e) { toast(`SMS failed: ${e.message}`, "error"); }
  });
  byId("clearFiltersButton").addEventListener("click", () => {
    byId("searchKeyword").value = "";
    byId("statusFilter").value = "all";
    byId("sortBy").value = "updated";
    filters = { query: "", status: "all", sort: "updated" };
    refreshView();
  });
  byId("exportCsvButton").addEventListener("click", () => { window.location.href = "/api/products/export.csv"; });

  byId("searchKeyword").addEventListener("input", (e) => { filters.query = e.target.value.trim().toLowerCase(); refreshView(); });
  byId("statusFilter").addEventListener("change", (e) => { filters.status = e.target.value; refreshView(); });
  byId("sortBy").addEventListener("change", (e) => { filters.sort = e.target.value; refreshView(); });

  byId("productForm").addEventListener("submit", saveForm);

  byId("inventoryTableBody").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-a]");
    if (!b) return;
    const id = b.dataset.id;
    const p = products.find((x) => x.id === id);
    if (b.dataset.a === "edit" && p) openModal(true, p);
    if (b.dataset.a === "delete") {
      byId("deleteProductName").textContent = b.dataset.name || "product";
      byId("executeDeleteButton").onclick = () => removeProduct(id, b.dataset.name || "product");
      byId("deleteConfirmationModal").classList.remove("hidden");
    }
    if (b.dataset.a === "restock") await restock(id, 1);
  });

  byId("alertsList").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-a='alert-restock']");
    if (!b) return;
    await restock(b.dataset.id, 5);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); closeDelete(); }
    if (e.altKey && e.key.toLowerCase() === "n") openModal();
  });
}

async function init() {
  bind();
  try {
    await api("/api/health");
    await Promise.all([loadProducts(), loadAlerts(), loadNotifications()]);
    connectLive();
  } catch (e) {
    byId("liveChip").textContent = "Live API: Offline";
    byId("liveChip").classList.add("offline");
    toast(`Backend unavailable: ${e.message}`, "error");
  }
}

window.addEventListener("load", init);
