(function () {
  "use strict";
  const E = GreenEngine, D = GreenData;
  const $ = (s) => document.querySelector(s);
  const COLORS = { car: "#e44840", bus: "#d7a126", metro: "#2f80c0", two: "#e8743b", bike: "#25824b", walk: "#6a9e48" };
  const state = { opts: null, sum: null, sel: null, pickMode: "bike", o: null, d: null, geo: null, time: "day", sharedMode: null, spare: 30, userPicked: false, myLoc: null, baseOpts: null };
  let map = null, layer = null, tileLayer = null, revealObserver = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtT = (m) => { m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min" : m + " min"; };
  const fmtKg = (v) => (v === 0 ? "0 kg" : v.toFixed(2) + " kg");


  // ---------- Haptics (Vibration API on Android/Chrome; best-effort switch-tick on iOS Safari 17.4+) ----------
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let hapticsOn = true;
  try { hapticsOn = localStorage.getItem("greenroute-haptics") !== "off"; } catch (_) {}
  const PAT = { tap: 8, select: 14, success: [14, 50, 24], warn: [30, 50, 30], error: [60, 40, 60, 40, 60] };
  function iosTick() {
    try {
      const l = document.createElement("label"); l.setAttribute("aria-hidden", "true");
      l.style.cssText = "position:fixed;left:-99px;top:0;opacity:0;pointer-events:none";
      const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); l.appendChild(i);
      document.body.appendChild(l); l.click(); setTimeout(() => l.remove(), 60);
    } catch (_) {}
  }
  function haptic(kind) {
    if (!hapticsOn) return;
    try { if (navigator.vibrate) { navigator.vibrate(PAT[kind] || PAT.tap); return; } } catch (_) {}
    if (kind !== "success" && kind !== "error") iosTick();
  }
  function initHaptics() {
    const b = $("#hapticToggle"); if (!b) return;
    const sync = () => { b.setAttribute("aria-pressed", hapticsOn ? "true" : "false"); b.setAttribute("aria-label", hapticsOn ? "Haptic feedback is on" : "Haptic feedback is off"); };
    sync();
    b.addEventListener("click", () => { hapticsOn = !hapticsOn; try { localStorage.setItem("greenroute-haptics", hapticsOn ? "on" : "off"); } catch (_) {} sync(); if (hapticsOn) haptic("select"); });
    document.addEventListener("click", (e) => {
      const t = e.target.closest(".mode-pick,.chip,.time-pill,.card,#swap,#themeToggle,.secondary-button,.share-button,.mb-share,#locate,.go");
      if (t) haptic(t.classList.contains("go") ? "select" : "tap");
    });
  }

  // ---------- Time-of-day traffic + "time I can spare" recommendation ----------
  const TRAFFIC = { day: { car: 1, bus: 1, two: 1 }, evening: { car: 1.4, bus: 1.3, two: 1.2 }, night: { car: .75, bus: .8, two: .8 } };
  function recompute() {
    const t = TRAFFIC[state.time] || TRAFFIC.day;
    state.opts = state.baseOpts.map((o) => (o.available && t[o.id] && t[o.id] !== 1) ? Object.assign({}, o, { min: o.min * t[o.id] }) : o);
    const s = E.summarize(state.opts);
    const ok = state.opts.filter((o) => o.available && o.practical && o.min <= s.fastest.min + state.spare);
    const lowest = ok.sort((x, y) => x.co2 - y.co2 || x.min - y.min)[0] || s.lowest;
    const savedKg = Math.max(0, s.car.co2 - lowest.co2);
    state.sum = Object.assign({}, s, { lowest, savedKg, pct: s.car.co2 > 0 ? Math.round(savedKg / s.car.co2 * 100) : 0, extraMin: Math.round(lowest.min - s.fastest.min) });
  }
  function countUp(el) {
    const to = +el.dataset.v; if (reduced || !isFinite(to)) return;
    const t0 = performance.now(), dur = 900;
    (function step(now) { const k = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - k, 3); el.textContent = (to * ease).toFixed(2); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function growBars(root) {
    const els = root.querySelectorAll("[data-w]");
    els.forEach((el) => { el.style.width = "0%"; });
    void root.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((el) => { el.style.width = el.dataset.w; })));
  }
  const cacheKey = (o, d) => "gr:" + [o.lat, o.lng, d.lat, d.lng].map((v) => v.toFixed(4)).join(",");
  function cacheGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }
  function cachePut(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }

  function setMapTiles(theme) {
    if (!map || typeof L === "undefined") return;
    // Keep the existing tiles loaded when the appearance changes: just switch the visual treatment.
    // This avoids re-requesting the entire basemap on every light/dark toggle.
    if (!tileLayer) {
      tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        maxNativeZoom: 19,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
    }
    const container = map.getContainer();
    if (container) {
      container.classList.toggle("map-dark-tiles", theme === "dark");
      container.classList.toggle("map-light-tiles", theme !== "dark");
    }
  }

  const MODE_MOOD = {
    walk: { title: "Take the greener short way", text: "Zero tailpipe emissions · simple and direct", tag: "LOW IMPACT" },
    bike: { title: "Cycle instead of driving", text: "Zero tailpipe emissions · active mobility", tag: "LOW IMPACT" },
    metro: { title: "Let the metro carry more", text: "Shared transit · emissions spread across riders", tag: "SHARED TRANSIT" },
    bus: { title: "Share the road", text: "Public bus estimate · less impact per passenger", tag: "SHARED TRANSIT" },
    two: { title: "Lighter than a car, still a tailpipe", text: "Solo petrol two-wheeler · moderate impact", tag: "MODERATE IMPACT" },
    car: { title: "Driving solo has a bigger footprint", text: "One person · petrol-car emissions estimate", tag: "HIGHER IMPACT" }
  };
  function updateModeUI(mode) {
    if (!["walk", "bike", "metro", "bus", "car", "two"].includes(mode)) mode = "bike";
    state.pickMode = mode;
    document.documentElement.dataset.mode = mode;
    document.querySelectorAll("[data-pick-mode]").forEach((button) => {
      const active = button.dataset.pickMode === mode;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const mood = $("#modeMood");
    if (mood) {
      mood.dataset.mood = mode;
      const copy = MODE_MOOD[mode];
      $("#moodTitle").textContent = copy.title;
      $("#moodText").textContent = copy.text;
      $("#moodTag").textContent = copy.tag;
    }
  }
  function updateTimeUI(value) {
    state.time = value;
    document.querySelectorAll("[data-time]").forEach((button) => {
      const active = button.dataset.time === value;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const select = $("#travelTime");
    if (select && select.value !== value) select.value = value;
    if (state.opts) { recompute(); render(); }
  }

  function initTheme() {
    const button = $("#themeToggle");
    if (!button) return;
    let theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const apply = (next, persist) => {
      theme = next === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      button.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = theme === "dark" ? "#07110c" : "#f7faf7";
      if (persist) {
        try { localStorage.setItem("greenroute-theme", theme); } catch (_) { /* Storage may be disabled. */ }
      }
      setMapTiles(theme);
      if (state.opts) draw(true);
    };
    button.addEventListener("click", () => apply(theme === "dark" ? "light" : "dark", true));
    apply(theme, false);
  }

  function initMap() {
    if (typeof L === "undefined") {
      $("#map").innerHTML = '<div class="map-fallback">The interactive map could not load. Route comparisons can still work when you use a sample journey.</div>';
      return;
    }
    map = L.map("map", { dragging: !L.Browser.mobile, tap: false, scrollWheelZoom: false, zoomControl: true, fadeAnimation: false, markerZoomAnimation: false, zoomAnimation: true, preferCanvas: true, wheelDebounceTime: 80 }).setView([28.61, 77.21], 10);
    setMapTiles(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    layer = L.layerGroup().addTo(map);
  }

  function initForm() {
    $("#places").innerHTML = D.PLACES.map((p) => '<option value="' + esc(p.name) + '"></option>').join("");
    $("#chips").innerHTML = D.EXAMPLES.map((e, i) => '<button type="button" class="chip" data-i="' + i + '">' + esc(e[0]) + " → " + esc(e[1]) + "</button>").join("");
    $("#chips").addEventListener("click", (ev) => {
      const b = ev.target.closest(".chip"); if (!b) return;
      const ex = D.EXAMPLES[+b.dataset.i]; $("#from").value = ex[0]; $("#to").value = ex[1]; run();
    });
    $("#swap").addEventListener("click", () => { const f = $("#from"), t = $("#to"); [f.value, t.value] = [t.value, f.value]; });
    $("#planner").addEventListener("submit", (e) => { e.preventDefault(); run(); });
    document.querySelectorAll(".mode-picker").forEach((picker) => picker.addEventListener("click", (ev) => {
      const button = ev.target.closest("[data-pick-mode]");
      if (!button) return;
      state.userPicked = true;
      updateModeUI(button.dataset.pickMode);
      if (state.opts) {
        const option = state.opts.find((o) => o.id === state.pickMode && o.available);
        if (option) { state.sel = option.id; render(); if (!option.practical) setStatus(option.label + " isn't practical for this distance (" + option.km.toFixed(0) + " km). Showing it anyway.", "warn"); }
        else {
          updateModeUI(state.sel || "bike");
          setStatus("That mode is unavailable for this sample journey. Try another option.", "warn");
        }
      }
    }));
    document.querySelectorAll("[data-time]").forEach((button) => button.addEventListener("click", () => updateTimeUI(button.dataset.time)));
    $("#travelTime").addEventListener("change", () => updateTimeUI($("#travelTime").value));
    $("#shareTrip").addEventListener("click", shareTrip);
    $("#mbShare").addEventListener("click", shareTrip);
    const sp = $("#spare");
    sp.addEventListener("input", () => {
      state.spare = +sp.value; $("#spareOut").textContent = "+" + sp.value + " min";
      if (+sp.value % 10 === 0) haptic("tap");
      if (state.opts) { recompute(); if (!state.userPicked) state.sel = state.sum.lowest.id; render(); }
    });
    $("#locate").addEventListener("click", () => {
      if (!navigator.geolocation) return showError("Location isn't available in this browser. Type a place instead.");
      setStatus("Finding your location…", "loading");
      navigator.geolocation.getCurrentPosition((p) => {
        const lat = p.coords.latitude, lng = p.coords.longitude; setStatus("");
        if (!E.inNCR(lat, lng)) return showError("Your location is outside Delhi NCR, so this demo can't plan from it.");
        state.myLoc = { name: "My location", lat, lng }; $("#from").value = "My location"; showError(""); haptic("success");
      }, () => { setStatus(""); showError("Couldn't get your location. Allow location access or type a place."); }, { enableHighAccuracy: true, timeout: 8000 });
    });
    $("#copyTrip").addEventListener("click", copyTrip);
    initReveal();
    const bp = document.querySelector(".bars-panel"); if (bp) bp.addEventListener("toggle", () => { if (bp.open) growBars($("#bars")); });
    $("#assump").innerHTML = ["metro", "bus", "two", "car", "bike", "walk"].map((m) => {
      const notes = { metro: "Electric; varies with load and grid", bus: "Mixed CNG/electric fleet, average occupancy", car: "Petrol, one occupant", two: "Petrol, one rider", bike: "No tailpipe emissions", walk: "No tailpipe emissions" };
      return "<tr><td>" + E.LABELS[m] + "</td><td>" + E.FACTORS[m] + "</td><td>" + E.SPEEDS[m] + "</td><td>" + notes[m] + "</td></tr>";
    }).join("");
    updateModeUI(state.pickMode);
    updateTimeUI($("#travelTime").value || "day");
  }

  async function fetchT(url, ms) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try { return await fetch(url, { signal: c.signal }); } finally { clearTimeout(t); }
  }

  // Keep address lookups serial and spaced out to be considerate of the public geocoder.
  let geocoderQueue = Promise.resolve();
  let lastGeocoderRequest = 0;
  function searchAddress(query) {
    const task = geocoderQueue.then(async () => {
      const wait = Math.max(0, 1100 - (Date.now() - lastGeocoderRequest));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      lastGeocoderRequest = Date.now();
      const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&viewbox=76.7,29.0,77.8,28.1&bounded=1&q=" + encodeURIComponent(query);
      const r = await fetchT(url, 8000);
      if (!r.ok) throw new Error("bad status");
      return r.json();
    });
    geocoderQueue = task.then(() => undefined, () => undefined);
    return task;
  }

  async function resolvePlace(text, label) {
    const t = text.trim();
    if (!t) throw new Error("Enter a " + label + " location.");
    if (state.myLoc && t.toLowerCase() === "my location") return state.myLoc;
    const p = D.PLACES.find((x) => x.name.toLowerCase() === t.toLowerCase());
    if (p) return { name: p.name, lat: p.lat, lng: p.lng };
    let j;
    try {
      j = await searchAddress(t);
    } catch (e) {
      throw new Error("Couldn't search for \"" + t + "\" (the OpenStreetMap search service may be unavailable). Choose one of the suggested places instead.");
    }
    if (!j.length) throw new Error("\"" + t + "\" wasn't found inside Delhi NCR. Try a landmark or add the area, e.g. \"Sector 29 Gurugram\".");
    const lat = +j[0].lat, lng = +j[0].lon;
    if (!E.inNCR(lat, lng)) throw new Error("\"" + t + "\" is outside the Delhi NCR area this demo covers.");
    return { name: t, lat, lng };
  }

  async function route(profile, o, d) {
    const url = "https://routing.openstreetmap.de/routed-" + profile + "/route/v1/driving/" + o.lng + "," + o.lat + ";" + d.lng + "," + d.lat + "?overview=full&geometries=geojson";
    const r = await fetchT(url, 9000);
    if (!r.ok) throw new Error("routing");
    const j = await r.json();
    const rt = j.routes && j.routes[0];
    if (!rt) throw new Error("no route");
    return { km: rt.distance / 1000, pts: rt.geometry.coordinates.map((c) => [c[1], c[0]]), live: true };
  }

  async function getGeo(o, d) {
    const key = cacheKey(o, d), hit = cacheGet(key);
    if (hit && hit.car && hit.bike && hit.walk) return hit;
    const h = E.haversine(o, d);
    const fb = (f) => ({ km: h * f, pts: [[o.lat, o.lng], [d.lat, d.lng]], live: false });
    const [c, b, w] = await Promise.allSettled([route("car", o, d), route("bike", o, d), route("foot", o, d)]);
    const res = { car: c.status === "fulfilled" ? c.value : fb(1.3), bike: b.status === "fulfilled" ? b.value : fb(1.25), walk: w.status === "fulfilled" ? w.value : fb(1.25) };
    if (res.car.live && res.bike.live && res.walk.live) cachePut(key, res);
    return res;
  }

  function showError(msg) { const e = $("#error"); e.textContent = msg; e.hidden = !msg; if (msg) haptic("error"); }
  function setStatus(msg, kind) { const s = $("#status"); s.hidden = !msg; s.textContent = msg || ""; s.className = "status " + (kind || ""); if (kind === "warn") haptic("warn"); }

  let busy = false;
  async function run() {
    if (busy) return;
    showError("");
    const f = $("#from").value, t = $("#to").value;
    if (!f.trim() || !t.trim()) return showError("Enter both a start and a destination.");
    busy = true; $("#go").disabled = true; $("#go").textContent = "Comparing…";
    setStatus("Finding places and routes…", "loading");
    try {
      const [o, d] = await Promise.all([resolvePlace(f, "start"), resolvePlace(t, "destination")]);
      if (E.haversine(o, d) < 0.15) throw new Error("Start and destination are almost the same place. Choose two different locations.");
      const geo = await getGeo(o, d);
      const opts = E.buildOptions(o, d, { car: geo.car.km, bike: geo.bike.km, walk: geo.walk.km }, D.STATIONS);
      Object.assign(state, { o, d, geo, baseOpts: opts, time: $("#travelTime").value });
      recompute();
      const requestedMode = state.sharedMode || (state.userPicked ? state.pickMode : null);
      const requested = requestedMode && state.opts.find((x) => x.id === requestedMode && x.available && x.practical);
      const modeUnavailable = !!requestedMode && !requested;
      state.sel = requested ? requested.id : state.sum.lowest.id;
      state.sharedMode = null;
      render();
      const live = geo.car.live && geo.bike.live && geo.walk.live;
      const anyLive = geo.car.live || geo.bike.live || geo.walk.live;
      const routeStatus = live
        ? "Road routes use OpenStreetMap routing. Transit and emissions are estimates."
        : anyLive
          ? "Some road routes use approximate distances. Times and emissions are estimates."
          : "Routing service unavailable: approximate distances and illustrative emissions shown.";
      setStatus(modeUnavailable
        ? "That mode isn't practical for this journey. Showing the greenest realistic option. " + routeStatus
        : routeStatus, modeUnavailable || !live ? "warn" : "");
      haptic("success");
      $("#results").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } catch (err) {
      setStatus("");
      showError(err.message || "Something went wrong. Please try again.");
    } finally { busy = false; $("#go").disabled = false; $("#go").innerHTML = 'Compare routes <span aria-hidden="true">→</span>'; }
  }

  function render() {
    const { opts, sum } = state;
    $("#empty").hidden = true; $("#summary").hidden = false; $("#board").hidden = false; $("#journey-insights").hidden = false;
    const L1 = sum.lowest, F = sum.fastest;
    updateModeUI(state.sel || state.pickMode);
    $("#hero-save").innerHTML = sum.savedKg > 0.005
      ? '<p class="save-big">Save <span class="save-num" data-v="' + sum.savedKg.toFixed(2) + '">' + sum.savedKg.toFixed(2) + '</span> kg CO₂e</p><p>' + esc(L1.label) + ' · ' + sum.pct + '% less than driving solo' + (sum.extraMin > 0 ? ' · +' + sum.extraMin + ' min vs fastest' : '') + '</p><p class="save-year">Twice a day, 250 days a year: <strong>≈ ' + Math.round(sum.savedKg * 500).toLocaleString("en-IN") + ' kg CO₂e</strong> avoided <small>(illustrative assumption)</small></p>'
      : '<p class="save-big">Compare your options</p><p>Choose the mode that works for this trip.</p>';
    renderBikeCarCompare(opts);
    document.querySelectorAll(".save-num").forEach(countUp);
    $("#mobileBar").hidden = false; $("#mbText").textContent = L1.label + (sum.savedKg > 0.005 ? " · saves " + sum.savedKg.toFixed(2) + " kg" : "");
    $("#stats").innerHTML =
      stat("Lowest emissions", L1.label, fmtKg(L1.co2) + " CO₂e · " + fmtT(L1.min)) +
      stat("Fastest", F.label, fmtT(F.min) + " · " + fmtKg(F.co2) + " CO₂e") +
      stat("Driving solo", fmtKg(sum.car.co2), fmtT(sum.car.min) + " · " + sum.car.km.toFixed(1) + " km");

    const sorted = [...opts].sort((a, b) => rank(a) - rank(b) || a.co2 - b.co2 || a.min - b.min);
    $("#cards").innerHTML = sorted.map((o) => {
      const usable = o.available && o.practical;
      const badges = (o.id === L1.id ? '<span class="badge green">Lowest CO₂e</span>' : "") + (o.id === F.id ? '<span class="badge amber">Fastest</span>' : "");
      return '<button type="button" class="card' + (usable ? "" : " dim") + (o.id === state.sel ? " on" : "") + '" aria-pressed="' + (o.id === state.sel ? "true" : "false") + '" data-id="' + o.id + '" ' + (o.available ? "" : "disabled") + ' style="--c:' + COLORS[o.id] + '">' +
        '<div class="card-h"><h3>' + o.label + "</h3><div>" + badges + "</div></div>" +
        (o.available ? '<dl><div><dt>Time</dt><dd>' + fmtT(o.min) + '</dd></div><div><dt>Distance</dt><dd>' + o.km.toFixed(1) + ' km</dd></div><div><dt>CO₂e</dt><dd>' + fmtKg(o.co2) + "</dd></div></dl>" : "") +
        '<p class="route-detail">' + walkDetail(o) + ' <span>·</span> ' + transferDetail(o) + '</p>' +
        '<p class="note">' + esc(modeHint(o)) + "</p></button>";
    }).join("");

    const maxC = Math.max(...opts.filter((o) => o.available).map((o) => o.co2), 0.01);
    const maxT = Math.max(...opts.filter((o) => o.available).map((o) => o.min), 1);
    $("#bars").innerHTML = sorted.filter((o) => o.available).map((o) =>
      '<div class="bar-row' + (o.practical ? "" : " dim") + '"><span class="bar-l">' + o.label + '</span>' +
      '<div class="bar-pair"><div class="bar co2" data-w="' + Math.max(2, (o.co2 / maxC) * 100) + '%" style="width:0;background:' + COLORS[o.id] + '"></div><span>' + fmtKg(o.co2) + " CO₂e</span></div>" +
      '<div class="bar-pair"><div class="bar tm" data-w="' + Math.max(2, (o.min / maxT) * 100) + '%" style="width:0"></div><span>' + fmtT(o.min) + "</span></div></div>").join("");
    growBars($("#bars")); draw(); renderInsights(); observeReveals($("#board")); observeReveals($("#journey-insights"));
  }
  function modeHint(o) {
    if (!o.available) return o.note && o.note.includes("station") ? "No usable station pair in this demo" : "Not available for this trip";
    if (!o.practical) return o.id === "bike" ? "Long ride for a typical commute" : o.id === "walk" ? "Long walk for most trips" : "Less practical for this journey";
    return ({
      walk: "Zero tailpipe emissions",
      bike: "Zero tailpipe emissions",
      metro: "Shared transit · estimate",
      bus: "Shared transit · estimate",
      car: "Solo driver · highest estimated emissions",
      two: "Solo rider · petrol estimate"
    })[o.id] || "Estimated route";
  }
  function renderBikeCarCompare(opts) {
    const box = $("#quickCompare");
    if (!box || !opts || !state.sum) return;
    const car = opts.find((o) => o.id === "car"), g = state.sum.lowest;
    if (!car || !g || g.id === "car") { box.hidden = true; return; }
    box.hidden = false;
    $("#compare-title").textContent = g.label + " vs. drive alone";
    $("#greenLabel").textContent = g.label.toUpperCase();
    $("#bikeCo2").textContent = fmtKg(g.co2) + " CO₂e"; $("#carCo2").textContent = fmtKg(car.co2) + " CO₂e";
    $("#bikeTime").textContent = fmtT(g.min); $("#carTime").textContent = fmtT(car.min);
    $("#bikeKm").textContent = g.km.toFixed(1); $("#carKm").textContent = car.km.toFixed(1);
    const max = Math.max(car.co2, g.co2, 0.001);
    $("#bikeBar").dataset.w = Math.max(g.co2 === 0 ? 2 : 4, g.co2 / max * 100) + "%"; $("#carBar").dataset.w = Math.max(4, car.co2 / max * 100) + "%";
    growBars(box);
    const saved = Math.max(0, car.co2 - g.co2), pct = car.co2 > 0 ? Math.round(saved / car.co2 * 100) : 0;
    $("#compareSaving").textContent = saved > 0 ? fmtKg(saved) + " less / trip" : "Similar emissions";
    $("#compareFoot").textContent = saved > 0
      ? g.label + " cuts about " + pct + "% of operational CO₂e vs a solo petrol car in this estimate. " + (g.min <= car.min ? "It is also estimated to be no slower." : "It takes about " + fmtT(g.min - car.min) + " longer.")
      : "This demo shows little or no emissions difference for these estimates.";
  }

  const rank = (o) => (o.available && o.practical ? 0 : o.available ? 1 : 2);
  const stat = (k, v, s) => '<div class="stat"><span>' + k + "</span><strong>" + esc(v) + "</strong><small>" + esc(s) + "</small></div>";

  document.addEventListener("click", (e) => {
    const c = e.target.closest(".card"); if (!c || !state.opts) return;
    state.sel = c.dataset.id; state.userPicked = true;
    updateModeUI(state.sel);
    document.querySelectorAll(".card").forEach((x) => {
      x.classList.toggle("on", x === c);
      x.setAttribute("aria-pressed", x === c ? "true" : "false");
    });
    draw(); renderInsights(); renderBikeCarCompare(state.opts);
  });

  function pin(p, t) {
    const end = t === "B";
    return L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: "route-pin-wrap", html: '<span class="route-pin ' + (end ? 'route-pin-end' : 'route-pin-start') + '"><span>' + t + "</span></span>", iconSize: [34, 42], iconAnchor: [17, 38] }),
      title: p.name,
      keyboard: true,
      alt: (end ? "Destination: " : "Start: ") + p.name
    }).bindTooltip(esc(p.name), { direction: "top", offset: [0, -28] });
  }

  function draw(preserveView) {
    if (!layer || !state.opts || !state.o || !state.d) return;
    layer.clearLayers();
    const { o, d, geo, sel, opts } = state, op = opts.find((x) => x.id === sel), col = COLORS[sel] || COLORS.car;
    const dark = document.documentElement.dataset.theme === "dark";
    const casing = dark ? "#07140c" : "#ffffff";
    const line = (pts, dash) => {
      // Double-stroke casing separates the route from both pale and dark streets.
      L.polyline(pts, { color: casing, weight: 12, opacity: 1, dashArray: dash || null, lineCap: "round", lineJoin: "round", smoothFactor: 1, interactive: false }).addTo(layer);
      L.polyline(pts, { color: col, weight: 6, opacity: 1, dashArray: dash || null, lineCap: "round", lineJoin: "round", smoothFactor: 1, className: "route-line", interactive: false }).addTo(layer);
    };
    let bounds = [[o.lat, o.lng], [d.lat, d.lng]];
    if (sel === "metro" && op.stations) {
      const [a, b] = op.stations, P = (st) => [st.lat, st.lng];
      line([[o.lat, o.lng], P(a)], "5 7"); line([P(a), P(b)]); line([P(b), [d.lat, d.lng]], "5 7");
      [a, b].forEach((st) => L.circleMarker(P(st), { radius: 7, color: casing, fillColor: col, fillOpacity: 1, weight: 4 }).bindTooltip(esc(st.name + " station (approximate)"), { direction: "top" }).addTo(layer));
      bounds = bounds.concat([P(a), P(b)]);
    } else {
      const g = sel === "bike" ? geo.bike : sel === "walk" ? geo.walk : geo.car;
      line(g.pts, g.live === false ? "3 11" : sel === "bus" ? "8 7" : null); bounds = g.pts;
    }
    pin(o, "A").addTo(layer); pin(d, "B").addTo(layer);
    if (!preserveView) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true, duration: 0.55 });
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
  }

  function walkKmFor(o) {
    if (Number.isFinite(o.walkKm)) return o.walkKm;
    if (o.id === "walk") return o.km;
    if (o.id === "bus") return 0.5;
    return 0;
  }
  function walkDetail(o) {
    return "Walk ~" + walkKmFor(o).toFixed(1) + " km";
  }
  function transferDetail(o) {
    if (o.id === "metro" || o.id === "bus") return "transfers not verified";
    return o.id === "car" ? "direct drive" : o.id === "bike" ? "cycle route" : "no transfers";
  }
  function comfortCard(label, value, note, tone, symbol) {
    return '<article class="comfort-item ' + (tone || "") + '"><span class="comfort-symbol" aria-hidden="true">' + symbol + '</span><div><span class="comfort-label">' + label + '</span><strong>' + value + '</strong><p>' + note + '</p></div></article>';
  }
  function renderInsights() {
    if (!state.opts || !state.sel) return;
    const o = state.opts.find((x) => x.id === state.sel);
    if (!o) return;
    const walk = walkKmFor(o);
    const walkLabel = walk < 0.4 ? "Very little walking" : walk < 1.2 ? "Some walking" : "More walking";
    const walkTone = walk < 0.4 ? "positive" : walk < 1.2 ? "neutral" : "caution";
    const transit = o.id === "metro" || o.id === "bus";
    const transfersValue = transit ? "Not verified" : "Not applicable";
    const transfersNote = transit ? "Live routes and interchange data are not connected." : "This option does not use a public-transport interchange.";
    const infrastructureValue = o.id === "bike" ? "Not verified" : state.time === "night" ? "Check locally" : "Data unavailable";
    const infrastructureNote = o.id === "bike" ? "Protected cycle-lane coverage is not available in this demo." : "Street lighting, sidewalk condition and personal-safety data are not connected.";
    $("#comfortItems").innerHTML =
      comfortCard("Estimated walking", walkLabel, walk.toFixed(1) + " km on foot is estimated for this option.", walkTone, '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l1.5-6-2.5-2.5 1.5-5 3 2.5 3 .5M11.5 15l3 2 .5 4M8.5 9.5l-2 3"/></svg>') +
      comfortCard("Transit changes", transfersValue, transfersNote, transit ? "caution" : "neutral", '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>') +
      comfortCard(o.id === "bike" ? "Cycling infrastructure" : "Street environment", infrastructureValue, infrastructureNote, "caution", '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>');
    $("#tripSteps").innerHTML = buildSteps(o);
    $("#transferNote").textContent = transit ? "Actual transfer count is not available" : "No public-transport transfers for this mode";
    const timeAdvice = {
      day: "Daylight helps visibility, but sidewalks, crossings and cycle lanes are not verified.",
      evening: "Prefer familiar, well-lit streets. Live lighting data is not connected.",
      night: "Choose a familiar, well-lit route. No live lighting or personal-safety data is available."
    };
    $("#safetyContext").textContent = (state.time === "evening" ? "Evening peak: car, bus and two-wheeler times are padded by 20–40%. " : state.time === "night" ? "Night: lighter traffic assumed. " : "") + (timeAdvice[state.time] || timeAdvice.day);
    $("#journey-insights").classList.remove("insights-enter");
    void $("#journey-insights").offsetWidth;
    $("#journey-insights").classList.add("insights-enter");
  }
  function buildSteps(o) {
    let steps;
    if (o.id === "metro") steps = ["Walk to nearest station", "Metro ride (schematic)", "Walk to destination"];
    else if (o.id === "bus") steps = ["Walk to a bus stop", "Bus journey (generic estimate)", "Walk to destination"];
    else if (o.id === "bike") steps = ["Start", "Cycle to destination", "Arrive"];
    else if (o.id === "walk") steps = ["Start", "Walk the full journey", "Arrive"];
    else steps = ["Start", o.id === "two" ? "Two-wheeler route" : "Private car route", "Arrive"];
    return steps.map((x, i) => '<div class="trip-step"><span>' + (i + 1) + '</span><strong>' + x + '</strong></div>').join('<span class="step-connector" aria-hidden="true">→</span>');
  }
  function tripText() {
    const o = state.opts && state.opts.find((x) => x.id === state.sel);
    if (!o) return "Plan a journey in GreenRoute NCR to create a shareable trip summary.";
    const when = { day: "Daytime", evening: "Evening", night: "Night" }[state.time] || "Daytime";
    return "GreenRoute NCR journey\n" + state.o.name + " → " + state.d.name + "\nSelected mode: " + o.label + "\nGreenest realistic option: " + state.sum.lowest.label + "\nEstimated distance: " + o.km.toFixed(1) + " km\nEstimated time: " + fmtT(o.min) + "\nEstimated operational emissions: " + fmtKg(o.co2) + " CO₂e\nTravel preference: " + when + "\nTransfer counts, lighting and personal-safety conditions are not verified. Route and emissions data may be illustrative.";
  }
  function tripUrl() {
    const url = new URL(window.location.href);
    url.search = ""; url.hash = "";
    url.searchParams.set("from", state.o.name); url.searchParams.set("to", state.d.name);
    url.searchParams.set("time", state.time); url.searchParams.set("mode", state.sel || "");
    return url.href;
  }
  function announceShare(msg) { const n = $("#shareStatus"); n.textContent = msg; n.hidden = false; }
  async function writeClipboard(value) {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(value); return true; }
    const area = document.createElement("textarea"); area.value = value; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) { ok = false; } area.remove(); return ok;
  }
  async function copyTrip() {
    try { const ok = await writeClipboard(tripText() + "\n\nOpen journey: " + tripUrl()); announceShare(ok ? "Trip summary and reusable journey link copied." : "Copy is unavailable in this browser. Select and copy the trip summary manually."); }
    catch (_) { announceShare("Clipboard access was blocked. Try sharing from a secure deployed website."); }
  }
  async function shareTrip() {
    const payload = { title: "GreenRoute NCR journey", text: tripText(), url: tripUrl() };
    try {
      if (navigator.share) { await navigator.share(payload); announceShare("Share sheet opened."); }
      else { const ok = await writeClipboard(payload.text + "\n\nOpen journey: " + payload.url); announceShare(ok ? "Trip details and a reusable journey link copied." : "Sharing isn't supported here. Use Copy trip summary instead."); }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      try { const ok = await writeClipboard(payload.text + "\n\nOpen journey: " + payload.url); announceShare(ok ? "Share was unavailable; copied the trip details instead." : "Sharing is unavailable in this browser."); }
      catch (_) { announceShare("Sharing was unavailable. Try Copy trip summary instead."); }
    }
  }
  function loadSharedTrip() {
    const q = new URLSearchParams(window.location.search);
    const from = q.get("from"), to = q.get("to");
    if (!from || !to) return;
    $("#from").value = from; $("#to").value = to;
    const time = q.get("time"); if (["day", "evening", "night"].includes(time)) updateTimeUI(time);
    const mode = q.get("mode"); if (["car", "two", "bus", "metro", "bike", "walk"].includes(mode)) { state.sharedMode = mode; updateModeUI(mode); }
    run();
  }
  function initReveal() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js-reveal");
    revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    observeReveals(document);
  }
  function observeReveals(root) {
    if (!revealObserver || !root) return;
    root.querySelectorAll(".section-heading, .step, .limit-item, .road-grid article, .panel, .comfort-item, .card").forEach((el, i) => {
      if (!el.classList.contains("reveal-item")) { el.classList.add("reveal-item"); el.style.setProperty("--reveal-delay", Math.min(i % 6, 5) * 55 + "ms"); }
      revealObserver.observe(el);
    });
  }

  initTheme(); initHaptics(); initMap(); initForm(); updateModeUI(state.pickMode); loadSharedTrip();
})();
