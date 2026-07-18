const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

// Native environment variables loader for zero-dependency structure
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
}
loadEnv();

const PORT = process.env.PORT || 5500;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");
const NOTIFICATION_FILE = path.join(DATA_DIR, "notifications.json");
const LOGS_FILE = path.join(DATA_DIR, "activity_logs.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SUPPLIERS_FILE = path.join(DATA_DIR, "suppliers.json");
const CUSTOMERS_FILE = path.join(DATA_DIR, "customers.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

let revision = Date.now();
const streamClients = new Set();

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  if (!fs.existsSync(NOTIFICATION_FILE)) fs.writeFileSync(NOTIFICATION_FILE, JSON.stringify([], null, 2), "utf8");
  if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), "utf8");
  if (!fs.existsSync(TRANSACTIONS_FILE)) fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([], null, 2), "utf8");
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf8");
  if (!fs.existsSync(SUPPLIERS_FILE)) fs.writeFileSync(SUPPLIERS_FILE, JSON.stringify([], null, 2), "utf8");
  if (!fs.existsSync(CUSTOMERS_FILE)) fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify([], null, 2), "utf8");
}

function readUsers() {
  ensureDataFile();
  const raw = fs.readFileSync(USERS_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function readSuppliers() {
  ensureDataFile();
  const raw = fs.readFileSync(SUPPLIERS_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeSuppliers(suppliers) {
  fs.writeFileSync(SUPPLIERS_FILE, JSON.stringify(suppliers, null, 2), "utf8");
}

function readCustomers() {
  ensureDataFile();
  const raw = fs.readFileSync(CUSTOMERS_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeCustomers(customers) {
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), "utf8");
}

function readProducts() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), "utf8");
}

function readNotifications() {
  ensureDataFile();
  const raw = fs.readFileSync(NOTIFICATION_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeNotifications(notifications) {
  fs.writeFileSync(NOTIFICATION_FILE, JSON.stringify(notifications, null, 2), "utf8");
}

function readLogs() {
  ensureDataFile();
  const raw = fs.readFileSync(LOGS_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), "utf8");
}

function readTransactions() {
  ensureDataFile();
  const raw = fs.readFileSync(TRANSACTIONS_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeTransactions(txs) {
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txs, null, 2), "utf8");
}

function logActivity(operator, role, action, details) {
  const logs = readLogs();
  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    operator: operator || "system",
    role: role || "System",
    action,
    details
  };
  logs.push(entry);
  writeLogs(logs.slice(-500)); // Keep last 500 logs
  emitStreamEvent("log_created", { logId: entry.id });
}

function seedData() {
  ensureDataFile();
  const products = readProducts();
  if (products.length === 0) {
    const seedProducts = [
      {
        id: randomUUID(),
        productId: "PROD-LPT",
        productName: "Enterprise Laptop",
        category: "Electronics",
        price: 999.99,
        quantity: 25,
        warehouseStock: { Chennai: 10, Coimbatore: 10, Bangalore: 5 },
        supplier: "Dell Enterprise",
        manufacturingDate: "2026-01-10",
        expiryDate: "",
        minStock: 10,
        rating: 4.8,
        image: "/images/enterprise_laptop.png",
        updatedAt: new Date().toISOString()
      },
      {
        id: randomUUID(),
        productId: "PROD-MOU",
        productName: "Wireless Mouse",
        category: "Electronics",
        price: 25.00,
        quantity: 45,
        warehouseStock: { Chennai: 20, Coimbatore: 15, Bangalore: 10 },
        supplier: "Logitech Systems",
        manufacturingDate: "2026-02-15",
        expiryDate: "",
        minStock: 20,
        rating: 4.2,
        image: "/images/wireless_mouse.png",
        updatedAt: new Date().toISOString()
      },
      {
        id: randomUUID(),
        productId: "PROD-KEY",
        productName: "Mechanical Keyboard",
        category: "Electronics",
        price: 75.00,
        quantity: 30,
        warehouseStock: { Chennai: 10, Coimbatore: 10, Bangalore: 10 },
        supplier: "Logitech Systems",
        manufacturingDate: "2026-03-01",
        expiryDate: "",
        minStock: 15,
        rating: 4.6,
        image: "/images/mechanical_keyboard.png",
        updatedAt: new Date().toISOString()
      },
      {
        id: randomUUID(),
        productId: "PROD-MLK",
        productName: "Organic Milk (1L)",
        category: "Food & Beverage",
        price: 2.99,
        quantity: 8,
        warehouseStock: { Chennai: 5, Coimbatore: 3, Bangalore: 0 },
        supplier: "Heritage Dairies",
        manufacturingDate: "2026-07-10",
        expiryDate: "2026-08-01",
        minStock: 30,
        rating: 4.0,
        image: "/images/organic_milk.png",
        updatedAt: new Date().toISOString()
      },
      {
        id: randomUUID(),
        productId: "PROD-SOF",
        productName: "Ergonomic Sofa",
        category: "Furniture",
        price: 499.00,
        quantity: 12,
        warehouseStock: { Chennai: 4, Coimbatore: 4, Bangalore: 4 },
        supplier: "IKEA Solutions",
        manufacturingDate: "2026-04-12",
        expiryDate: "",
        minStock: 5,
        rating: 4.5,
        image: "/images/ergonomic_sofa.png",
        updatedAt: new Date().toISOString()
      },
      {
        id: randomUUID(),
        productId: "PROD-HDM",
        productName: "Noise Cancelling Headset",
        category: "Electronics",
        price: 129.99,
        quantity: 0,
        warehouseStock: { Chennai: 0, Coimbatore: 0, Bangalore: 0 },
        supplier: "Sony India",
        manufacturingDate: "2026-05-20",
        expiryDate: "",
        minStock: 12,
        rating: 4.7,
        image: "/images/noise_cancelling_headset.png",
        updatedAt: new Date().toISOString()
      }
    ];
    writeProducts(seedProducts);
  }

  const txs = readTransactions();
  if (txs.length === 0) {
    const seedTransactions = [];
    const prodList = readProducts();
    const now = new Date();
    
    // Generate simulated daily transactions for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const txDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      prodList.forEach((product) => {
        // Daily random sales probability
        if (Math.random() > 0.4) {
          const qtySold = Math.floor(Math.random() * 3) + 1;
          seedTransactions.push({
            id: randomUUID(),
            productId: product.productId,
            productName: product.productName,
            type: "sale",
            quantity: qtySold,
            price: product.price,
            fromWarehouse: ["Chennai", "Coimbatore", "Bangalore"][Math.floor(Math.random() * 3)],
            toWarehouse: null,
            timestamp: txDate.toISOString()
          });
        }
        
        // Random restocking purchase
        if (Math.random() > 0.85) {
          const qtyBought = Math.floor(Math.random() * 15) + 5;
          seedTransactions.push({
            id: randomUUID(),
            productId: product.productId,
            productName: product.productName,
            type: "purchase",
            quantity: qtyBought,
            price: Number((product.price * 0.75).toFixed(2)),
            fromWarehouse: null,
            toWarehouse: ["Chennai", "Coimbatore", "Bangalore"][Math.floor(Math.random() * 3)],
            timestamp: txDate.toISOString()
          });
        }
      });
    }
    writeTransactions(seedTransactions);
  }

  const logs = readLogs();
  if (logs.length === 0) {
    const seedLogs = [
      {
        id: randomUUID(),
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        operator: "local-admin",
        role: "Admin",
        action: "Database Initialized",
        details: "System started and seed database loaded successfully."
      },
      {
        id: randomUUID(),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        operator: "local-admin",
        role: "Admin",
        action: "Stock Sync",
        details: "Synced stock levels across Chennai, Coimbatore, and Bangalore warehouses."
      }
    ];
    writeLogs(seedLogs);
  }

  const users = readUsers();
  if (users.length === 0) {
    const seedUsers = [
      { id: "u-1", username: "local-admin", name: "Super Administrator", role: "Super Admin", email: "admin@pulsetock.com", status: "Active", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=local-admin", createdAt: new Date().toISOString() },
      { id: "u-2", username: "mgr-alex", name: "Alex Rivera", role: "Inventory Manager", email: "alex.mgr@pulsetock.com", status: "Active", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=mgr-alex", createdAt: new Date().toISOString() },
      { id: "u-3", username: "sales-sarah", name: "Sarah Jenkins", role: "Sales Executive", email: "sarah.sales@pulsetock.com", status: "Active", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sales-sarah", createdAt: new Date().toISOString() },
      { id: "u-4", username: "wh-david", name: "David Chen", role: "Warehouse Staff", email: "david.wh@pulsetock.com", status: "Active", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=wh-david", createdAt: new Date().toISOString() },
      { id: "u-5", username: "cust-john", name: "John Doe", role: "Customer", email: "john.doe@client.com", status: "Active", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cust-john", createdAt: new Date().toISOString() }
    ];
    writeUsers(seedUsers);
  }

  const suppliers = readSuppliers();
  if (suppliers.length === 0) {
    const seedSuppliers = [
      { id: "sup-1", name: "Dell Enterprise", contact: "contact@dell.com", phone: "+1 800-456-3355", category: "Electronics", rating: 4.9, status: "Active" },
      { id: "sup-2", name: "Logitech Systems", contact: "b2b@logitech.com", phone: "+1 800-231-7717", category: "Electronics", rating: 4.7, status: "Active" },
      { id: "sup-3", name: "Heritage Dairies", contact: "supply@heritagedairy.com", phone: "+91 44-2450-9999", category: "Food & Beverage", rating: 4.5, status: "Active" },
      { id: "sup-4", name: "IKEA Solutions", contact: "business@ikea.com", phone: "+1 888-888-4532", category: "Furniture", rating: 4.8, status: "Active" },
      { id: "sup-5", name: "Sony India", contact: "sales@sony.co.in", phone: "+91 1800-103-7799", category: "Electronics", rating: 4.6, status: "Active" }
    ];
    writeSuppliers(seedSuppliers);
  }

  const customers = readCustomers();
  if (customers.length === 0) {
    const seedCustomers = [
      { id: "c-1", name: "Acme Corp", email: "orders@acmecorp.com", phone: "+1 555-019-2834", tier: "VIP", totalSpent: 14500.00, status: "Active" },
      { id: "c-2", name: "TechNova Inc", email: "procurement@technova.io", phone: "+1 555-018-9981", tier: "VIP", totalSpent: 28900.00, status: "Active" },
      { id: "c-3", name: "Global Logistics", email: "info@globallogistics.com", phone: "+1 555-014-7721", tier: "Regular", totalSpent: 4200.00, status: "Active" },
      { id: "c-4", name: "Apex Design Studio", email: "hello@apexdesign.co", phone: "+1 555-012-3345", tier: "New", totalSpent: 850.00, status: "Active" }
    ];
    writeCustomers(seedCustomers);
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendCsv(res, filename, csvText) {
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`
  });
  res.end(csvText);
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // Increase body size limit to 5MB to handle Base64 image uploads
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeParseJson(raw) {
  try { return { value: JSON.parse(raw || "{}"), error: null }; }
  catch (_error) { return { value: null, error: "Invalid JSON payload" }; }
}

function validateProductInput(payload) {
  const required = ["productId", "productName", "category", "price", "manufacturingDate", "supplier"];
  for (const key of required) {
    if (payload[key] === undefined || payload[key] === null || String(payload[key]).trim() === "") return `${key} is required`;
  }
  if (Number(payload.price) <= 0) return "price must be greater than zero";
  
  if (payload.warehouseStock) {
    if (typeof payload.warehouseStock !== "object") return "warehouseStock must be an object";
    for (const wh in payload.warehouseStock) {
      const q = payload.warehouseStock[wh];
      if (!Number.isInteger(Number(q)) || Number(q) < 0) return `Stock for warehouse ${wh} must be a non-negative integer`;
    }
  } else {
    if (payload.quantity === undefined || payload.quantity === null) return "quantity or warehouseStock is required";
    if (!Number.isInteger(Number(payload.quantity)) || Number(payload.quantity) < 0) return "quantity must be a non-negative integer";
  }
  return null;
}

function computeAlerts(products) {
  const lowStockItems = products.filter((p) => p.quantity < (p.minStock ?? 10));
  const outOfStockItems = products.filter((p) => p.quantity === 0);
  
  const now = new Date();
  const nearExpiryItems = products.filter((p) => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    const diff = exp - now;
    return diff <= 30 * 24 * 60 * 60 * 1000; // Expired or expiring within 30 days
  });

  return {
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    nearExpiryCount: nearExpiryItems.length,
    lowStockItems: lowStockItems.map((item) => ({ 
      id: item.id, 
      productId: item.productId, 
      productName: item.productName, 
      quantity: item.quantity, 
      minStock: item.minStock ?? 10,
      supplier: item.supplier 
    })),
    nearExpiryItems: nearExpiryItems.map((item) => ({ 
      id: item.id, 
      productId: item.productId, 
      productName: item.productName, 
      expiryDate: item.expiryDate, 
      supplier: item.supplier 
    }))
  };
}

function emitStreamEvent(type, details = {}) {
  revision = Date.now();
  const payload = JSON.stringify({ type, revision, timestamp: new Date().toISOString(), ...details });
  for (const client of streamClients) {
    client.write(`event: ${type}\n`);
    client.write(`data: ${payload}\n\n`);
  }
}

function registerStreamClient(req, res) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.write(": connected\n\n");
  streamClients.add(res);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 20000);
  req.on("close", () => { clearInterval(heartbeat); streamClients.delete(res); });
}

function toCsv(products) {
  const headers = ["id", "productId", "productName", "category", "price", "quantity", "Chennai_Stock", "Coimbatore_Stock", "Bangalore_Stock", "minStock", "expiryDate", "supplier", "manufacturingDate", "rating", "updatedAt"];
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = products.map((item) => {
    const wh = item.warehouseStock || {};
    return [
      item.id,
      item.productId,
      item.productName,
      item.category,
      item.price,
      item.quantity,
      wh.Chennai ?? 0,
      wh.Coimbatore ?? 0,
      wh.Bangalore ?? 0,
      item.minStock ?? 10,
      item.expiryDate ?? "",
      item.supplier,
      item.manufacturingDate,
      item.rating ?? 5,
      item.updatedAt
    ].map(escape).join(",");
  });
  return `${headers.join(",")}\n${rows.join("\n")}`;
}

async function dispatchNotification(channel, payload) {
  const hook = channel === "email" ? process.env.EMAIL_WEBHOOK_URL : process.env.SMS_WEBHOOK_URL;
  if (!hook) return { delivered: false, mode: "log-only", message: "Webhook not configured" };
  try {
    const response = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return { delivered: false, mode: "webhook", message: `Webhook failed: ${response.status}` };
    return { delivered: true, mode: "webhook", message: "Delivered to webhook" };
  } catch (error) {
    return { delivered: false, mode: "webhook", message: error.message };
  }
}

function serveStatic(req, res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);
  if (!filePath.startsWith(ROOT_DIR)) return sendJson(res, 403, { error: "Forbidden" });
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${PORT}`;
    const url = new URL(req.url, `http://${host}`);
    const pathname = url.pathname;

    const operator = req.headers["x-user-id"] || "local-admin";
    const role = req.headers["x-user-role"] || "Admin";

    if (pathname === "/api/health" && req.method === "GET") return sendJson(res, 200, { status: "ok", revision, activeStreamClients: streamClients.size, date: new Date().toISOString() });
    if (pathname === "/api/stream" && req.method === "GET") return registerStreamClient(req, res);
    if (pathname === "/api/products/export.csv" && req.method === "GET") return sendCsv(res, "inventory_export.csv", toCsv(readProducts()));
    if (pathname === "/api/alerts" && req.method === "GET") return sendJson(res, 200, computeAlerts(readProducts()));
    if (pathname === "/api/notifications" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") || 20);
      const notifications = readNotifications().slice(-Math.max(1, Math.min(limit, 100))).reverse();
      return sendJson(res, 200, { notifications });
    }

    // Users Management API
    if (pathname === "/api/users" && req.method === "GET") {
      return sendJson(res, 200, { users: readUsers() });
    }
    if (pathname === "/api/users" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      if (!payload.username || !payload.name || !payload.role) {
        return sendJson(res, 400, { error: "username, name, and role are required" });
      }
      const users = readUsers();
      if (users.find(u => u.username === payload.username)) {
        return sendJson(res, 409, { error: "Username already exists" });
      }
      const newUser = {
        id: randomUUID(),
        username: String(payload.username).trim(),
        name: String(payload.name).trim(),
        role: String(payload.role).trim(),
        email: payload.email ? String(payload.email).trim() : "",
        status: payload.status || "Active",
        avatar: payload.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${payload.username}`,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      writeUsers(users);
      logActivity(operator, role, "Add User", `Created user account for ${newUser.name} (${newUser.username}) as ${newUser.role}`);
      emitStreamEvent("user_created", { userId: newUser.id });
      return sendJson(res, 201, { user: newUser });
    }
    if (pathname.startsWith("/api/users/")) {
      const id = decodeURIComponent(pathname.replace("/api/users/", ""));
      const users = readUsers();
      const uIndex = users.findIndex(u => u.id === id);
      
      if (req.method === "DELETE") {
        if (uIndex === -1) return sendJson(res, 404, { error: "User not found" });
        const removed = users.splice(uIndex, 1)[0];
        writeUsers(users);
        logActivity(operator, role, "Delete User", `Deleted user account ${removed.username}`);
        emitStreamEvent("user_deleted", { userId: id });
        return sendJson(res, 200, { success: true });
      }
      if (req.method === "PUT") {
        if (uIndex === -1) return sendJson(res, 404, { error: "User not found" });
        const raw = await getRequestBody(req);
        const { value: payload, error } = safeParseJson(raw);
        if (error) return sendJson(res, 400, { error });
        
        users[uIndex] = {
          ...users[uIndex],
          name: payload.name ? String(payload.name).trim() : users[uIndex].name,
          role: payload.role ? String(payload.role).trim() : users[uIndex].role,
          email: payload.email !== undefined ? String(payload.email).trim() : users[uIndex].email,
          status: payload.status || users[uIndex].status,
          updatedAt: new Date().toISOString()
        };
        writeUsers(users);
        logActivity(operator, role, "Update User", `Updated user details for ${users[uIndex].username}`);
        emitStreamEvent("user_updated", { userId: id });
        return sendJson(res, 200, { user: users[uIndex] });
      }
    }

    // Suppliers & Customers API
    if (pathname === "/api/suppliers" && req.method === "GET") {
      return sendJson(res, 200, { suppliers: readSuppliers() });
    }
    if (pathname === "/api/suppliers" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      const suppliers = readSuppliers();
      const newSup = {
        id: randomUUID(),
        name: String(payload.name).trim(),
        contact: String(payload.contact || "").trim(),
        phone: String(payload.phone || "").trim(),
        category: String(payload.category || "General").trim(),
        rating: Number(payload.rating || 4.5),
        status: payload.status || "Active"
      };
      suppliers.push(newSup);
      writeSuppliers(suppliers);
      logActivity(operator, role, "Add Supplier", `Created supplier ${newSup.name}`);
      return sendJson(res, 201, { supplier: newSup });
    }
    if (pathname === "/api/customers" && req.method === "GET") {
      return sendJson(res, 200, { customers: readCustomers() });
    }

    // Backup & Restore API
    if (pathname === "/api/backup" && req.method === "GET") {
      const backupData = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        products: readProducts(),
        transactions: readTransactions(),
        logs: readLogs(),
        notifications: readNotifications(),
        users: readUsers(),
        suppliers: readSuppliers(),
        customers: readCustomers()
      };
      return sendJson(res, 200, backupData);
    }
    if (pathname === "/api/restore" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      if (payload.products) writeProducts(payload.products);
      if (payload.transactions) writeTransactions(payload.transactions);
      if (payload.logs) writeLogs(payload.logs);
      if (payload.notifications) writeNotifications(payload.notifications);
      if (payload.users) writeUsers(payload.users);
      if (payload.suppliers) writeSuppliers(payload.suppliers);
      if (payload.customers) writeCustomers(payload.customers);
      logActivity(operator, role, "System Restore", "Restored system database from JSON backup.");
      emitStreamEvent("database_restored", {});
      return sendJson(res, 200, { success: true, message: "Database restored successfully" });
    }
    
    // Custom Activity Logs endpoints
    if (pathname === "/api/logs" && req.method === "GET") {
      return sendJson(res, 200, { logs: readLogs() });
    }
    if (pathname === "/api/logs" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      const { action, details } = payload;
      if (!action || !details) return sendJson(res, 400, { error: "action and details are required" });
      logActivity(operator, role, action, details);
      return sendJson(res, 201, { success: true });
    }

    // Custom Chat Assistant endpoint
    if (pathname === "/api/chat/assistant" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      
      const userMessage = payload?.message || "";
      if (!userMessage.trim()) {
        return sendJson(res, 400, { error: "message is required" });
      }

      const productsList = readProducts();
      const transactionsList = readTransactions();
      const logsList = readLogs();

      // System prompt with full live database state context
      const systemPrompt = `You are PulseStock AI, an expert enterprise inventory intelligence assistant.
You have access to the current live inventory database:

PRODUCTS LIST:
${productsList.map(p => `- SKU: ${p.productId}, Name: ${p.productName}, Category: ${p.category}, Price: $${p.price}, Qty: ${p.quantity} (Chennai: ${p.warehouseStock?.Chennai ?? 0}, Coimbatore: ${p.warehouseStock?.Coimbatore ?? 0}, Bangalore: ${p.warehouseStock?.Bangalore ?? 0}), Min Alert Threshold: ${p.minStock ?? 10}, Expiry Date: ${p.expiryDate || "N/A"}, Average Rating: ${p.rating ?? 5} stars`).join("\n")}

RECENT TRANSACTIONS LOGS (LAST 10):
${transactionsList.slice(-10).map(t => `- [${t.timestamp}] ${t.type.toUpperCase()}: ${t.quantity} units of ${t.productName} (${t.productId}) at $${t.price} (From: ${t.fromWarehouse || "N/A"}, To: ${t.toWarehouse || "N/A"})`).join("\n")}

LATEST SYSTEM ACTIVITY TRAIL (LAST 10):
${logsList.slice(-10).map(l => `- [${l.timestamp}] ${l.operator} (${l.role}): ${l.action} - ${l.details}`).join("\n")}

Rules:
1. Base your answers strictly on the live data provided above.
2. Be brief, clear, and professional.
3. If the user asks you to perform an action (like restock, transfer, or delete), explain that they can perform this action using the dashboard panels (e.g. Transactions Hub, Inventory Table, Quick Stock Operation), and describe how.
4. Format your responses in markdown (bolding key numbers, list items).`;

      // API Key Configs
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
      const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

      let responseText = "";
      let success = false;

      // Method 1: Try OpenAI GPT-4o-mini
      if (OPENAI_API_KEY && !success) {
        try {
          console.log("AI Assistant: Attempting OpenAI API call...");
          const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
              ],
              max_tokens: 400
            })
          });
          
          if (openAiResponse.ok) {
            const data = await openAiResponse.json();
            responseText = data.choices?.[0]?.message?.content || "";
            if (responseText) {
              success = true;
              console.log("AI Assistant: OpenAI call succeeded.");
            }
          } else {
            console.warn(`AI Assistant: OpenAI API failed with status ${openAiResponse.status}`);
          }
        } catch (e) {
          console.error("AI Assistant: OpenAI API error:", e.message);
        }
      }

      // Method 2: Try Groq API Llama 3.1
      if (GROQ_API_KEY && !success) {
        try {
          console.log("AI Assistant: Attempting Groq API call...");
          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
              ],
              max_tokens: 400
            })
          });
          
          if (groqResponse.ok) {
            const data = await groqResponse.json();
            responseText = data.choices?.[0]?.message?.content || "";
            if (responseText) {
              success = true;
              console.log("AI Assistant: Groq call succeeded.");
            }
          } else {
            console.warn(`AI Assistant: Groq API failed with status ${groqResponse.status}`);
          }
        } catch (e) {
          console.error("AI Assistant: Groq API error:", e.message);
        }
      }

      // Method 3: Try Gemini API
      if (GEMINI_API_KEY && !success) {
        try {
          console.log("AI Assistant: Attempting Gemini API call...");
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemPrompt}\n\nUser Question: ${userMessage}`
                }]
              }]
            })
          });

          if (geminiResponse.ok) {
            const data = await geminiResponse.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (responseText) {
              success = true;
              console.log("AI Assistant: Gemini call succeeded.");
            }
          } else {
            console.warn(`AI Assistant: Gemini API failed with status ${geminiResponse.status}`);
          }
        } catch (e) {
          console.error("AI Assistant: Gemini API error:", e.message);
        }
      }

      // Fallback: If all API calls fail or keys are invalid, return a friendly message using rule-based fallback
      if (!success) {
        console.warn("AI Assistant: All LLM APIs failed or were not configured. Falling back to local rule-based responses.");
        return sendJson(res, 200, { response: "", fallback: true });
      }

      return sendJson(res, 200, { response: responseText, fallback: false });
    }

    // Custom Transaction endpoints
    if (pathname === "/api/transactions" && req.method === "GET") {
      return sendJson(res, 200, { transactions: readTransactions() });
    }
    if (pathname === "/api/transactions" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });

      const { productId, type, quantity, price, fromWarehouse, toWarehouse } = payload;
      if (!productId || !type || !quantity || quantity <= 0) {
        return sendJson(res, 400, { error: "productId, type, and positive quantity are required" });
      }
      if (!["sale", "purchase", "transfer"].includes(type)) {
        return sendJson(res, 400, { error: "type must be sale, purchase, or transfer" });
      }

      const products = readProducts();
      const pIndex = products.findIndex((p) => p.id === productId || p.productId === productId);
      if (pIndex === -1) return sendJson(res, 404, { error: "Product not found" });

      const product = products[pIndex];
      if (!product.warehouseStock) {
        product.warehouseStock = { Chennai: product.quantity, Coimbatore: 0, Bangalore: 0 };
      }

      if (type === "sale") {
        if (!fromWarehouse) return sendJson(res, 400, { error: "fromWarehouse is required for sales" });
        const currentStock = product.warehouseStock[fromWarehouse] ?? 0;
        if (currentStock < quantity) {
          return sendJson(res, 400, { error: `Insufficient stock in ${fromWarehouse}. Available: ${currentStock}` });
        }
        product.warehouseStock[fromWarehouse] -= quantity;
        logActivity(operator, role, "Stock Sale", `Sold ${quantity} units of ${product.productName} from ${fromWarehouse}`);
      } else if (type === "purchase") {
        if (!toWarehouse) return sendJson(res, 400, { error: "toWarehouse is required for purchases" });
        product.warehouseStock[toWarehouse] = (product.warehouseStock[toWarehouse] ?? 0) + quantity;
        logActivity(operator, role, "Stock Purchase", `Purchased ${quantity} units of ${product.productName} into ${toWarehouse}`);
      } else if (type === "transfer") {
        if (!fromWarehouse || !toWarehouse) {
          return sendJson(res, 400, { error: "fromWarehouse and toWarehouse are required for transfers" });
        }
        if (fromWarehouse === toWarehouse) {
          return sendJson(res, 400, { error: "Source and destination warehouses must be different" });
        }
        const currentStock = product.warehouseStock[fromWarehouse] ?? 0;
        if (currentStock < quantity) {
          return sendJson(res, 400, { error: `Insufficient stock in ${fromWarehouse}. Available: ${currentStock}` });
        }
        product.warehouseStock[fromWarehouse] -= quantity;
        product.warehouseStock[toWarehouse] = (product.warehouseStock[toWarehouse] ?? 0) + quantity;
        logActivity(operator, role, "Stock Transfer", `Transferred ${quantity} units of ${product.productName} from ${fromWarehouse} to ${toWarehouse}`);
      }

      product.quantity = Object.values(product.warehouseStock).reduce((a, b) => a + b, 0);
      product.updatedAt = new Date().toISOString();
      writeProducts(products);

      const txs = readTransactions();
      const newTx = {
        id: randomUUID(),
        productId: product.productId,
        productName: product.productName,
        type,
        quantity,
        price: price ?? product.price,
        fromWarehouse: fromWarehouse || null,
        toWarehouse: toWarehouse || null,
        timestamp: new Date().toISOString()
      };
      txs.push(newTx);
      writeTransactions(txs);

      emitStreamEvent("transaction_created", { transactionId: newTx.id });
      emitStreamEvent("product_updated", { productId: product.id });
      return sendJson(res, 200, { product, transaction: newTx });
    }

    if (pathname === "/api/alerts/notify" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      const channel = String(payload?.channel || "").toLowerCase();
      const recipient = String(payload?.recipient || "").trim();
      const message = String(payload?.message || "").trim();
      if (!["email", "sms"].includes(channel)) return sendJson(res, 400, { error: "channel must be email or sms" });
      if (!recipient || !message) return sendJson(res, 400, { error: "recipient and message are required" });

      const dispatch = await dispatchNotification(channel, {
        subject: payload?.subject || "Inventory Alert",
        recipient,
        message
      });
      const item = {
        id: randomUUID(),
        channel,
        recipient,
        subject: payload?.subject || "Inventory Alert",
        message,
        delivered: dispatch.delivered,
        mode: dispatch.mode,
        resultMessage: dispatch.message,
        createdAt: new Date().toISOString()
      };
      const history = readNotifications();
      history.push(item);
      writeNotifications(history);
      logActivity(operator, role, "Send Notification", `Dispatched ${channel.toUpperCase()} alert to ${recipient}`);
      emitStreamEvent("notification_sent", { notificationId: item.id, channel });
      return sendJson(res, 201, { notification: item });
    }

    if (pathname === "/api/products" && req.method === "GET") {
      return sendJson(res, 200, { products: readProducts(), revision });
    }

    if (pathname === "/api/products" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      
      const validationError = validateProductInput(payload);
      if (validationError) return sendJson(res, 400, { error: validationError });
      
      const products = readProducts();
      if (products.find((p) => p.productId === payload.productId)) return sendJson(res, 409, { error: "productId already exists" });

      let warehouseStock = payload.warehouseStock || { Chennai: Number(payload.quantity || 0), Coimbatore: 0, Bangalore: 0 };
      let quantity = Object.values(warehouseStock).reduce((a, b) => a + b, 0);

      const newItem = { 
        id: randomUUID(), 
        productId: String(payload.productId), 
        productName: String(payload.productName), 
        category: String(payload.category), 
        price: Number(payload.price), 
        quantity: quantity,
        warehouseStock: warehouseStock,
        supplier: String(payload.supplier), 
        manufacturingDate: String(payload.manufacturingDate), 
        expiryDate: payload.expiryDate ? String(payload.expiryDate) : "",
        minStock: payload.minStock !== undefined ? Number(payload.minStock) : 10,
        rating: payload.rating !== undefined ? Number(payload.rating) : 5,
        image: payload.image ? String(payload.image) : "",
        updatedAt: new Date().toISOString() 
      };
      
      products.push(newItem);
      writeProducts(products);
      
      logActivity(operator, role, "Add Product", `Created product ${newItem.productName} (${newItem.productId})`);
      emitStreamEvent("product_created", { productId: newItem.id });

      // Record a transaction for the initial stock if quantity > 0
      if (quantity > 0) {
        const txs = readTransactions();
        for (const wh in warehouseStock) {
          const whQty = warehouseStock[wh];
          if (whQty > 0) {
            txs.push({
              id: randomUUID(),
              productId: newItem.productId,
              productName: newItem.productName,
              type: "purchase",
              quantity: whQty,
              price: newItem.price,
              fromWarehouse: null,
              toWarehouse: wh,
              timestamp: new Date().toISOString()
            });
          }
        }
        writeTransactions(txs);
      }

      return sendJson(res, 201, { product: newItem });
    }

    if (pathname.startsWith("/api/products/") && pathname.endsWith("/restock") && req.method === "PATCH") {
      const id = decodeURIComponent(pathname.replace("/api/products/", "").replace("/restock", ""));
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      
      const delta = Number(payload?.delta ?? 1);
      if (!Number.isInteger(delta) || delta <= 0) return sendJson(res, 400, { error: "delta must be a positive integer" });
      
      const products = readProducts();
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) return sendJson(res, 404, { error: "product not found" });
      
      const product = products[index];
      if (!product.warehouseStock) {
        product.warehouseStock = { Chennai: product.quantity, Coimbatore: 0, Bangalore: 0 };
      }
      
      product.warehouseStock.Chennai = (product.warehouseStock.Chennai ?? 0) + delta;
      product.quantity = Object.values(product.warehouseStock).reduce((a, b) => a + b, 0);
      product.updatedAt = new Date().toISOString();
      writeProducts(products);

      const txs = readTransactions();
      txs.push({
        id: randomUUID(),
        productId: product.productId,
        productName: product.productName,
        type: "purchase",
        quantity: delta,
        price: product.price,
        fromWarehouse: null,
        toWarehouse: "Chennai",
        timestamp: new Date().toISOString()
      });
      writeTransactions(txs);

      logActivity(operator, role, "Quick Restock", `Restocked ${delta} units of ${product.productName} in Chennai`);
      
      emitStreamEvent("product_restocked", { productId: id, delta });
      emitStreamEvent("product_updated", { productId: id });
      return sendJson(res, 200, { product: products[index] });
    }

    if (pathname.startsWith("/api/products/")) {
      const id = decodeURIComponent(pathname.replace("/api/products/", ""));
      if (!id) return sendJson(res, 400, { error: "id is required" });

      if (req.method === "DELETE") {
        const products = readProducts();
        const productToDelete = products.find((p) => p.id === id);
        if (!productToDelete) return sendJson(res, 404, { error: "product not found" });
        
        const nextProducts = products.filter((p) => p.id !== id);
        writeProducts(nextProducts);
        
        logActivity(operator, role, "Delete Product", `Deleted product ${productToDelete.productName} (${productToDelete.productId})`);
        emitStreamEvent("product_deleted", { productId: id });
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "PUT") {
        const raw = await getRequestBody(req);
        const { value: payload, error } = safeParseJson(raw);
        if (error) return sendJson(res, 400, { error });
        
        const validationError = validateProductInput(payload);
        if (validationError) return sendJson(res, 400, { error: validationError });
        
        const products = readProducts();
        const index = products.findIndex((p) => p.id === id);
        if (index === -1) return sendJson(res, 404, { error: "product not found" });
        if (products.find((p) => p.id !== id && p.productId === payload.productId)) return sendJson(res, 409, { error: "productId already exists" });

        const oldProduct = products[index];
        let warehouseStock = payload.warehouseStock || { Chennai: Number(payload.quantity || 0), Coimbatore: 0, Bangalore: 0 };
        let quantity = Object.values(warehouseStock).reduce((a, b) => a + b, 0);

        products[index] = { 
          ...oldProduct, 
          productId: String(payload.productId), 
          productName: String(payload.productName), 
          category: String(payload.category), 
          price: Number(payload.price), 
          quantity: quantity,
          warehouseStock: warehouseStock,
          supplier: String(payload.supplier), 
          manufacturingDate: String(payload.manufacturingDate), 
          expiryDate: payload.expiryDate ? String(payload.expiryDate) : "",
          minStock: payload.minStock !== undefined ? Number(payload.minStock) : 10,
          rating: payload.rating !== undefined ? Number(payload.rating) : 5,
          image: payload.image ? String(payload.image) : oldProduct.image || "",
          updatedAt: new Date().toISOString() 
        };
        
        writeProducts(products);
        logActivity(operator, role, "Update Product", `Modified details of product ${products[index].productName} (${products[index].productId})`);
        emitStreamEvent("product_updated", { productId: id });
        return sendJson(res, 200, { product: products[index] });
      }
    }

    serveStatic(req, res, pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

seedData();

server.listen(PORT, () => {
  console.log(`IMS server running at http://127.0.0.1:${PORT}`);
});
