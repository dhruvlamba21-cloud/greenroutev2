const E = require('./engine.js');
const D = require('./data.js');
const place = (name) => D.PLACES.find((p) => p.name === name);
let failures = 0;
const check = (condition, message) => {
  if (!condition) { failures += 1; console.error('FAIL:', message); }
};

for (const [from, to] of D.EXAMPLES) {
  const o = place(from), d = place(to);
  check(Boolean(o && d), `sample locations exist: ${from} → ${to}`);
  if (!o || !d) continue;
  const direct = E.haversine(o, d);
  const distances = { car: direct * 1.3, bike: direct * 1.25, walk: direct * 1.25 };
  const options = E.buildOptions(o, d, distances, D.STATIONS);
  const summary = E.summarize(options);
  check(summary && summary.lowest && summary.fastest, `summary exists: ${from} → ${to}`);
  check(summary.lowest.co2 <= summary.car.co2 + 1e-9, `lowest emissions do not exceed car: ${from} → ${to}`);
  check(options.every((x) => Number.isFinite(x.km) && Number.isFinite(x.min) && Number.isFinite(x.co2)), `finite values: ${from} → ${to}`);
}
check(E.inNCR(28.6, 77.2) && !E.inNCR(19, 72.8), 'NCR geographic guard');
check(E.haversine(place('Connaught Place'), place('India Gate')) > 0, 'distance calculation is positive');
console.log(failures ? `FAILURES ${failures}` : 'ALL PASS');
if (failures) process.exitCode = 1;
