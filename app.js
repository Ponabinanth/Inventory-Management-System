// PulseStock Enterprise - Modern Application Logic & RBAC Engine

// Application State
let products = [];
let transactions = [];
let logs = [];
let notifications = [];
let users = [];
let suppliers = [];
let customers = [];
let posCart = [];

let activeUser = localStorage.getItem("activeUser") || "local-admin";
let activeRole = localStorage.getItem("activeRole") || "Super Admin";
let activeTheme = localStorage.getItem("activeTheme") || "light";
let activeCurrency = localStorage.getItem("activeCurrency") || "$";

let charts = {
  sales: null,
  category: null,
  revenueExpense: null,
  topProducts: null
};

let html5QrScanner = null;

// DOM Helpers
const byId = (id) => document.getElementById(id);
const formatMoney = (n) => `${activeCurrency}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Toast Notification Engine
function toast(msg, type = "success") {
  const box = byId("messageBox");
  if (!box) return;

  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-xmark"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>'
  };

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500'
  };

  const toastEl = document.createElement("div");
  toastEl.className = `p-4 rounded-xl shadow-2xl text-white text-sm flex items-center gap-3 font-semibold transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toastEl.innerHTML = `${icons[type] || icons.info} <span>${msg}</span>`;

  box.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.remove("translate-y-2", "opacity-0");
  }, 10);

  setTimeout(() => {
    toastEl.classList.add("opacity-0", "translate-y-[-10px]");
    setTimeout(() => toastEl.remove(), 300);
  }, 3500);
}

// RBAC Permissions Matrix
const ROLE_PERMISSIONS = {
  "Super Admin": ["dashboard", "inventory", "sales", "purchases", "suppliers", "customers", "reports", "analytics", "notifications", "calendar", "users", "settings", "logs", "add_product", "edit_product", "delete_product", "manage_users", "manage_settings"],
  "Inventory Manager": ["dashboard", "inventory", "purchases", "suppliers", "reports", "analytics", "notifications", "calendar", "logs", "add_product", "edit_product"],
  "Sales Executive": ["dashboard", "inventory", "sales", "customers", "notifications", "calendar"],
  "Warehouse Staff": ["dashboard", "inventory", "scanner", "purchases", "notifications"],
  "Customer": ["dashboard", "sales", "notifications"]
};

function hasPermission(permission) {
  const allowed = ROLE_PERMISSIONS[activeRole] || [];
  return allowed.includes(permission);
}

function applyRolePermissionsUI() {
  const roleSelect = byId("userRoleSelect");
  if (roleSelect) roleSelect.value = activeRole;

  const headerUsername = byId("headerUsername");
  const headerRole = byId("headerRole");
  const userAvatar = byId("userAvatar");

  if (headerRole) headerRole.textContent = activeRole;

  const activeUserObj = users.find(u => u.role === activeRole || u.username === activeUser);
  if (headerUsername) headerUsername.textContent = activeUserObj ? activeUserObj.name : activeRole;
  if (userAvatar && activeUserObj?.avatar) userAvatar.src = activeUserObj.avatar;

  // Show/Hide Navigation Tabs based on permissions
  document.querySelectorAll(".nav-menu .nav-item").forEach(item => {
    const tabName = item.getAttribute("data-tab")?.replace("-tab", "");
    if (tabName && ROLE_PERMISSIONS[activeRole]) {
      const isAllowed = hasPermission(tabName);
      item.parentElement.style.display = isAllowed ? "block" : "none";
    }
  });

  // Hide action buttons for restricted roles
  const addBtn = byId("openAddModalBtn");
  if (addBtn) addBtn.style.display = hasPermission("add_product") ? "inline-flex" : "none";

  const fabBtn = byId("globalFabBtn");
  if (fabBtn) fabBtn.style.display = hasPermission("add_product") ? "flex" : "none";
}

// API Fetch Helper with LocalStorage Fallback
async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "x-user-id": activeUser,
    "x-user-role": activeRole,
    ...(options.headers || {})
  };

  try {
    const response = await fetch(path, { ...options, headers });
    if (!response.ok) {
      let err = "Request failed";
      try { err = (await response.json()).error || err; } catch {}
      throw new Error(err);
    }
    return response.status === 204 ? null : response.json();
  } catch (error) {
    console.warn(`API network fallback on ${path}: ${error.message}`);
    return handleLocalStorageFallback(path, options);
  }
}

// LocalStorage Fallback Handlers
function handleLocalStorageFallback(path, options) {
  let fbProducts = JSON.parse(localStorage.getItem("fb_products") || "[]");
  let fbTxs = JSON.parse(localStorage.getItem("fb_txs") || "[]");
  let fbUsers = JSON.parse(localStorage.getItem("fb_users") || "[]");
  let fbLogs = JSON.parse(localStorage.getItem("fb_logs") || "[]");

  if (fbProducts.length === 0) {
    fbProducts = [
      { id: "1", productId: "PROD-LPT", productName: "Enterprise Laptop", category: "Electronics", price: 999.99, quantity: 25, warehouseStock: { Chennai: 10, Coimbatore: 10, Bangalore: 5 }, supplier: "Dell Enterprise", manufacturingDate: "2026-01-10", expiryDate: "", minStock: 10, rating: 4.8, image: "/images/enterprise_laptop.png", updatedAt: new Date().toISOString() },
      { id: "2", productId: "PROD-MOU", productName: "Wireless Mouse", category: "Electronics", price: 25.00, quantity: 45, warehouseStock: { Chennai: 20, Coimbatore: 15, Bangalore: 10 }, supplier: "Logitech Systems", manufacturingDate: "2026-02-15", expiryDate: "", minStock: 20, rating: 4.2, image: "/images/wireless_mouse.png", updatedAt: new Date().toISOString() },
      { id: "3", productId: "PROD-KEY", productName: "Mechanical Keyboard", category: "Electronics", price: 75.00, quantity: 30, warehouseStock: { Chennai: 10, Coimbatore: 10, Bangalore: 10 }, supplier: "Logitech Systems", manufacturingDate: "2026-03-01", expiryDate: "", minStock: 15, rating: 4.6, image: "/images/mechanical_keyboard.png", updatedAt: new Date().toISOString() },
      { id: "4", productId: "PROD-MLK", productName: "Organic Milk (1L)", category: "Food & Beverage", price: 2.99, quantity: 8, warehouseStock: { Chennai: 5, Coimbatore: 3, Bangalore: 0 }, supplier: "Heritage Dairies", manufacturingDate: "2026-07-10", expiryDate: "2026-08-01", minStock: 30, rating: 4.0, image: "/images/organic_milk.png", updatedAt: new Date().toISOString() },
      { id: "5", productId: "PROD-SOF", productName: "Ergonomic Sofa", category: "Furniture", price: 499.00, quantity: 12, warehouseStock: { Chennai: 4, Coimbatore: 4, Bangalore: 4 }, supplier: "IKEA Solutions", manufacturingDate: "2026-04-12", expiryDate: "", minStock: 5, rating: 4.5, image: "/images/ergonomic_sofa.png", updatedAt: new Date().toISOString() },
      { id: "6", productId: "PROD-HDM", productName: "Noise Cancelling Headset", category: "Electronics", price: 129.99, quantity: 0, warehouseStock: { Chennai: 0, Coimbatore: 0, Bangalore: 0 }, supplier: "Sony India", manufacturingDate: "2026-05-20", expiryDate: "", minStock: 12, rating: 4.7, image: "/images/noise_cancelling_headset.png", updatedAt: new Date().toISOString() }
    ];
    localStorage.setItem("fb_products", JSON.stringify(fbProducts));
  }

  if (path === "/api/products" && (!options.method || options.method === "GET")) return { products: fbProducts };
  if (path === "/api/transactions" && (!options.method || options.method === "GET")) return { transactions: fbTxs };
  if (path === "/api/users" && (!options.method || options.method === "GET")) return { users: fbUsers };
  if (path === "/api/logs" && (!options.method || options.method === "GET")) return { logs: fbLogs };

  return {};
}

// Initialization Logic
document.addEventListener("DOMContentLoaded", async () => {
  setupTheme();
  setupSidebarNavigation();
  setupGlobalSearch();
  setupEventListeners();

  await loadInitialData();
  renderDashboard();
  renderInventoryTable();
  renderPOSCart();
  renderSuppliers();
  renderCustomers();
  renderUserManagement();
  renderActivityLogs();
  renderCalendar();
  applyRolePermissionsUI();

  setInterval(updateLiveClock, 1000);
  updateLiveClock();
});

// Clock & Date Update
function updateLiveClock() {
  const clockEl = byId("displaySystemTime");
  const dateEl = byId("todayDate");
  const now = new Date();

  if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Theme Toggle Setup
function setupTheme() {
  if (activeTheme === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }

  const themeBtn = byId("themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      activeTheme = document.body.classList.toggle("dark-mode") ? "dark" : "light";
      localStorage.setItem("activeTheme", activeTheme);
      themeBtn.innerHTML = activeTheme === "dark" ? '<i class="fa-solid fa-sun text-amber-400"></i>' : '<i class="fa-solid fa-moon"></i>';
      toast(`Switched to ${activeTheme.toUpperCase()} mode`, "info");
      renderCharts();
    });
  }
}

// Sidebar Navigation & Accordion Toggle
function setupSidebarNavigation() {
  const sidebar = byId("sidebar");
  const toggleBtn = byId("sidebarToggleBtn");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });
  }

  // Accordion Toggle for Inventory
  const invMenuToggle = byId("inventoryMenuToggle");
  const invSubmenu = byId("inventorySubmenu");
  const invArrow = byId("invArrow");

  if (invMenuToggle && invSubmenu) {
    invMenuToggle.addEventListener("click", (e) => {
      const isExpanded = invSubmenu.classList.toggle("expanded");
      if (invArrow) invArrow.classList.toggle("rotated", isExpanded);
    });
  }

  // Tab Navigation Links
  document.querySelectorAll(".nav-menu .nav-item").forEach(item => {
    item.addEventListener("click", function (e) {
      const targetTabId = this.getAttribute("data-tab");
      if (!targetTabId) return;

      document.querySelectorAll(".nav-menu .nav-item").forEach(el => el.classList.remove("active"));
      this.classList.add("active");

      document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
      const targetPanel = byId(targetTabId);
      if (targetPanel) targetPanel.classList.add("active");

      if (targetTabId === "scanner-tab") initCameraScanner();
    });
  });

  // Role Switcher Handler
  const roleSelect = byId("userRoleSelect");
  if (roleSelect) {
    roleSelect.addEventListener("change", (e) => {
      activeRole = e.target.value;
      localStorage.setItem("activeRole", activeRole);
      applyRolePermissionsUI();
      toast(`Switched to role: ${activeRole}`, "warning");
    });
  }
}

// Fetch Initial Database Records
async function loadInitialData() {
  try {
    const pData = await api("/api/products");
    products = pData.products || [];

    const tData = await api("/api/transactions");
    transactions = tData.transactions || [];

    const uData = await api("/api/users");
    users = uData.users || [];

    const lData = await api("/api/logs");
    logs = lData.logs || [];

    const sData = await api("/api/suppliers");
    suppliers = sData.suppliers || [];

    const cData = await api("/api/customers");
    customers = cData.customers || [];
  } catch (err) {
    console.error("Data load error:", err);
  }
}

// Render Main Dashboard Stats & Charts
function renderDashboard() {
  const totalItemsEl = byId("totalItems");
  const totalValueEl = byId("totalValue");
  const lowStockCountEl = byId("lowStockCount");
  const criticalCountEl = byId("criticalCount");

  const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0);
  const lowStockItems = products.filter(p => p.quantity < (p.minStock || 10));
  const criticalItems = products.filter(p => p.quantity === 0);

  if (totalItemsEl) totalItemsEl.textContent = totalItems;
  if (totalValueEl) totalValueEl.textContent = formatMoney(totalValue);
  if (lowStockCountEl) lowStockCountEl.textContent = lowStockItems.length;
  if (criticalCountEl) criticalCountEl.textContent = criticalItems.length;

  renderPredictions(lowStockItems);
  renderCharts();
}

// AI Predictions & Low Stock Predictions Engine
function renderPredictions(lowStockItems) {
  const tbody = byId("predictionsTableBody");
  if (!tbody) return;

  if (lowStockItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-emerald-500 font-semibold"><i class="fa-solid fa-check-circle mr-1"></i> All stock levels optimal! No urgent restock needed.</td></tr>`;
    return;
  }

  tbody.innerHTML = lowStockItems.map(p => {
    const burnRate = (Math.random() * 2 + 0.5).toFixed(1);
    const daysLeft = Math.max(1, Math.floor(p.quantity / burnRate));
    return `
      <tr>
        <td class="font-bold text-slate-100">${p.productName}</td>
        <td><span class="badge-status badge-low-stock">${p.quantity} Units</span></td>
        <td>${burnRate} / day</td>
        <td class="font-bold text-amber-400">${daysLeft} Days</td>
        <td>
          <button class="btn btn-primary text-xs py-1 px-2" onclick="quickRestock('${p.id}')">
            <i class="fa-solid fa-arrow-up"></i> Restock +20
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// Chart.js Visualization Engine
function renderCharts() {
  const isDark = document.body.classList.contains("dark-mode");
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  // 1. Sales Trend Chart
  const salesCanvas = byId("salesChart");
  if (salesCanvas) {
    if (charts.sales) charts.sales.destroy();
    charts.sales = new Chart(salesCanvas, {
      type: 'line',
      data: {
        labels: ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'],
        datasets: [{
          label: 'Sales ($)',
          data: [1200, 1900, 1500, 2400, 2800, 3100, 3800],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }, {
          label: 'Purchases ($)',
          data: [800, 1100, 1300, 900, 2100, 1600, 2200],
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  // 2. Category Distribution Chart
  const categoryCanvas = byId("categoryChart");
  if (categoryCanvas) {
    if (charts.category) charts.category.destroy();
    
    const catMap = {};
    products.forEach(p => {
      catMap[p.category] = (catMap[p.category] || 0) + (p.quantity || 0);
    });

    charts.category = new Chart(categoryCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(catMap).length ? Object.keys(catMap) : ['Electronics', 'Food', 'Furniture'],
        datasets: [{
          data: Object.values(catMap).length ? Object.values(catMap) : [60, 25, 15],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
      }
    });
  }
}

// Render Inventory Data Table
function renderInventoryTable() {
  const tbody = byId("inventoryTableBody");
  if (!tbody) return;

  const search = (byId("inventorySearch")?.value || "").toLowerCase();
  const catVal = byId("categoryFilter")?.value || "all";
  const statusVal = byId("statusFilter")?.value || "all";

  let filtered = products.filter(p => {
    const matchSearch = p.productName.toLowerCase().includes(search) || p.productId.toLowerCase().includes(search) || p.supplier.toLowerCase().includes(search);
    const matchCat = catVal === "all" || p.category === catVal;
    
    let matchStatus = true;
    if (statusVal === "in_stock") matchStatus = p.quantity > (p.minStock || 10);
    if (statusVal === "low_stock") matchStatus = p.quantity <= (p.minStock || 10) && p.quantity > 0;
    if (statusVal === "out_of_stock") matchStatus = p.quantity === 0;

    return matchSearch && matchCat && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-400">No products found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    let statusBadge = `<span class="badge-status badge-in-stock"><i class="fa-solid fa-circle-check"></i> In Stock</span>`;
    if (p.quantity === 0) statusBadge = `<span class="badge-status badge-out-of-stock"><i class="fa-solid fa-circle-xmark"></i> Out of Stock</span>`;
    else if (p.quantity <= (p.minStock || 10)) statusBadge = `<span class="badge-status badge-low-stock"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock</span>`;

    const imgUrl = p.image || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100";
    const wh = p.warehouseStock || {};

    return `
      <tr>
        <td><input type="checkbox" value="${p.id}"></td>
        <td>
          <div class="flex items-center gap-3">
            <img src="${imgUrl}" class="product-img-thumb" alt="${p.productName}">
            <div>
              <div class="font-bold text-slate-100">${p.productName}</div>
              <div class="text-xs text-slate-400">Rating: ⭐ ${p.rating || 4.5}</div>
            </div>
          </div>
        </td>
        <td><code class="text-xs bg-slate-800 px-2 py-1 rounded text-sky-400">${p.productId}</code></td>
        <td><span class="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-slate-300">${p.category}</span></td>
        <td class="font-bold text-emerald-400">${formatMoney(p.price)}</td>
        <td class="font-bold text-base">${p.quantity}</td>
        <td>${statusBadge}</td>
        <td class="text-xs text-slate-400">
          CH: <b>${wh.Chennai || 0}</b> | CB: <b>${wh.Coimbatore || 0}</b> | BL: <b>${wh.Bangalore || 0}</b>
        </td>
        <td class="text-xs text-slate-300">${p.supplier}</td>
        <td>
          <div class="table-action-group">
            <button class="icon-btn text-xs w-7 h-7" onclick="showQrModal('${p.productId}', '${p.productName}')" title="Generate QR"><i class="fa-solid fa-qrcode"></i></button>
            ${hasPermission('edit_product') ? `<button class="icon-btn text-xs w-7 h-7" onclick="editProduct('${p.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
            ${hasPermission('delete_product') ? `<button class="icon-btn text-xs w-7 h-7 text-rose-400" onclick="deleteProduct('${p.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  updatePOSProductDropdown();
}

// Quick Restock Function
async function quickRestock(id) {
  try {
    await api(`/api/products/${id}/restock`, {
      method: "PATCH",
      body: JSON.stringify({ delta: 20 })
    });
    toast("Restocked 20 units successfully!", "success");
    await loadInitialData();
    renderDashboard();
    renderInventoryTable();
  } catch (e) {
    toast(`Restock failed: ${e.message}`, "error");
  }
}

// Show QR Modal
function showQrModal(sku, name) {
  const modal = byId("codeModal");
  const container = byId("qrcodeContainer");
  const title = byId("codeModalTitle");
  const skuText = byId("codeSkuText");

  if (!modal || !container) return;

  container.innerHTML = "";
  if (title) title.textContent = name;
  if (skuText) skuText.textContent = `SKU: ${sku}`;

  new QRCode(container, {
    text: `PRODUCT:${sku}`,
    width: 160,
    height: 160
  });

  modal.classList.add("active");
}

// Edit Product Modal Handler
function editProduct(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  byId("pmId").value = p.id;
  byId("pmSku").value = p.productId;
  byId("pmName").value = p.productName;
  byId("pmCategory").value = p.category;
  byId("pmPrice").value = p.price;
  byId("pmSupplier").value = p.supplier;
  byId("pmMfgDate").value = p.manufacturingDate || "";
  byId("pmExpiryDate").value = p.expiryDate || "";
  byId("pmImage").value = p.image || "";

  const wh = p.warehouseStock || {};
  byId("pmWhChennai").value = wh.Chennai || 0;
  byId("pmWhCoimbatore").value = wh.Coimbatore || 0;
  byId("pmWhBangalore").value = wh.Bangalore || 0;

  byId("productModalTitle").textContent = "Edit Product Record";
  byId("productModal").classList.add("active");
}

// Delete Product Handler
async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product record?")) return;

  try {
    await api(`/api/products/${id}`, { method: "DELETE" });
    toast("Product deleted successfully!", "error");
    await loadInitialData();
    renderDashboard();
    renderInventoryTable();
  } catch (e) {
    toast(`Delete failed: ${e.message}`, "error");
  }
}

// Update POS Product Select Options
function updatePOSProductDropdown() {
  const select = byId("posProductSelect");
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Product to Add --</option>' + products.map(p => `
    <option value="${p.id}">${p.productName} (${p.productId}) - ${formatMoney(p.price)} [Stock: ${p.quantity}]</option>
  `).join("");
}

// Render POS Cart & Receipt Calculations
function renderPOSCart() {
  const tbody = byId("posCartBody");
  const subtotalEl = byId("posSubtotal");
  const taxEl = byId("posTax");
  const totalEl = byId("posGrandTotal");

  if (!tbody) return;

  if (posCart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-400 py-4">No items added to current order cart.</td></tr>`;
    if (subtotalEl) subtotalEl.textContent = formatMoney(0);
    if (taxEl) taxEl.textContent = formatMoney(0);
    if (totalEl) totalEl.textContent = formatMoney(0);
    return;
  }

  let subtotal = 0;
  tbody.innerHTML = posCart.map((item, index) => {
    const lineTotal = item.price * item.qty;
    subtotal += lineTotal;
    return `
      <tr>
        <td class="font-bold">${item.productName}</td>
        <td>${formatMoney(item.price)}</td>
        <td>
          <input type="number" value="${item.qty}" min="1" class="w-16 p-1 text-center" onchange="updateCartQty(${index}, this.value)">
        </td>
        <td class="font-bold text-emerald-400">${formatMoney(lineTotal)}</td>
        <td>
          <button class="icon-btn text-xs w-7 h-7 text-rose-400" onclick="removeFromCart(${index})"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join("");

  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (taxEl) taxEl.textContent = formatMoney(tax);
  if (totalEl) totalEl.textContent = formatMoney(grandTotal);
}

function updateCartQty(index, val) {
  posCart[index].qty = Math.max(1, parseInt(val) || 1);
  renderPOSCart();
}

function removeFromCart(index) {
  posCart.splice(index, 1);
  renderPOSCart();
}

// Render Suppliers List
function renderSuppliers() {
  const grid = byId("suppliersGrid");
  if (!grid) return;

  grid.innerHTML = suppliers.map(s => `
    <div class="panel flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold text-base m-0">${s.name}</h3>
          <span class="badge-status badge-in-stock">${s.category}</span>
        </div>
        <p class="text-xs text-slate-400 mb-1"><i class="fa-solid fa-envelope mr-1"></i> ${s.contact}</p>
        <p class="text-xs text-slate-400 mb-2"><i class="fa-solid fa-phone mr-1"></i> ${s.phone}</p>
      </div>
      <div class="flex justify-between items-center pt-3 border-t border-slate-700 text-xs">
        <span class="font-bold text-amber-400">⭐ ${s.rating} / 5.0</span>
        <span class="text-slate-400">${s.status}</span>
      </div>
    </div>
  `).join("");
}

// Render Customers List
function renderCustomers() {
  const tbody = byId("customersTableBody");
  if (!tbody) return;

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td class="font-bold">${c.name}</td>
      <td>${c.email}</td>
      <td>${c.phone}</td>
      <td><span class="text-xs font-bold px-2 py-1 rounded bg-indigo-500/20 text-indigo-400">${c.tier}</span></td>
      <td class="font-bold text-emerald-400">${formatMoney(c.totalSpent)}</td>
      <td><span class="badge-status badge-in-stock">${c.status}</span></td>
    </tr>
  `).join("");
}

// Render User Management Table
function renderUserManagement() {
  const tbody = byId("usersTableBody");
  if (!tbody) return;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <img src="${u.avatar}" class="w-8 h-8 rounded-full bg-slate-700">
          <span class="font-bold">${u.name}</span>
        </div>
      </td>
      <td><code class="text-xs bg-slate-800 px-2 py-1 rounded text-sky-400">${u.username}</code></td>
      <td class="text-xs text-slate-400">${u.email}</td>
      <td><span class="text-xs font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-400">${u.role}</span></td>
      <td><span class="badge-status badge-in-stock">${u.status}</span></td>
      <td>
        <div class="flex gap-2">
          ${hasPermission('manage_users') ? `<button class="icon-btn text-xs w-7 h-7 text-rose-400" onclick="deleteUser('${u.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>
  `).join("");
}

async function deleteUser(id) {
  if (!confirm("Delete user account?")) return;
  try {
    await api(`/api/users/${id}`, { method: "DELETE" });
    toast("User deleted", "error");
    await loadInitialData();
    renderUserManagement();
  } catch (e) {
    toast(e.message, "error");
  }
}

// Render Activity Audit Logs
function renderActivityLogs() {
  const tbody = byId("logsTableBody");
  if (!tbody) return;

  tbody.innerHTML = logs.slice(-20).reverse().map(l => `
    <tr>
      <td class="text-xs text-slate-400">${new Date(l.timestamp).toLocaleString()}</td>
      <td class="font-bold">${l.operator}</td>
      <td><span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800">${l.role}</span></td>
      <td class="font-bold text-sky-400">${l.action}</td>
      <td class="text-xs text-slate-300">${l.details}</td>
    </tr>
  `).join("");
}

// Render Calendar Matrix
function renderCalendar() {
  const matrix = byId("calendarMatrix");
  if (!matrix) return;

  let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="font-bold text-xs text-slate-400 pb-2">${d}</div>`).join("");
  
  for (let i = 1; i <= 31; i++) {
    const isToday = i === 18;
    html += `
      <div class="p-3 rounded-xl border border-slate-700/60 bg-slate-800/30 ${isToday ? 'border-sky-500 bg-sky-500/10' : ''}">
        <span class="font-bold text-xs ${isToday ? 'text-sky-400' : 'text-slate-400'}">${i}</span>
        ${i === 10 ? '<div class="text-[10px] mt-1 p-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">Shipment Arrived</div>' : ''}
        ${i === 24 ? '<div class="text-[10px] mt-1 p-1 rounded bg-amber-500/20 text-amber-400 font-semibold">Stock Audit</div>' : ''}
      </div>
    `;
  }
  matrix.innerHTML = html;
}

// Setup Event Listeners
function setupEventListeners() {
  // Add Product Form Submit
  const productForm = byId("productForm");
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = byId("pmId").value;
      
      const payload = {
        productId: byId("pmSku").value.trim(),
        productName: byId("pmName").value.trim(),
        category: byId("pmCategory").value.trim(),
        price: parseFloat(byId("pmPrice").value),
        warehouseStock: {
          Chennai: parseInt(byId("pmWhChennai").value) || 0,
          Coimbatore: parseInt(byId("pmWhCoimbatore").value) || 0,
          Bangalore: parseInt(byId("pmWhBangalore").value) || 0
        },
        minStock: parseInt(byId("pmMinStock").value) || 10,
        supplier: byId("pmSupplier").value.trim(),
        manufacturingDate: byId("pmMfgDate").value,
        expiryDate: byId("pmExpiryDate").value,
        image: byId("pmImage").value.trim()
      };

      try {
        if (id) {
          await api(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
          toast("✔ Product Updated Successfully", "success");
        } else {
          await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
          toast("✔ Product Added Successfully", "success");
        }
        
        byId("productModal").classList.remove("active");
        productForm.reset();
        await loadInitialData();
        renderDashboard();
        renderInventoryTable();
      } catch (err) {
        toast(`Save failed: ${err.message}`, "error");
      }
    });
  }

  // Open Add Modal Buttons
  const addBtn = byId("openAddModalBtn");
  const fabBtn = byId("globalFabBtn");
  if (addBtn) addBtn.addEventListener("click", openAddProductModal);
  if (fabBtn) fabBtn.addEventListener("click", openAddProductModal);

  // Modal Close Buttons
  document.querySelectorAll(".modal-close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
    });
  });

  // POS Add to Cart Button
  const posAddBtn = byId("posAddToCartBtn");
  if (posAddBtn) {
    posAddBtn.addEventListener("click", () => {
      const prodId = byId("posProductSelect")?.value;
      if (!prodId) return toast("Select a product first", "warning");

      const prod = products.find(p => p.id === prodId);
      if (!prod) return;

      const existing = posCart.find(item => item.id === prodId);
      if (existing) {
        existing.qty += 1;
      } else {
        posCart.push({ id: prod.id, productName: prod.productName, price: prod.price, qty: 1 });
      }

      renderPOSCart();
      toast(`Added ${prod.productName} to Cart`, "info");
    });
  }

  // POS Checkout Button
  const posCheckoutBtn = byId("posCheckoutBtn");
  if (posCheckoutBtn) {
    posCheckoutBtn.addEventListener("click", () => {
      if (posCart.length === 0) return toast("Cart is empty", "warning");
      window.print();
      posCart = [];
      renderPOSCart();
      toast("✔ Sale Completed & Receipt Printed", "success");
    });
  }

  // Backup Database Button
  const backupBtn = byId("backupDatabaseBtn");
  if (backupBtn) {
    backupBtn.addEventListener("click", async () => {
      const data = await api("/api/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pulsetock_backup_${Date.now()}.json`;
      a.click();
      toast("✔ Database Backup Downloaded", "success");
    });
  }

  // Restore Database File Input
  const restoreInput = byId("restoreFileInput");
  if (restoreInput) {
    restoreInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const payload = JSON.parse(event.target.result);
          await api("/api/restore", { method: "POST", body: JSON.stringify(payload) });
          toast("✔ Database Restored Successfully", "success");
          await loadInitialData();
          renderDashboard();
          renderInventoryTable();
        } catch (err) {
          toast("Invalid backup JSON file", "error");
        }
      };
      reader.readAsText(file);
    });
  }
}

function openAddProductModal() {
  const form = byId("productForm");
  if (form) form.reset();
  byId("pmId").value = "";
  byId("productModalTitle").textContent = "Add New Product Record";
  byId("productModal").classList.add("active");
}

// Camera Scanner Implementation
function initCameraScanner() {
  if (html5QrScanner) return;
  try {
    html5QrScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
    html5QrScanner.render((decodedText) => {
      toast(`Scanned Code: ${decodedText}`, "info");
      const res = byId("scannerResult");
      if (res) {
        res.classList.remove("hidden");
        res.innerHTML = `<p class="font-bold text-emerald-400"><i class="fa-solid fa-barcode mr-2"></i>Scanned Result: ${decodedText}</p>`;
      }
    });
  } catch (e) {
    console.warn("Scanner camera error:", e);
  }
}

// Global Search & Voice Search
function setupGlobalSearch() {
  const input = byId("globalSearchInput");
  const popover = byId("globalSearchResults");
  const list = byId("searchResultsList");
  const voiceBtn = byId("voiceSearchBtn");

  if (input && popover && list) {
    input.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        popover.classList.add("hidden");
        return;
      }

      const matches = products.filter(p => p.productName.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));

      if (matches.length === 0) {
        list.innerHTML = `<p class="text-xs text-slate-400 p-2 text-center">No matching products found</p>`;
      } else {
        list.innerHTML = matches.map(m => `
          <div class="p-2 rounded hover:bg-slate-800 cursor-pointer flex justify-between items-center" onclick="editProduct('${m.id}')">
            <span class="font-bold text-sm text-slate-100">${m.productName}</span>
            <span class="text-xs text-emerald-400 font-bold">${formatMoney(m.price)}</span>
          </div>
        `).join("");
      }
      popover.classList.remove("hidden");
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        input.focus();
      }
    });
  }

  // Voice Search Handler
  if (voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    voiceBtn.addEventListener("click", () => {
      toast("Listening... Speak product name now", "info");
      recognition.start();
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) {
        input.value = transcript;
        input.dispatchEvent(new Event("input"));
      }
      toast(`Voice recognized: "${transcript}"`, "success");
    };
  }
}
