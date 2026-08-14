const shellFields = {
  homeView: document.getElementById("homeView"),
  detailView: document.getElementById("detailView"),
  menu: document.getElementById("appMenu"),
  menuBackdrop: document.getElementById("menuBackdrop"),
  menuTrigger: document.getElementById("menuTrigger"),
  detailMenuTrigger: document.getElementById("detailMenuTrigger"),
  menuClose: document.getElementById("menuClose"),
  menuNav: document.getElementById("appMenuNav"),
  menuVehicleName: document.getElementById("menuVehicleName"),
  detailTitle: document.getElementById("detailTitle"),
  detailEyebrow: document.getElementById("detailEyebrow"),
  detailDescription: document.getElementById("detailDescription"),
  detailUpdatedAt: document.getElementById("detailUpdatedAt"),
  detailRefresh: document.getElementById("detailRefresh"),
  detailStatus: document.getElementById("detailStatus"),
  detailRetry: document.getElementById("detailRetry"),
  detailPlaceholder: document.getElementById("detailPlaceholder"),
  detailContent: document.getElementById("detailContent"),
  tripsView: document.getElementById("tripsView"),
  tripSummary: document.getElementById("tripSummary"),
  tripList: document.getElementById("tripList"),
  tripListCount: document.getElementById("tripListCount"),
  tripDetailTitle: document.getElementById("tripDetailTitle"),
  tripDetailTime: document.getElementById("tripDetailTime"),
  tripDetailMetrics: document.getElementById("tripDetailMetrics"),
  tripDetailMap: document.getElementById("tripDetailMap"),
  tripDetailGrid: document.getElementById("tripDetailGrid"),
  tripDetailSvg: document.getElementById("tripDetailSvg"),
  tripDetailPath: document.getElementById("tripDetailPath"),
  tripDetailStart: document.getElementById("tripDetailStart"),
  tripDetailEnd: document.getElementById("tripDetailEnd"),
  tripMapLoading: document.getElementById("tripMapLoading"),
  chargingView: document.getElementById("chargingView"),
  chargingSummary: document.getElementById("chargingSummary"),
  chargingList: document.getElementById("chargingList"),
  chargingListCount: document.getElementById("chargingListCount"),
  chargingDetailTitle: document.getElementById("chargingDetailTitle"),
  chargingDetailTime: document.getElementById("chargingDetailTime"),
  chargingDetailMetrics: document.getElementById("chargingDetailMetrics"),
  chargingChart: document.getElementById("chargingChart"),
  chargingGrid: document.getElementById("chargingGrid"),
  chargingSocArea: document.getElementById("chargingSocArea"),
  chargingSocLine: document.getElementById("chargingSocLine"),
  chargingPowerLine: document.getElementById("chargingPowerLine"),
  chargingChartEmpty: document.getElementById("chargingChartEmpty"),
  energyView: document.getElementById("energyView"),
  energySummary: document.getElementById("energySummary"),
  energyDetailChart: document.getElementById("energyDetailChart"),
  energyDetailGrid: document.getElementById("energyDetailGrid"),
  energyDetailBars: document.getElementById("energyDetailBars"),
  energyDetailLine: document.getElementById("energyDetailLine"),
  energyDetailDots: document.getElementById("energyDetailDots"),
  energyDetailEmpty: document.getElementById("energyDetailEmpty"),
  energyDayCount: document.getElementById("energyDayCount"),
  energyDayList: document.getElementById("energyDayList"),
  energyDayTitle: document.getElementById("energyDayTitle"),
  energyDayMetrics: document.getElementById("energyDayMetrics"),
  batteryView: document.getElementById("batteryView"),
  batterySummary: document.getElementById("batterySummary"),
  batteryDetailChart: document.getElementById("batteryDetailChart"),
  batteryDetailGrid: document.getElementById("batteryDetailGrid"),
  batteryDetailRanges: document.getElementById("batteryDetailRanges"),
  batteryDetailLine: document.getElementById("batteryDetailLine"),
  batteryDetailDots: document.getElementById("batteryDetailDots"),
  batteryDetailEmpty: document.getElementById("batteryDetailEmpty"),
  batteryDayCount: document.getElementById("batteryDayCount"),
  batteryDayList: document.getElementById("batteryDayList"),
  batteryDayTitle: document.getElementById("batteryDayTitle"),
  batteryDayMetrics: document.getElementById("batteryDayMetrics"),
  statusView: document.getElementById("statusView"),
  statusSummary: document.getElementById("statusSummary"),
  statusDistribution: document.getElementById("statusDistribution"),
  statusLegend: document.getElementById("statusLegend"),
  statusEventCount: document.getElementById("statusEventCount"),
  statusEventList: document.getElementById("statusEventList"),
  statusEventTitle: document.getElementById("statusEventTitle"),
  statusEventMetrics: document.getElementById("statusEventMetrics"),
  statisticsView: document.getElementById("statisticsView"),
  statisticsSummary: document.getElementById("statisticsSummary"),
  statisticsChart: document.getElementById("statisticsChart"),
  statisticsGrid: document.getElementById("statisticsGrid"),
  statisticsBars: document.getElementById("statisticsBars"),
  statisticsLine: document.getElementById("statisticsLine"),
  statisticsDots: document.getElementById("statisticsDots"),
  statisticsChartEmpty: document.getElementById("statisticsChartEmpty"),
  statisticsStateDistribution: document.getElementById("statisticsStateDistribution"),
  statisticsStateLegend: document.getElementById("statisticsStateLegend"),
  statisticsBreakdown: document.getElementById("statisticsBreakdown"),
  settingsView: document.getElementById("settingsView"),
  settingsOverallStatus: document.getElementById("settingsOverallStatus"),
  settingsRuntime: document.getElementById("settingsRuntime"),
  settingsRefresh: document.getElementById("settingsRefresh"),
  settingsSecurity: document.getElementById("settingsSecurity"),
  settingsQualityStatus: document.getElementById("settingsQualityStatus"),
  settingsQuality: document.getElementById("settingsQuality"),
  passwordForm: document.getElementById("passwordForm"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  passwordStatus: document.getElementById("passwordStatus"),
  passwordSubmit: document.getElementById("passwordSubmit"),
  rangeToolbar: document.getElementById("rangeToolbar"),
  customRange: document.getElementById("customRange"),
  rangeStart: document.getElementById("rangeStart"),
  rangeEnd: document.getElementById("rangeEnd"),
};

let vehicleDisplayName = String(window.cockpitVehicleName || shellFields.menuVehicleName?.textContent || "Model S").trim();

const fallbackSections = [
  { id: "home", path: "/", label: "主页", description: "车辆实时概览" },
  { id: "trips", path: "/trips", label: "行程", description: "行程记录与单次详情" },
  { id: "charging", path: "/charging", label: "充电", description: "充电记录与功率曲线" },
  { id: "energy", path: "/energy", label: "能耗", description: "能耗趋势与能量回收" },
  { id: "battery", path: "/battery", label: "电池", description: "电量、续航与停车能耗" },
  { id: "status", path: "/status", label: "车辆状态", description: "状态时间线与持续时间" },
  { id: "statistics", path: "/statistics", label: "统计", description: "选定时间范围汇总" },
  { id: "settings", path: "/settings", label: "设置", description: "账户与数据源状态" },
];

const rangeLabels = {
  today: "今天",
  "7d": "最近 7 天",
  "30d": "最近 30 天",
  month: "本月",
  year: "本年",
  custom: "自定义",
};

const drilldownTargets = [
  [".status-block", "/status"], ["#estimatedRange", "/battery"],
  ["#odometer", "/statistics"], ["#avgConsumption", "/energy"],
  [".today-drive-card", "/trips"], [".battery-panel", "/battery"],
  [".energy-chart-card", "/energy"], ["#monthDuration", "/statistics"],
  ["#monthDistance", "/statistics"], ["#ratedRange", "/energy"],
  ["#idealRange", "/energy"], ["#insideTemp", "/status"],
  ["#outsideTemp", "/status"],
  [".drive-panel", "/trips"],
];

const DETAIL_TILE_URL = "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7";
const detailMap = { center: null, zoom: 14, route: [], adjusted: false, tileWatchId: 0 };
let sections = fallbackSections;
let activeRange = loadRange();
let activeTrips = [];
let activeTripId = null;
let tripsPagination = { page: 1, hasMore: false, loading: false, total: 0 };
let activeChargingSessions = [];
let activeChargingId = null;
let activeChargingSamples = [];
let chargingPagination = { page: 1, hasMore: false, loading: false, total: 0 };
let activeEnergyDays = [];
let activeBatteryDays = [];
let activeStatusEvents = [];
let statusPagination = { page: 1, hasMore: false, loading: false, total: 0 };
let activeStatisticsDays = [];
let detailRequestId = 0;
let detailRefreshRequested = false;
let detailAbortController = null;
let tripRouteAbortController = null;
let chargingCurveAbortController = null;
const detailPayloadCache = new Map();
const tripRouteCache = new Map();
const chargingCurveCache = new Map();
let visibleDetailSectionId = null;
let detailRecoveryPending = false;
let detailRecoveryTimer = null;
const detailAnimationTimers = new WeakMap();

const DETAIL_STATE_PREFIX = "tesla_cockpit_detail_state";

function detailStateKey(sectionId) {
  return `${DETAIL_STATE_PREFIX}:${sectionId}:${activeRange.key}:${activeRange.start || ""}:${activeRange.end || ""}`;
}

function loadDetailState(sectionId) {
  try {
    return JSON.parse(sessionStorage.getItem(detailStateKey(sectionId)) || "{}") || {};
  } catch (_) {
    return {};
  }
}

function saveDetailState(sectionId, patch) {
  const next = { ...loadDetailState(sectionId), ...patch };
  sessionStorage.setItem(detailStateKey(sectionId), JSON.stringify(next));
  return next;
}

function abortDetailRequests() {
  detailAbortController?.abort();
  tripRouteAbortController?.abort();
  chargingCurveAbortController?.abort();
  detailAbortController = null;
  tripRouteAbortController = null;
  chargingCurveAbortController = null;
}

function restoreListScroll(list, scrollTop) {
  requestAnimationFrame(() => { list.scrollTop = Math.max(0, Number(scrollTop) || 0); });
}

function detailPayloadKey(sectionId) {
  return `${sectionId}:${rangeQuery()}`;
}

function hideDetailViews() {
  [
    shellFields.tripsView, shellFields.chargingView, shellFields.energyView,
    shellFields.batteryView, shellFields.statusView, shellFields.statisticsView,
    shellFields.settingsView,
  ].forEach((view) => { view.hidden = true; });
}

function renderDetailPayload(sectionId, payload) {
  if (visibleDetailSectionId !== sectionId) hideDetailViews();
  shellFields.detailPlaceholder.hidden = true;
  if (sectionId === "trips") renderTrips(payload);
  else if (sectionId === "charging") renderCharging(payload);
  else if (sectionId === "energy") renderEnergy(payload);
  else if (sectionId === "battery") renderBattery(payload);
  else if (sectionId === "status") renderStatus(payload);
  else if (sectionId === "statistics") renderStatistics(payload);
  else renderSettings(payload);
  visibleDetailSectionId = sectionId;
  applyMetricExplanations(shellFields.detailContent);
}

function triggerDetailUpdate(element, className = "metric-updated") {
  if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.clearTimeout(detailAnimationTimers.get(element));
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  detailAnimationTimers.set(element, window.setTimeout(() => element.classList.remove(className), 360));
}

function renderMetricCards(container, items) {
  if (!container) return;
  const previous = new Map(Array.from(container.querySelectorAll("article")).map((article) => [
    article.querySelector("span")?.textContent?.trim(),
    article.querySelector("strong")?.textContent?.trim(),
  ]));
  container.innerHTML = items.map(([label, value, unit]) => `
    <article><span>${label}</span><strong>${value}${unit ? `<small>${unit}</small>` : ""}</strong></article>
  `).join("");
  container.querySelectorAll("article").forEach((article) => {
    const label = article.querySelector("span")?.textContent?.trim();
    const strong = article.querySelector("strong");
    const oldValue = previous.get(label);
    if (oldValue !== undefined && oldValue !== strong?.textContent?.trim()) triggerDetailUpdate(strong);
  });
}

function animateDetailChart(svg) {
  if (!svg) return;
  const signature = Array.from(svg.querySelectorAll("path, rect, circle"))
    .map((node) => `${node.tagName}:${node.getAttribute("d") || node.getAttribute("x") || node.getAttribute("cx") || ""}:${node.getAttribute("y") || node.getAttribute("cy") || ""}`)
    .join("|");
  const previous = svg.dataset.renderSignature;
  svg.dataset.renderSignature = signature;
  if (previous !== undefined && previous !== signature) triggerDetailUpdate(svg.parentElement, "chart-data-updated");
}

function setModuleMessage(element, message = "", { mode = "neutral", compact = false, retry = null } = {}) {
  if (!element) return;
  element.replaceChildren();
  element.hidden = !message;
  element.dataset.mode = mode;
  element.classList.toggle("is-compact", compact);
  if (!message) return;
  const label = document.createElement("span");
  label.textContent = message;
  element.appendChild(label);
  if (typeof retry === "function") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "module-retry-button";
    button.textContent = "重试";
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", retry, { once: true });
    element.appendChild(button);
  }
}

function markDetailRecovered() {
  if (!detailRecoveryPending) return;
  detailRecoveryPending = false;
  shellFields.detailView.classList.add("is-recovered");
  window.clearTimeout(detailRecoveryTimer);
  detailRecoveryTimer = window.setTimeout(() => shellFields.detailView.classList.remove("is-recovered"), 1800);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

const metricExplanations = {
  "纯消耗": "车辆驱动与用电产生的正向能量消耗，不扣除制动能量回收。",
  "净能耗": "纯消耗减去能量回收后的净电量变化。",
  "能量回收": "减速和制动过程中回充到电池的估算电量。",
  "平均能耗": "所选范围内纯消耗除以行驶里程。",
  "额定续航": "Tesla 按额定能耗模型估算的剩余续航。",
  "理想续航": "Tesla 按较理想工况估算的剩余续航。",
  "日均停车掉电": "所选范围内停车状态 SOC 下降总量除以有电池记录的自然日；排除驾驶、充电和明显异常跳变。",
  "最大单次掉电": "所选范围内相邻两次停车采样之间最大的 SOC 下降。",
  "当日停车掉电": "当天所有有效停车 SOC 下降采样之和。",
};

function applyMetricExplanations(root = document) {
  root.querySelectorAll("article > span").forEach((label) => {
    const explanation = metricExplanations[label.textContent.trim()];
    if (!explanation) return;
    label.classList.add("metric-help");
    label.tabIndex = 0;
    label.setAttribute("data-explanation", explanation);
    label.setAttribute("aria-label", `${label.textContent.trim()}：${explanation}`);
  });
}

function formatNumber(value, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return Number(value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}

function formatDuration(value) {
  const minutes = Math.round(Number(value) || 0);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} 小时 ${minutes % 60} 分钟` : `${minutes} 分钟`;
}

function loadRange() {
  try {
    const stored = JSON.parse(localStorage.getItem("tesla_cockpit_range") || "null");
    if (stored && rangeLabels[stored.key]) return stored;
  } catch (_) {
    // Ignore damaged local preferences.
  }
  return { key: "30d", start: "", end: "" };
}

function saveRange() {
  localStorage.setItem("tesla_cockpit_range", JSON.stringify(activeRange));
}

function currentSection(pathname = window.location.pathname) {
  return sections.find((section) => section.path === pathname)
    || fallbackSections.find((section) => section.path === pathname)
    || null;
}

function openMenu() {
  shellFields.menu.hidden = false;
  shellFields.menuBackdrop.hidden = false;
  requestAnimationFrame(() => document.body.classList.add("menu-open"));
  shellFields.menu.setAttribute("aria-hidden", "false");
  shellFields.menuClose.focus({ preventScroll: true });
}

function closeMenu({ restoreFocus = false } = {}) {
  document.body.classList.remove("menu-open");
  shellFields.menu.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!document.body.classList.contains("menu-open")) {
      shellFields.menu.hidden = true;
      shellFields.menuBackdrop.hidden = true;
    }
  }, 260);
  if (restoreFocus) (shellFields.detailView.hidden ? shellFields.menuTrigger : shellFields.detailMenuTrigger).focus();
}

function renderMenu() {
  shellFields.menuNav.innerHTML = sections.map((section) => `
    <a class="menu-link" href="${section.path}" data-route="${section.path}" data-section="${section.id}">
      <span>${section.label}</span><small>${section.description}</small>
    </a>
  `).join("");
}

function renderRange() {
  document.querySelectorAll("[data-range]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.range === activeRange.key));
  });
  shellFields.customRange.hidden = activeRange.key !== "custom";
  shellFields.rangeStart.value = activeRange.start || "";
  shellFields.rangeEnd.value = activeRange.end || "";
}

function showPlaceholder(message, loading = false, retry = false) {
  shellFields.detailPlaceholder.hidden = false;
  hideDetailViews();
  visibleDetailSectionId = null;
  shellFields.detailStatus.textContent = message;
  shellFields.detailPlaceholder.classList.toggle("is-loading", loading);
  shellFields.detailPlaceholder.classList.toggle("has-error", retry);
  if (shellFields.detailRetry) shellFields.detailRetry.hidden = !retry;
}

function rangeQuery() {
  const params = new URLSearchParams({ range: activeRange.key });
  if (activeRange.key === "custom") {
    params.set("start", activeRange.start || "");
    params.set("end", activeRange.end || "");
  }
  return params.toString();
}

async function loadDetail(section) {
  if (!["trips", "charging", "energy", "battery", "status", "statistics", "settings"].includes(section.id)) {
    showPlaceholder(`${rangeLabels[activeRange.key]}的数据视图将在下一阶段接入。`);
    return;
  }
  if (section.id !== "settings" && activeRange.key === "custom" && (!activeRange.start || !activeRange.end)) {
    showPlaceholder("请选择完整的开始和结束日期。", false);
    return;
  }
  abortDetailRequests();
  const controller = new AbortController();
  detailAbortController = controller;
  const requestId = ++detailRequestId;
  const cacheKey = detailPayloadKey(section.id);
  const cached = detailPayloadCache.get(cacheKey);
  if (!navigator.onLine) {
    shellFields.detailView.classList.add("has-sync-error");
    shellFields.detailView.classList.toggle("is-cache-fallback", Boolean(cached));
    shellFields.detailView.classList.remove("is-refreshing");
    detailRecoveryPending = true;
    if (cached) {
      renderDetailPayload(section.id, cached.payload);
      shellFields.detailUpdatedAt.textContent = "网络已断开 · 显示缓存";
    } else {
      shellFields.detailUpdatedAt.textContent = "网络已断开";
      showPlaceholder("网络已断开，恢复后将自动重新加载。", false, true);
    }
    shellFields.detailRefresh.disabled = false;
    detailAbortController = null;
    detailRefreshRequested = false;
    return;
  }
  shellFields.detailRefresh.disabled = true;
  shellFields.detailView.classList.add("is-refreshing");
  shellFields.detailView.classList.remove("has-sync-error");
  shellFields.detailView.classList.remove("is-cache-fallback");
  const loadingText = { trips: "正在读取 Grafana 行程数据…", charging: "正在读取 Grafana 充电数据…", energy: "正在聚合 Grafana 能耗数据…", battery: "正在聚合 Grafana 电池数据…", status: "正在读取 Grafana 状态时间线…", statistics: "正在汇总所选时间范围的数据…", settings: "正在检查服务与数据源状态…" };
  if (cached) {
    renderDetailPayload(section.id, cached.payload);
    shellFields.detailUpdatedAt.textContent = "后台更新中";
  } else {
    showPlaceholder(loadingText[section.id], true);
    shellFields.detailUpdatedAt.textContent = "正在更新";
  }
  try {
    const force = detailRefreshRequested ? `${section.id === "settings" ? "?" : "&"}force=1` : "";
    const endpoint = section.id === "settings" ? `/api/settings${force}` : `/api/detail/${section.id}?${rangeQuery()}${force}`;
    const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `行程接口 ${response.status}`);
    if (requestId !== detailRequestId) return;
    detailPayloadCache.set(cacheKey, { payload, updatedAt: Date.now() });
    renderDetailPayload(section.id, payload);
    const updated = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    shellFields.detailUpdatedAt.textContent = `更新于 ${updated}`;
    markDetailRecovered();
  } catch (error) {
    if (error.name === "AbortError") return;
    if (requestId === detailRequestId) {
      shellFields.detailView.classList.add("has-sync-error");
      shellFields.detailView.classList.toggle("is-cache-fallback", Boolean(cached));
      detailRecoveryPending = true;
      if (cached) shellFields.detailUpdatedAt.textContent = "更新失败 · 显示缓存";
      else {
        shellFields.detailUpdatedAt.textContent = "更新失败";
        showPlaceholder(`${section.label}数据读取失败：${error.message}`, false, true);
      }
    }
  } finally {
    if (requestId === detailRequestId && detailAbortController === controller) {
      shellFields.detailRefresh.disabled = false;
      shellFields.detailView.classList.remove("is-refreshing");
    }
    detailRefreshRequested = false;
  }
}

function renderTrips(payload) {
  activeTrips = payload.trips || [];
  tripsPagination = { ...(payload.pagination || {}), loading: false };
  shellFields.detailPlaceholder.hidden = true;
  shellFields.tripsView.hidden = false;
  const summary = payload.summary || {};
  const summaryItems = [
    ["行程次数", formatNumber(summary.count), "次"],
    ["累计里程", formatNumber(summary.distanceKm, 1), "km"],
    ["驾驶时间", formatDuration(summary.durationMin), ""],
    ["纯消耗", formatNumber(summary.energyKwh, 1), "kWh"],
    ["平均能耗", formatNumber(summary.consumptionWhKm), "Wh/km"],
  ];
  renderMetricCards(shellFields.tripSummary, summaryItems);
  shellFields.tripListCount.textContent = `${formatNumber(tripsPagination.total || summary.count)} 条`;
  if (!activeTrips.length) {
    shellFields.tripList.innerHTML = '<div class="trip-empty">该时间范围内没有行程</div>';
    clearTripDetail("暂无可显示的行程");
    return;
  }
  shellFields.tripList.innerHTML = activeTrips.map((trip) => `
    <button class="trip-row" type="button" data-trip-id="${trip.id}" aria-pressed="false">
      <span class="trip-row-time">${formatDateTime(trip.start)}</span>
      <strong>${formatNumber(trip.distanceKm, 1)} <small>km</small></strong>
      <span class="trip-row-route">${escapeHtml(trip.startName)}<b>→</b>${escapeHtml(trip.endName)}</span>
      <span class="trip-row-meta">${formatDuration(trip.durationMin)} · ${formatNumber(trip.consumptionWhKm)} Wh/km</span>
    </button>
  `).join("") + (tripsPagination.hasMore ? '<div class="trip-list-more">继续向下滚动加载</div>' : "");
  restoreTripsState();
}

async function restoreTripsState() {
  const controller = detailAbortController;
  const state = loadDetailState("trips");
  while (Number(state.page || 1) > Number(tripsPagination.page || 1) && tripsPagination.hasMore) {
    if (!await loadMoreTrips()) break;
  }
  if (controller?.signal.aborted || controller !== detailAbortController) return;
  const selectedId = activeTrips.some((trip) => trip.id === Number(state.selectedId)) ? Number(state.selectedId) : activeTrips[0]?.id;
  if (selectedId != null) selectTrip(selectedId);
  restoreListScroll(shellFields.tripList, state.scrollTop);
}

async function loadMoreTrips() {
  if (tripsPagination.loading || !tripsPagination.hasMore) return;
  tripsPagination.loading = true;
  const indicator = shellFields.tripList.querySelector(".trip-list-more");
  if (indicator) indicator.textContent = "正在载入更多行程…";
  try {
    const nextPage = Number(tripsPagination.page || 1) + 1;
    const response = await fetch(`/api/detail/trips?${rangeQuery()}&page=${nextPage}&pageSize=40`, { cache: "no-store", signal: detailAbortController?.signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "更多行程读取失败");
    const newTrips = payload.trips || [];
    activeTrips.push(...newTrips);
    tripsPagination = { ...(payload.pagination || {}), loading: false };
    indicator?.remove();
    shellFields.tripList.insertAdjacentHTML("beforeend", newTrips.map((trip) => `
      <button class="trip-row" type="button" data-trip-id="${trip.id}" aria-pressed="false">
        <span class="trip-row-time">${formatDateTime(trip.start)}</span>
        <strong>${formatNumber(trip.distanceKm, 1)} <small>km</small></strong>
        <span class="trip-row-route">${escapeHtml(trip.startName)}<b>→</b>${escapeHtml(trip.endName)}</span>
        <span class="trip-row-meta">${formatDuration(trip.durationMin)} · ${formatNumber(trip.consumptionWhKm)} Wh/km</span>
      </button>
    `).join("") + (tripsPagination.hasMore ? '<div class="trip-list-more">继续向下滚动加载</div>' : ""));
    saveDetailState("trips", { page: tripsPagination.page });
    return true;
  } catch (error) {
    tripsPagination.loading = false;
    if (error.name === "AbortError") return false;
    if (indicator) indicator.textContent = `加载失败：${error.message}`;
    return false;
  }
}

function renderCharging(payload) {
  activeChargingSessions = payload.sessions || [];
  chargingPagination = { ...(payload.pagination || {}), loading: false };
  shellFields.detailPlaceholder.hidden = true;
  shellFields.tripsView.hidden = true;
  shellFields.chargingView.hidden = false;
  const summary = payload.summary || {};
  const items = [
    ["充电次数", formatNumber(summary.count), "次"],
    ["补充电量", formatNumber(summary.energyAddedKwh, 1), "kWh"],
    ["充电时长", formatDuration(summary.durationMin), ""],
    ["平均功率", formatNumber(summary.averagePowerKw, 1), "kW"],
    ["平均增幅", formatNumber(summary.averageGain), "%"],
  ];
  renderMetricCards(shellFields.chargingSummary, items);
  shellFields.chargingListCount.textContent = `${formatNumber(chargingPagination.total || summary.count)} 条`;
  if (!activeChargingSessions.length) {
    shellFields.chargingList.innerHTML = '<div class="trip-empty">该时间范围内没有充电记录</div>';
    clearChargingDetail("暂无可显示的充电记录");
    return;
  }
  shellFields.chargingList.innerHTML = activeChargingSessions.map((session) => `
    <button class="trip-row charging-row" type="button" data-charging-id="${session.id}" aria-pressed="false">
      <span class="trip-row-time">${formatDateTime(session.start)}</span>
      <strong>${formatNumber(session.energyAddedKwh, 1)} <small>kWh</small></strong>
      <span class="trip-row-route">${escapeHtml(session.locationName)}</span>
      <span class="trip-row-meta">${formatNumber(session.startLevel)}% → ${formatNumber(session.endLevel)}% · ${formatDuration(session.durationMin)}</span>
    </button>
  `).join("") + (chargingPagination.hasMore ? '<div class="trip-list-more">继续向下滚动加载</div>' : "");
  restoreChargingState();
}

async function restoreChargingState() {
  const controller = detailAbortController;
  const state = loadDetailState("charging");
  while (Number(state.page || 1) > Number(chargingPagination.page || 1) && chargingPagination.hasMore) {
    if (!await loadMoreCharging()) break;
  }
  if (controller?.signal.aborted || controller !== detailAbortController) return;
  const selectedId = activeChargingSessions.some((session) => session.id === Number(state.selectedId)) ? Number(state.selectedId) : activeChargingSessions[0]?.id;
  if (selectedId != null) selectCharging(selectedId);
  restoreListScroll(shellFields.chargingList, state.scrollTop);
}

async function loadMoreCharging() {
  if (chargingPagination.loading || !chargingPagination.hasMore) return;
  chargingPagination.loading = true;
  const indicator = shellFields.chargingList.querySelector(".trip-list-more");
  if (indicator) indicator.textContent = "正在载入更多充电记录…";
  try {
    const nextPage = Number(chargingPagination.page || 1) + 1;
    const response = await fetch(`/api/detail/charging?${rangeQuery()}&page=${nextPage}&pageSize=40`, { cache: "no-store", signal: detailAbortController?.signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "更多充电记录读取失败");
    const sessions = payload.sessions || [];
    activeChargingSessions.push(...sessions);
    chargingPagination = { ...(payload.pagination || {}), loading: false };
    indicator?.remove();
    shellFields.chargingList.insertAdjacentHTML("beforeend", sessions.map((session) => `
      <button class="trip-row charging-row" type="button" data-charging-id="${session.id}" aria-pressed="false">
        <span class="trip-row-time">${formatDateTime(session.start)}</span>
        <strong>${formatNumber(session.energyAddedKwh, 1)} <small>kWh</small></strong>
        <span class="trip-row-route">${escapeHtml(session.locationName)}</span>
        <span class="trip-row-meta">${formatNumber(session.startLevel)}% → ${formatNumber(session.endLevel)}% · ${formatDuration(session.durationMin)}</span>
      </button>
    `).join("") + (chargingPagination.hasMore ? '<div class="trip-list-more">继续向下滚动加载</div>' : ""));
    saveDetailState("charging", { page: chargingPagination.page });
    return true;
  } catch (error) {
    chargingPagination.loading = false;
    if (error.name === "AbortError") return false;
    if (indicator) indicator.textContent = `加载失败：${error.message}`;
    return false;
  }
}

function renderEnergy(payload) {
  activeEnergyDays = payload.days || [];
  shellFields.detailPlaceholder.hidden = true;
  shellFields.tripsView.hidden = true;
  shellFields.chargingView.hidden = true;
  shellFields.energyView.hidden = false;
  const summary = payload.summary || {};
  const items = [
    ["纯消耗", formatNumber(summary.grossKwh, 1), "kWh"],
    ["净能耗", formatNumber(summary.netKwh, 1), "kWh"],
    ["能量回收", formatNumber(summary.regenKwh, 1), "kWh"],
    ["平均能耗", formatNumber(summary.averageWhKm), "Wh/km"],
    ["累计里程", formatNumber(summary.distanceKm, 1), "km"],
  ];
  renderMetricCards(shellFields.energySummary, items);
  shellFields.energyDayCount.textContent = `${activeEnergyDays.length} 天`;
  if (!activeEnergyDays.length) {
    shellFields.energyDayList.innerHTML = '<div class="trip-empty">该时间范围内没有能耗记录</div>';
    shellFields.energyDetailEmpty.textContent = "暂无能耗趋势";
    shellFields.energyDetailEmpty.hidden = false;
    shellFields.energyDayTitle.textContent = "暂无数据";
    shellFields.energyDayMetrics.innerHTML = "";
    return;
  }
  shellFields.energyDayList.innerHTML = [...activeEnergyDays].reverse().map((day) => `
    <button class="trip-row energy-day-row" type="button" data-energy-day="${day.day}" aria-pressed="false">
      <span class="trip-row-time">${formatDay(day.day)}</span>
      <strong>${formatNumber(day.averageWhKm)} <small>Wh/km</small></strong>
      <span class="trip-row-route">${formatNumber(day.distanceKm, 1)} km · ${day.tripCount} 次行程</span>
      <span class="trip-row-meta">纯消耗 ${formatNumber(day.grossKwh, 1)} kWh · 回收 ${formatNumber(day.regenKwh, 1)} kWh</span>
    </button>
  `).join("");
  renderEnergyDetailChart(activeEnergyDays);
  const energyState = loadDetailState("energy");
  const energyDay = activeEnergyDays.some((day) => day.day === energyState.selectedId) ? energyState.selectedId : activeEnergyDays.at(-1).day;
  selectEnergyDay(energyDay);
  restoreListScroll(shellFields.energyDayList, energyState.scrollTop);
}

function renderBattery(payload) {
  activeBatteryDays = payload.days || [];
  shellFields.detailPlaceholder.hidden = true;
  shellFields.tripsView.hidden = true;
  shellFields.chargingView.hidden = true;
  shellFields.energyView.hidden = true;
  shellFields.batteryView.hidden = false;
  const summary = payload.summary || {};
  const items = [
    ["当前电量", formatNumber(summary.currentLevel), "%"],
    ["额定续航", formatNumber(summary.ratedKm), "km"],
    ["理想续航", formatNumber(summary.idealKm), "km"],
    ["周期最低", formatNumber(summary.observedMinimum), "%"],
    ["日均停车掉电", formatNumber(summary.averageDailyParkingDropPct, 1), "%"],
    ["最大单次掉电", formatNumber(summary.maximumParkingDropPct, 1), "%"],
  ];
  renderMetricCards(shellFields.batterySummary, items);
  shellFields.batteryDayCount.textContent = `${activeBatteryDays.length} 天`;
  if (!activeBatteryDays.length) {
    shellFields.batteryDayList.innerHTML = '<div class="trip-empty">该时间范围内没有电池记录</div>';
    shellFields.batteryDetailEmpty.textContent = "暂无电量历史";
    shellFields.batteryDetailEmpty.hidden = false;
    shellFields.batteryDayTitle.textContent = "暂无数据";
    shellFields.batteryDayMetrics.innerHTML = "";
    return;
  }
  shellFields.batteryDayList.innerHTML = [...activeBatteryDays].reverse().map((day) => `
    <button class="trip-row battery-day-row" type="button" data-battery-day="${day.day}" aria-pressed="false">
      <span class="trip-row-time">${formatDay(day.day)}</span>
      <strong>${formatNumber(day.endingLevel)} <small>%</small></strong>
      <span class="trip-row-route">${formatNumber(day.minimumLevel)}% - ${formatNumber(day.maximumLevel)}%</span>
      <span class="trip-row-meta">额定 ${formatNumber(day.ratedKm)} km · 当日停车掉电 ${formatNumber(day.parkingDropPct, 1)}%</span>
    </button>
  `).join("");
  renderBatteryDetailChart(activeBatteryDays);
  const batteryState = loadDetailState("battery");
  const batteryDay = activeBatteryDays.some((day) => day.day === batteryState.selectedId) ? batteryState.selectedId : activeBatteryDays.at(-1).day;
  selectBatteryDay(batteryDay);
  restoreListScroll(shellFields.batteryDayList, batteryState.scrollTop);
}

const vehicleStateMeta = {
  online: { label: "在线", color: "#34c759" },
  asleep: { label: "休眠", color: "#8e8e93" },
  driving: { label: "驾驶", color: "#0a84ff" },
  charging: { label: "充电", color: "#ff9f0a" },
  offline: { label: "离线", color: "#ff453a" },
  updating: { label: "更新中", color: "#af52de" },
  suspended: { label: "暂停", color: "#ffd60a" },
  unknown: { label: "未知", color: "#c7c7cc" },
};

function stateMeta(state) {
  return vehicleStateMeta[String(state || "unknown").toLowerCase()] || { label: "未知", color: "#c7c7cc" };
}

function renderStatus(payload) {
  activeStatusEvents = payload.events || [];
  statusPagination = { ...(payload.pagination || {}), loading: false };
  shellFields.detailPlaceholder.hidden = true;
  shellFields.tripsView.hidden = true;
  shellFields.chargingView.hidden = true;
  shellFields.energyView.hidden = true;
  shellFields.batteryView.hidden = true;
  shellFields.statusView.hidden = false;
  const summary = payload.summary || {};
  const totals = summary.totals || {};
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const summaryStates = [summary.currentState, ...ranked.map(([state]) => state)].filter((state, index, all) => state && all.indexOf(state) === index).slice(0, 4);
  const items = [
    ["当前状态", stateMeta(summary.currentState).label, ""],
    ...summaryStates.slice(0, 4).map((state) => [stateMeta(state).label, formatDuration(totals[state] || 0), ""]),
  ].slice(0, 5);
  renderMetricCards(shellFields.statusSummary, items);
  const totalDuration = Math.max(1, Number(summary.totalDurationMin) || 0);
  shellFields.statusDistribution.innerHTML = ranked.map(([state, duration]) => `<span title="${stateMeta(state).label} ${formatDuration(duration)}" style="width:${Math.max(0.4, duration / totalDuration * 100).toFixed(2)}%;background:${stateMeta(state).color}"></span>`).join("");
  shellFields.statusLegend.innerHTML = ranked.map(([state, duration]) => `<span><i style="background:${stateMeta(state).color}"></i>${stateMeta(state).label}<b>${formatDuration(duration)}</b></span>`).join("");
  shellFields.statusEventCount.textContent = `${formatNumber(statusPagination.total || summary.eventCount)} 段`;
  if (!activeStatusEvents.length) {
    shellFields.statusEventList.innerHTML = '<div class="trip-empty">该时间范围内没有状态记录</div>';
    shellFields.statusEventTitle.textContent = "暂无数据";
    shellFields.statusEventMetrics.innerHTML = "";
    return;
  }
  shellFields.statusEventList.innerHTML = activeStatusEvents.map((event) => {
    const meta = stateMeta(event.state);
    return `<button class="trip-row status-event-row" type="button" data-status-id="${event.id}" aria-pressed="false">
      <span class="trip-row-time">${formatDateTime(event.start)}</span>
      <strong>${formatDuration(event.durationMin)}</strong>
      <span class="trip-row-route"><i class="status-event-dot" style="background:${meta.color}"></i>${meta.label}</span>
      <span class="trip-row-meta">至 ${formatDateTime(event.end)}</span>
    </button>`;
  }).join("") + (statusPagination.hasMore ? '<div class="trip-list-more">继续向下滚动加载</div>' : "");
  restoreStatusState();
}

async function restoreStatusState() {
  const controller = detailAbortController;
  const state = loadDetailState("status");
  while (Number(state.page || 1) > Number(statusPagination.page || 1) && statusPagination.hasMore) {
    if (!await loadMoreStatusEvents()) break;
  }
  if (controller?.signal.aborted || controller !== detailAbortController) return;
  const selectedId = activeStatusEvents.some((event) => event.id === Number(state.selectedId)) ? Number(state.selectedId) : activeStatusEvents[0]?.id;
  if (selectedId != null) selectStatusEvent(selectedId);
  restoreListScroll(shellFields.statusEventList, state.scrollTop);
}

async function loadMoreStatusEvents() {
  if (statusPagination.loading || !statusPagination.hasMore) return;
  statusPagination.loading = true;
  const indicator = shellFields.statusEventList.querySelector(".trip-list-more");
  if (indicator) indicator.textContent = "正在载入更多状态记录…";
  try {
    const nextPage = Number(statusPagination.page || 1) + 1;
    const response = await fetch(`/api/detail/status?${rangeQuery()}&page=${nextPage}&pageSize=40`, { cache: "no-store", signal: detailAbortController?.signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "更多状态记录读取失败");
    const events = payload.events || [];
    activeStatusEvents.push(...events);
    statusPagination = { ...(payload.pagination || {}), loading: false };
    indicator?.remove();
    shellFields.statusEventList.insertAdjacentHTML("beforeend", events.map((event) => {
      const meta = stateMeta(event.state);
      return `<button class="trip-row status-event-row" type="button" data-status-id="${event.id}" aria-pressed="false">
        <span class="trip-row-time">${formatDateTime(event.start)}</span>
        <strong>${formatDuration(event.durationMin)}</strong>
        <span class="trip-row-route"><i class="status-event-dot" style="background:${meta.color}"></i>${meta.label}</span>
        <span class="trip-row-meta">至 ${formatDateTime(event.end)}</span>
      </button>`;
    }).join("") + (statusPagination.hasMore ? '<div class="trip-list-more">继续向下滚动加载</div>' : ""));
    saveDetailState("status", { page: statusPagination.page });
    return true;
  } catch (error) {
    statusPagination.loading = false;
    if (error.name === "AbortError") return false;
    if (indicator) indicator.textContent = `加载失败：${error.message}`;
    return false;
  }
}

function renderStatistics(payload) {
  activeStatisticsDays = payload.days || [];
  shellFields.detailPlaceholder.hidden = true;
  shellFields.tripsView.hidden = true;
  shellFields.chargingView.hidden = true;
  shellFields.energyView.hidden = true;
  shellFields.batteryView.hidden = true;
  shellFields.statusView.hidden = true;
  shellFields.statisticsView.hidden = false;
  const summary = payload.summary || {};
  const items = [
    ["累计里程", formatNumber(summary.distanceKm, 1), "km"],
    ["驾驶时间", formatDuration(summary.durationMin), ""],
    ["行程次数", formatNumber(summary.tripCount), "次"],
    ["平均能耗", formatNumber(summary.averageWhKm), "Wh/km"],
    ["纯消耗", formatNumber(summary.grossKwh, 1), "kWh"],
  ];
  renderMetricCards(shellFields.statisticsSummary, items);
  const states = payload.states || {};
  const ranked = Object.entries(states).sort((a, b) => b[1] - a[1]);
  const total = Math.max(1, Number(payload.stateDurationMin) || 0);
  shellFields.statisticsStateDistribution.innerHTML = ranked.map(([state, duration]) => `<span title="${stateMeta(state).label} ${formatDuration(duration)}" style="width:${Math.max(0.4, duration / total * 100).toFixed(2)}%;background:${stateMeta(state).color}"></span>`).join("");
  shellFields.statisticsStateLegend.innerHTML = ranked.length
    ? ranked.map(([state, duration]) => `<span><i style="background:${stateMeta(state).color}"></i>${stateMeta(state).label}<b>${formatDuration(duration)}</b></span>`).join("")
    : '<span class="statistics-empty-text">暂无状态数据</span>';
  const breakdown = [
    ["能量回收", formatNumber(summary.regenKwh, 1), "kWh", "#34c759"],
    ["补充电量", formatNumber(summary.chargedKwh, 1), "kWh", "#0a84ff"],
    ["充电次数", formatNumber(summary.chargingCount), "次", "#ff9f0a"],
    ["充电时长", formatDuration(summary.chargingDurationMin), "", "#af52de"],
    ["日均停车掉电", formatNumber(summary.averageDailyParkingDropPct, 1), "%", "#5ac8fa"],
    ["最大单次掉电", formatNumber(summary.maximumParkingDropPct, 1), "%", "#8e8e93"],
  ];
  shellFields.statisticsBreakdown.innerHTML = breakdown.map(([label, value, unit, color]) => `
    <article><i style="background:${color}"></i><span>${label}</span><strong>${value}${unit ? `<small>${unit}</small>` : ""}</strong></article>
  `).join("");
  renderStatisticsChart(activeStatisticsDays);
}

function renderStatisticsChart(days) {
  if (!days.length) {
    shellFields.statisticsGrid.innerHTML = "";
    shellFields.statisticsBars.innerHTML = "";
    shellFields.statisticsLine.setAttribute("d", "");
    shellFields.statisticsDots.innerHTML = "";
    shellFields.statisticsChartEmpty.textContent = "该时间范围内没有行驶数据";
    shellFields.statisticsChartEmpty.hidden = false;
    return;
  }
  const bounds = shellFields.statisticsChart.getBoundingClientRect();
  const width = Math.max(760, Math.round(bounds.width));
  const height = Math.max(300, Math.round(bounds.height));
  const left = 56; const right = 54; const top = 30; const bottom = 44;
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  shellFields.statisticsChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const maxDistance = Math.max(10, ...days.map((day) => Number(day.distanceKm) || 0));
  const maxWh = Math.max(100, ...days.map((day) => Number(day.averageWhKm) || 0));
  const x = (index) => left + (days.length === 1 ? plotWidth / 2 : index / (days.length - 1) * plotWidth);
  const distanceHeight = (value) => Math.max(0, Number(value) || 0) / maxDistance * plotHeight;
  const whY = (value) => top + (1 - Math.max(0, Number(value) || 0) / maxWh) * plotHeight;
  const spacing = plotWidth / Math.max(days.length, 1);
  const barWidth = Math.max(3, Math.min(20, spacing * 0.48));
  shellFields.statisticsBars.innerHTML = days.map((day, index) => {
    const h = distanceHeight(day.distanceKm);
    return `<rect x="${(x(index) - barWidth / 2).toFixed(1)}" y="${(top + plotHeight - h).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(5, barWidth / 2).toFixed(1)}"></rect>`;
  }).join("");
  const validDays = days.map((day, index) => ({ day, index })).filter(({ day }) => Number(day.averageWhKm) > 0);
  shellFields.statisticsLine.setAttribute("d", validDays.map(({ day, index }, pointIndex) => `${pointIndex ? "L" : "M"} ${x(index).toFixed(1)} ${whY(day.averageWhKm).toFixed(1)}`).join(" "));
  shellFields.statisticsDots.innerHTML = validDays.map(({ day, index }) => `<circle cx="${x(index).toFixed(1)}" cy="${whY(day.averageWhKm).toFixed(1)}" r="3.5"><title>${formatDay(day.day)} · ${formatNumber(day.averageWhKm)} Wh/km</title></circle>`).join("");
  const horizontal = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = top + (1 - ratio) * plotHeight;
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text x="${left - 9}" y="${y + 4}" text-anchor="end">${Math.round(maxWh * ratio)}</text><text x="${width - right + 9}" y="${y + 4}">${formatNumber(maxDistance * ratio, 0)}</text>`;
  }).join("");
  const labelCount = Math.min(6, days.length);
  const labelIndexes = Array.from(new Set(Array.from({ length: labelCount }, (_, index) => Math.round(index * (days.length - 1) / Math.max(1, labelCount - 1)))));
  const labels = labelIndexes.map((index) => `<text x="${x(index)}" y="${height - 15}" text-anchor="middle">${days[index].day.slice(5).replace("-", "/")}</text>`).join("");
  shellFields.statisticsGrid.innerHTML = horizontal + labels + `<text class="power-scale" x="${left}" y="${top - 11}">Wh/km</text><text class="power-scale" x="${width - right}" y="${top - 11}" text-anchor="end">km</text>`;
  shellFields.statisticsChartEmpty.hidden = true;
  animateDetailChart(shellFields.statisticsChart);
}

function settingsRows(items) {
  return items.map(([label, value, tone = ""]) => `<article><span>${label}</span><strong class="${tone}">${escapeHtml(value)}</strong></article>`).join("");
}

function renderSettings(payload) {
  shellFields.detailPlaceholder.hidden = true;
  shellFields.tripsView.hidden = true;
  shellFields.chargingView.hidden = true;
  shellFields.energyView.hidden = true;
  shellFields.batteryView.hidden = true;
  shellFields.statusView.hidden = true;
  shellFields.statisticsView.hidden = true;
  shellFields.settingsView.hidden = false;
  const service = payload.service || {};
  const grafana = payload.grafana || {};
  const refresh = payload.refresh || {};
  const security = payload.security || {};
  const allOnline = service.status === "online" && grafana.status === "online";
  shellFields.settingsOverallStatus.textContent = allOnline ? "运行正常" : "需要检查";
  shellFields.settingsOverallStatus.classList.toggle("is-error", !allOnline);
  shellFields.settingsRuntime.innerHTML = settingsRows([
    ["Cockpit 服务", service.status === "online" ? "在线" : "异常", service.status === "online" ? "is-good" : "is-bad"],
    ["Grafana 数据源", grafana.status === "online" ? "已连接" : "连接失败", grafana.status === "online" ? "is-good" : "is-bad"],
    ["Grafana 主机", grafana.host || "--"],
    ["数据源配置", grafana.datasourceConfigured ? "已配置" : "未配置", grafana.datasourceConfigured ? "is-good" : "is-bad"],
    ["查询延迟", `${formatNumber(grafana.latencyMs)} ms`],
    ["服务运行时间", formatDuration((Number(service.uptimeSeconds) || 0) / 60)],
  ]);
  shellFields.settingsRefresh.innerHTML = settingsRows([
    ["车辆在线刷新", `${formatNumber(refresh.activeSeconds)} 秒`],
    ["车辆休眠刷新", `${formatNumber((refresh.restingSeconds || 0) / 60)} 分钟`],
    ["详情数据缓存", `${formatNumber((refresh.detailCacheSeconds || 0) / 60)} 分钟`],
    ["地址识别缓存", `${formatNumber((refresh.addressCacheSeconds || 0) / 60)} 分钟`],
    ["数据访问模式", payload.readOnly ? "只读" : "可写", payload.readOnly ? "is-good" : "is-bad"],
  ]);
  shellFields.settingsSecurity.innerHTML = settingsRows([
    ["密码存储", security.passwordHashed ? "PBKDF2 哈希" : "需要迁移", security.passwordHashed ? "is-good" : "is-bad"],
    ["会话有效期", `${formatNumber(security.sessionDays)} 天`],
    ["失败锁定", `${formatNumber(security.loginLockThreshold)} 次后锁定`],
    ["锁定时长", `${formatNumber(security.loginLockMinutes)} 分钟`],
    ["配置托管", security.passwordManagedByEnvironment ? "服务器环境变量" : "Cockpit 配置文件"],
  ]);
  const quality = payload.dataQuality;
  const issues = quality?.issues || [];
  const issueCount = Number(quality?.issueCount || 0);
  shellFields.settingsQualityStatus.textContent = issueCount ? `${issueCount} 条异常` : "未发现异常";
  shellFields.settingsQualityStatus.classList.toggle("is-error", issueCount > 0);
  shellFields.settingsQuality.innerHTML = quality ? issues.map((issue) => `
    <article class="${issue.count ? "has-issue" : ""}">
      <i></i><div><strong>${escapeHtml(issue.label)}</strong><span>${escapeHtml(issue.detail)}</span></div><b>${formatNumber(issue.count)}</b>
    </article>
  `).join("") : '<p class="settings-quality-empty">Grafana 未连接，暂时无法检查数据质量。</p>';
  const managed = Boolean(security.passwordManagedByEnvironment);
  shellFields.passwordForm.querySelectorAll("input, button").forEach((field) => { field.disabled = managed; });
  shellFields.passwordStatus.textContent = managed ? "密码由服务器环境变量托管，请在服务器侧修改。" : "新密码至少 10 位，修改成功后需要重新登录。";
  shellFields.passwordStatus.className = managed ? "is-warning" : "";
}

async function updatePassword(event) {
  event.preventDefault();
  shellFields.passwordSubmit.disabled = true;
  shellFields.passwordStatus.className = "";
  shellFields.passwordStatus.textContent = "正在更新密码…";
  try {
    const response = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        currentPassword: shellFields.currentPassword.value,
        newPassword: shellFields.newPassword.value,
        confirmPassword: shellFields.confirmPassword.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "密码更新失败");
    shellFields.passwordStatus.className = "is-success";
    shellFields.passwordStatus.textContent = payload.message;
    shellFields.passwordForm.reset();
    window.setTimeout(() => { window.location.href = "/login"; }, 900);
  } catch (error) {
    shellFields.passwordStatus.className = "is-error";
    shellFields.passwordStatus.textContent = error.message;
    shellFields.passwordSubmit.disabled = false;
  }
}

function selectStatusEvent(eventId) {
  const event = activeStatusEvents.find((item) => item.id === Number(eventId));
  if (!event) return;
  saveDetailState("status", { selectedId: event.id });
  const eventIndex = activeStatusEvents.indexOf(event);
  const previousEvent = activeStatusEvents[eventIndex + 1];
  const nextEvent = activeStatusEvents[eventIndex - 1];
  const meta = stateMeta(event.state);
  document.querySelectorAll(".status-event-row").forEach((row) => row.setAttribute("aria-pressed", String(Number(row.dataset.statusId) === event.id)));
  shellFields.statusEventTitle.textContent = meta.label;
  const metrics = [
    ["状态", meta.label, ""],
    ["开始时间", formatDateTime(event.start), ""],
    ["结束时间", formatDateTime(event.end), ""],
    ["持续时间", formatDuration(event.durationMin), ""],
    ["上一状态", previousEvent ? stateMeta(previousEvent.state).label : "无", ""],
    ["下一状态", nextEvent ? stateMeta(nextEvent.state).label : "无", ""],
  ];
  renderMetricCards(shellFields.statusEventMetrics, metrics);
}

function selectBatteryDay(dayKey) {
  const day = activeBatteryDays.find((item) => item.day === dayKey);
  if (!day) return;
  saveDetailState("battery", { selectedId: day.day });
  document.querySelectorAll(".battery-day-row").forEach((row) => row.setAttribute("aria-pressed", String(row.dataset.batteryDay === dayKey)));
  shellFields.batteryDayTitle.textContent = formatDay(day.day);
  const metrics = [
    ["结束电量", formatNumber(day.endingLevel), "%"],
    ["最高电量", formatNumber(day.maximumLevel), "%"],
    ["最低电量", formatNumber(day.minimumLevel), "%"],
    ["额定续航", formatNumber(day.ratedKm), "km"],
    ["理想续航", formatNumber(day.idealKm), "km"],
    ["当日停车掉电", formatNumber(day.parkingDropPct, 1), "%"],
  ];
  renderMetricCards(shellFields.batteryDayMetrics, metrics);
}

function renderBatteryDetailChart(days) {
  const bounds = shellFields.batteryDetailChart.getBoundingClientRect();
  const width = Math.max(760, Math.round(bounds.width));
  const height = Math.max(300, Math.round(bounds.height));
  const left = 54; const right = 30; const top = 28; const bottom = 44;
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  shellFields.batteryDetailChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const x = (index) => left + (days.length === 1 ? plotWidth / 2 : index / (days.length - 1) * plotWidth);
  const y = (value) => top + (1 - Math.max(0, Math.min(100, Number(value) || 0)) / 100) * plotHeight;
  const spacing = plotWidth / Math.max(days.length, 1);
  const barWidth = Math.max(4, Math.min(16, spacing * 0.42));
  shellFields.batteryDetailRanges.innerHTML = days.map((day, index) => {
    const topY = y(day.maximumLevel); const bottomY = y(day.minimumLevel);
    return `<rect x="${(x(index) - barWidth / 2).toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(3, bottomY - topY).toFixed(1)}" rx="${Math.min(6, barWidth / 2).toFixed(1)}"></rect>`;
  }).join("");
  shellFields.batteryDetailLine.setAttribute("d", days.map((day, index) => `${index ? "L" : "M"} ${x(index).toFixed(1)} ${y(day.endingLevel).toFixed(1)}`).join(" "));
  shellFields.batteryDetailDots.innerHTML = days.map((day, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(day.endingLevel).toFixed(1)}" r="3.5"></circle>`).join("");
  const grid = [0, 25, 50, 75, 100].map((value) => {
    const py = y(value); return `<line x1="${left}" y1="${py}" x2="${width - right}" y2="${py}"></line><text x="${left - 9}" y="${py + 4}" text-anchor="end">${value}%</text>`;
  }).join("");
  const labelIndexes = Array.from(new Set([0, Math.floor((days.length - 1) / 2), days.length - 1]));
  const labels = labelIndexes.map((index) => `<text x="${x(index)}" y="${height - 15}" text-anchor="middle">${days[index].day.slice(5).replace("-", "/")}</text>`).join("");
  shellFields.batteryDetailGrid.innerHTML = grid + labels;
  shellFields.batteryDetailEmpty.hidden = true;
  animateDetailChart(shellFields.batteryDetailChart);
}

function formatDay(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

function selectEnergyDay(dayKey) {
  const day = activeEnergyDays.find((item) => item.day === dayKey);
  if (!day) return;
  saveDetailState("energy", { selectedId: day.day });
  document.querySelectorAll(".energy-day-row").forEach((row) => row.setAttribute("aria-pressed", String(row.dataset.energyDay === dayKey)));
  shellFields.energyDayTitle.textContent = formatDay(day.day);
  const metrics = [
    ["行驶里程", formatNumber(day.distanceKm, 1), "km"],
    ["驾驶时间", formatDuration(day.durationMin), ""],
    ["纯消耗", formatNumber(day.grossKwh, 1), "kWh"],
    ["净能耗", formatNumber(day.netKwh, 1), "kWh"],
    ["能量回收", formatNumber(day.regenKwh, 1), "kWh"],
    ["平均能耗", formatNumber(day.averageWhKm), "Wh/km"],
  ];
  renderMetricCards(shellFields.energyDayMetrics, metrics);
}

function renderEnergyDetailChart(days) {
  const bounds = shellFields.energyDetailChart.getBoundingClientRect();
  const width = Math.max(760, Math.round(bounds.width));
  const height = Math.max(300, Math.round(bounds.height));
  const left = 56; const right = 30; const top = 28; const bottom = 44;
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  shellFields.energyDetailChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const maxWh = Math.max(100, ...days.map((day) => day.averageWhKm || 0));
  const maxKwh = Math.max(1, ...days.map((day) => day.grossKwh || 0));
  const x = (index) => left + (days.length === 1 ? plotWidth / 2 : index / (days.length - 1) * plotWidth);
  const whY = (value) => top + (1 - (Number(value) || 0) / maxWh) * plotHeight;
  const kwhHeight = (value) => (Number(value) || 0) / maxKwh * plotHeight;
  const spacing = plotWidth / Math.max(days.length, 1);
  const barWidth = Math.max(3, Math.min(18, spacing * 0.46));
  shellFields.energyDetailBars.innerHTML = days.map((day, index) => {
    const h = kwhHeight(day.grossKwh); return `<rect x="${(x(index) - barWidth / 2).toFixed(1)}" y="${(top + plotHeight - h).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(5, barWidth / 2).toFixed(1)}"></rect>`;
  }).join("");
  shellFields.energyDetailLine.setAttribute("d", days.map((day, index) => `${index ? "L" : "M"} ${x(index).toFixed(1)} ${whY(day.averageWhKm).toFixed(1)}`).join(" "));
  shellFields.energyDetailDots.innerHTML = days.map((day, index) => `<circle cx="${x(index).toFixed(1)}" cy="${whY(day.averageWhKm).toFixed(1)}" r="3.5" data-energy-day="${day.day}"></circle>`).join("");
  const yGrid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = top + (1 - ratio) * plotHeight; const label = Math.round(maxWh * ratio);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text x="${left - 9}" y="${y + 4}" text-anchor="end">${label}</text>`;
  }).join("");
  const labelIndexes = Array.from(new Set([0, Math.floor((days.length - 1) / 2), days.length - 1]));
  const xLabels = labelIndexes.map((index) => `<text x="${x(index)}" y="${height - 15}" text-anchor="middle">${days[index].day.slice(5).replace("-", "/")}</text>`).join("");
  shellFields.energyDetailGrid.innerHTML = yGrid + xLabels + `<text class="power-scale" x="${left}" y="${top - 10}">Wh/km</text><text class="power-scale" x="${width - right}" y="${top - 10}" text-anchor="end">最高单日 ${formatNumber(maxKwh, 1)} kWh</text>`;
  shellFields.energyDetailEmpty.hidden = true;
  animateDetailChart(shellFields.energyDetailChart);
}

function clearChargingDetail(message) {
  activeChargingId = null;
  shellFields.chargingDetailTitle.textContent = message;
  shellFields.chargingDetailTime.textContent = "--";
  shellFields.chargingDetailMetrics.innerHTML = "";
  shellFields.chargingGrid.innerHTML = "";
  shellFields.chargingSocArea.setAttribute("d", "");
  shellFields.chargingSocLine.setAttribute("d", "");
  shellFields.chargingPowerLine.setAttribute("d", "");
  setModuleMessage(shellFields.chargingChartEmpty, "暂无曲线");
}

async function selectCharging(processId) {
  const session = activeChargingSessions.find((item) => item.id === Number(processId));
  if (!session) return;
  chargingCurveAbortController?.abort();
  const controller = new AbortController();
  chargingCurveAbortController = controller;
  activeChargingId = session.id;
  saveDetailState("charging", { selectedId: session.id });
  document.querySelectorAll(".charging-row").forEach((row) => row.setAttribute("aria-pressed", String(Number(row.dataset.chargingId) === session.id)));
  shellFields.chargingDetailTitle.textContent = session.locationName;
  shellFields.chargingDetailTime.textContent = `${formatDateTime(session.start)} - ${formatDateTime(session.end)}`;
  const metrics = [
    ["电量变化", `${formatNumber(session.startLevel)}% → ${formatNumber(session.endLevel)}%`, ""],
    ["补充电量", formatNumber(session.energyAddedKwh, 1), "kWh"],
    ["充电时长", formatDuration(session.durationMin), ""],
    ["平均功率", formatNumber(session.averagePowerKw, 1), "kW"],
    ["峰值功率", formatNumber(session.peakPowerKw, 1), "kW"],
  ];
  renderMetricCards(shellFields.chargingDetailMetrics, metrics);
  activeChargingSamples = [];
  const cachedSamples = chargingCurveCache.get(session.id);
  if (cachedSamples) renderChargingChart(cachedSamples);
  else {
    setModuleMessage(shellFields.chargingChartEmpty, "正在载入充电曲线", { mode: "loading" });
  }
  try {
    const response = await fetch(`/api/charging/${session.id}/curve`, { cache: "no-store", signal: controller.signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "充电曲线读取失败");
    if (activeChargingId !== session.id) return;
    const samples = payload.samples || [];
    chargingCurveCache.set(session.id, samples);
    renderChargingChart(samples);
  } catch (error) {
    if (error.name === "AbortError") return;
    if (activeChargingId === session.id && !cachedSamples) {
      setModuleMessage(shellFields.chargingChartEmpty, error.message || "充电曲线读取失败", {
        mode: "error",
        retry: () => selectCharging(session.id),
      });
    } else if (activeChargingId === session.id) {
      setModuleMessage(shellFields.chargingChartEmpty, "曲线更新失败 · 显示缓存", {
        mode: "warning",
        compact: true,
        retry: () => selectCharging(session.id),
      });
    }
  }
}

function renderChargingChart(samples) {
  const valid = samples.filter((sample) => sample.at && (Number.isFinite(sample.batteryLevel) || Number.isFinite(sample.powerKw)));
  if (valid.length < 2) {
    setModuleMessage(shellFields.chargingChartEmpty, "该记录没有足够的曲线数据");
    return;
  }
  activeChargingSamples = valid;
  const bounds = shellFields.chargingChart.getBoundingClientRect();
  const width = Math.max(640, Math.round(bounds.width));
  const height = Math.max(300, Math.round(bounds.height));
  const left = 52; const right = 28; const top = 28; const bottom = 42;
  shellFields.chargingChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const times = valid.map((sample) => new Date(sample.at).getTime());
  const minTime = Math.min(...times); const maxTime = Math.max(...times); const span = Math.max(1, maxTime - minTime);
  const maxPower = Math.max(1, ...valid.map((sample) => Number(sample.powerKw) || 0));
  const x = (time) => left + ((time - minTime) / span) * plotWidth;
  const socY = (value) => top + (1 - Math.max(0, Math.min(100, Number(value) || 0)) / 100) * plotHeight;
  const powerY = (value) => top + (1 - Math.max(0, Number(value) || 0) / maxPower) * plotHeight;
  const pathFor = (valueKey, yScale) => valid.map((sample, index) => `${index ? "L" : "M"} ${x(new Date(sample.at).getTime()).toFixed(1)} ${yScale(sample[valueKey]).toFixed(1)}`).join(" ");
  const socPath = pathFor("batteryLevel", socY);
  const firstX = x(times[0]).toFixed(1); const lastX = x(times.at(-1)).toFixed(1); const baseY = (top + plotHeight).toFixed(1);
  shellFields.chargingSocLine.setAttribute("d", socPath);
  shellFields.chargingSocArea.setAttribute("d", `${socPath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`);
  shellFields.chargingPowerLine.setAttribute("d", pathFor("powerKw", powerY));
  const horizontal = [0, 25, 50, 75, 100].map((value) => {
    const y = socY(value); return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text x="${left - 9}" y="${y + 4}" text-anchor="end">${value}%</text>`;
  }).join("");
  const vertical = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const px = left + ratio * plotWidth;
    const label = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(minTime + ratio * span));
    return `<line x1="${px}" y1="${top}" x2="${px}" y2="${top + plotHeight}"></line><text x="${px}" y="${height - 14}" text-anchor="middle">${label}</text>`;
  }).join("");
  shellFields.chargingGrid.innerHTML = horizontal + vertical + `<text class="power-scale" x="${width - right}" y="${top + 13}" text-anchor="end">峰值 ${formatNumber(maxPower, 1)} kW</text>`;
  shellFields.chargingChartEmpty.hidden = true;
  animateDetailChart(shellFields.chargingChart);
}

function installChartTooltip(svg, getItems, formatItem, { timeBased = false, left = 56, right = 30 } = {}) {
  const shell = svg.parentElement;
  if (!shell || shell.querySelector(".detail-chart-tooltip")) return;
  const tooltip = document.createElement("div");
  tooltip.className = "detail-chart-tooltip";
  tooltip.hidden = true;
  shell.appendChild(tooltip);
  const guide = document.createElement("i");
  guide.className = "detail-chart-guide";
  guide.hidden = true;
  shell.appendChild(guide);

  svg.addEventListener("pointermove", (event) => {
    const items = getItems();
    if (!items?.length) return;
    const bounds = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const leftPx = bounds.width * left / Math.max(1, viewBox.width);
    const rightPx = bounds.width * right / Math.max(1, viewBox.width);
    const plotWidth = Math.max(1, bounds.width - leftPx - rightPx);
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left - leftPx) / plotWidth));
    let index = Math.round(ratio * Math.max(0, items.length - 1));
    if (timeBased && items.length > 1) {
      const times = items.map((item) => new Date(item.at).getTime());
      const target = times[0] + ratio * Math.max(1, times.at(-1) - times[0]);
      index = times.reduce((best, value, itemIndex) => Math.abs(value - target) < Math.abs(times[best] - target) ? itemIndex : best, 0);
    }
    tooltip.innerHTML = formatItem(items[index]);
    tooltip.hidden = false;
    const shellBounds = shell.getBoundingClientRect();
    let selectedRatio = items.length === 1 ? 0.5 : index / (items.length - 1);
    if (timeBased && items.length > 1) {
      const firstTime = new Date(items[0].at).getTime();
      const lastTime = new Date(items.at(-1).at).getTime();
      selectedRatio = (new Date(items[index].at).getTime() - firstTime) / Math.max(1, lastTime - firstTime);
    }
    const selectedX = bounds.left - shellBounds.left + leftPx + selectedRatio * plotWidth;
    const x = Math.max(78, Math.min(shellBounds.width - 78, selectedX));
    const y = Math.max(54, event.clientY - shellBounds.top - 14);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    guide.hidden = false;
    guide.style.left = `${selectedX}px`;
    guide.style.top = `${bounds.top - shellBounds.top + 12}px`;
    guide.style.height = `${Math.max(20, bounds.height - 48)}px`;
  });
  svg.addEventListener("pointerleave", () => { tooltip.hidden = true; guide.hidden = true; });
}

function installDetailChartTooltips() {
  installChartTooltip(shellFields.chargingChart, () => activeChargingSamples, (sample) => `
    <strong>${formatDateTime(sample.at)}</strong>
    <span>电量 ${formatNumber(sample.batteryLevel)}%</span>
    <span>功率 ${formatNumber(sample.powerKw, 1)} kW</span>
  `, { timeBased: true, left: 52, right: 28 });
  installChartTooltip(shellFields.energyDetailChart, () => activeEnergyDays, (day) => `
    <strong>${formatDay(day.day)}</strong>
    <span>平均能耗 ${formatNumber(day.averageWhKm)} Wh/km</span>
    <span>纯消耗 ${formatNumber(day.grossKwh, 1)} kWh</span>
  `, { left: 56, right: 30 });
  installChartTooltip(shellFields.batteryDetailChart, () => activeBatteryDays, (day) => `
    <strong>${formatDay(day.day)}</strong>
    <span>结束电量 ${formatNumber(day.endingLevel)}%</span>
    <span>区间 ${formatNumber(day.minimumLevel)}% - ${formatNumber(day.maximumLevel)}%</span>
  `, { left: 54, right: 30 });
  installChartTooltip(shellFields.statisticsChart, () => activeStatisticsDays, (day) => `
    <strong>${formatDay(day.day)}</strong>
    <span>里程 ${formatNumber(day.distanceKm, 1)} km</span>
    <span>平均能耗 ${formatNumber(day.averageWhKm)} Wh/km</span>
  `, { left: 56, right: 54 });
}

function clearTripDetail(message) {
  activeTripId = null;
  shellFields.tripDetailTitle.textContent = message;
  shellFields.tripDetailTime.textContent = "--";
  shellFields.tripDetailMetrics.innerHTML = "";
  shellFields.tripDetailGrid.innerHTML = "";
  shellFields.tripDetailPath.setAttribute("d", "");
  shellFields.tripDetailStart.setAttribute("opacity", "0");
  shellFields.tripDetailEnd.setAttribute("opacity", "0");
  setModuleMessage(shellFields.tripMapLoading, "暂无路线");
}

async function selectTrip(tripId) {
  const trip = activeTrips.find((item) => item.id === Number(tripId));
  if (!trip) return;
  tripRouteAbortController?.abort();
  const controller = new AbortController();
  tripRouteAbortController = controller;
  activeTripId = trip.id;
  saveDetailState("trips", { selectedId: trip.id });
  document.querySelectorAll(".trip-row").forEach((row) => row.setAttribute("aria-pressed", String(Number(row.dataset.tripId) === trip.id)));
  shellFields.tripDetailTitle.textContent = `${trip.startName} → ${trip.endName}`;
  shellFields.tripDetailTime.textContent = `${formatDateTime(trip.start)} - ${formatDateTime(trip.end)}`;
  const metrics = [
    ["距离", formatNumber(trip.distanceKm, 1), "km"], ["用时", formatDuration(trip.durationMin), ""],
    ["平均能耗", formatNumber(trip.consumptionWhKm), "Wh/km"], ["最高车速", formatNumber(trip.speedMax), "km/h"],
    ["纯消耗", formatNumber(trip.energyKwh, 1), "kWh"],
  ];
  renderMetricCards(shellFields.tripDetailMetrics, metrics);
  detailMap.adjusted = false;
  const cachedRoute = tripRouteCache.get(trip.id);
  if (cachedRoute) setDetailRoute(cachedRoute);
  else {
    setModuleMessage(shellFields.tripMapLoading, "正在载入路线", { mode: "loading" });
  }
  try {
    const response = await fetch(`/api/trips/${trip.id}/route`, { cache: "no-store", signal: controller.signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "路线读取失败");
    if (activeTripId !== trip.id) return;
    const route = payload.route || [];
    tripRouteCache.set(trip.id, route);
    setDetailRoute(route);
  } catch (error) {
    if (error.name === "AbortError") return;
    if (activeTripId === trip.id && !cachedRoute) {
      setModuleMessage(shellFields.tripMapLoading, error.message || "路线读取失败", {
        mode: "error",
        retry: () => selectTrip(trip.id),
      });
    } else if (activeTripId === trip.id) {
      setModuleMessage(shellFields.tripMapLoading, "路线更新失败 · 显示缓存", {
        mode: "warning",
        compact: true,
        retry: () => selectTrip(trip.id),
      });
    }
  }
}

function detailWorld(lng, lat) {
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
  const radians = safeLat * Math.PI / 180;
  return { x: (Number(lng) + 180) / 360, y: (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2 };
}

function setDetailRoute(route) {
  detailMap.route = route.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)).map((point) => detailWorld(point.longitude, point.latitude));
  if (detailMap.route.length < 2) {
    setModuleMessage(shellFields.tripMapLoading, "该行程没有可用轨迹");
    return;
  }
  const xs = detailMap.route.map((point) => point.x);
  const ys = detailMap.route.map((point) => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rect = shellFields.tripDetailMap.getBoundingClientRect();
  const zoomX = Math.log2(Math.max(rect.width - 80, 240) / (Math.max(maxX - minX, 0.000001) * 256));
  const zoomY = Math.log2(Math.max(rect.height - 70, 180) / (Math.max(maxY - minY, 0.000001) * 256));
  detailMap.center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  detailMap.zoom = Math.max(3, Math.min(17, Math.min(zoomX, zoomY)));
  shellFields.tripMapLoading.hidden = true;
  drawDetailMap();
}

function detailScreen(point, width, height) {
  const scale = (2 ** detailMap.zoom) * 256;
  return { x: width / 2 + (point.x - detailMap.center.x) * scale, y: height / 2 + (point.y - detailMap.center.y) * scale };
}

function drawDetailMap() {
  if (!detailMap.center) return;
  const rect = shellFields.tripDetailMap.getBoundingClientRect();
  const width = Math.max(1, rect.width); const height = Math.max(1, rect.height);
  const tileZoom = Math.max(3, Math.min(18, Math.floor(detailMap.zoom)));
  const tileScale = 2 ** (detailMap.zoom - tileZoom);
  const count = 2 ** tileZoom; const tileSize = 256 * tileScale;
  const cx = detailMap.center.x * count; const cy = detailMap.center.y * count;
  const tiles = [];
  for (let y = Math.max(0, Math.floor(cy - height / (2 * tileSize)) - 2); y <= Math.min(count - 1, Math.ceil(cy + height / (2 * tileSize)) + 2); y += 1) {
    for (let x = Math.floor(cx - width / (2 * tileSize)) - 2; x <= Math.ceil(cx + width / (2 * tileSize)) + 2; x += 1) {
      const wrappedX = ((x % count) + count) % count;
      tiles.push(`<img src="${DETAIL_TILE_URL}&x=${wrappedX}&y=${y}&z=${tileZoom}" alt="" draggable="false" style="left:${(width / 2 + (x - cx) * tileSize).toFixed(1)}px;top:${(height / 2 + (y - cy) * tileSize).toFixed(1)}px;width:${tileSize.toFixed(1)}px;height:${tileSize.toFixed(1)}px">`);
    }
  }
  shellFields.tripDetailGrid.innerHTML = tiles.join("");
  monitorDetailMapTiles();
  shellFields.tripDetailSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const points = detailMap.route.map((point) => detailScreen(point, width, height));
  shellFields.tripDetailPath.setAttribute("d", points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" "));
  [[shellFields.tripDetailStart, points[0]], [shellFields.tripDetailEnd, points.at(-1)]].forEach(([marker, point]) => {
    marker.setAttribute("transform", `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`); marker.setAttribute("opacity", "1");
  });
}

function monitorDetailMapTiles() {
  const watchId = ++detailMap.tileWatchId;
  const images = Array.from(shellFields.tripDetailGrid.querySelectorAll("img"));
  if (!images.length) return;
  let settled = 0;
  let failed = 0;
  const settle = (ok) => {
    if (watchId !== detailMap.tileWatchId) return;
    settled += 1;
    if (!ok) failed += 1;
    if (settled !== images.length) return;
    if (!navigator.onLine || failed / images.length >= 0.35) {
      setModuleMessage(shellFields.tripMapLoading, navigator.onLine ? "地图底图暂时无法加载" : "网络已断开", {
        mode: "error",
        retry: navigator.onLine ? drawDetailMap : null,
      });
    } else if (shellFields.tripMapLoading.dataset.mode !== "warning") {
      setModuleMessage(shellFields.tripMapLoading);
    }
  };
  images.forEach((image) => {
    if (image.complete) settle(image.naturalWidth > 0);
    else {
      image.addEventListener("load", () => settle(true), { once: true });
      image.addEventListener("error", () => settle(false), { once: true });
    }
  });
}

function installDetailMapInteraction() {
  let dragging = false; let last = null;
  shellFields.tripDetailMap.addEventListener("pointerdown", (event) => {
    if (!detailMap.center) return;
    if (event.target.closest(".trip-map-loading")) return;
    event.preventDefault(); dragging = true; detailMap.adjusted = true;
    last = { x: event.clientX, y: event.clientY };
    shellFields.tripDetailMap.setPointerCapture(event.pointerId);
    shellFields.tripDetailMap.classList.add("is-dragging");
  });
  shellFields.tripDetailMap.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const scale = (2 ** detailMap.zoom) * 256;
    detailMap.center.x -= (event.clientX - last.x) / scale;
    detailMap.center.y -= (event.clientY - last.y) / scale;
    last = { x: event.clientX, y: event.clientY }; drawDetailMap();
  });
  const stop = () => { dragging = false; shellFields.tripDetailMap.classList.remove("is-dragging"); };
  shellFields.tripDetailMap.addEventListener("pointerup", stop);
  shellFields.tripDetailMap.addEventListener("pointercancel", stop);
  shellFields.tripDetailMap.addEventListener("wheel", (event) => {
    if (!detailMap.center) return;
    event.preventDefault();
    const rect = shellFields.tripDetailMap.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2; const dy = event.clientY - rect.top - rect.height / 2;
    const oldScale = (2 ** detailMap.zoom) * 256;
    const anchor = { x: detailMap.center.x + dx / oldScale, y: detailMap.center.y + dy / oldScale };
    detailMap.zoom = Math.max(3, Math.min(18, detailMap.zoom + Math.max(-0.22, Math.min(0.22, -event.deltaY * 0.0018))));
    const scale = (2 ** detailMap.zoom) * 256;
    detailMap.center = { x: anchor.x - dx / scale, y: anchor.y - dy / scale };
    drawDetailMap();
  }, { passive: false });
}

function renderShellRoute() {
  abortDetailRequests();
  if (window.location.pathname === "/location") {
    navigate("/trips", { replace: true });
    return;
  }
  const section = currentSection();
  const isHome = !section || section.id === "home";
  shellFields.homeView.hidden = !isHome;
  shellFields.detailView.hidden = isHome;
  document.body.dataset.view = isHome ? "home" : "detail";
  document.querySelectorAll(".menu-link").forEach((link) => link.toggleAttribute("aria-current", Boolean(section && link.dataset.section === section.id)));
  if (isHome) {
    document.title = "Tesla Cockpit";
    window.requestAnimationFrame(() => window.dispatchEvent(new Event("cockpit:home-visible")));
    return;
  }
  shellFields.detailTitle.textContent = section.label;
  shellFields.detailEyebrow.textContent = vehicleDisplayName;
  shellFields.detailDescription.textContent = section.description;
  shellFields.rangeToolbar.hidden = section.id === "settings";
  document.title = `${section.label} - Tesla Cockpit`;
  shellFields.detailView.scrollTop = 0;
  loadDetail(section);
}

function navigate(path, { replace = false } = {}) {
  if (path !== window.location.pathname) window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  closeMenu(); renderShellRoute();
}

function installDrilldowns() {
  drilldownTargets.forEach(([selector, path]) => document.querySelectorAll(selector).forEach((node) => {
    const target = node.matches("strong") ? node.closest("article") : node;
    if (!target || target.dataset.drilldown) return;
    target.dataset.drilldown = path; target.classList.add("drilldown-target"); target.tabIndex = 0; target.setAttribute("role", "link");
    target.setAttribute("aria-label", `查看${currentSection(path)?.label || "详情"}`);
    const activate = (event) => {
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      if (event.target.closest("a, button, input, .map-shell, .route-shell")) return;
      event.preventDefault(); navigate(path);
    };
    target.addEventListener("click", activate); target.addEventListener("keydown", activate);
  }));
}

async function loadNavigation() {
  try {
    const response = await fetch("/api/navigation", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const payload = await response.json();
    if (Array.isArray(payload.sections) && payload.sections.length) sections = payload.sections;
  } catch (_) { sections = fallbackSections; }
  renderMenu();
}

shellFields.menuTrigger.addEventListener("click", openMenu);
shellFields.detailMenuTrigger.addEventListener("click", openMenu);
shellFields.menuClose.addEventListener("click", () => closeMenu({ restoreFocus: true }));
shellFields.menuBackdrop.addEventListener("click", () => closeMenu({ restoreFocus: true }));
shellFields.tripList.addEventListener("click", (event) => {
  const row = event.target.closest(".trip-row"); if (row) selectTrip(Number(row.dataset.tripId));
});
shellFields.tripList.addEventListener("scroll", () => {
  saveDetailState("trips", { scrollTop: shellFields.tripList.scrollTop });
  const remaining = shellFields.tripList.scrollHeight - shellFields.tripList.scrollTop - shellFields.tripList.clientHeight;
  if (remaining < 180) loadMoreTrips();
});
shellFields.chargingList.addEventListener("click", (event) => {
  const row = event.target.closest(".charging-row"); if (row) selectCharging(Number(row.dataset.chargingId));
});
shellFields.chargingList.addEventListener("scroll", () => {
  saveDetailState("charging", { scrollTop: shellFields.chargingList.scrollTop });
  const remaining = shellFields.chargingList.scrollHeight - shellFields.chargingList.scrollTop - shellFields.chargingList.clientHeight;
  if (remaining < 180) loadMoreCharging();
});
shellFields.energyDayList.addEventListener("click", (event) => {
  const row = event.target.closest(".energy-day-row"); if (row) selectEnergyDay(row.dataset.energyDay);
});
shellFields.energyDayList.addEventListener("scroll", () => saveDetailState("energy", { scrollTop: shellFields.energyDayList.scrollTop }));
shellFields.batteryDayList.addEventListener("click", (event) => {
  const row = event.target.closest(".battery-day-row"); if (row) selectBatteryDay(row.dataset.batteryDay);
});
shellFields.batteryDayList.addEventListener("scroll", () => saveDetailState("battery", { scrollTop: shellFields.batteryDayList.scrollTop }));
shellFields.statusEventList.addEventListener("click", (event) => {
  const row = event.target.closest(".status-event-row"); if (row) selectStatusEvent(Number(row.dataset.statusId));
});
shellFields.statusEventList.addEventListener("scroll", () => {
  saveDetailState("status", { scrollTop: shellFields.statusEventList.scrollTop });
  const remaining = shellFields.statusEventList.scrollHeight - shellFields.statusEventList.scrollTop - shellFields.statusEventList.clientHeight;
  if (remaining < 180) loadMoreStatusEvents();
});
shellFields.passwordForm.addEventListener("submit", updatePassword);
shellFields.detailRefresh.addEventListener("click", () => {
  const section = currentSection();
  if (!section || section.id === "home") return;
  detailRefreshRequested = true;
  loadDetail(section);
});
shellFields.detailRetry?.addEventListener("click", () => {
  const section = currentSection();
  if (!section || section.id === "home") return;
  detailRefreshRequested = true;
  loadDetail(section);
});
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-route]");
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); navigate(link.dataset.route || link.getAttribute("href"));
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu({ restoreFocus: true }); });
document.querySelectorAll("[data-range]").forEach((button) => button.addEventListener("click", () => {
  activeRange = { ...activeRange, key: button.dataset.range }; saveRange(); renderRange(); renderShellRoute();
}));
[shellFields.rangeStart, shellFields.rangeEnd].forEach((input) => input.addEventListener("change", () => {
  activeRange = { key: "custom", start: shellFields.rangeStart.value, end: shellFields.rangeEnd.value };
  saveRange(); renderShellRoute();
}));
window.addEventListener("popstate", renderShellRoute);
window.addEventListener("cockpit:vehicle-name", (event) => {
  const name = String(event.detail?.name || "").trim();
  if (!name) return;
  vehicleDisplayName = name;
  if (shellFields.menuVehicleName) shellFields.menuVehicleName.textContent = name;
  if (!shellFields.detailView.hidden) shellFields.detailEyebrow.textContent = name;
});
window.addEventListener("cockpit:connectivity", (event) => {
  const online = Boolean(event.detail?.online);
  if (shellFields.detailView.hidden) return;
  const section = currentSection();
  if (!section || section.id === "home") return;
  if (!online) {
    detailRecoveryPending = true;
    abortDetailRequests();
    shellFields.detailView.classList.add("has-sync-error");
    shellFields.detailView.classList.toggle("is-cache-fallback", Boolean(visibleDetailSectionId));
    shellFields.detailView.classList.remove("is-refreshing");
    shellFields.detailRefresh.disabled = false;
    shellFields.detailUpdatedAt.textContent = visibleDetailSectionId ? "网络已断开 · 显示缓存" : "网络已断开";
    if (activeTripId && !tripRouteCache.has(activeTripId)) {
      setModuleMessage(shellFields.tripMapLoading, "网络已断开", { mode: "error" });
    }
    if (activeChargingId && !chargingCurveCache.has(activeChargingId)) {
      setModuleMessage(shellFields.chargingChartEmpty, "网络已断开", { mode: "error" });
    }
    if (!visibleDetailSectionId) showPlaceholder("网络已断开，恢复后将自动重新加载。", false, true);
    return;
  }
  if (detailRecoveryPending) {
    shellFields.detailUpdatedAt.textContent = "正在恢复连接";
    loadDetail(section);
  }
});
window.addEventListener("resize", () => {
  if (!shellFields.tripsView.hidden) drawDetailMap();
  if (!shellFields.chargingView.hidden && activeChargingSamples.length > 1) renderChargingChart(activeChargingSamples);
  if (!shellFields.energyView.hidden && activeEnergyDays.length) renderEnergyDetailChart(activeEnergyDays);
  if (!shellFields.batteryView.hidden && activeBatteryDays.length) renderBatteryDetailChart(activeBatteryDays);
  if (!shellFields.statisticsView.hidden && activeStatisticsDays.length) renderStatisticsChart(activeStatisticsDays);
});

renderRange(); renderMenu(); installDrilldowns(); installDetailMapInteraction(); installDetailChartTooltips(); renderShellRoute(); loadNavigation();
