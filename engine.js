/* GreenRoute NCR - pure calculation engine (works in browser and Node for testing). */
(function (root) {
  // Illustrative emission factors, grams CO2e per passenger-km (operational, rounded).
  const FACTORS = { car: 150, bus: 50, two: 60, metro: 30, bike: 0, walk: 0 };
  // Illustrative average door-to-door speeds in km/h (Delhi NCR urban conditions).
  const SPEEDS = { walk: 4.8, bike: 14, car: 24, bus: 15, two: 26, metro: 32 };
  const LABELS = { car: "Private car (solo)", two: "Two-wheeler (solo)", bus: "Bus + walking", metro: "Metro + walking", bike: "Cycling", walk: "Walking" };
  const LIMITS = { walkKm: 5, bikeKm: 15, stationWalkKm: 2.5, minBusKm: 1.5 };
  const NCR = { minLat: 28.1, maxLat: 29.0, minLng: 76.7, maxLng: 77.8 };

  const rad = (x) => (x * Math.PI) / 180;
  function haversine(a, b) {
    const R = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function nearest(p, list) {
    let best = null, bd = Infinity;
    for (const s of list) { const d = haversine(p, s); if (d < bd) { bd = d; best = s; } }
    return { station: best, km: bd };
  }
  function inNCR(lat, lng) {
    return lat >= NCR.minLat && lat <= NCR.maxLat && lng >= NCR.minLng && lng <= NCR.maxLng;
  }
  const kg = (km, mode) => (km * FACTORS[mode]) / 1000;

  /** dist = { car, bike, walk } road/path distances in km. */
  function buildOptions(o, d, dist, stations) {
    const out = [];
    const mk = (id, km, min, co2, extra) => Object.assign({ id, label: LABELS[id], km, min, co2, available: true, practical: true, note: "" }, extra);

    out.push(mk("car", dist.car, (dist.car / SPEEDS.car) * 60 + 5, kg(dist.car, "car"),
      { note: "Assumes 1 occupant, petrol car, +5 min for parking." }));
    out.push(mk("two", dist.car * 0.97, ((dist.car * 0.97) / SPEEDS.two) * 60 + 2, kg(dist.car * 0.97, "two"),
      { note: "Assumes one rider on a petrol scooter or motorcycle." }));

    const walkOk = dist.walk <= LIMITS.walkKm;
    out.push(mk("walk", dist.walk, (dist.walk / SPEEDS.walk) * 60, 0,
      { practical: walkOk, note: walkOk ? "Zero tailpipe emissions." : "Too far to walk comfortably (over " + LIMITS.walkKm + " km)." }));

    const bikeOk = dist.bike <= LIMITS.bikeKm;
    out.push(mk("bike", dist.bike, (dist.bike / SPEEDS.bike) * 60, 0,
      { practical: bikeOk, note: bikeOk ? "Zero tailpipe emissions." : "Too far for a typical commute ride (over " + LIMITS.bikeKm + " km)." }));

    const a = nearest(o, stations), b = nearest(d, stations);
    const wA = a.km * 1.3, wB = b.km * 1.3;
    if (a.station.name === b.station.name || wA > LIMITS.stationWalkKm || wB > LIMITS.stationWalkKm) {
      out.push(mk("metro", 0, 0, 0, { available: false, practical: false,
        note: a.station.name === b.station.name ? "Nearest metro station is the same at both ends." : "No station within about " + LIMITS.stationWalkKm + " km walk of one end (in this demo station list)." }));
    } else {
      const ride = haversine(a.station, b.station) * 1.25;
      const km = wA + wB + ride;
      const min = ((wA + wB) / SPEEDS.walk) * 60 + (ride / SPEEDS.metro) * 60 + 6;
      out.push(mk("metro", km, min, kg(ride, "metro"), {
        stations: [a.station, b.station], walkKm: wA + wB, rideKm: ride,
        note: "Walk to " + a.station.name + ", ride to " + b.station.name + ", walk to destination. Illustrative timing, not a live timetable." }));
    }

    if (dist.car < LIMITS.minBusKm) {
      out.push(mk("bus", 0, 0, 0, { available: false, practical: false, note: "Trip is too short for a bus to make sense." }));
    } else {
      const ride = dist.car * 1.05, walk = 0.5;
      out.push(mk("bus", ride + walk, (walk / SPEEDS.walk) * 60 + (ride / SPEEDS.bus) * 60 + 10, kg(ride, "bus"),
        { note: "Generic bus along the road route (+10 min wait). No real bus numbers or live data used." }));
    }
    return out;
  }

  function summarize(opts) {
    const ok = opts.filter((x) => x.available && x.practical);
    const lowest = [...ok].sort((x, y) => x.co2 - y.co2 || x.min - y.min)[0];
    const fastest = [...ok].sort((x, y) => x.min - y.min)[0];
    const car = opts.find((x) => x.id === "car");
    const savedKg = Math.max(0, car.co2 - lowest.co2);
    const pct = car.co2 > 0 ? Math.round((savedKg / car.co2) * 100) : 0;
    return { lowest, fastest, car, savedKg, pct, extraMin: Math.round(lowest.min - fastest.min) };
  }

  const api = { FACTORS, SPEEDS, LABELS, LIMITS, haversine, nearest, inNCR, buildOptions, summarize };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GreenEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
