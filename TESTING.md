# GreenRoute NCR — Testing checklist

## Local automated checks

- `node test-engine.js`
- `node --check app.js`
- `node --check engine.js`

## Browser checklist

1. Open `index.html` at desktop and mobile widths.
2. Confirm the planner shows origin, destination, all five modes, time-of-day buttons and Compare routes together. After results appear, the compact second mode selector should remain near the comparison so users do not need to scroll back to the planner.
3. Select Walk, Cycle, Metro, Bus and Solo car in either selector before and after calculating a route. Both selectors, mode colours and selected route should stay in sync when the mode is available.
4. Run `Connaught Place → India Gate`. The cycling-vs-solo-car panel should display emissions, time and distance for both choices and their estimated emissions difference.
5. Check route visibility in both site themes and confirm the light/dark preference persists after refresh.
6. Select Day, Evening and Night and confirm the brief comfort note changes.
7. Confirm unavailable transit options cannot be selected as working routes and are labelled clearly.
8. Test Swap, blank locations, identical endpoints, example trips and address search.
9. Test copy/share and open a shared URL; location, time preference and mode should be restored when supported.
10. Check keyboard focus, visible control states and reduced-motion settings.
11. Confirm OpenStreetMap attribution is visible on the map.

## Limits

The public map, address lookup and routing services can fail or be rate-limited. A browser with internet access is required for live map tiles. Transit, safety infrastructure, transfer counts and emission factors remain illustrative or unavailable; the comfort panel is not a safety rating.

## v2 additions
- Vaishali Ghaziabad -> Dwarka Sector 21: the selected card must be Metro (not Cycle), and the "carbon gap" panel must say "Metro + walking vs. drive alone".
- Move the "time I can spare" slider to 0: the pick becomes the fastest option; to 60: greener, slower options appear.
- Switch Day -> Evening: car time increases. Night: decreases.
- On an Android phone (deployed site): tap modes and Compare; you should feel vibrations. Toggle the header haptics button off: they stop.
- Tap the crosshair button in "From" and allow location (inside NCR) to plan from your position.
- Run each example once online, switch to airplane mode, run again: it should still show real road routes from cache.
