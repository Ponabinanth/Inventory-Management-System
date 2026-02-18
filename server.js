const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 5500;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");
const NOTIFICATION_FILE = path.join(DATA_DIR, "notifications.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

let revision = Date.now();
const streamClients = new Set();

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  if (!fs.existsSync(NOTIFICATION_FILE)) fs.writeFileSync(NOTIFICATION_FILE, JSON.stringify([], null, 2), "utf8");
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
      if (body.length > 1024 * 1024) {
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
  const required = ["productId", "productName", "category", "price", "quantity", "manufacturingDate", "supplier"];
  for (const key of required) {
    if (payload[key] === undefined || payload[key] === null || String(payload[key]).trim() === "") return `${key} is required`;
  }
  if (Number(payload.price) <= 0) return "price must be greater than zero";
  if (!Number.isInteger(Number(payload.quantity)) || Number(payload.quantity) < 0) return "quantity must be a non-negative integer";
  return null;
}

function computeAlerts(products) {
  const lowStockItems = products.filter((p) => p.quantity < 5);
  const outOfStockItems = products.filter((p) => p.quantity === 0);
  return {
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    lowStockItems: lowStockItems.map((item) => ({ id: item.id, productId: item.productId, productName: item.productName, quantity: item.quantity, supplier: item.supplier }))
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
  const headers = ["id", "productId", "productName", "category", "price", "quantity", "manufacturingDate", "supplier", "updatedAt"];
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = products.map((item) => headers.map((h) => escape(item[h])).join(","));
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

    if (pathname === "/api/health" && req.method === "GET") return sendJson(res, 200, { status: "ok", revision, activeStreamClients: streamClients.size, date: new Date().toISOString() });
    if (pathname === "/api/stream" && req.method === "GET") return registerStreamClient(req, res);
    if (pathname === "/api/products/export.csv" && req.method === "GET") return sendCsv(res, "inventory_export.csv", toCsv(readProducts()));
    if (pathname === "/api/alerts" && req.method === "GET") return sendJson(res, 200, computeAlerts(readProducts()));
    if (pathname === "/api/notifications" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit") || 20);
      const notifications = readNotifications().slice(-Math.max(1, Math.min(limit, 100))).reverse();
      return sendJson(res, 200, { notifications });
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
      emitStreamEvent("notification_sent", { notificationId: item.id, channel });
      return sendJson(res, 201, { notification: item });
    }
    if (pathname === "/api/products" && req.method === "GET") return sendJson(res, 200, { products: readProducts(), revision });

    if (pathname === "/api/products" && req.method === "POST") {
      const raw = await getRequestBody(req);
      const { value: payload, error } = safeParseJson(raw);
      if (error) return sendJson(res, 400, { error });
      const validationError = validateProductInput(payload);
      if (validationError) return sendJson(res, 400, { error: validationError });
      const products = readProducts();
      if (products.find((p) => p.productId === payload.productId)) return sendJson(res, 409, { error: "productId already exists" });
      const newItem = { id: randomUUID(), productId: String(payload.productId), productName: String(payload.productName), category: String(payload.category), price: Number(payload.price), quantity: Number(payload.quantity), manufacturingDate: String(payload.manufacturingDate), supplier: String(payload.supplier), updatedAt: new Date().toISOString() };
      products.push(newItem);
      writeProducts(products);
      emitStreamEvent("product_created", { productId: newItem.id });
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
      products[index].quantity += delta;
      products[index].updatedAt = new Date().toISOString();
      writeProducts(products);
      emitStreamEvent("product_restocked", { productId: id, delta });
      return sendJson(res, 200, { product: products[index] });
    }

    if (pathname.startsWith("/api/products/")) {
      const id = decodeURIComponent(pathname.replace("/api/products/", ""));
      if (!id) return sendJson(res, 400, { error: "id is required" });

      if (req.method === "DELETE") {
        const products = readProducts();
        const nextProducts = products.filter((p) => p.id !== id);
        if (nextProducts.length === products.length) return sendJson(res, 404, { error: "product not found" });
        writeProducts(nextProducts);
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
        products[index] = { ...products[index], productId: String(payload.productId), productName: String(payload.productName), category: String(payload.category), price: Number(payload.price), quantity: Number(payload.quantity), manufacturingDate: String(payload.manufacturingDate), supplier: String(payload.supplier), updatedAt: new Date().toISOString() };
        writeProducts(products);
        emitStreamEvent("product_updated", { productId: id });
        return sendJson(res, 200, { product: products[index] });
      }
    }

    serveStatic(req, res, pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`IMS server running at http://127.0.0.1:${PORT}`);
});
