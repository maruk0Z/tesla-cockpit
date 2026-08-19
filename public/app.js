const $ = (id) => document.getElementById(id);

const fields = {
  homeView: $("homeView"),
  carName: $("carName"),
  modelName: $("modelName"),
  stateText: $("stateText"),
  stateDot: $("stateDot"),
  stateSince: $("stateSince"),
  batteryLevel: $("batteryLevel"),
  mainBattery: $("mainBattery"),
  batteryBadge: $("batteryBadge"),
  batterySegments: $("batterySegments"),
  batteryAdviceStatus: $("batteryAdviceStatus"),
  batteryAdviceText: $("batteryAdviceText"),
  estimatedRange: $("estimatedRange"),
  avgConsumption: $("avgConsumption"),
  todayDistance: $("todayDistance"),
  todayDuration: $("todayDuration"),
  todayConsumption: $("todayConsumption"),
  todayDriveDetails: $("todayDriveDetails"),
  todayEmpty: $("todayEmpty"),
  ratedRange: $("ratedRange"),
  idealRange: $("idealRange"),
  odometer: $("odometer"),
  insideTemp: $("insideTemp"),
  outsideTemp: $("outsideTemp"),
  updatedAt: $("updatedAt"),
  headerState: $("headerState"),
  refreshCadence: $("refreshCadence"),
  dataFreshness: $("dataFreshness"),
  manualRefresh: $("manualRefresh"),
  monthDuration: $("monthDuration"),
  monthDistance: $("monthDistance"),
  energyChartRange: $("energyChartRange"),
  energyChartAvg: $("energyChartAvg"),
  energyModeNet: $("energyModeNet"),
  energyModeGross: $("energyModeGross"),
  energyChart: $("energyChart"),
  energyArea: $("energyArea"),
  energyLine: $("energyLine"),
  energyAverageLine: $("energyAverageLine"),
  energyMinMarker: $("energyMinMarker"),
  energyMinDot: $("energyMinDot"),
  energyMinLabel: $("energyMinLabel"),
  energyMaxMarker: $("energyMaxMarker"),
  energyMaxDot: $("energyMaxDot"),
  energyMaxLabel: $("energyMaxLabel"),
  energyCurrentMarker: $("energyCurrentMarker"),
  energyCurrentDot: $("energyCurrentDot"),
  energyCurrentLabel: $("energyCurrentLabel"),
  energyAxisHigh: $("energyAxisHigh"),
  energyAxisUpper: $("energyAxisUpper"),
  energyAxisMid: $("energyAxisMid"),
  energyAxisLower: $("energyAxisLower"),
  energyAxisLowerMid: $("energyAxisLowerMid"),
  energyAxisLow: $("energyAxisLow"),
  energyGridLines: Array.from(document.querySelectorAll(".energy-grid-horizontal")),
  energyXStart: $("energyXStart"),
  energyX20: $("energyX20"),
  energyX40: $("energyX40"),
  energyX60: $("energyX60"),
  energyX80: $("energyX80"),
  energyXEnd: $("energyXEnd"),
  energyHover: $("energyHover"),
  energyHoverLine: $("energyHoverLine"),
  energyHoverDot: $("energyHoverDot"),
  energyHoverBubble: $("energyHoverBubble"),
  energyHoverText: $("energyHoverText"),
  energyHoverTooltip: $("energyHoverTooltip"),
  coords: $("coords"),
  mapGrid: $("mapGrid"),
  currentMarker: $("currentMarker"),
  currentMapStatus: $("currentMapStatus"),
  routeGrid: $("routeGrid"),
  routePath: $("routePath"),
  routeStartMarker: $("routeStartMarker"),
  routeEndMarker: $("routeEndMarker"),
  routeMapStatus: $("routeMapStatus"),
  mapLink: $("mapLink"),
  driveDistance: $("driveDistance"),
  driveDuration: $("driveDuration"),
  driveTime: $("driveTime"),
  driveAddress: $("driveAddress"),
  toast: $("toast"),
};

const TILE_URL = "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let mapFrame = null;
let homeLayoutGeneration = 0;
let homeLayoutTimer = null;
let homeLayoutResetPending = false;
let energyHoverPoints = [];
let energyRows = [];
let energyMode = "gross";
let refreshTimer = null;
let refreshInFlight = false;
let refreshAbortController = null;
let refreshWhenVisible = false;
let hasRenderedVehicleData = false;
let browserOnline = navigator.onLine;
let recoveryPending = false;
let recoveryTimer = null;
const animationTimers = new WeakMap();

const mapState = {
  current: { shell: $("tileMap"), grid: $("mapGrid"), marker: $("currentMarker"), zoom: 15, center: null, markerWorld: null, route: [], userAdjusted: false, tileWatchId: 0 },
  route: { shell: $("routeMap"), grid: $("routeGrid"), path: $("routePath"), zoom: 14, center: null, route: [], routeKey: "", needsFit: false, userAdjusted: false, tileWatchId: 0 },
};

function number(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function duration(value) {
  const minutes = Number(value) || 0;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) return `${mins} 分钟`;
  return `${hours} 小时 ${mins} 分钟`;
}

function triggerDataUpdate(element, className = "metric-updated") {
  if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.clearTimeout(animationTimers.get(element));
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  animationTimers.set(element, window.setTimeout(() => element.classList.remove(className), 360));
}

function updateMetricMarkup(element, markup, valueKey) {
  if (!element) return;
  const nextKey = String(valueKey);
  const previousKey = element.dataset.metricValue;
  if (element.innerHTML !== markup) element.innerHTML = markup;
  element.dataset.metricValue = nextKey;
  if (previousKey !== undefined && previousKey !== nextKey) triggerDataUpdate(element);
}

function updateMetricText(element, text, valueKey = text) {
  if (!element) return;
  const nextKey = String(valueKey);
  const previousKey = element.dataset.metricValue;
  if (element.textContent !== text) element.textContent = text;
  element.dataset.metricValue = nextKey;
  if (previousKey !== undefined && previousKey !== nextKey) triggerDataUpdate(element);
}

function setMetric(element, value, unit = "", digits = 0) {
  if (!element) return;
  const formatted = number(value, digits);
  updateMetricMarkup(
    element,
    `<span class="metric-number">${formatted}</span>${unit ? `<span class="metric-unit">${unit}</span>` : ""}`,
    `${formatted}|${unit}`,
  );
}

function setDurationMetric(element, value) {
  if (!element) return;
  const minutes = Number(value) || 0;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) {
    updateMetricMarkup(element, `<span class="metric-number">${mins}</span><span class="metric-unit">分钟</span>`, `${mins}|分钟`);
    return;
  }
  updateMetricMarkup(
    element,
    `<span class="metric-number">${hours}</span><span class="metric-unit">小时</span><span class="metric-number">${mins}</span><span class="metric-unit">分钟</span>`,
    `${hours}|${mins}`,
  );
}

function time(value, withDate = false) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    month: withDate ? "2-digit" : undefined,
    day: withDate ? "2-digit" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function setToast(text, mode = "ok") {
  if (!fields.toast) return;
  fields.toast.textContent = text;
  fields.toast.dataset.mode = mode;
}

function setModuleState(element, message = "", { mode = "neutral", retry = null } = {}) {
  if (!element) return;
  element.replaceChildren();
  element.hidden = !message;
  element.dataset.mode = mode;
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
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      retry();
    }, { once: true });
    element.appendChild(button);
  }
}

function mapStatusElement(name) {
  return name === "current" ? fields.currentMapStatus : fields.routeMapStatus;
}

function setMapState(name, message = "", options = {}) {
  setModuleState(mapStatusElement(name), message, options);
}

function monitorMapTiles(name) {
  const state = mapState[name];
  const watchId = ++state.tileWatchId;
  const images = Array.from(state.grid.querySelectorAll("img"));
  if (!images.length) return;
  let settled = 0;
  let failed = 0;
  const settle = (ok) => {
    if (watchId !== state.tileWatchId) return;
    settled += 1;
    if (!ok) failed += 1;
    if (settled !== images.length) return;
    if (!browserOnline || failed / images.length >= 0.35) {
      setMapState(name, browserOnline ? "地图暂时无法加载" : "网络已断开", {
        mode: "error",
        retry: browserOnline ? () => drawMap(name) : null,
      });
    } else {
      setMapState(name);
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

function amapUrl(lat, lng) {
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=Tesla&src=tesla-cockpit&coordinate=gaode&callnative=0`;
}

function lonLatToWorld(lng, lat) {
  const safeLat = clamp(Number(lat), -85.05112878, 85.05112878);
  const latRad = safeLat * Math.PI / 180;
  return {
    x: (Number(lng) + 180) / 360,
    y: (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2,
  };
}

function worldToScreen(world, state, width, height) {
  const scale = (2 ** state.zoom) * 256;
  return {
    x: width / 2 + (world.x - state.center.x) * scale,
    y: height / 2 + (world.y - state.center.y) * scale,
  };
}

function tileUrl(x, y, z) {
  const max = 2 ** z;
  const wrappedX = ((x % max) + max) % max;
  return `${TILE_URL}&x=${wrappedX}&y=${y}&z=${z}`;
}

function scheduleMaps() {
  if (mapFrame) return;
  mapFrame = requestAnimationFrame(() => {
    mapFrame = null;
    drawMap("current");
    drawMap("route");
  });
}

function drawMap(name) {
  const state = mapState[name];
  if (!state.center) return;

  const rect = state.shell.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const tileZoom = clamp(Math.floor(state.zoom), 3, 18);
  const tileScale = 2 ** (state.zoom - tileZoom);
  const tileCount = 2 ** tileZoom;
  const centerTileX = state.center.x * tileCount;
  const centerTileY = state.center.y * tileCount;
  const visibleTileWidth = 256 * tileScale;
  const minX = Math.floor(centerTileX - width / (2 * visibleTileWidth)) - 2;
  const maxX = Math.ceil(centerTileX + width / (2 * visibleTileWidth)) + 2;
  const minY = clamp(Math.floor(centerTileY - height / (2 * visibleTileWidth)) - 2, 0, tileCount - 1);
  const maxY = clamp(Math.ceil(centerTileY + height / (2 * visibleTileWidth)) + 2, 0, tileCount - 1);
  const tiles = [];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const left = width / 2 + (x - centerTileX) * visibleTileWidth;
      const top = height / 2 + (y - centerTileY) * visibleTileWidth;
      tiles.push(`<img src="${tileUrl(x, y, tileZoom)}" alt="" draggable="false" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${visibleTileWidth.toFixed(1)}px;height:${visibleTileWidth.toFixed(1)}px">`);
    }
  }
  state.grid.innerHTML = tiles.join("");
  monitorMapTiles(name);

  if (state.marker && state.markerWorld) {
    const pos = worldToScreen(state.markerWorld, state, width, height);
    state.marker.style.left = `${pos.x}px`;
    state.marker.style.top = `${pos.y}px`;
  }

  if (state.path && state.route.length > 1) {
    state.path.ownerSVGElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const routePoints = state.route.map((world) => worldToScreen(world, state, width, height));
    const commands = routePoints.map((pos, index) => {
      return `${index === 0 ? "M" : "L"} ${pos.x.toFixed(1)} ${pos.y.toFixed(1)}`;
    });
    state.path.setAttribute("d", commands.join(" "));
    const start = routePoints[0];
    const end = routePoints[routePoints.length - 1];
    if (fields.routeStartMarker) {
      fields.routeStartMarker.setAttribute("transform", `translate(${start.x.toFixed(1)} ${start.y.toFixed(1)})`);
      fields.routeStartMarker.setAttribute("opacity", "1");
    }
    if (fields.routeEndMarker) {
      fields.routeEndMarker.setAttribute("transform", `translate(${end.x.toFixed(1)} ${end.y.toFixed(1)})`);
      fields.routeEndMarker.setAttribute("opacity", "1");
    }
  }
}

function installMapInteraction(name) {
  const state = mapState[name];
  let dragging = false;
  let last = null;

  state.shell.addEventListener("dragstart", (event) => event.preventDefault());

  state.shell.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".map-module-state")) return;
    event.preventDefault();
    dragging = true;
    state.userAdjusted = true;
    last = { x: event.clientX, y: event.clientY };
    state.shell.setPointerCapture(event.pointerId);
    state.shell.classList.add("is-dragging");
  });

  state.shell.addEventListener("pointermove", (event) => {
    if (!dragging || !state.center) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    const scale = (2 ** state.zoom) * 256;
    state.center.x -= dx / scale;
    state.center.y = clamp(state.center.y - dy / scale, 0, 1);
    last = { x: event.clientX, y: event.clientY };
    scheduleMaps();
  });

  const endDrag = () => {
    dragging = false;
    state.shell.classList.remove("is-dragging");
  };
  state.shell.addEventListener("pointerup", endDrag);
  state.shell.addEventListener("pointercancel", endDrag);

  state.shell.addEventListener("wheel", (event) => {
    if (!state.center) return;
    event.preventDefault();
    state.userAdjusted = true;

    const rect = state.shell.getBoundingClientRect();
    const cursorX = event.clientX - rect.left - rect.width / 2;
    const cursorY = event.clientY - rect.top - rect.height / 2;
    const oldScale = (2 ** state.zoom) * 256;
    const oldWorld = {
      x: state.center.x + cursorX / oldScale,
      y: state.center.y + cursorY / oldScale,
    };

    const delta = clamp(-event.deltaY * 0.0022, -0.28, 0.28);
    state.zoom = clamp(state.zoom + delta, 3, 18);

    const newScale = (2 ** state.zoom) * 256;
    state.center.x = oldWorld.x - cursorX / newScale;
    state.center.y = clamp(oldWorld.y - cursorY / newScale, 0, 1);
    scheduleMaps();
  }, { passive: false });
}

function fitWorldRoute(worlds) {
  const xs = worlds.map((point) => point.x);
  const ys = worlds.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rect = mapState.route.shell.getBoundingClientRect();
  if (rect.width < 120 || rect.height < 100) return null;
  const width = Math.max(rect.width - 54, 160);
  const height = Math.max(rect.height - 48, 110);
  const spanX = Math.max(maxX - minX, 0.000001);
  const spanY = Math.max(maxY - minY, 0.000001);
  const zoomX = Math.log2(width / (spanX * 256));
  const zoomY = Math.log2(height / (spanY * 256));

  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    zoom: clamp(Math.min(zoomX, zoomY), 3, 17),
    route: worlds,
  };
}

function refitRouteMap() {
  const state = mapState.route;
  if (state.userAdjusted || state.route.length < 2) return false;
  const fitted = fitWorldRoute(state.route);
  if (!fitted) {
    state.needsFit = true;
    return false;
  }
  state.center = fitted.center;
  state.zoom = fitted.zoom;
  state.needsFit = false;
  drawMap("route");
  return true;
}

function renderCurrentMap(lat, lng) {
  const world = lonLatToWorld(lng, lat);
  mapState.current.userAdjusted = false;
  mapState.current.center = { ...world };
  mapState.current.zoom = 15.2;
  mapState.current.markerWorld = world;
  drawMap("current");
}

function renderRoute(points) {
  const valid = (points || []).filter((point) => point.latitude && point.longitude);
  if (valid.length < 2) {
    mapState.route.route = [];
    mapState.route.center = null;
    mapState.route.routeKey = "";
    mapState.route.needsFit = false;
    mapState.route.grid.innerHTML = "";
    fields.routePath.setAttribute("d", "");
    if (fields.routeStartMarker) fields.routeStartMarker.setAttribute("opacity", "0");
    if (fields.routeEndMarker) fields.routeEndMarker.setAttribute("opacity", "0");
    setMapState("route", "该行程暂无可用轨迹");
    return;
  }
  const state = mapState.route;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const routeKey = `${valid.length}:${first.latitude},${first.longitude}:${last.latitude},${last.longitude}`;
  state.routeKey = routeKey;
  state.userAdjusted = false;
  state.route = valid.map((point) => lonLatToWorld(point.longitude, point.latitude));
  state.needsFit = true;
  refitRouteMap();
}

function resetHomeMaps() {
  const current = mapState.current;
  current.userAdjusted = false;
  if (current.markerWorld) {
    current.center = { ...current.markerWorld };
    current.zoom = 15.2;
    drawMap("current");
  }

  mapState.route.userAdjusted = false;
  mapState.route.needsFit = true;
  if (!refitRouteMap()) scheduleMaps();
}

function scheduleHomeLayout({ resetMaps = false } = {}) {
  homeLayoutResetPending ||= resetMaps;
  const generation = ++homeLayoutGeneration;
  window.clearTimeout(homeLayoutTimer);

  const redraw = (pass) => {
    if (generation !== homeLayoutGeneration || fields.homeView?.hidden) return;
    renderEnergyChart(energyRows);
    if (homeLayoutResetPending && pass === 0) {
      homeLayoutResetPending = false;
      resetHomeMaps();
    } else if (!refitRouteMap()) scheduleMaps();
    if (pass < 2) window.requestAnimationFrame(() => redraw(pass + 1));
  };

  window.requestAnimationFrame(() => window.requestAnimationFrame(() => redraw(0)));
  homeLayoutTimer = window.setTimeout(() => redraw(3), 180);
}

function smoothPath(points) {
  if (points.length < 2) return "";
  const commands = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let index = 1; index < points.length; index++) {
    const current = points[index];
    commands.push(`L ${current.x.toFixed(1)} ${current.y.toFixed(1)}`);
  }
  return commands.join(" ");
}

function takeTrailingDistance(rows, targetDistanceKm) {
  let remainingKm = targetDistanceKm;
  const selected = [];
  for (let index = rows.length - 1; index >= 0 && remainingKm > 0; index -= 1) {
    const row = rows[index];
    const distance = Math.min(row.distance, remainingKm);
    selected.unshift({ ...row, distance });
    remainingKm -= distance;
  }
  return selected;
}

function rollingEnergyRows(rows, windowDistanceKm) {
  const window = [];
  const result = [];
  let windowDistance = 0;
  let windowEnergy = 0;
  let provisionalCount = 0;

  rows.forEach((row) => {
    const entry = {
      distance: row.distance,
      energy: row.consumption * row.distance,
      provisional: row.provisional,
    };
    window.push(entry);
    windowDistance += entry.distance;
    windowEnergy += entry.energy;
    if (entry.provisional) provisionalCount += 1;

    while (windowDistance > windowDistanceKm + 0.000001) {
      const oldest = window[0];
      const excess = windowDistance - windowDistanceKm;
      const removeDistance = Math.min(excess, oldest.distance);
      const removeEnergy = oldest.energy * (removeDistance / oldest.distance);
      oldest.distance -= removeDistance;
      oldest.energy -= removeEnergy;
      windowDistance -= removeDistance;
      windowEnergy -= removeEnergy;
      if (oldest.distance <= 0.000001) {
        if (oldest.provisional) provisionalCount -= 1;
        window.shift();
      }
    }

    result.push({
      ...row,
      consumption: windowEnergy / Math.max(windowDistance, 0.000001),
      provisional: provisionalCount > 0,
    });
  });
  return result;
}

function renderEnergyChart(rows) {
  const consumptionKey = energyMode === "gross" ? "grossConsumptionWhKm" : "consumptionWhKm";
  const source = (rows || [])
    .map((row) => ({
      consumption: Number(row[consumptionKey]),
      distance: Number(row.distanceKm) || 0,
      provisional: Boolean(row.provisional),
    }))
    .filter((row) => Number.isFinite(row.consumption) && row.distance > 0);

  const rawRecent = takeTrailingDistance(source, 100);
  const valid = takeTrailingDistance(rollingEnergyRows(source, 10), 100);

  if (valid.length < 2) {
    energyHoverPoints = [];
    fields.energyChartAvg.textContent = "-- Wh/km";
    fields.energyLine.setAttribute("d", "");
    fields.energyArea.setAttribute("d", "");
    if (fields.energyAverageLine) fields.energyAverageLine.setAttribute("opacity", "0");
    if (fields.energyMinMarker) fields.energyMinMarker.setAttribute("opacity", "0");
    if (fields.energyMaxMarker) fields.energyMaxMarker.setAttribute("opacity", "0");
    if (fields.energyCurrentMarker) fields.energyCurrentMarker.setAttribute("opacity", "0");
    if (fields.energyMinLabel) fields.energyMinLabel.style.opacity = "0";
    if (fields.energyMaxLabel) fields.energyMaxLabel.style.opacity = "0";
    if (fields.energyCurrentLabel) fields.energyCurrentLabel.style.opacity = "0";
    if (fields.energyHover) fields.energyHover.setAttribute("opacity", "0");
    return;
  }

  const totalDistance = rawRecent.reduce((sum, row) => sum + row.distance, 0);
  const weighted = rawRecent.reduce((sum, row) => sum + row.consumption * row.distance, 0);
  const simple = rawRecent.reduce((sum, row) => sum + row.consumption, 0) / rawRecent.length;
  const average = totalDistance > 0 ? weighted / totalDistance : simple;
  fields.energyChartAvg.textContent = `${number(average, 0)} Wh/km`;
  const displayDistance = Math.round(totalDistance);
  if (fields.energyChartRange) fields.energyChartRange.textContent = `最近 ${displayDistance} km · 10 km 滚动平均`;
  const xLabels = [
    [fields.energyXStart, -displayDistance],
    [fields.energyX20, -displayDistance * 0.8],
    [fields.energyX40, -displayDistance * 0.6],
    [fields.energyX60, -displayDistance * 0.4],
    [fields.energyX80, -displayDistance * 0.2],
  ];
  xLabels.forEach(([label, value]) => {
    if (label) label.textContent = `${number(value, 0)} km`;
  });
  if (fields.energyXEnd) fields.energyXEnd.textContent = "现在";

  const width = 640;
  const height = 128;
  const padX = 18;
  const padY = 14;
  const series = [{ consumption: valid[0].consumption, distance: 0 }, ...valid];
  const values = series.map((row) => row.consumption);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const axisIncrement = 10;
  const low = Math.floor(min / axisIncrement) * axisIncrement;
  const high = Math.ceil(max / axisIncrement) * axisIncrement;
  const span = Math.max(high - low, 1);
  let cumulativeDistance = 0;
  const points = series.map((row, index) => {
    if (index > 0) cumulativeDistance += row.distance;
    const point = {
      x: padX + (cumulativeDistance / Math.max(totalDistance, 1)) * (width - padX * 2),
      y: padY + (1 - (row.consumption - low) / span) * (height - padY * 2),
      value: row.consumption,
      distanceKm: cumulativeDistance,
    };
    return point;
  });
  energyHoverPoints = points;
  const line = smoothPath(points);
  const baseline = height - padY;
  const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`;

  const previousLine = fields.energyLine.getAttribute("d");
  fields.energyLine.setAttribute("d", line);
  fields.energyArea.setAttribute("d", area);
  if (previousLine && previousLine !== line) triggerDataUpdate(fields.energyChart.parentElement, "chart-data-updated");

  const minIndex = values.indexOf(min);
  const maxIndex = values.indexOf(max);
  const averageY = padY + (1 - (average - low) / span) * (height - padY * 2);
  if (fields.energyAverageLine) {
    fields.energyAverageLine.setAttribute("y1", averageY.toFixed(1));
    fields.energyAverageLine.setAttribute("y2", averageY.toFixed(1));
    fields.energyAverageLine.setAttribute("opacity", "1");
  }

  const chartRect = fields.energyChart.getBoundingClientRect();
  const plotRect = fields.energyChart.parentElement.getBoundingClientRect();
  const labelScaleX = chartRect.width / width;
  const labelScaleY = chartRect.height / height;
  const labelOffsetX = chartRect.left - plotRect.left;
  const labelOffsetY = chartRect.top - plotRect.top;
  const axisLabelWidth = Math.max(labelOffsetX + padX * labelScaleX - 6, 28);
  const plotHeight = height - padY * 2;
  const targetTickStep = (high - low) / 5;
  const tickSteps = [10, 20, 25, 50, 100, 200, 250, 500];
  const tickStep = tickSteps.find((step) => step >= targetTickStep) || Math.ceil(targetTickStep / 500) * 500;
  const axisTicks = [high];
  for (let value = Math.floor(high / tickStep) * tickStep; value > low; value -= tickStep) {
    if (value !== high) axisTicks.push(value);
  }
  if (axisTicks.at(-1) !== low) axisTicks.push(low);

  const axisLabels = [
    fields.energyAxisHigh,
    fields.energyAxisUpper,
    fields.energyAxisMid,
    fields.energyAxisLower,
    fields.energyAxisLowerMid,
    fields.energyAxisLow,
  ];
  axisLabels.forEach((axis, index) => {
    if (!axis) return;
    const value = axisTicks[index];
    if (value === undefined) {
      axis.style.display = "none";
      return;
    }
    const y = padY + (1 - (value - low) / span) * plotHeight;
    axis.textContent = `${number(value, 0)}`;
    axis.style.display = "block";
    axis.style.width = `${axisLabelWidth.toFixed(1)}px`;
    axis.style.top = `${(labelOffsetY + y * labelScaleY).toFixed(1)}px`;
    axis.style.transform = "translateY(-50%)";
  });
  fields.energyGridLines.forEach((line, index) => {
    const value = axisTicks[index];
    if (value === undefined) {
      line.style.display = "none";
      return;
    }
    const y = padY + (1 - (value - low) / span) * plotHeight;
    line.setAttribute("y1", y.toFixed(1));
    line.setAttribute("y2", y.toFixed(1));
    line.style.display = "block";
  });
  const placeExtremum = (marker, dot, label, point, value, anchor, labelClass) => {
    if (!marker || !dot || !label || !point) return;
    marker.setAttribute("opacity", "1");
    marker.setAttribute("transform", `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
    dot.setAttribute("cx", "0");
    dot.setAttribute("cy", "0");
    const text = `${labelClass} ${number(value, 0)} Wh/km`;
    label.textContent = text;
    label.style.left = `${(labelOffsetX + point.x * labelScaleX).toFixed(1)}px`;
    label.style.top = `${(labelOffsetY + point.y * labelScaleY).toFixed(1)}px`;
    label.style.transform = "";
    label.dataset.anchor = anchor;
    label.style.opacity = "1";
  };

  const currentPoint = points[points.length - 1];
  const maxAnchor = points[maxIndex].y < 42 ? "below" : "above";
  const minNearCurrent = Math.abs(points[minIndex].x - currentPoint.x) < 120
    && Math.abs(points[minIndex].y - currentPoint.y) < 42;
  const minAnchor = minNearCurrent
    ? "left"
    : (points[minIndex].x < 110 ? "right" : (points[minIndex].y > 88 ? "above" : "below"));
  const currentAnchor = currentPoint.y < 48 ? "left-below" : "left-above";
  placeExtremum(fields.energyMaxMarker, fields.energyMaxDot, fields.energyMaxLabel, points[maxIndex], max, maxAnchor, "最高");
  placeExtremum(fields.energyMinMarker, fields.energyMinDot, fields.energyMinLabel, points[minIndex], min, minAnchor, "最低");
  placeExtremum(fields.energyCurrentMarker, fields.energyCurrentDot, fields.energyCurrentLabel, currentPoint, values[values.length - 1], currentAnchor, currentPoint.provisional ? "暂估" : "当前");
}

function updateEnergyModeControls() {
  const isNet = energyMode === "net";
  if (fields.energyModeNet) fields.energyModeNet.setAttribute("aria-pressed", String(isNet));
  if (fields.energyModeGross) fields.energyModeGross.setAttribute("aria-pressed", String(!isNet));
}

function showEnergyHover(event) {
  if (!fields.energyChart || !energyHoverPoints.length) return;
  const rect = fields.energyChart.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 640;
  const closest = energyHoverPoints.reduce((best, point) => (
    Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best
  ), energyHoverPoints[0]);
  const bubbleWidth = 112;
  const bubbleHeight = 28;
  const bubbleX = clamp(closest.x - bubbleWidth / 2, 4, 640 - bubbleWidth - 4);
  const bubbleY = clamp(closest.y - 40, 4, 128 - bubbleHeight - 4);

  fields.energyHover.setAttribute("opacity", "1");
  fields.energyHoverLine.setAttribute("x1", closest.x.toFixed(1));
  fields.energyHoverLine.setAttribute("x2", closest.x.toFixed(1));
  fields.energyHoverDot.setAttribute("cx", closest.x.toFixed(1));
  fields.energyHoverDot.setAttribute("cy", closest.y.toFixed(1));
  if (fields.energyHoverBubble) {
    fields.energyHoverBubble.setAttribute("transform", `translate(${bubbleX.toFixed(1)} ${bubbleY.toFixed(1)})`);
  }
  if (fields.energyHoverText) fields.energyHoverText.textContent = `${number(closest.value, 0)} Wh/km`;
  if (fields.energyHoverTooltip) {
    const cardRect = fields.energyHoverTooltip.parentElement.getBoundingClientRect();
    const left = rect.left - cardRect.left + (closest.x / 640) * rect.width;
    const top = rect.top - cardRect.top + (closest.y / 128) * rect.height;
    fields.energyHoverTooltip.textContent = `${number(closest.value, 0)} Wh/km`;
    fields.energyHoverTooltip.style.left = `${left.toFixed(1)}px`;
    fields.energyHoverTooltip.style.top = `${top.toFixed(1)}px`;
    fields.energyHoverTooltip.dataset.visible = "true";
  }
}

function hideEnergyHover() {
  if (fields.energyHover) fields.energyHover.setAttribute("opacity", "0");
  if (fields.energyHoverTooltip) fields.energyHoverTooltip.dataset.visible = "false";
}

function renderBatteryPanel(level) {
  const value = clamp(Number(level) || 0, 0, 100);
  let tone = "good";
  updateMetricText(fields.mainBattery, `${number(value)}%`, value);

  if (fields.batterySegments) {
    const previousValue = fields.batterySegments.dataset.metricValue;
    fields.batterySegments.innerHTML = Array.from({ length: 10 }, (_, index) => {
      const fill = clamp(value - index * 10, 0, 10) * 10;
      return `<span class="battery-segment" style="--fill:${fill}%"></span>`;
    }).join("");
    fields.batterySegments.dataset.metricValue = String(value);
    if (previousValue !== undefined && previousValue !== String(value)) triggerDataUpdate(fields.batterySegments, "battery-updated");
  }

  let badge = "续航充足";
  let status = "续航充足";
  let advice = "可安心出发";
  if (value < 20) {
    tone = "critical";
    badge = "电量很低";
    status = "低电量";
    advice = "建议尽快充电";
  } else if (value < 35) {
    tone = "low";
    badge = "电量偏低";
    status = "低电量";
    advice = "建议尽快充电";
  } else if (value < 60) {
    tone = "medium";
    badge = "电量适中";
    status = "续航正常";
    advice = "按计划补能即可";
  } else if (value < 80) {
    badge = "电量充足";
    status = "状态良好";
    advice = "可以正常驾驶";
  }

  if (fields.batteryBadge) fields.batteryBadge.textContent = badge;
  document.querySelector(".battery-panel")?.setAttribute("data-tone", tone);
  if (fields.batteryAdviceStatus) fields.batteryAdviceStatus.textContent = status;
  if (fields.batteryAdviceText) fields.batteryAdviceText.textContent = advice;
}

function vehicleStateLabel(state) {
  const key = String(state || "unknown").toLowerCase();
  const labels = {
    online: "在线",
    asleep: "休眠",
    offline: "离线",
    driving: "行驶中",
    charging: "充电中",
    updating: "更新中",
    suspended: "暂停",
    unknown: "未知",
  };
  return labels[key] || key;
}

function refreshLabel(seconds) {
  const value = Number(seconds) || 30;
  if (value >= 60) return `${Math.round(value / 60)} 分钟刷新`;
  return `${Math.round(value)} 秒刷新`;
}

function freshnessLabel(cache) {
  const age = Math.max(0, Number(cache?.ageSeconds) || 0);
  if (cache?.status === "stale") {
    if (age < 60) return "使用刚才的缓存";
    if (age < 3600) return `使用 ${Math.round(age / 60)} 分钟前缓存`;
    return `使用 ${Math.round(age / 3600)} 小时前缓存`;
  }
  if (age < 10) return "刚刚更新";
  if (age < 60) return `${Math.round(age)} 秒前更新`;
  return `${Math.round(age / 60)} 分钟前更新`;
}

function dispatchConnectivity() {
  window.dispatchEvent(new CustomEvent("cockpit:connectivity", { detail: { online: browserOnline } }));
}

function setConnectivityState(online, { announce = true } = {}) {
  const changed = browserOnline !== online;
  browserOnline = online;
  document.body.classList.toggle("browser-offline", !online);
  if (!online) {
    recoveryPending = true;
    window.clearTimeout(refreshTimer);
    refreshAbortController?.abort();
    ["current", "route"].forEach((name) => {
      const state = mapState[name];
      if (state.center || state.route.length) setMapState(name, "网络已断开", { mode: "error" });
    });
    if (fields.dataFreshness) {
      fields.dataFreshness.textContent = hasRenderedVehicleData ? "网络已断开 · 显示上次数据" : "网络已断开";
      fields.dataFreshness.classList.add("is-stale");
      fields.dataFreshness.title = "网络恢复后会自动重新连接";
    }
    if (announce) setToast(hasRenderedVehicleData ? "网络已断开，继续显示上次数据" : "网络已断开", "error");
  } else if (changed || recoveryPending) {
    if (fields.dataFreshness) {
      fields.dataFreshness.textContent = "正在恢复连接";
      fields.dataFreshness.classList.remove("is-stale");
      fields.dataFreshness.title = "正在重新读取 Grafana 数据";
    }
    if (announce) setToast("网络已恢复，正在更新数据", "ok");
    window.clearTimeout(refreshTimer);
    if (document.hidden || refreshInFlight) refreshWhenVisible = true;
    else window.setTimeout(() => refresh(true), 0);
  }
  if (changed) dispatchConnectivity();
}

function markRecovered() {
  if (!recoveryPending) return;
  recoveryPending = false;
  document.body.classList.add("data-recovered");
  window.clearTimeout(recoveryTimer);
  recoveryTimer = window.setTimeout(() => document.body.classList.remove("data-recovered"), 1800);
}

function render(data) {
  const { car, battery, position, climate, lastDrive, month, today } = data;
  const state = car.state || "unknown";
  const lat = position.latitude;
  const lng = position.longitude;
  const mapLat = position.amapLatitude || lat;
  const mapLng = position.amapLongitude || lng;
  const vehicleName = car.name || car.model || "Model S";

  if (fields.carName) fields.carName.textContent = vehicleName;
  fields.modelName.textContent = vehicleName;
  window.cockpitVehicleName = vehicleName;
  window.dispatchEvent(new CustomEvent("cockpit:vehicle-name", { detail: { name: vehicleName } }));
  fields.stateText.textContent = vehicleStateLabel(state);
  fields.stateDot.dataset.state = state;
  fields.headerState.dataset.state = state;
  fields.headerState.textContent = vehicleStateLabel(state);
  fields.refreshCadence.textContent = refreshLabel(data.refreshAfterSeconds);
  if (fields.dataFreshness) {
    fields.dataFreshness.textContent = freshnessLabel(data.cache);
    fields.dataFreshness.classList.toggle("is-stale", data.cache?.status === "stale");
    fields.dataFreshness.title = data.cache?.error || "Grafana 数据更新时间";
  }
  fields.stateSince.textContent = `状态开始于 ${time(car.stateSince, true)}`;
  updateMetricText(fields.batteryLevel, `${number(battery.level)}%`, battery.level);
  renderBatteryPanel(battery.level);
  setMetric(fields.estimatedRange, battery.idealKm, "km");
  setMetric(fields.ratedRange, month && month.regenKwh, "kWh", 1);
  setMetric(fields.idealRange, month && month.totalConsumptionKwh, "kWh", 1);
  setMetric(fields.odometer, data.odometerKm, "km");
  setMetric(fields.insideTemp, climate.insideTemp, "°C", 1);
  setMetric(fields.outsideTemp, climate.outsideTemp, "°C", 1);
  setDurationMetric(fields.monthDuration, month && month.durationMin);
  setMetric(fields.monthDistance, month && month.distanceKm, "km", 1);
  setMetric(fields.avgConsumption, month && month.avgConsumptionWhKm, "Wh/km");
  const hasTodayDrive = Number(today && today.distanceKm) > 0 || Number(today && today.durationMin) > 0;
  setMetric(fields.todayDistance, today && today.distanceKm, "km", 1);
  updateMetricText(fields.todayDuration, duration(today && today.durationMin), today && today.durationMin);
  updateMetricText(fields.todayConsumption, `${number(today && today.avgConsumptionWhKm)} Wh/km`, today && today.avgConsumptionWhKm);
  if (fields.todayDriveDetails) fields.todayDriveDetails.hidden = !hasTodayDrive;
  if (fields.todayEmpty) fields.todayEmpty.hidden = hasTodayDrive;
  fields.updatedAt.textContent = time(data.updatedAt);
  energyRows = data.recentEnergy || [];
  renderEnergyChart(energyRows);

  if (lat && lng) {
    fields.coords.textContent = position.addressName || "位置暂不可用";
    fields.coords.title = `${number(lat, 6)}, ${number(lng, 6)}`;
    fields.mapLink.href = amapUrl(mapLat, mapLng);
    renderCurrentMap(mapLat, mapLng);
  }

  setMetric(fields.driveDistance, lastDrive.distanceKm, "km", 1);
  setMetric(fields.driveDuration, lastDrive.durationMin, "分钟");
  fields.driveTime.textContent = `${time(lastDrive.start, true)} - ${time(lastDrive.end, true)}`;
  fields.driveAddress.textContent = lastDrive.addressName || "";
  renderRoute(lastDrive.route);
  hasRenderedVehicleData = true;
  document.body.classList.remove("vehicle-data-error");
  markRecovered();
  setToast(`已更新 ${time(data.updatedAt)}`, "ok");
}

async function refresh(force = false) {
  if (document.hidden) return;
  if (refreshInFlight) return;
  if (!navigator.onLine) {
    setConnectivityState(false);
    return;
  }
  refreshInFlight = true;
  const controller = new AbortController();
  refreshAbortController = controller;
  if (fields.manualRefresh) {
    fields.manualRefresh.disabled = true;
    fields.manualRefresh.dataset.loading = "true";
    fields.manualRefresh.setAttribute("aria-label", "正在刷新数据");
  }
  try {
    const url = force ? "/api/vehicle?force=1" : "/api/vehicle";
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "读取失败");
    const connectivityChanged = !browserOnline;
    browserOnline = true;
    document.body.classList.remove("browser-offline");
    if (connectivityChanged) dispatchConnectivity();
    render(data);
    scheduleRefresh(data.refreshAfterSeconds);
  } catch (error) {
    if (error.name === "AbortError") return;
    document.body.classList.add("vehicle-data-error");
    if (fields.dataFreshness) {
      const offline = !navigator.onLine;
      fields.dataFreshness.textContent = offline
        ? (hasRenderedVehicleData ? "网络已断开 · 显示上次数据" : "网络已断开")
        : (hasRenderedVehicleData ? "连接异常 · 显示上次数据" : "连接异常");
      fields.dataFreshness.classList.add("is-stale");
      fields.dataFreshness.title = error.message;
    }
    setToast(hasRenderedVehicleData ? "更新失败，当前仍显示上次成功数据" : `连接失败：${error.message}`, "error");
    if (navigator.onLine) scheduleRefresh(30);
  } finally {
    refreshInFlight = false;
    if (refreshAbortController === controller) refreshAbortController = null;
    if (fields.manualRefresh) {
      fields.manualRefresh.disabled = false;
      fields.manualRefresh.dataset.loading = "false";
      fields.manualRefresh.setAttribute("aria-label", "手动刷新数据");
    }
    if (refreshWhenVisible && !document.hidden) {
      refreshWhenVisible = false;
      window.setTimeout(() => refresh(), 0);
    }
  }
}

function scheduleRefresh(seconds) {
  const delaySeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 30;
  const delay = Math.max(5, delaySeconds) * 1000;
  window.clearTimeout(refreshTimer);
  if (document.hidden) return;
  refreshTimer = window.setTimeout(refresh, delay);
}

installMapInteraction("current");
installMapInteraction("route");
if (fields.energyChart) {
  fields.energyChart.addEventListener("pointermove", showEnergyHover);
  fields.energyChart.addEventListener("pointerleave", hideEnergyHover);
}
if (fields.manualRefresh) {
  fields.manualRefresh.addEventListener("click", () => {
    window.clearTimeout(refreshTimer);
    refresh(true);
  });
}
[
  fields.energyModeNet,
  fields.energyModeGross,
].filter(Boolean).forEach((button) => {
  button.addEventListener("click", () => {
    energyMode = button.dataset.mode === "gross" ? "gross" : "net";
    updateEnergyModeControls();
    renderEnergyChart(energyRows);
  });
});
updateEnergyModeControls();
window.addEventListener("resize", () => {
  scheduleHomeLayout();
});
window.addEventListener("offline", () => setConnectivityState(false));
window.addEventListener("online", () => setConnectivityState(true));
window.addEventListener("cockpit:home-visible", () => {
  scheduleHomeLayout({ resetMaps: true });
});
if (typeof ResizeObserver === "function") {
  const homeLayoutObserver = new ResizeObserver(() => scheduleHomeLayout());
  [fields.energyChart?.parentElement, mapState.current.shell, mapState.route.shell]
    .filter(Boolean)
    .forEach((element) => homeLayoutObserver.observe(element));
}
document.addEventListener("visibilitychange", () => {
  window.clearTimeout(refreshTimer);
  if (document.hidden) {
    refreshWhenVisible = true;
    refreshAbortController?.abort();
    return;
  }
  if (refreshInFlight) refreshWhenVisible = true;
  else {
    refreshWhenVisible = false;
    window.setTimeout(() => refresh(), 0);
  }
});
setConnectivityState(navigator.onLine, { announce: false });
refresh();
