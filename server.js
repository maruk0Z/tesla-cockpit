const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3456);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const CONFIG_PATH = path.resolve(process.env.TESLA_COCKPIT_CONFIG_PATH || path.join(ROOT, "config.json"));
const ADDRESS_RESULT_CACHE_PATH = path.resolve(
  process.env.TESLA_COCKPIT_ADDRESS_CACHE_PATH || path.join(ROOT, "address-cache.json"),
);
const SESSION_COOKIE = "tesla_cockpit_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const PASSWORD_HASH_PREFIX = "pbkdf2_sha256";
const PASSWORD_HASH_ITERATIONS = 210000;
const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;
const ACTIVE_REFRESH_SECONDS = 30;
const RESTING_REFRESH_SECONDS = 5 * 60;
const TRIPS_CACHE_MS = 5 * 60 * 1000;
const ADDRESS_CACHE_MS = 30 * 60 * 1000;
const GRAFANA_TIMEOUT_MS = Number(process.env.TESLA_COCKPIT_GRAFANA_TIMEOUT_MS || 15000);
const AMAP_TIMEOUT_MS = Number(process.env.TESLA_COCKPIT_AMAP_TIMEOUT_MS || 10000);
const AMAP_LOOKUP_CONCURRENCY = 1;
const AMAP_MIN_INTERVAL_MS = 500;
const DETAIL_RANGE_KEYS = new Set(["today", "7d", "30d", "month", "year", "custom"]);
const NAVIGATION_SECTIONS = Object.freeze([
  { id: "home", path: "/", label: "主页", description: "车辆实时概览", timeRange: false },
  { id: "trips", path: "/trips", label: "行程", description: "行程记录与单次详情", timeRange: true },
  { id: "charging", path: "/charging", label: "充电", description: "充电记录与功率曲线", timeRange: true },
  { id: "energy", path: "/energy", label: "能耗", description: "能耗趋势与能量回收", timeRange: true },
  { id: "battery", path: "/battery", label: "电池", description: "电量、续航与停车能耗", timeRange: true },
  { id: "status", path: "/status", label: "车辆状态", description: "状态时间线与持续时间", timeRange: true },
  { id: "statistics", path: "/statistics", label: "统计", description: "选定时间范围汇总", timeRange: true },
  { id: "settings", path: "/settings", label: "设置", description: "账户与运行状态", timeRange: false },
]);
const loginAttempts = new Map();
let vehicleCache = null;
let vehicleRequestPromise = null;
const tripsDetailCache = new Map();
const chargingDetailCache = new Map();
const tripsSummaryCache = new Map();
const chargingSummaryCache = new Map();
const energyDetailCache = new Map();
const batteryDetailCache = new Map();
const statusDetailCache = new Map();
const statusSummaryCache = new Map();
const statisticsDetailCache = new Map();
let addressLookupCache = null;
let persistentAddressCache = loadPersistentAddressCache();
const pendingAddressLookups = new Map();
const amapLookupQueue = [];
let activeAmapLookups = 0;
let lastAmapLookupAt = 0;
let addressCacheSaveTimer = null;
let addressCachePrewarmTimer = null;
let addressCachePrewarmRunning = false;
let dataQualityCache = null;
let activeConfig = null;
let activeConfigMtimeMs = 0;
const runtimeDiagnostics = {
  grafana: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastDataSuccessAt: null,
    lastFailureAt: null,
    lastDataFailureAt: null,
    lastError: null,
    lastLatencyMs: null,
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
  },
  amap: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
    lastLatencyMs: null,
    successCount: 0,
    failureCount: 0,
    prewarm: {
      running: false,
      lastStartedAt: null,
      lastCompletedAt: null,
      lastError: null,
      total: 0,
      cached: 0,
      pending: 0,
      processed: 0,
      failed: 0,
    },
  },
  vehicle: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
    servingStale: false,
  },
};

function isoNow() {
  return new Date().toISOString();
}

function isDockerRuntime() {
  try {
    return process.env.CONTAINER === "true" || fs.existsSync("/.dockerenv");
  } catch (_) {
    return false;
  }
}

function cacheMapStats(caches) {
  const now = Date.now();
  const stats = { entries: 0, fresh: 0, expired: 0, pending: 0 };
  for (const cache of caches) {
    for (const entry of cache.values()) {
      stats.entries += 1;
      if (entry?.promise) stats.pending += 1;
      else if (Number(entry?.expiresAt) > now) stats.fresh += 1;
      else stats.expired += 1;
    }
  }
  return stats;
}

function operationalSnapshot(config) {
  const now = Date.now();
  const detail = cacheMapStats([
    tripsDetailCache,
    chargingDetailCache,
    tripsSummaryCache,
    chargingSummaryCache,
    energyDetailCache,
    batteryDetailCache,
    statusDetailCache,
    statusSummaryCache,
    statisticsDetailCache,
  ]);
  let vehicleStatus = "empty";
  if (vehicleCache) {
    if (runtimeDiagnostics.vehicle.servingStale) vehicleStatus = "fallback";
    else vehicleStatus = now < vehicleCache.expiresAt ? "fresh" : "expired";
  }
  const amap = runtimeDiagnostics.amap;
  const amapConfigured = Boolean(config?.amapWebServiceKey);
  const cachedAddresses = Object.keys(persistentAddressCache.entries || {}).length;
  const amapFailureIsLatest = Boolean(amap.lastFailureAt && (!amap.lastSuccessAt || amap.lastFailureAt > amap.lastSuccessAt));
  const amapStatus = !amapConfigured
    ? cachedAddresses ? "cache_only" : "disabled"
    : amap.prewarm.running || amapLookupQueue.length || activeAmapLookups
      ? "working"
      : amapFailureIsLatest
        ? "degraded"
        : amap.lastSuccessAt
          ? "online"
          : cachedAddresses
            ? "cached"
            : "idle";
  return {
    service: {
      status: "online",
      runtime: isDockerRuntime() ? "docker" : "process",
      containerStatus: isDockerRuntime() ? "running" : "not_applicable",
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      port: PORT,
    },
    grafana: { ...runtimeDiagnostics.grafana },
    cache: {
      vehicle: {
        status: vehicleStatus,
        fetchedAt: vehicleCache ? new Date(vehicleCache.fetchedAt).toISOString() : null,
        expiresAt: vehicleCache ? new Date(vehicleCache.expiresAt).toISOString() : null,
        ageSeconds: vehicleCache ? Math.max(0, Math.round((now - vehicleCache.fetchedAt) / 1000)) : null,
        lastError: runtimeDiagnostics.vehicle.lastError,
      },
      detail,
    },
    amap: {
      status: amapStatus,
      configured: amapConfigured,
      cachedAddresses,
      cacheUpdatedAt: persistentAddressCache.updatedAt || amap.lastSuccessAt,
      queued: amapLookupQueue.length,
      active: activeAmapLookups,
      pendingLookups: pendingAddressLookups.size,
      lastSuccessAt: amap.lastSuccessAt,
      lastFailureAt: amap.lastFailureAt,
      lastError: amap.lastError,
      lastLatencyMs: amap.lastLatencyMs,
      successCount: amap.successCount,
      failureCount: amap.failureCount,
      prewarm: { ...amap.prewarm },
    },
  };
}

async function getCachedDetailSummary(cache, key, loader) {
  const cached = cache.get(key);
  if (cached?.data && Date.now() < cached.expiresAt) return cached.data;
  if (cached?.promise) return cached.promise;
  let entry;
  const promise = Promise.resolve()
    .then(loader)
    .then((data) => {
      if (cache.get(key) === entry) cache.set(key, { data, expiresAt: Date.now() + TRIPS_CACHE_MS });
      return data;
    })
    .catch((error) => {
      if (cache.get(key) === entry) cache.delete(key);
      throw error;
    });
  entry = { promise, expiresAt: Date.now() + TRIPS_CACHE_MS };
  cache.set(key, entry);
  return promise;
}

function loadConfig() {
  try {
    const stat = fs.statSync(CONFIG_PATH);
    if (activeConfig && stat.mtimeMs === activeConfigMtimeMs) return activeConfig;
    const raw = fs.readFileSync(CONFIG_PATH, "utf8").replace(/^\uFEFF/, "");
    const config = JSON.parse(raw);
    if (!config.grafanaUrl || !config.grafanaToken || !config.datasourceUid) {
      throw new Error("config.json requires grafanaUrl, grafanaToken, and datasourceUid");
    }
    activeConfig = config;
    activeConfigMtimeMs = stat.mtimeMs;
    return activeConfig;
  } catch (error) {
    if (activeConfig) {
      console.error(`[config] reload failed, using last valid config: ${error.message}`);
      return activeConfig;
    }
    throw error;
  }
}

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...securityHeaders(),
    "Content-Length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function saveConfig(config) {
  const temporaryPath = `${CONFIG_PATH}.${process.pid}.tmp`;
  const backupPath = `${CONFIG_PATH}.${process.pid}.bak`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    fs.renameSync(CONFIG_PATH, backupPath);
    fs.renameSync(temporaryPath, CONFIG_PATH);
    fs.unlinkSync(backupPath);
    activeConfig = config;
    activeConfigMtimeMs = fs.statSync(CONFIG_PATH).mtimeMs;
  } catch (error) {
    if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(backupPath)) fs.renameSync(backupPath, CONFIG_PATH);
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
}

function html(res, status, body, headers = {}) {
  const payload = Buffer.from(body);
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    ...securityHeaders(),
    "Content-Length": payload.length,
    ...headers,
  });
  res.end(payload);
}

function redirect(res, location, headers = {}) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
    ...securityHeaders(),
    ...headers,
  });
  res.end();
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  };
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index === -1) return [part.trim(), ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function isAuthenticated(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [sessionId, expiresAtText, signature] = parts;
  const expiresAt = Number(expiresAtText);
  if (!sessionId || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = signSession(sessionId, expiresAt);
  if (!safeEqual(signature, expected)) return false;
  return true;
}

function signSession(sessionId, expiresAt) {
  const config = loadConfig();
  const passwordIdentity = process.env.TESLA_COCKPIT_PASSWORD_HASH
    || config.sitePasswordHash
    || process.env.TESLA_COCKPIT_PASSWORD
    || config.sitePassword
    || "";
  const passwordFingerprint = crypto.createHash("sha256").update(passwordIdentity).digest("base64url");
  return crypto
    .createHmac("sha256", getSessionSecret(config))
    .update(`${sessionId}.${expiresAt}.${passwordFingerprint}`)
    .digest("base64url");
}

function createSessionCookie() {
  const sessionId = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  return sessionCookie(`${sessionId}.${expiresAt}.${signSession(sessionId, expiresAt)}`);
}

function sessionCookie(token) {
  const secure = loadConfig().cookieSecure ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function loginPage(error = "") {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tesla Cockpit Login</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at 22% 18%, rgba(0, 122, 255, 0.16), transparent 28rem),
          radial-gradient(circle at 84% 18%, rgba(232, 33, 39, 0.10), transparent 26rem),
          linear-gradient(135deg, #fbfbfd 0%, #f3f4f8 48%, #eceef3 100%);
        color: #1d1d1f;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "Microsoft YaHei UI", Arial, sans-serif;
      }
      .login-card {
        width: min(430px, calc(100vw - 42px));
        padding: 34px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.74);
        backdrop-filter: saturate(160%) blur(26px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.85);
      }
      .brand {
        display: block;
        width: 210px;
        height: auto;
        margin: 0 auto 28px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 34px;
        line-height: 1;
        letter-spacing: 0;
      }
      p {
        margin: 0 0 24px;
        color: #6e6e73;
        font-size: 14px;
      }
      label {
        display: block;
        margin-bottom: 8px;
        color: #6e6e73;
        font-size: 13px;
        font-weight: 650;
      }
      input {
        width: 100%;
        height: 50px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 16px;
        padding: 0 15px;
        outline: none;
        background: rgba(255, 255, 255, 0.82);
        color: #1d1d1f;
        font: inherit;
        font-size: 18px;
      }
      input:focus {
        border-color: rgba(0, 122, 255, 0.56);
        box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.12);
      }
      button {
        width: 100%;
        height: 50px;
        margin-top: 18px;
        border: 0;
        border-radius: 16px;
        background: #007aff;
        color: white;
        font-size: 17px;
        font-weight: 760;
        cursor: pointer;
      }
      .error {
        min-height: 20px;
        margin-top: 14px;
        color: #ff3b30;
        font-size: 13px;
        font-weight: 650;
      }
    </style>
  </head>
  <body>
    <form class="login-card" method="post" action="/api/login">
      <img class="brand" src="/assets/tesla-wordmark.png" alt="Tesla">
      <h1>车辆看板</h1>
      <p>请输入访问密码</p>
      <label for="password">密码</label>
      <input id="password" name="password" type="password" autocomplete="current-password" autofocus>
      <button type="submit">进入</button>
      <div class="error">${error}</div>
    </form>
  </body>
</html>`;
}

function readRequestBody(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getSitePassword(config) {
  return process.env.TESLA_COCKPIT_PASSWORD || config.sitePassword || "";
}

function getSessionSecret(config) {
  return process.env.TESLA_COCKPIT_SESSION_SECRET || config.sessionSecret || config.grafanaToken;
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, 32, "sha256").toString("base64url");
  return `${PASSWORD_HASH_PREFIX}:${PASSWORD_HASH_ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password, config) {
  const configuredHash = process.env.TESLA_COCKPIT_PASSWORD_HASH || config.sitePasswordHash || "";
  if (configuredHash) {
    const [prefix, iterationsText, salt, expectedHash] = configuredHash.split(":");
    const iterations = Number(iterationsText);
    if (prefix !== PASSWORD_HASH_PREFIX || !Number.isFinite(iterations) || !salt || !expectedHash) return false;
    const actualHash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
    return safeEqual(actualHash, expectedHash);
  }
  const sitePassword = getSitePassword(config);
  return Boolean(sitePassword && safeEqual(password, sitePassword));
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function clientKey(req) {
  const forwarded = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (_) { return false; }
}

function getLoginLock(req) {
  const entry = loginAttempts.get(clientKey(req));
  if (!entry || !entry.lockUntil || Date.now() >= entry.lockUntil) return null;
  return Math.ceil((entry.lockUntil - Date.now()) / 1000);
}

function recordLoginFailure(req) {
  const key = clientKey(req);
  const entry = loginAttempts.get(key) || { count: 0, lockUntil: 0 };
  entry.count += 1;
  if (entry.count >= LOGIN_LOCK_THRESHOLD) {
    entry.lockUntil = Date.now() + LOGIN_LOCK_MS;
  }
  loginAttempts.set(key, entry);
}

function recordLoginSuccess(req) {
  loginAttempts.delete(clientKey(req));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
  }[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store", ...securityHeaders() });
    res.end(data);
  });
}

function destroySessionFromRequest(req) {
  void req;
}

function tableToRows(frame) {
  if (!frame || !frame.schema || !frame.data) return [];
  const names = frame.schema.fields.map((field) => field.name);
  const values = frame.data.values || [];
  const length = values[0] ? values[0].length : 0;
  return Array.from({ length }, (_, rowIndex) => {
    const row = {};
    names.forEach((name, columnIndex) => {
      row[name] = values[columnIndex] ? values[columnIndex][rowIndex] : null;
    });
    return row;
  });
}

function fromGrafanaTime(value) {
  if (value == null) return null;
  if (typeof value === "number") return new Date(value).toISOString();
  return value;
}

function fromGrafanaDate(value) {
  if (value == null) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(typeof value === "number" ? value : String(value));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function queryGrafana(config, rawSql, refId = "A", maxDataPoints = 100) {
  const startedAt = Date.now();
  const attemptedAt = isoNow();
  runtimeDiagnostics.grafana.lastAttemptAt = attemptedAt;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GRAFANA_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.grafanaUrl.replace(/\/$/, "")}/api/ds/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.grafanaToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        queries: [{
          refId,
          datasource: {
            uid: config.datasourceUid,
            type: config.datasourceType || "grafana-postgresql-datasource",
          },
          rawSql,
          format: "table",
          intervalMs: 1000,
          maxDataPoints,
        }],
        from: "now-24h",
        to: "now",
      }),
    });

    const payload = await response.json();
    const result = payload.results && payload.results[refId];
    if (!response.ok || (result && result.error)) {
      throw new Error((result && result.error) || `Grafana API ${response.status}`);
    }
    const completedAt = isoNow();
    runtimeDiagnostics.grafana.lastSuccessAt = completedAt;
    runtimeDiagnostics.grafana.lastLatencyMs = Date.now() - startedAt;
    runtimeDiagnostics.grafana.lastError = null;
    runtimeDiagnostics.grafana.successCount += 1;
    runtimeDiagnostics.grafana.consecutiveFailures = 0;
    if (refId !== "H") runtimeDiagnostics.grafana.lastDataSuccessAt = completedAt;
    return tableToRows(result.frames && result.frames[0]);
  } catch (error) {
    const normalizedError = error.name === "AbortError"
      ? new Error(`Grafana 请求超过 ${Math.round(GRAFANA_TIMEOUT_MS / 1000)} 秒`)
      : error;
    const failedAt = isoNow();
    runtimeDiagnostics.grafana.lastFailureAt = failedAt;
    runtimeDiagnostics.grafana.lastLatencyMs = Date.now() - startedAt;
    runtimeDiagnostics.grafana.lastError = normalizedError.message;
    runtimeDiagnostics.grafana.failureCount += 1;
    runtimeDiagnostics.grafana.consecutiveFailures += 1;
    if (refId !== "H") runtimeDiagnostics.grafana.lastDataFailureAt = failedAt;
    throw normalizedError;
  } finally {
    clearTimeout(timeout);
  }
}

async function getDataQuality(config) {
  if (dataQualityCache && Date.now() < dataQualityCache.expiresAt) return dataQualityCache.data;
  const sql = `
WITH position_steps AS (
  SELECT
    p.date,
    p.battery_level,
    LEAD(p.date) OVER (PARTITION BY p.car_id ORDER BY p.date) AS next_date,
    LEAD(p.battery_level) OVER (PARTITION BY p.car_id ORDER BY p.date) AS next_level
  FROM positions p
  WHERE p.date >= now() - interval '30 days'
    AND p.battery_level IS NOT NULL
)
SELECT
  (SELECT COUNT(*) FROM charging_processes WHERE end_date IS NULL AND start_date < now() - interval '24 hours') AS open_charging,
  (SELECT COUNT(*) FROM drives WHERE end_date IS NULL AND start_date < now() - interval '24 hours') AS open_drives,
  (SELECT COUNT(*) FROM drives d WHERE d.end_date IS NOT NULL AND d.start_date >= now() - interval '30 days' AND (d.start_address_id IS NULL OR d.end_address_id IS NULL)) AS missing_addresses,
  (SELECT COUNT(*) FROM drives d WHERE d.end_date IS NOT NULL AND d.start_date >= now() - interval '30 days' AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.drive_id = d.id AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL)) AS missing_routes,
  (SELECT COUNT(*) FROM position_steps WHERE next_date - date <= interval '30 minutes' AND ABS(next_level - battery_level) > 15) AS soc_jumps;
`;
  const row = (await queryGrafana(config, sql, "Q", 10))[0] || {};
  const issues = [
    { id: "open_charging", label: "未结束充电记录", count: Number(row.open_charging || 0), detail: "超过 24 小时仍未结束" },
    { id: "open_drives", label: "未结束行程记录", count: Number(row.open_drives || 0), detail: "超过 24 小时仍未结束" },
    { id: "missing_addresses", label: "缺少地址的行程", count: Number(row.missing_addresses || 0), detail: "最近 30 天" },
    { id: "missing_routes", label: "缺少轨迹的行程", count: Number(row.missing_routes || 0), detail: "最近 30 天" },
    { id: "soc_jumps", label: "异常 SOC 跳变", count: Number(row.soc_jumps || 0), detail: "30 分钟内变化超过 15%" },
  ];
  const data = {
    checkedAt: new Date().toISOString(),
    issueCount: issues.reduce((sum, issue) => sum + issue.count, 0),
    issues,
  };
  dataQualityCache = { data, expiresAt: Date.now() + TRIPS_CACHE_MS };
  return data;
}

function detailRangeSql(range, start = "", end = "") {
  const ranges = {
    today: "d.start_date >= (date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai')",
    "7d": "d.start_date >= now() - interval '7 days'",
    "30d": "d.start_date >= now() - interval '30 days'",
    month: "d.start_date >= date_trunc('month', now())",
    year: "d.start_date >= date_trunc('year', now())",
  };
  if (range !== "custom") return ranges[range] || ranges["30d"];
  return `d.start_date >= '${start}'::date AND d.start_date < ('${end}'::date + interval '1 day')`;
}

function detailTimestampRangeSql(range, column, start = "", end = "") {
  const ranges = {
    today: `${column} >= (date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai')`,
    "7d": `${column} >= now() - interval '7 days'`,
    "30d": `${column} >= now() - interval '30 days'`,
    month: `${column} >= date_trunc('month', now())`,
    year: `${column} >= date_trunc('year', now())`,
  };
  if (range !== "custom") return ranges[range] || ranges["30d"];
  return `${column} >= '${start}'::date AND ${column} < ('${end}'::date + interval '1 day')`;
}

function detailRangeBoundsSql(range, start = "", end = "") {
  const starts = {
    today: "(date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai')",
    "7d": "now() - interval '7 days'",
    "30d": "now() - interval '30 days'",
    month: "date_trunc('month', now())",
    year: "date_trunc('year', now())",
  };
  return {
    start: range === "custom" ? `'${start}'::date` : (starts[range] || starts["30d"]),
    end: range === "custom" ? `('${end}'::date + interval '1 day')` : "now()",
  };
}

function addressLabel(address) {
  return address.name
    || [address.city, address.road, address.house_number].filter(Boolean).join(" ")
    || address.neighbourhood
    || address.display_name
    || null;
}

function nearestAddress(addresses, latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const address of addresses) {
    const addressLat = Number(address.latitude);
    const addressLng = Number(address.longitude);
    if (!Number.isFinite(addressLat) || !Number.isFinite(addressLng)) continue;
    const latDelta = addressLat - lat;
    const lngDelta = (addressLng - lng) * Math.cos(lat * Math.PI / 180);
    const distance = latDelta * latDelta + lngDelta * lngDelta;
    if (distance < nearestDistance) {
      nearest = address;
      nearestDistance = distance;
    }
  }
  return nearestDistance <= 0.005 * 0.005 ? addressLabel(nearest) : null;
}

function coordinateLabel(latitude, longitude, fallback) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng)
    ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : fallback;
}

function loadPersistentAddressCache() {
  try {
    const raw = fs.readFileSync(ADDRESS_RESULT_CACHE_PATH, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.entries === "object" ? parsed : { version: 1, entries: {} };
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`[amap] address cache load failed: ${error.message}`);
    return { version: 1, entries: {} };
  }
}

function savePersistentAddressCache() {
  addressCacheSaveTimer = null;
  const temporaryPath = `${ADDRESS_RESULT_CACHE_PATH}.${process.pid}.tmp`;
  const backupPath = `${ADDRESS_RESULT_CACHE_PATH}.${process.pid}.bak`;
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: persistentAddressCache.entries,
  };
  fs.writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  try {
    if (fs.existsSync(ADDRESS_RESULT_CACHE_PATH)) fs.renameSync(ADDRESS_RESULT_CACHE_PATH, backupPath);
    fs.renameSync(temporaryPath, ADDRESS_RESULT_CACHE_PATH);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    persistentAddressCache.updatedAt = payload.updatedAt;
  } catch (error) {
    if (!fs.existsSync(ADDRESS_RESULT_CACHE_PATH) && fs.existsSync(backupPath)) fs.renameSync(backupPath, ADDRESS_RESULT_CACHE_PATH);
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
}

function scheduleAddressCacheSave() {
  if (addressCacheSaveTimer) return;
  addressCacheSaveTimer = setTimeout(() => {
    try {
      savePersistentAddressCache();
    } catch (error) {
      console.warn(`[amap] address cache save failed: ${error.message}`);
    }
  }, 3000);
  addressCacheSaveTimer.unref?.();
}

function addressCoordinateKey(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

function enqueueAmapLookup(task, priority = "high") {
  return new Promise((resolve, reject) => {
    const item = { task, resolve, reject };
    if (priority === "low") amapLookupQueue.push(item);
    else amapLookupQueue.unshift(item);
    drainAmapLookupQueue();
  });
}

function drainAmapLookupQueue() {
  while (activeAmapLookups < AMAP_LOOKUP_CONCURRENCY && amapLookupQueue.length) {
    const item = amapLookupQueue.shift();
    activeAmapLookups += 1;
    Promise.resolve()
      .then(item.task)
      .then(item.resolve, item.reject)
      .finally(() => {
        activeAmapLookups -= 1;
        drainAmapLookupQueue();
      });
  }
}

function textValue(value) {
  if (Array.isArray(value)) return value.map(textValue).find(Boolean) || "";
  return value == null ? "" : String(value).trim();
}

function chineseValue(value) {
  const text = textValue(value);
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(text) ? text : "";
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function amapAddressResult(payload) {
  const regeocode = payload?.regeocode || {};
  const component = regeocode.addressComponent || {};
  const firstAoi = Array.isArray(regeocode.aois) ? regeocode.aois[0] : null;
  const firstPoi = Array.isArray(regeocode.pois) ? regeocode.pois[0] : null;
  const candidates = [
    firstAoi?.name,
    component.neighborhood?.name,
    component.building?.name,
    firstPoi?.name,
    [component.district, component.township].map(textValue).filter(Boolean).join(" "),
    [component.streetNumber?.street, component.streetNumber?.number].map(textValue).filter(Boolean).join(""),
    regeocode.formatted_address,
  ];
  const label = candidates.map(chineseValue).find(Boolean) || textValue(regeocode.formatted_address);
  if (!label) throw new Error("高德未返回可用地址");
  return {
    label,
    formattedAddress: textValue(regeocode.formatted_address),
    district: textValue(component.district),
    resolvedAt: new Date().toISOString(),
  };
}

async function lookupAmapAddress(config, latitude, longitude, priority = "high") {
  const coordinateKey = addressCoordinateKey(latitude, longitude);
  if (!coordinateKey || !config.amapWebServiceKey) return null;
  const cached = persistentAddressCache.entries[coordinateKey];
  if (cached?.label) return cached;
  if (pendingAddressLookups.has(coordinateKey)) return pendingAddressLookups.get(coordinateKey);

  let lookupStartedAt = 0;
  const promise = enqueueAmapLookup(async () => {
    lookupStartedAt = Date.now();
    runtimeDiagnostics.amap.lastAttemptAt = isoNow();
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const throttleDelay = Math.max(0, AMAP_MIN_INTERVAL_MS - (Date.now() - lastAmapLookupAt));
      if (throttleDelay) await wait(throttleDelay);
      lastAmapLookupAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AMAP_TIMEOUT_MS);
      try {
        const params = new URLSearchParams({
          key: config.amapWebServiceKey,
          location: coordinateKey,
          output: "json",
          extensions: "all",
          radius: "300",
        });
        const response = await fetch(`https://restapi.amap.com/v3/geocode/regeo?${params}`, { signal: controller.signal });
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          error.amapPermanent = response.status < 500 && response.status !== 429;
          throw error;
        }
        const payload = await response.json();
        if (payload.status === "1") {
          const result = amapAddressResult(payload);
          persistentAddressCache.entries[coordinateKey] = result;
          scheduleAddressCacheSave();
          return result;
        }
        const code = String(payload.infocode || "");
        const info = String(payload.info || "");
        const rateLimited = ["10004", "10029"].includes(code) || /QPS|FREQUENT/i.test(info);
        const error = new Error(info || code || "高德查询失败");
        error.amapPermanent = !rateLimited;
        throw error;
      } catch (error) {
        lastError = error;
        if (error.amapPermanent || attempt === 2) throw error;
      } finally {
        clearTimeout(timeout);
      }
      await wait(2000 * (attempt + 1));
    }
    throw lastError || new Error("高德查询重试失败");
  }, priority).then((result) => {
    runtimeDiagnostics.amap.lastSuccessAt = isoNow();
    runtimeDiagnostics.amap.lastLatencyMs = lookupStartedAt ? Date.now() - lookupStartedAt : null;
    runtimeDiagnostics.amap.lastError = null;
    runtimeDiagnostics.amap.successCount += 1;
    return result;
  }, (error) => {
    runtimeDiagnostics.amap.lastFailureAt = isoNow();
    runtimeDiagnostics.amap.lastLatencyMs = lookupStartedAt ? Date.now() - lookupStartedAt : null;
    runtimeDiagnostics.amap.lastError = error.message;
    runtimeDiagnostics.amap.failureCount += 1;
    throw error;
  });
  pendingAddressLookups.set(coordinateKey, promise);
  try {
    return await promise;
  } finally {
    pendingAddressLookups.delete(coordinateKey);
  }
}

async function resolveCoordinateAddress(config, latitude, longitude, fallback) {
  try {
    const result = await lookupAmapAddress(config, latitude, longitude);
    return result?.label || fallback;
  } catch (error) {
    console.warn(`[amap] reverse geocoding failed: ${error.message}`);
    return fallback;
  }
}

async function getAddressLookup(config) {
  if (addressLookupCache && Date.now() < addressLookupCache.expiresAt) return addressLookupCache.rows;
  const rows = await queryGrafana(config, `
SELECT latitude, longitude, name, city, road, house_number, neighbourhood, display_name
FROM addresses
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
`, "A", 10000);
  addressLookupCache = { rows, expiresAt: Date.now() + ADDRESS_CACHE_MS };
  return rows;
}

async function prewarmAddressCache() {
  const config = loadConfig();
  if (!config.amapWebServiceKey) return;
  const amapTileUrl = "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}";
  const rows = await queryGrafana(config, `
WITH drive_start AS (
  SELECT DISTINCT ON (p.drive_id) p.latitude, p.longitude
  FROM positions p
  JOIN drives d ON d.id = p.drive_id
  WHERE d.end_date IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY p.drive_id, p.date ASC
),
drive_end AS (
  SELECT DISTINCT ON (p.drive_id) p.latitude, p.longitude
  FROM positions p
  JOIN drives d ON d.id = p.drive_id
  WHERE d.end_date IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY p.drive_id, p.date DESC
),
charging_points AS (
  SELECT p.latitude, p.longitude
  FROM charging_processes c
  JOIN positions p ON p.id = c.position_id
  WHERE c.end_date IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
),
current_positions AS (
  SELECT DISTINCT ON (p.car_id) p.latitude, p.longitude
  FROM positions p
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY p.car_id, p.date DESC
),
all_points AS (
  SELECT * FROM drive_start
  UNION ALL SELECT * FROM drive_end
  UNION ALL SELECT * FROM charging_points
  UNION ALL SELECT * FROM current_positions
)
SELECT DISTINCT
  ROUND((lat_for_map('${amapTileUrl}', latitude, longitude))::numeric, 6) AS latitude,
  ROUND((lng_for_map('${amapTileUrl}', latitude, longitude))::numeric, 6) AS longitude
FROM all_points;
`, "G", 10000);

  const pending = rows.filter((row) => {
    const key = addressCoordinateKey(row.latitude, row.longitude);
    return key && !persistentAddressCache.entries[key]?.label;
  });
  runtimeDiagnostics.amap.prewarm.total = rows.length;
  runtimeDiagnostics.amap.prewarm.cached = rows.length - pending.length;
  runtimeDiagnostics.amap.prewarm.pending = pending.length;
  runtimeDiagnostics.amap.prewarm.processed = 0;
  runtimeDiagnostics.amap.prewarm.failed = 0;
  console.log(`[amap] address cache: ${rows.length - pending.length} cached, ${pending.length} pending`);
  let failed = 0;
  let lastFailure = "";
  let processed = 0;
  for (let index = 0; index < pending.length; index += AMAP_LOOKUP_CONCURRENCY * 2) {
    const batch = pending.slice(index, index + AMAP_LOOKUP_CONCURRENCY * 2);
    await Promise.all(batch.map((row) => lookupAmapAddress(config, row.latitude, row.longitude, "low").catch((error) => {
      failed += 1;
      lastFailure = error.message;
      if (failed <= 3 || failed % 50 === 0) console.warn(`[amap] background failures: ${failed} (${lastFailure})`);
    })));
    processed += batch.length;
    runtimeDiagnostics.amap.prewarm.processed = processed;
    runtimeDiagnostics.amap.prewarm.failed = failed;
    if (processed === pending.length || processed % 50 < batch.length) {
      console.log(`[amap] address cache progress: ${processed}/${pending.length}, ${failed} failed`);
    }
  }
  if (addressCacheSaveTimer) {
    clearTimeout(addressCacheSaveTimer);
    savePersistentAddressCache();
  }
  tripsDetailCache.clear();
  chargingDetailCache.clear();
  console.log(`[amap] address cache ready: ${Object.keys(persistentAddressCache.entries).length} entries, ${failed} failed${lastFailure ? ` (${lastFailure})` : ""}`);
  return failed;
}

function scheduleAddressCachePrewarm(delayMs = 3000) {
  if (addressCachePrewarmTimer || addressCachePrewarmRunning) return;
  addressCachePrewarmTimer = setTimeout(async () => {
    addressCachePrewarmTimer = null;
    addressCachePrewarmRunning = true;
    runtimeDiagnostics.amap.prewarm.running = true;
    runtimeDiagnostics.amap.prewarm.lastStartedAt = isoNow();
    runtimeDiagnostics.amap.prewarm.lastError = null;
    let failed = 0;
    try {
      failed = await prewarmAddressCache();
    } catch (error) {
      failed = 1;
      runtimeDiagnostics.amap.prewarm.lastError = error.message;
      console.warn(`[amap] cache prewarm failed: ${error.message}`);
    } finally {
      addressCachePrewarmRunning = false;
      runtimeDiagnostics.amap.prewarm.running = false;
      runtimeDiagnostics.amap.prewarm.failed = failed;
      runtimeDiagnostics.amap.prewarm.lastCompletedAt = isoNow();
    }
    if (failed > 0) scheduleAddressCachePrewarm(60 * 1000);
  }, delayMs);
  addressCachePrewarmTimer.unref?.();
}

async function getTripsDetail(range, start = "", end = "", page = 1, pageSize = 40) {
  const config = loadConfig();
  const amapTileUrl = "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}";
  const where = detailRangeSql(range, start, end);
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safePageSize = Math.max(20, Math.min(100, Math.floor(Number(pageSize) || 40)));
  const offset = (safePage - 1) * safePageSize;
  const summaryKey = `${range}:${start}:${end}`;
  const cacheKey = `${range}:${start}:${end}:${safePage}:${safePageSize}`;
  const cached = tripsDetailCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return { ...cached.data, cache: "hit" };
  const sql = `
WITH selected_drives AS (
  SELECT d.*
  FROM drives d
  WHERE d.end_date IS NOT NULL AND ${where}
  ORDER BY d.start_date DESC
  LIMIT ${safePageSize}
  OFFSET ${offset}
),
start_positions AS (
  SELECT DISTINCT ON (p.drive_id) p.drive_id, p.latitude, p.longitude
  FROM positions p
  JOIN selected_drives d ON d.id = p.drive_id
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY p.drive_id, p.date ASC
),
end_positions AS (
  SELECT DISTINCT ON (p.drive_id) p.drive_id, p.latitude, p.longitude
  FROM positions p
  JOIN selected_drives d ON d.id = p.drive_id
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY p.drive_id, p.date DESC
)
SELECT
  d.id,
  d.start_date,
  d.end_date,
  ROUND(d.distance::numeric, 2) AS distance_km,
  d.duration_min,
  d.speed_max,
  ROUND(((d.start_rated_range_km - d.end_rated_range_km) * c.efficiency)::numeric, 3) AS energy_kwh,
  ROUND((((d.start_rated_range_km - d.end_rated_range_km) * c.efficiency * 1000) / NULLIF(d.distance, 0))::numeric, 1) AS consumption_wh_km,
  sa.name AS start_address_name, sa.city AS start_city, sa.road AS start_road,
  sa.house_number AS start_house_number, sa.neighbourhood AS start_neighbourhood,
  sa.display_name AS start_display_name,
  ea.name AS end_address_name, ea.city AS end_city, ea.road AS end_road,
  ea.house_number AS end_house_number, ea.neighbourhood AS end_neighbourhood,
  ea.display_name AS end_display_name,
  sp.latitude AS start_latitude, sp.longitude AS start_longitude,
  ep.latitude AS end_latitude, ep.longitude AS end_longitude,
  ROUND((lat_for_map('${amapTileUrl}', sp.latitude, sp.longitude))::numeric, 6) AS start_amap_latitude,
  ROUND((lng_for_map('${amapTileUrl}', sp.latitude, sp.longitude))::numeric, 6) AS start_amap_longitude,
  ROUND((lat_for_map('${amapTileUrl}', ep.latitude, ep.longitude))::numeric, 6) AS end_amap_latitude,
  ROUND((lng_for_map('${amapTileUrl}', ep.latitude, ep.longitude))::numeric, 6) AS end_amap_longitude
FROM selected_drives d
JOIN cars c ON c.id = d.car_id
LEFT JOIN addresses sa ON sa.id = d.start_address_id
LEFT JOIN addresses ea ON ea.id = d.end_address_id
LEFT JOIN start_positions sp ON sp.drive_id = d.id
LEFT JOIN end_positions ep ON ep.drive_id = d.id
ORDER BY d.start_date DESC
`;
  const summarySql = `
SELECT
  COUNT(*) AS trip_count,
  COALESCE(SUM(d.distance), 0) AS distance_km,
  COALESCE(SUM(d.duration_min), 0) AS duration_min,
  COALESCE(SUM(GREATEST(0, (d.start_rated_range_km - d.end_rated_range_km) * c.efficiency)), 0) AS energy_kwh
FROM drives d
JOIN cars c ON c.id = d.car_id
WHERE d.end_date IS NOT NULL AND ${where};
`;
  const [rows, summaryRows, addresses] = await Promise.all([
    queryGrafana(config, sql, "D", safePageSize),
    getCachedDetailSummary(tripsSummaryCache, summaryKey, () => queryGrafana(config, summarySql, "S", 1)),
    getAddressLookup(config),
  ]);
  const trips = await Promise.all(rows.map(async (row) => {
    const startFallback = addressLabel({
      name: row.start_address_name, city: row.start_city, road: row.start_road,
      house_number: row.start_house_number, neighbourhood: row.start_neighbourhood,
      display_name: row.start_display_name,
    }) || nearestAddress(addresses, row.start_latitude, row.start_longitude)
      || coordinateLabel(row.start_latitude, row.start_longitude, "起点");
    const endFallback = addressLabel({
      name: row.end_address_name, city: row.end_city, road: row.end_road,
      house_number: row.end_house_number, neighbourhood: row.end_neighbourhood,
      display_name: row.end_display_name,
    }) || nearestAddress(addresses, row.end_latitude, row.end_longitude)
      || coordinateLabel(row.end_latitude, row.end_longitude, "终点");
    const [startName, endName] = await Promise.all([
      resolveCoordinateAddress(config, row.start_amap_latitude, row.start_amap_longitude, startFallback),
      resolveCoordinateAddress(config, row.end_amap_latitude, row.end_amap_longitude, endFallback),
    ]);
    return {
      id: Number(row.id),
      start: fromGrafanaTime(row.start_date),
      end: fromGrafanaTime(row.end_date),
      distanceKm: Number(row.distance_km || 0),
      durationMin: Number(row.duration_min || 0),
      speedMax: row.speed_max == null ? null : Number(row.speed_max),
      energyKwh: row.energy_kwh == null ? null : Number(row.energy_kwh),
      consumptionWhKm: row.consumption_wh_km == null ? null : Number(row.consumption_wh_km),
      startName,
      endName,
    };
  }));
  const aggregate = summaryRows[0] || {};
  const tripCount = Number(aggregate.trip_count || 0);
  const totalDistanceKm = Number(aggregate.distance_km || 0);
  const totalDurationMin = Number(aggregate.duration_min || 0);
  const totalEnergyKwh = Number(aggregate.energy_kwh || 0);
  const data = {
    ok: true,
    section: "trips",
    range,
    summary: {
      count: tripCount,
      distanceKm: Number(totalDistanceKm.toFixed(1)),
      durationMin: totalDurationMin,
      energyKwh: Number(totalEnergyKwh.toFixed(1)),
      consumptionWhKm: totalDistanceKm > 0 ? Math.round(totalEnergyKwh * 1000 / totalDistanceKm) : null,
    },
    trips,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: tripCount,
      hasMore: offset + trips.length < tripCount,
    },
  };
  tripsDetailCache.set(cacheKey, { data, expiresAt: Date.now() + TRIPS_CACHE_MS });
  return { ...data, cache: "fresh" };
}

async function getTripRoute(tripId) {
  const config = loadConfig();
  const amapTileUrl = "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}";
  const sql = `
WITH sampled AS (
  SELECT
    p.date,
    ROUND((lat_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS latitude,
    ROUND((lng_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS longitude,
    p.speed,
    row_number() OVER (ORDER BY p.date) AS rn,
    count(*) OVER () AS total
  FROM positions p
  WHERE p.drive_id = ${tripId}
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
)
SELECT date, latitude, longitude, speed
FROM sampled
WHERE rn = 1 OR rn = total OR rn % GREATEST(1, CEIL(total / 900.0)::integer) = 0
ORDER BY date;
`;
  const rows = await queryGrafana(config, sql, "R", 1000);
  return {
    ok: true,
    tripId,
    route: rows.map((row) => ({
      at: fromGrafanaTime(row.date),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      speed: row.speed == null ? null : Number(row.speed),
    })),
  };
}

async function getChargingDetail(range, start = "", end = "", page = 1, pageSize = 40) {
  const config = loadConfig();
  const amapTileUrl = "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}";
  const where = detailRangeSql(range, start, end);
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safePageSize = Math.max(20, Math.min(100, Math.floor(Number(pageSize) || 40)));
  const offset = (safePage - 1) * safePageSize;
  const summaryKey = `${range}:${start}:${end}`;
  const cacheKey = `${range}:${start}:${end}:${safePage}:${safePageSize}`;
  const cached = chargingDetailCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return { ...cached.data, cache: "hit" };
  const sql = `
SELECT
  d.id,
  d.start_date,
  d.end_date,
  d.start_battery_level,
  d.end_battery_level,
  ROUND(d.charge_energy_added::numeric, 2) AS energy_added_kwh,
  d.duration_min,
  g.name AS geofence_name,
  a.name AS address_name,
  a.city AS address_city,
  a.road AS address_road,
  a.house_number AS address_house_number,
  a.neighbourhood AS address_neighbourhood,
  a.display_name AS address_display_name,
  p.latitude,
  p.longitude,
  ROUND((lat_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS amap_latitude,
  ROUND((lng_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS amap_longitude,
  ROUND((SELECT MAX(ch.charger_power) FROM charges ch WHERE ch.charging_process_id = d.id)::numeric, 1) AS peak_power_kw
FROM charging_processes d
LEFT JOIN addresses a ON a.id = d.address_id
LEFT JOIN geofences g ON g.id = d.geofence_id
LEFT JOIN positions p ON p.id = d.position_id
WHERE d.end_date IS NOT NULL
  AND ${where}
ORDER BY d.start_date DESC
LIMIT ${safePageSize}
OFFSET ${offset};
`;
  const summarySql = `
SELECT
  COUNT(*) AS session_count,
  COALESCE(SUM(d.charge_energy_added), 0) AS energy_added_kwh,
  COALESCE(SUM(d.duration_min), 0) AS duration_min,
  AVG(GREATEST(0, COALESCE(d.end_battery_level, 0) - COALESCE(d.start_battery_level, 0))) AS average_gain
FROM charging_processes d
WHERE d.end_date IS NOT NULL AND ${where};
`;
  const [rows, summaryRows, addresses] = await Promise.all([
    queryGrafana(config, sql, "C", safePageSize),
    getCachedDetailSummary(chargingSummaryCache, summaryKey, () => queryGrafana(config, summarySql, "CS", 1)),
    getAddressLookup(config),
  ]);
  const sessions = await Promise.all(rows.map(async (row) => {
    const durationMin = Number(row.duration_min || 0);
    const energyAddedKwh = Number(row.energy_added_kwh || 0);
    const fallbackLocation = row.geofence_name || addressLabel({
      name: row.address_name,
      city: row.address_city,
      road: row.address_road,
      house_number: row.address_house_number,
      neighbourhood: row.address_neighbourhood,
      display_name: row.address_display_name,
    }) || nearestAddress(addresses, row.latitude, row.longitude)
      || coordinateLabel(row.latitude, row.longitude, "未知位置");
    return {
      id: Number(row.id),
      start: fromGrafanaTime(row.start_date),
      end: fromGrafanaTime(row.end_date),
      startLevel: row.start_battery_level == null ? null : Number(row.start_battery_level),
      endLevel: row.end_battery_level == null ? null : Number(row.end_battery_level),
      energyAddedKwh,
      durationMin,
      averagePowerKw: durationMin > 0 ? Number((energyAddedKwh / (durationMin / 60)).toFixed(1)) : null,
      peakPowerKw: row.peak_power_kw == null ? null : Number(row.peak_power_kw),
      locationName: await resolveCoordinateAddress(config, row.amap_latitude, row.amap_longitude, fallbackLocation),
    };
  }));
  const aggregate = summaryRows[0] || {};
  const sessionCount = Number(aggregate.session_count || 0);
  const totalEnergyKwh = Number(aggregate.energy_added_kwh || 0);
  const totalDurationMin = Number(aggregate.duration_min || 0);
  const data = {
    ok: true,
    section: "charging",
    range,
    summary: {
      count: sessionCount,
      energyAddedKwh: Number(totalEnergyKwh.toFixed(1)),
      durationMin: totalDurationMin,
      averagePowerKw: totalDurationMin > 0 ? Number((totalEnergyKwh / (totalDurationMin / 60)).toFixed(1)) : null,
      averageGain: aggregate.average_gain == null ? null : Math.round(Number(aggregate.average_gain)),
    },
    sessions,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: sessionCount,
      hasMore: offset + sessions.length < sessionCount,
    },
  };
  chargingDetailCache.set(cacheKey, { data, expiresAt: Date.now() + TRIPS_CACHE_MS });
  return { ...data, cache: "fresh" };
}

async function getChargingCurve(processId) {
  const config = loadConfig();
  const sql = `
WITH sampled AS (
  SELECT
    ch.date,
    ch.battery_level,
    ch.charger_power,
    ch.charge_energy_added,
    row_number() OVER (ORDER BY ch.date) AS rn,
    count(*) OVER () AS total
  FROM charges ch
  WHERE ch.charging_process_id = ${processId}
)
SELECT date, battery_level, charger_power, charge_energy_added
FROM sampled
WHERE rn = 1 OR rn = total OR rn % GREATEST(1, CEIL(total / 700.0)::integer) = 0
ORDER BY date;
`;
  const rows = await queryGrafana(config, sql, "P", 800);
  return {
    ok: true,
    processId,
    samples: rows.map((row) => ({
      at: fromGrafanaTime(row.date),
      batteryLevel: row.battery_level == null ? null : Number(row.battery_level),
      powerKw: row.charger_power == null ? null : Number(row.charger_power),
      energyAddedKwh: row.charge_energy_added == null ? null : Number(row.charge_energy_added),
    })),
  };
}

async function getEnergyDetail(range, start = "", end = "") {
  const config = loadConfig();
  const where = detailRangeSql(range, start, end);
  const cacheKey = `${range}:${start}:${end}`;
  const cached = energyDetailCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return { ...cached.data, cache: "hit" };
  const sql = `
WITH selected_drives AS (
  SELECT d.*, c.efficiency
  FROM drives d
  JOIN cars c ON c.id = d.car_id
  WHERE d.end_date IS NOT NULL AND ${where}
),
drive_daily AS (
  SELECT
    (d.start_date AT TIME ZONE 'Asia/Shanghai')::date AS day,
    COUNT(*) AS trip_count,
    COALESCE(SUM(d.distance), 0) AS distance_km,
    COALESCE(SUM(d.duration_min), 0) AS duration_min,
    COALESCE(SUM((d.start_rated_range_km - d.end_rated_range_km) * d.efficiency), 0) AS net_kwh
  FROM selected_drives d
  GROUP BY 1
),
position_samples AS (
  SELECT
    (d.start_date AT TIME ZONE 'Asia/Shanghai')::date AS day,
    p.power,
    EXTRACT(EPOCH FROM (LEAD(p.date) OVER (PARTITION BY p.drive_id ORDER BY p.date) - p.date)) / 3600.0 AS hours_to_next
  FROM positions p
  JOIN selected_drives d ON d.id = p.drive_id
  WHERE p.power IS NOT NULL
),
regen_daily AS (
  SELECT
    day,
    COALESCE(SUM(CASE
      WHEN power < 0 AND hours_to_next > 0 AND hours_to_next <= 0.05
      THEN ABS(power) * hours_to_next
      ELSE 0
    END), 0) AS regen_kwh
  FROM position_samples
  GROUP BY day
)
SELECT
  d.day,
  d.trip_count,
  ROUND(d.distance_km::numeric, 2) AS distance_km,
  d.duration_min,
  ROUND(d.net_kwh::numeric, 3) AS net_kwh,
  ROUND(COALESCE(r.regen_kwh, 0)::numeric, 3) AS regen_kwh,
  ROUND((d.net_kwh + COALESCE(r.regen_kwh, 0))::numeric, 3) AS gross_kwh,
  ROUND((((d.net_kwh + COALESCE(r.regen_kwh, 0)) * 1000) / NULLIF(d.distance_km, 0))::numeric, 1) AS average_wh_km
FROM drive_daily d
LEFT JOIN regen_daily r ON r.day = d.day
ORDER BY d.day ASC;
`;
  const rows = await queryGrafana(config, sql, "E", 1000);
  const days = rows.map((row) => ({
    day: fromGrafanaDate(row.day),
    tripCount: Number(row.trip_count || 0),
    distanceKm: Number(row.distance_km || 0),
    durationMin: Number(row.duration_min || 0),
    netKwh: Number(row.net_kwh || 0),
    regenKwh: Number(row.regen_kwh || 0),
    grossKwh: Number(row.gross_kwh || 0),
    averageWhKm: row.average_wh_km == null ? null : Number(row.average_wh_km),
  }));
  const distanceKm = days.reduce((sum, day) => sum + day.distanceKm, 0);
  const netKwh = days.reduce((sum, day) => sum + day.netKwh, 0);
  const regenKwh = days.reduce((sum, day) => sum + day.regenKwh, 0);
  const grossKwh = days.reduce((sum, day) => sum + day.grossKwh, 0);
  const data = {
    ok: true,
    section: "energy",
    range,
    summary: {
      distanceKm: Number(distanceKm.toFixed(1)),
      grossKwh: Number(grossKwh.toFixed(1)),
      netKwh: Number(netKwh.toFixed(1)),
      regenKwh: Number(regenKwh.toFixed(1)),
      averageWhKm: distanceKm > 0 ? Math.round(grossKwh * 1000 / distanceKm) : null,
    },
    days,
  };
  energyDetailCache.set(cacheKey, { data, expiresAt: Date.now() + TRIPS_CACHE_MS });
  return { ...data, cache: "fresh" };
}

async function getBatteryDetail(range, start = "", end = "") {
  const config = loadConfig();
  const where = detailTimestampRangeSql(range, "p.date", start, end);
  const cacheKey = `${range}:${start}:${end}`;
  const cached = batteryDetailCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return { ...cached.data, cache: "hit" };
  const sql = `
WITH ordered AS (
  SELECT
    p.date,
    (p.date AT TIME ZONE 'Asia/Shanghai')::date AS day,
    p.battery_level,
    p.usable_battery_level,
    p.rated_battery_range_km,
    p.ideal_battery_range_km,
    p.est_battery_range_km,
    p.drive_id,
    LEAD(p.date) OVER (ORDER BY p.date) AS next_date,
    LEAD(p.battery_level) OVER (ORDER BY p.date) AS next_battery_level,
    LEAD(p.drive_id) OVER (ORDER BY p.date) AS next_drive_id
  FROM positions p
  WHERE ${where}
    AND p.battery_level IS NOT NULL
),
valid_parking_drops AS (
  SELECT
    day,
    date AS start_date,
    next_date AS end_date,
    battery_level - next_battery_level AS drop_pct
  FROM ordered o
  WHERE drive_id IS NULL
    AND next_drive_id IS NULL
    AND next_battery_level < battery_level
    AND next_date - date <= interval '24 hours'
    AND battery_level - next_battery_level <= 5
    AND NOT EXISTS (
      SELECT 1
      FROM charging_processes c
      WHERE c.start_date < o.next_date
        AND COALESCE(c.end_date, c.start_date + interval '24 hours') > o.date
    )
),
daily AS (
  SELECT
    o.day,
    MIN(o.battery_level) AS minimum_level,
    MAX(o.battery_level) AS maximum_level,
    (array_agg(o.battery_level ORDER BY o.date DESC))[1] AS ending_level,
    (array_agg(o.rated_battery_range_km ORDER BY o.date DESC) FILTER (WHERE o.rated_battery_range_km IS NOT NULL))[1] AS rated_range_km,
    (array_agg(o.ideal_battery_range_km ORDER BY o.date DESC) FILTER (WHERE o.ideal_battery_range_km IS NOT NULL))[1] AS ideal_range_km,
    (array_agg(o.est_battery_range_km ORDER BY o.date DESC) FILTER (WHERE o.est_battery_range_km IS NOT NULL))[1] AS estimated_range_km,
    COALESCE((SELECT SUM(v.drop_pct) FROM valid_parking_drops v WHERE v.day = o.day), 0) AS parking_drop_pct,
    COALESCE((SELECT MAX(v.drop_pct) FROM valid_parking_drops v WHERE v.day = o.day), 0) AS maximum_parking_drop_pct
  FROM ordered o
  GROUP BY o.day
)
SELECT * FROM daily ORDER BY day ASC;
`;
  const rows = await queryGrafana(config, sql, "B", 1000);
  const days = rows.map((row) => ({
    day: fromGrafanaDate(row.day),
    minimumLevel: Number(row.minimum_level || 0),
    maximumLevel: Number(row.maximum_level || 0),
    endingLevel: Number(row.ending_level || 0),
    ratedKm: row.rated_range_km == null ? null : Number(row.rated_range_km),
    idealKm: row.ideal_range_km == null ? null : Number(row.ideal_range_km),
    estimatedKm: row.estimated_range_km == null ? null : Number(row.estimated_range_km),
    parkingDropPct: Number(row.parking_drop_pct || 0),
    maximumParkingDropPct: Number(row.maximum_parking_drop_pct || 0),
  }));
  const latest = days.at(-1) || {};
  const parkingDays = days.filter((day) => day.parkingDropPct > 0);
  const data = {
    ok: true,
    section: "battery",
    range,
    summary: {
      currentLevel: latest.endingLevel ?? null,
      ratedKm: latest.ratedKm ?? null,
      idealKm: latest.idealKm ?? null,
      observedMinimum: days.length ? Math.min(...days.map((day) => day.minimumLevel)) : null,
      averageDailyParkingDropPct: days.length
        ? Number((days.reduce((sum, day) => sum + day.parkingDropPct, 0) / days.length).toFixed(1))
        : 0,
      maximumParkingDropPct: parkingDays.length
        ? Number(Math.max(...parkingDays.map((day) => day.maximumParkingDropPct)).toFixed(1))
        : 0,
    },
    days,
  };
  batteryDetailCache.set(cacheKey, { data, expiresAt: Date.now() + TRIPS_CACHE_MS });
  return { ...data, cache: "fresh" };
}

async function getStatusDetail(range, start = "", end = "", page = 1, pageSize = 40) {
  const config = loadConfig();
  const bounds = detailRangeBoundsSql(range, start, end);
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safePageSize = Math.max(20, Math.min(100, Math.floor(Number(pageSize) || 40)));
  const offset = (safePage - 1) * safePageSize;
  const summaryKey = `${range}:${start}:${end}`;
  const cacheKey = `${range}:${start}:${end}:${safePage}:${safePageSize}`;
  const cached = statusDetailCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return { ...cached.data, cache: "hit" };
  const sql = `
WITH bounds AS (
  SELECT ${bounds.start} AS range_start, ${bounds.end} AS range_end
),
clipped AS (
  SELECT
    s.id,
    s.state::text AS state,
    GREATEST(s.start_date, b.range_start) AS start_date,
    LEAST(COALESCE(s.end_date, b.range_end), b.range_end) AS end_date
  FROM states s
  CROSS JOIN bounds b
  WHERE s.start_date < b.range_end
    AND COALESCE(s.end_date, b.range_end) > b.range_start
)
SELECT
  id,
  state,
  start_date,
  end_date,
  ROUND((EXTRACT(EPOCH FROM (end_date - start_date)) / 60.0)::numeric, 1) AS duration_min
FROM clipped
WHERE end_date > start_date
ORDER BY start_date DESC
LIMIT ${safePageSize}
OFFSET ${offset};
`;
  const summarySql = `
WITH bounds AS (
  SELECT ${bounds.start} AS range_start, ${bounds.end} AS range_end
), clipped AS (
  SELECT
    s.state::text AS state,
    GREATEST(s.start_date, b.range_start) AS start_date,
    LEAST(COALESCE(s.end_date, b.range_end), b.range_end) AS end_date
  FROM states s
  CROSS JOIN bounds b
  WHERE s.start_date < b.range_end
    AND COALESCE(s.end_date, b.range_end) > b.range_start
), totals AS (
  SELECT state, SUM(EXTRACT(EPOCH FROM (end_date - start_date)) / 60.0) AS duration_min, COUNT(*) AS event_count
  FROM clipped
  WHERE end_date > start_date
  GROUP BY state
)
SELECT state, ROUND(duration_min::numeric, 1) AS duration_min, event_count
FROM totals;
`;
  const [rows, summaryRows] = await Promise.all([
    queryGrafana(config, sql, "S", safePageSize),
    getCachedDetailSummary(statusSummaryCache, summaryKey, () => queryGrafana(config, summarySql, "SS", 20)),
  ]);
  const events = rows.map((row) => ({
    id: Number(row.id),
    state: String(row.state || "unknown").toLowerCase(),
    start: fromGrafanaTime(row.start_date),
    end: fromGrafanaTime(row.end_date),
    durationMin: Number(row.duration_min || 0),
  }));
  const totals = Object.fromEntries(summaryRows.map((row) => [String(row.state || "unknown").toLowerCase(), Number(row.duration_min || 0)]));
  const eventCount = summaryRows.reduce((sum, row) => sum + Number(row.event_count || 0), 0);
  const data = {
    ok: true,
    section: "status",
    range,
    summary: {
      eventCount,
      totalDurationMin: Number(Object.values(totals).reduce((sum, value) => sum + value, 0).toFixed(1)),
      totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Number(value.toFixed(1))])),
      currentState: events[0]?.state || null,
    },
    events,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: eventCount,
      hasMore: offset + events.length < eventCount,
    },
  };
  statusDetailCache.set(cacheKey, { data, expiresAt: Date.now() + TRIPS_CACHE_MS });
  return { ...data, cache: "fresh" };
}

async function getStatisticsDetail(range, start = "", end = "") {
  const cacheKey = `${range}:${start}:${end}`;
  const cached = statisticsDetailCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return { ...cached.data, cache: "hit" };
  const [trips, charging, energy, battery, status] = await Promise.all([
    getTripsDetail(range, start, end),
    getChargingDetail(range, start, end),
    getEnergyDetail(range, start, end),
    getBatteryDetail(range, start, end),
    getStatusDetail(range, start, end),
  ]);
  const data = {
    ok: true,
    section: "statistics",
    range,
    summary: {
      tripCount: trips.summary.count,
      distanceKm: trips.summary.distanceKm,
      durationMin: trips.summary.durationMin,
      grossKwh: energy.summary.grossKwh,
      regenKwh: energy.summary.regenKwh,
      averageWhKm: energy.summary.averageWhKm,
      chargingCount: charging.summary.count,
      chargedKwh: charging.summary.energyAddedKwh,
      chargingDurationMin: charging.summary.durationMin,
      currentBatteryLevel: battery.summary.currentLevel,
      averageDailyParkingDropPct: battery.summary.averageDailyParkingDropPct,
      maximumParkingDropPct: battery.summary.maximumParkingDropPct,
    },
    days: energy.days.map((day) => ({
      day: day.day,
      distanceKm: day.distanceKm,
      durationMin: day.durationMin,
      averageWhKm: day.averageWhKm,
      grossKwh: day.grossKwh,
      regenKwh: day.regenKwh,
      tripCount: day.tripCount,
    })),
    states: status.summary.totals,
    stateDurationMin: status.summary.totalDurationMin,
  };
  statisticsDetailCache.set(cacheKey, { data, expiresAt: Date.now() + TRIPS_CACHE_MS });
  return { ...data, cache: "fresh" };
}

function buildRecentEnergyBuckets(rows, targetDistanceKm = 100, bucketSizeKm = 5) {
  const segments = rows
    .map((row) => {
      const distanceKm = Number(row.end_odometer_km) - Number(row.start_odometer_km);
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
      const startPower = Number(row.start_power_kw);
      const endPower = Number(row.end_power_kw);
      const startSpeed = Number(row.start_speed_kph);
      const endSpeed = Number(row.end_speed_kph);
      const averagePowerKw = (startPower + endPower) / 2;
      const averageSpeedKph = (startSpeed + endSpeed) / 2;
      const hasProxy = Number.isFinite(averagePowerKw) && Number.isFinite(averageSpeedKph) && averageSpeedKph > 2;
      const proxyNetWh = hasProxy ? averagePowerKw * distanceKm / averageSpeedKph * 1000 : null;
      const proxyGrossWh = hasProxy ? Math.max(averagePowerKw, 0) * distanceKm / averageSpeedKph * 1000 : null;
      return {
        driveId: row.drive_id,
        distanceKm,
        proxyNetWh,
        proxyGrossWh,
        finalNetWh: row.drive_net_energy_wh == null ? null : Number(row.drive_net_energy_wh),
      };
    })
    .filter(Boolean);

  const byDrive = new Map();
  segments.forEach((segment) => {
    const key = String(segment.driveId || "current");
    if (!byDrive.has(key)) byDrive.set(key, []);
    byDrive.get(key).push(segment);
  });

  byDrive.forEach((driveSegments) => {
    const totalDistanceKm = driveSegments.reduce((sum, segment) => sum + segment.distanceKm, 0);
    const validSegments = driveSegments.filter((segment) => Number.isFinite(segment.proxyNetWh));
    const validDistanceKm = validSegments.reduce((sum, segment) => sum + segment.distanceKm, 0);
    const rawNetWh = validSegments.reduce((sum, segment) => sum + segment.proxyNetWh, 0);
    const rawGrossWh = validSegments.reduce((sum, segment) => sum + segment.proxyGrossWh, 0);
    const finalNetWh = driveSegments.find((segment) => Number.isFinite(segment.finalNetWh))?.finalNetWh;
    const fallbackNetWhKm = validDistanceKm > 0
      ? rawNetWh / validDistanceKm
      : (Number.isFinite(finalNetWh) && totalDistanceKm > 0 ? finalNetWh / totalDistanceKm : 0);
    const fallbackGrossWhKm = validDistanceKm > 0
      ? rawGrossWh / validDistanceKm
      : Math.max(fallbackNetWhKm, 0);

    driveSegments.forEach((segment) => {
      segment.estimatedNetWh = Number.isFinite(segment.proxyNetWh)
        ? segment.proxyNetWh
        : fallbackNetWhKm * segment.distanceKm;
      segment.estimatedGrossWh = Number.isFinite(segment.proxyGrossWh)
        ? segment.proxyGrossWh
        : fallbackGrossWhKm * segment.distanceKm;
    });

    const estimatedNetTotalWh = driveSegments.reduce((sum, segment) => sum + segment.estimatedNetWh, 0);
    const estimatedGrossTotalWh = driveSegments.reduce((sum, segment) => sum + segment.estimatedGrossWh, 0);
    const calibrated = Number.isFinite(finalNetWh);
    const calibration = calibrated && Math.abs(estimatedNetTotalWh) > 1
      ? finalNetWh / estimatedNetTotalWh
      : 1;

    driveSegments.forEach((segment) => {
      if (calibrated && Math.abs(estimatedNetTotalWh) <= 1) {
        const weight = estimatedGrossTotalWh > 1
          ? segment.estimatedGrossWh / estimatedGrossTotalWh
          : segment.distanceKm / totalDistanceKm;
        segment.netWh = finalNetWh * weight;
      } else {
        segment.netWh = segment.estimatedNetWh * calibration;
      }
      segment.grossWh = segment.estimatedGrossWh * Math.max(calibration, 0);
      segment.provisional = !calibrated;
    });
  });

  let remainingKm = targetDistanceKm;
  const recentSegments = [];
  for (let index = segments.length - 1; index >= 0 && remainingKm > 0; index -= 1) {
    const segment = segments[index];
    const distanceKm = Math.min(segment.distanceKm, remainingKm);
    recentSegments.unshift({
      distanceKm,
      netWh: segment.netWh * (distanceKm / segment.distanceKm),
      grossWh: segment.grossWh * (distanceKm / segment.distanceKm),
      provisional: segment.provisional,
    });
    remainingKm -= distanceKm;
  }

  const buckets = [];
  let bucketDistanceKm = 0;
  let bucketNetWh = 0;
  let bucketGrossWh = 0;
  let bucketProvisional = false;
  recentSegments.forEach((segment) => {
    let remainingSegmentKm = segment.distanceKm;
    let remainingNetWh = segment.netWh;
    let remainingGrossWh = segment.grossWh;
    while (remainingSegmentKm > 0.000001) {
      const takeKm = Math.min(bucketSizeKm - bucketDistanceKm, remainingSegmentKm);
      const takeNetWh = remainingNetWh * (takeKm / remainingSegmentKm);
      const takeGrossWh = remainingGrossWh * (takeKm / remainingSegmentKm);
      bucketDistanceKm += takeKm;
      bucketNetWh += takeNetWh;
      bucketGrossWh += takeGrossWh;
      bucketProvisional = bucketProvisional || segment.provisional;
      remainingSegmentKm -= takeKm;
      remainingNetWh -= takeNetWh;
      remainingGrossWh -= takeGrossWh;
      if (bucketDistanceKm >= bucketSizeKm - 0.000001) {
        buckets.push({
          distanceKm: bucketDistanceKm,
          consumptionWhKm: bucketNetWh / bucketDistanceKm,
          grossConsumptionWhKm: bucketGrossWh / bucketDistanceKm,
          provisional: bucketProvisional,
        });
        bucketDistanceKm = 0;
        bucketNetWh = 0;
        bucketGrossWh = 0;
        bucketProvisional = false;
      }
    }
  });

  if (bucketDistanceKm > 0.05) {
    buckets.push({
      distanceKm: bucketDistanceKm,
      consumptionWhKm: bucketNetWh / bucketDistanceKm,
      grossConsumptionWhKm: bucketGrossWh / bucketDistanceKm,
      provisional: bucketProvisional,
    });
  }
  return buckets;
}

async function getVehicleData() {
  const config = loadConfig();
  const amapTileUrl = "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}";
  const vehicleSql = `
SELECT
  c.id AS car_id,
  c.name AS car_name,
  c.model,
  c.efficiency,
  c.marketing_name,
  c.exterior_color,
  s.state::text AS state,
  s.start_date AS state_since,
  p.date AS last_position_at,
  p.battery_level,
  p.usable_battery_level,
  ROUND((p.rated_battery_range_km)::numeric, 2) AS rated_range_km,
  ROUND((p.ideal_battery_range_km)::numeric, 2) AS ideal_range_km,
  ROUND((p.est_battery_range_km)::numeric, 2) AS estimated_range_km,
  ROUND((p.latitude)::numeric, 6) AS latitude,
  ROUND((p.longitude)::numeric, 6) AS longitude,
  ROUND((lat_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS amap_latitude,
  ROUND((lng_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS amap_longitude,
  p.speed,
  p.power,
  p.outside_temp,
  p.inside_temp,
  p.is_climate_on,
  ROUND((p.odometer)::numeric, 2) AS odometer_km,
  d.id AS last_drive_id,
  d.start_date AS last_drive_start,
  d.end_date AS last_drive_end,
  ROUND((d.distance)::numeric, 2) AS last_drive_distance_km,
  d.duration_min AS last_drive_duration_min,
  d.speed_max AS last_drive_speed_max,
  a.name AS last_address_name
FROM cars c
LEFT JOIN LATERAL (
  SELECT * FROM states s
  WHERE s.car_id = c.id
  ORDER BY s.start_date DESC
  LIMIT 1
) s ON true
LEFT JOIN LATERAL (
  SELECT * FROM positions p
  WHERE p.car_id = c.id
  ORDER BY p.date DESC
  LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT * FROM drives d
  WHERE d.car_id = c.id AND d.end_date IS NOT NULL
  ORDER BY d.end_date DESC
  LIMIT 1
) d ON true
LEFT JOIN addresses a ON a.id = d.end_address_id
ORDER BY c.display_priority ASC, c.name ASC;
`;

  const rows = await queryGrafana(config, vehicleSql);
  const car = rows[0] || {};
  const driveId = car.last_drive_id;
  const monthSql = `
WITH drive_stats AS (
  SELECT
    COALESCE(ROUND(SUM(distance)::numeric, 2), 0) AS month_distance_km,
    COALESCE(SUM(duration_min), 0) AS month_duration_min,
    COALESCE(ROUND(SUM((start_rated_range_km - end_rated_range_km) * ${Number(car.efficiency || 0)})::numeric, 2), 0) AS total_consumption_kwh,
    COALESCE(ROUND((SUM((start_rated_range_km - end_rated_range_km) * ${Number(car.efficiency || 0)} * 1000) / NULLIF(SUM(distance), 0))::numeric, 1), 0) AS avg_consumption_wh_km
  FROM drives
  WHERE car_id = ${Number(car.car_id || 0)}
    AND end_date IS NOT NULL
    AND start_date >= date_trunc('month', now())
),
position_samples AS (
  SELECT
    p.power,
    EXTRACT(EPOCH FROM (LEAD(p.date) OVER (PARTITION BY p.drive_id ORDER BY p.date) - p.date)) / 3600.0 AS hours_to_next
  FROM positions p
  JOIN drives d ON d.id = p.drive_id
  WHERE d.car_id = ${Number(car.car_id || 0)}
    AND d.end_date IS NOT NULL
    AND d.start_date >= date_trunc('month', now())
    AND p.power IS NOT NULL
),
regen_stats AS (
  SELECT
    COALESCE(ROUND(SUM(CASE
      WHEN power < 0 AND hours_to_next > 0 AND hours_to_next <= 0.05
      THEN ABS(power) * hours_to_next
      ELSE 0
    END)::numeric, 2), 0) AS regen_kwh
  FROM position_samples
)
SELECT *
FROM drive_stats, regen_stats;
`;
  const todaySql = `
WITH day_bounds AS (
  SELECT
    (date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai') AS day_start,
    ((date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') + interval '1 day') AT TIME ZONE 'Asia/Shanghai') AS day_end
)
SELECT
  COALESCE(ROUND(SUM(distance)::numeric, 2), 0) AS today_distance_km,
  COALESCE(SUM(duration_min), 0) AS today_duration_min,
  COALESCE(ROUND((SUM((start_rated_range_km - end_rated_range_km) * ${Number(car.efficiency || 0)} * 1000) / NULLIF(SUM(distance), 0))::numeric, 1), 0) AS today_avg_consumption_wh_km
FROM drives d
CROSS JOIN day_bounds b
WHERE d.car_id = ${Number(car.car_id || 0)}
  AND d.end_date IS NOT NULL
  AND d.start_date >= b.day_start
  AND d.start_date < b.day_end;
`;
  const routeSql = `
WITH last_drive AS (
  SELECT id
  FROM drives
  WHERE car_id = ${Number(car.car_id || 0)} AND end_date IS NOT NULL
  ORDER BY end_date DESC
  LIMIT 1
),
sampled AS (
  SELECT
    p.date,
    ROUND((lat_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS latitude,
    ROUND((lng_for_map('${amapTileUrl}', p.latitude, p.longitude))::numeric, 6) AS longitude,
    p.speed,
    row_number() OVER (ORDER BY p.date ASC) AS rn,
    count(*) OVER () AS total
  FROM positions p
  JOIN last_drive d ON d.id = p.drive_id
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY p.date ASC
)
SELECT date, latitude, longitude, speed
FROM sampled
WHERE rn = 1
   OR rn = total
   OR rn % GREATEST(1, CEIL(total / 700.0)::integer) = 0
ORDER BY date ASC;
`;
  const recentEnergySql = `
WITH latest_position AS (
  SELECT p.odometer
  FROM positions p
  WHERE p.car_id = ${Number(car.car_id || 0)}
    AND p.drive_id IS NOT NULL
    AND p.odometer IS NOT NULL
  ORDER BY p.date DESC
  LIMIT 1
),
recent_drive_ids AS (
  SELECT DISTINCT p.drive_id
  FROM positions p
  CROSS JOIN latest_position latest
  WHERE p.car_id = ${Number(car.car_id || 0)}
    AND p.drive_id IS NOT NULL
    AND p.odometer IS NOT NULL
    AND p.odometer >= latest.odometer - 115
),
samples AS (
  SELECT
    p.date AS start_at,
    p.drive_id,
    p.odometer AS start_odometer_km,
    p.power AS start_power_kw,
    p.speed AS start_speed_kph,
    LEAD(p.date) OVER (ORDER BY p.date) AS end_at,
    LEAD(p.drive_id) OVER (ORDER BY p.date) AS next_drive_id,
    LEAD(p.odometer) OVER (ORDER BY p.date) AS end_odometer_km,
    LEAD(p.power) OVER (ORDER BY p.date) AS end_power_kw,
    LEAD(p.speed) OVER (ORDER BY p.date) AS end_speed_kph,
    CASE
      WHEN d.end_date IS NOT NULL
       AND d.start_rated_range_km IS NOT NULL
       AND d.end_rated_range_km IS NOT NULL
      THEN (d.start_rated_range_km - d.end_rated_range_km) * ${Number(car.efficiency || 0)} * 1000
      ELSE NULL
    END AS drive_net_energy_wh
  FROM positions p
  JOIN recent_drive_ids recent ON recent.drive_id = p.drive_id
  LEFT JOIN drives d ON d.id = p.drive_id
  WHERE p.car_id = ${Number(car.car_id || 0)}
    AND p.drive_id IS NOT NULL
    AND p.odometer IS NOT NULL
)
SELECT
  drive_id,
  start_at,
  end_at,
  start_odometer_km,
  end_odometer_km,
  start_power_kw,
  end_power_kw,
  start_speed_kph,
  end_speed_kph,
  drive_net_energy_wh
FROM samples
WHERE next_drive_id = drive_id
  AND end_at IS NOT NULL
  AND end_odometer_km > start_odometer_km
  AND end_odometer_km - start_odometer_km <= 6
ORDER BY start_at ASC;
`;
  const monthRows = car.car_id ? await queryGrafana(config, monthSql, "M", 10) : [];
  const todayRows = car.car_id ? await queryGrafana(config, todaySql, "T", 10) : [];
  const routeRows = car.car_id ? await queryGrafana(config, routeSql, "R", 1000) : [];
  const recentEnergyRows = car.car_id ? await queryGrafana(config, recentEnergySql, "E", 10000) : [];
  const recentEnergy = buildRecentEnergyBuckets(recentEnergyRows, 110, 1);
  const positionAddressName = await resolveCoordinateAddress(
    config,
    car.amap_latitude,
    car.amap_longitude,
    "位置暂不可用",
  );
  const month = monthRows[0] || {};
  const today = todayRows[0] || {};
  return {
    updatedAt: new Date().toISOString(),
    car: {
      id: car.car_id,
      name: car.car_name,
      model: car.marketing_name || (car.model ? `Model ${car.model}` : null),
      color: car.exterior_color,
      state: car.state,
      stateSince: fromGrafanaTime(car.state_since),
    },
    battery: {
      level: car.battery_level,
      usableLevel: car.usable_battery_level,
      ratedKm: car.rated_range_km,
      idealKm: car.ideal_range_km,
      estimatedKm: car.estimated_range_km,
    },
    position: {
      latitude: car.latitude,
      longitude: car.longitude,
      amapLatitude: car.amap_latitude,
      amapLongitude: car.amap_longitude,
      at: fromGrafanaTime(car.last_position_at),
      speed: car.speed,
      power: car.power,
      addressName: positionAddressName,
    },
    climate: {
      outsideTemp: car.outside_temp,
      insideTemp: car.inside_temp,
      isOn: car.is_climate_on,
    },
    odometerKm: car.odometer_km,
    month: {
      distanceKm: month.month_distance_km || 0,
      durationMin: month.month_duration_min || 0,
      avgConsumptionWhKm: month.avg_consumption_wh_km || 0,
      totalConsumptionKwh: month.total_consumption_kwh || 0,
      regenKwh: month.regen_kwh || 0,
    },
    today: {
      distanceKm: today.today_distance_km || 0,
      durationMin: today.today_duration_min || 0,
      avgConsumptionWhKm: today.today_avg_consumption_wh_km || 0,
    },
    recentEnergy,
    lastDrive: {
      id: driveId,
      start: fromGrafanaTime(car.last_drive_start),
      end: fromGrafanaTime(car.last_drive_end),
      distanceKm: car.last_drive_distance_km,
      durationMin: car.last_drive_duration_min,
      speedMax: car.last_drive_speed_max,
      addressName: car.last_address_name,
      route: routeRows.map((row) => ({
        latitude: row.latitude,
        longitude: row.longitude,
        speed: row.speed,
        at: fromGrafanaTime(row.date),
      })),
    },
  };
}

function isRestingVehicleState(state) {
  const key = String(state || "").toLowerCase();
  return key === "asleep" || key === "offline";
}

function refreshSecondsForVehicle(data) {
  return isRestingVehicleState(data && data.car && data.car.state)
    ? RESTING_REFRESH_SECONDS
    : ACTIVE_REFRESH_SECONDS;
}

function vehicleResponse(data, cacheStatus, fetchedAt, error = null) {
  const refreshAfterSeconds = refreshSecondsForVehicle(data);
  const ageSeconds = Math.max(0, Math.round((Date.now() - fetchedAt) / 1000));
  return {
    ...data,
    refreshAfterSeconds,
    cache: {
      status: cacheStatus,
      ageSeconds,
      nextRefreshSeconds: refreshAfterSeconds,
      error,
    },
  };
}

async function getCachedVehicleData(force = false) {
  const now = Date.now();
  if (!force && vehicleCache && now < vehicleCache.expiresAt) {
    return vehicleResponse(vehicleCache.data, "hit", vehicleCache.fetchedAt);
  }

  if (vehicleRequestPromise) {
    return vehicleRequestPromise.then(() => {
      if (!vehicleCache) throw new Error("Vehicle cache unavailable");
      return vehicleResponse(vehicleCache.data, "shared", vehicleCache.fetchedAt);
    });
  }

  vehicleRequestPromise = (async () => {
    runtimeDiagnostics.vehicle.lastAttemptAt = isoNow();
    try {
      const data = await getVehicleData();
      const fetchedAt = Date.now();
      const refreshAfterSeconds = refreshSecondsForVehicle(data);
      vehicleCache = {
        data,
        fetchedAt,
        expiresAt: fetchedAt + refreshAfterSeconds * 1000,
      };
      runtimeDiagnostics.vehicle.lastSuccessAt = new Date(fetchedAt).toISOString();
      runtimeDiagnostics.vehicle.lastError = null;
      runtimeDiagnostics.vehicle.servingStale = false;
      return vehicleResponse(data, "fresh", fetchedAt);
    } catch (error) {
      runtimeDiagnostics.vehicle.lastFailureAt = isoNow();
      runtimeDiagnostics.vehicle.lastError = error.message;
      runtimeDiagnostics.vehicle.servingStale = Boolean(vehicleCache);
      if (vehicleCache) {
        return vehicleResponse(vehicleCache.data, "stale", vehicleCache.fetchedAt, error.message);
      }
      throw error;
    } finally {
      vehicleRequestPromise = null;
    }
  })();

  return vehicleRequestPromise;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/health") {
      try {
        const config = loadConfig();
        const snapshot = operationalSnapshot(config);
        const grafanaFailureIsLatest = Boolean(
          snapshot.grafana.lastFailureAt
          && (!snapshot.grafana.lastSuccessAt || snapshot.grafana.lastFailureAt > snapshot.grafana.lastSuccessAt),
        );
        json(res, 200, {
          ok: true,
          status: grafanaFailureIsLatest ? "degraded" : "online",
          config: "valid",
          time: isoNow(),
          service: snapshot.service,
          dependencies: {
            grafana: {
              status: !snapshot.grafana.lastAttemptAt ? "unknown" : grafanaFailureIsLatest ? "degraded" : "online",
              lastSuccessAt: snapshot.grafana.lastSuccessAt,
              lastFailureAt: snapshot.grafana.lastFailureAt,
            },
            amap: {
              status: snapshot.amap.status,
              lastSuccessAt: snapshot.amap.lastSuccessAt,
              lastFailureAt: snapshot.amap.lastFailureAt,
            },
          },
        });
      } catch (error) {
        json(res, 503, { ok: false, config: "invalid", message: error.message, time: new Date().toISOString() });
      }
      return;
    }
    const config = loadConfig();

  if (url.pathname === "/login") {
    if (isAuthenticated(req)) {
      redirect(res, "/");
      return;
    }
    html(res, 200, loginPage());
    return;
  }

  if (url.pathname === "/api/login") {
    if (req.method !== "POST") {
      redirect(res, "/login");
      return;
    }
    try {
      const lockSeconds = getLoginLock(req);
      if (lockSeconds) {
        html(res, 429, loginPage(`登录尝试过多，请 ${lockSeconds} 秒后再试`));
        return;
      }
      const body = await readRequestBody(req);
      const params = new URLSearchParams(body);
      const password = params.get("password") || "";
      if (!verifyPassword(password, config)) {
        recordLoginFailure(req);
        html(res, 401, loginPage("密码不正确"));
        return;
      }
      recordLoginSuccess(req);
      redirect(res, "/", { "Set-Cookie": createSessionCookie() });
    } catch (error) {
      html(res, 400, loginPage("登录请求无效"));
    }
    return;
  }

  if (url.pathname === "/logout") {
    destroySessionFromRequest(req);
    redirect(res, "/login", { "Set-Cookie": clearSessionCookie() });
    return;
  }

  if (url.pathname === "/assets/tesla-wordmark.png") {
    serveFile(res, path.join(PUBLIC, "/assets/tesla-wordmark.png"));
    return;
  }

  if (!isAuthenticated(req)) {
    if (url.pathname.startsWith("/api/")) {
      json(res, 401, { ok: false, error: "Unauthorized" });
      return;
    }
    redirect(res, "/login");
    return;
  }

  if (url.pathname === "/api/vehicle") {
    try {
      json(res, 200, await getCachedVehicleData(url.searchParams.get("force") === "1"));
    } catch (error) {
      json(res, 500, { ok: false, error: error.message });
    }
    return;
  }

  if (url.pathname === "/api/navigation") {
    json(res, 200, {
      ok: true,
      version: 1,
      readOnly: true,
      sections: NAVIGATION_SECTIONS,
      ranges: Array.from(DETAIL_RANGE_KEYS),
      excludedData: ["charging_cost", "tire_pressure", "battery_health"],
    });
    return;
  }

  if (url.pathname === "/api/settings" && req.method === "GET") {
    if (url.searchParams.get("force") === "1") dataQualityCache = null;
    let grafanaOnline = false;
    let grafanaError = null;
    let probeLatencyMs = null;
    let dataQuality = null;
    try {
      const probeStartedAt = Date.now();
      await queryGrafana(config, "SELECT 1 AS connected;", "H", 1);
      probeLatencyMs = Date.now() - probeStartedAt;
      grafanaOnline = true;
      dataQuality = await getDataQuality(config);
    } catch (error) {
      grafanaError = error.message;
    }
    let grafanaHost = "已配置";
    try { grafanaHost = new URL(config.grafanaUrl).host; } catch (_) { /* Keep the safe fallback. */ }
    const operational = operationalSnapshot(config);
    json(res, 200, {
      ok: true,
      readOnly: true,
      service: operational.service,
      grafana: {
        status: grafanaOnline ? "online" : "error",
        host: grafanaHost,
        datasourceConfigured: Boolean(config.datasourceUid),
        latencyMs: probeLatencyMs ?? operational.grafana.lastLatencyMs,
        lastSuccessAt: operational.grafana.lastSuccessAt,
        lastDataSuccessAt: operational.grafana.lastDataSuccessAt,
        lastFailureAt: operational.grafana.lastFailureAt,
        lastDataFailureAt: operational.grafana.lastDataFailureAt,
        successCount: operational.grafana.successCount,
        failureCount: operational.grafana.failureCount,
        consecutiveFailures: operational.grafana.consecutiveFailures,
        error: grafanaError,
      },
      cache: operational.cache,
      amap: operational.amap,
      refresh: {
        activeSeconds: ACTIVE_REFRESH_SECONDS,
        restingSeconds: RESTING_REFRESH_SECONDS,
        detailCacheSeconds: Math.round(TRIPS_CACHE_MS / 1000),
        addressCacheSeconds: Math.round(ADDRESS_CACHE_MS / 1000),
      },
      security: {
        passwordHashed: Boolean(process.env.TESLA_COCKPIT_PASSWORD_HASH || config.sitePasswordHash),
        passwordManagedByEnvironment: Boolean(process.env.TESLA_COCKPIT_PASSWORD_HASH || process.env.TESLA_COCKPIT_PASSWORD),
        sessionDays: Math.round(SESSION_MAX_AGE_SECONDS / 86400),
        loginLockThreshold: LOGIN_LOCK_THRESHOLD,
        loginLockMinutes: Math.round(LOGIN_LOCK_MS / 60000),
      },
      dataQuality,
    });
    return;
  }

  if (url.pathname === "/api/settings/password" && req.method === "POST") {
    if (!isSameOriginRequest(req)) {
      json(res, 403, { ok: false, code: "ORIGIN_REJECTED", message: "请求来源无效" });
      return;
    }
    if (process.env.TESLA_COCKPIT_PASSWORD_HASH || process.env.TESLA_COCKPIT_PASSWORD) {
      json(res, 409, { ok: false, code: "PASSWORD_MANAGED_BY_ENV", message: "密码由服务器环境变量管理，不能在网页中修改" });
      return;
    }
    try {
      const body = await readRequestBody(req);
      const params = new URLSearchParams(body);
      const currentPassword = params.get("currentPassword") || "";
      const newPassword = params.get("newPassword") || "";
      const confirmPassword = params.get("confirmPassword") || "";
      if (!verifyPassword(currentPassword, config)) {
        json(res, 401, { ok: false, code: "CURRENT_PASSWORD_INVALID", message: "当前密码不正确" });
        return;
      }
      if (newPassword.length < 10 || newPassword.length > 128) {
        json(res, 400, { ok: false, code: "PASSWORD_LENGTH_INVALID", message: "新密码长度需要为 10 至 128 位" });
        return;
      }
      if (newPassword !== confirmPassword) {
        json(res, 400, { ok: false, code: "PASSWORD_CONFIRMATION_MISMATCH", message: "两次输入的新密码不一致" });
        return;
      }
      if (safeEqual(currentPassword, newPassword)) {
        json(res, 400, { ok: false, code: "PASSWORD_UNCHANGED", message: "新密码不能与当前密码相同" });
        return;
      }
      const updatedConfig = { ...config, sitePasswordHash: createPasswordHash(newPassword) };
      delete updatedConfig.sitePassword;
      saveConfig(updatedConfig);
      loginAttempts.clear();
      json(res, 200, { ok: true, message: "密码已更新，请重新登录" }, { "Set-Cookie": clearSessionCookie() });
    } catch (error) {
      json(res, 500, { ok: false, code: "PASSWORD_UPDATE_FAILED", message: `密码更新失败：${error.message}` });
    }
    return;
  }

  if (url.pathname.startsWith("/api/detail/")) {
    const sectionId = url.pathname.slice("/api/detail/".length);
    const section = NAVIGATION_SECTIONS.find((item) => item.id === sectionId && item.timeRange);
    if (!section) {
      json(res, 404, { ok: false, code: "DETAIL_SECTION_NOT_FOUND", message: "未找到该数据模块" });
      return;
    }

    const range = url.searchParams.get("range") || "30d";
    if (!DETAIL_RANGE_KEYS.has(range)) {
      json(res, 400, { ok: false, code: "INVALID_TIME_RANGE", message: "时间范围无效" });
      return;
    }

    if (range === "custom") {
      const start = url.searchParams.get("start") || "";
      const end = url.searchParams.get("end") || "";
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(start) || !datePattern.test(end) || start > end) {
        json(res, 400, { ok: false, code: "INVALID_CUSTOM_RANGE", message: "自定义日期范围无效" });
        return;
      }
    }

    if (url.searchParams.get("force") === "1") {
      const cacheKey = `${range}:${url.searchParams.get("start") || ""}:${url.searchParams.get("end") || ""}`;
      const caches = { trips: tripsDetailCache, charging: chargingDetailCache, energy: energyDetailCache, battery: batteryDetailCache, status: statusDetailCache, statistics: statisticsDetailCache };
      const summaryCaches = { trips: tripsSummaryCache, charging: chargingSummaryCache, status: statusSummaryCache };
      if (["trips", "charging", "status"].includes(sectionId)) {
        const pagedCache = { trips: tripsDetailCache, charging: chargingDetailCache, status: statusDetailCache }[sectionId];
        for (const key of pagedCache.keys()) if (key.startsWith(`${cacheKey}:`)) pagedCache.delete(key);
        summaryCaches[sectionId].delete(cacheKey);
      } else {
        caches[sectionId]?.delete(cacheKey);
      }
      if (sectionId === "statistics") {
        for (const key of tripsDetailCache.keys()) if (key.startsWith(`${cacheKey}:`)) tripsDetailCache.delete(key);
        for (const key of chargingDetailCache.keys()) if (key.startsWith(`${cacheKey}:`)) chargingDetailCache.delete(key);
        for (const key of statusDetailCache.keys()) if (key.startsWith(`${cacheKey}:`)) statusDetailCache.delete(key);
        [tripsSummaryCache, chargingSummaryCache, statusSummaryCache].forEach((cache) => cache.delete(cacheKey));
        [energyDetailCache, batteryDetailCache].forEach((cache) => cache.delete(cacheKey));
      }
    }

    if (sectionId === "trips") {
      try {
        json(res, 200, await getTripsDetail(
          range,
          url.searchParams.get("start") || "",
          url.searchParams.get("end") || "",
          url.searchParams.get("page") || 1,
          url.searchParams.get("pageSize") || 40,
        ));
      } catch (error) {
        json(res, 500, { ok: false, code: "TRIPS_QUERY_FAILED", message: error.message });
      }
      return;
    }

    if (sectionId === "charging") {
      try {
        json(res, 200, await getChargingDetail(
          range,
          url.searchParams.get("start") || "",
          url.searchParams.get("end") || "",
          url.searchParams.get("page") || 1,
          url.searchParams.get("pageSize") || 40,
        ));
      } catch (error) {
        json(res, 500, { ok: false, code: "CHARGING_QUERY_FAILED", message: error.message });
      }
      return;
    }

    if (sectionId === "energy") {
      try {
        json(res, 200, await getEnergyDetail(
          range,
          url.searchParams.get("start") || "",
          url.searchParams.get("end") || "",
        ));
      } catch (error) {
        json(res, 500, { ok: false, code: "ENERGY_QUERY_FAILED", message: error.message });
      }
      return;
    }

    if (sectionId === "battery") {
      try {
        json(res, 200, await getBatteryDetail(
          range,
          url.searchParams.get("start") || "",
          url.searchParams.get("end") || "",
        ));
      } catch (error) {
        json(res, 500, { ok: false, code: "BATTERY_QUERY_FAILED", message: error.message });
      }
      return;
    }

    if (sectionId === "status") {
      try {
        json(res, 200, await getStatusDetail(
          range,
          url.searchParams.get("start") || "",
          url.searchParams.get("end") || "",
          url.searchParams.get("page") || 1,
          url.searchParams.get("pageSize") || 40,
        ));
      } catch (error) {
        json(res, 500, { ok: false, code: "STATUS_QUERY_FAILED", message: error.message });
      }
      return;
    }

    if (sectionId === "statistics") {
      try {
        json(res, 200, await getStatisticsDetail(
          range,
          url.searchParams.get("start") || "",
          url.searchParams.get("end") || "",
        ));
      } catch (error) {
        json(res, 500, { ok: false, code: "STATISTICS_QUERY_FAILED", message: error.message });
      }
      return;
    }

    json(res, 501, {
      ok: false,
      code: "DETAIL_SECTION_NOT_READY",
      section: section.id,
      range,
      message: "该数据模块将在后续阶段接入",
    });
    return;
  }

  if (url.pathname.startsWith("/api/trips/") && url.pathname.endsWith("/route")) {
    const tripId = Number(url.pathname.split("/")[3]);
    if (!Number.isInteger(tripId) || tripId <= 0) {
      json(res, 400, { ok: false, code: "INVALID_TRIP_ID", message: "行程编号无效" });
      return;
    }
    try {
      json(res, 200, await getTripRoute(tripId));
    } catch (error) {
      json(res, 500, { ok: false, code: "TRIP_ROUTE_QUERY_FAILED", message: error.message });
    }
    return;
  }

  if (url.pathname.startsWith("/api/charging/") && url.pathname.endsWith("/curve")) {
    const processId = Number(url.pathname.split("/")[3]);
    if (!Number.isInteger(processId) || processId <= 0) {
      json(res, 400, { ok: false, code: "INVALID_CHARGING_ID", message: "充电记录编号无效" });
      return;
    }
    try {
      json(res, 200, await getChargingCurve(processId));
    } catch (error) {
      json(res, 500, { ok: false, code: "CHARGING_CURVE_QUERY_FAILED", message: error.message });
    }
    return;
  }

  const isAppRoute = req.method === "GET" && !path.extname(url.pathname);
  const safePath = url.pathname === "/" || isAppRoute ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC, safePath));
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
    serveFile(res, filePath);
  } catch (error) {
    console.error(`[request] ${req.method} ${req.url}: ${error.stack || error.message}`);
    if (!res.headersSent) {
      if (String(req.url || "").startsWith("/api/")) {
        json(res, 500, { ok: false, code: "INTERNAL_ERROR", message: "服务暂时不可用，请稍后重试" });
      } else {
        html(res, 500, "<!doctype html><meta charset=\"utf-8\"><title>服务暂时不可用</title><p>服务暂时不可用，请稍后刷新。</p>");
      }
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

process.on("unhandledRejection", (error) => {
  console.error(`[unhandledRejection] ${error?.stack || error}`);
});

process.on("uncaughtException", (error) => {
  console.error(`[uncaughtException] ${error?.stack || error}`);
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Tesla cockpit running on http://0.0.0.0:${PORT}`);
  scheduleAddressCachePrewarm();
});
