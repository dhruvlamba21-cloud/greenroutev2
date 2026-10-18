# GreenRoute NCR

**A one-screen, comfort-aware green mobility demo for Delhi NCR.** Compare walking, cycling, metro, bus, two-wheeler and solo driving with estimated travel time, distance and operational CO₂e.

## Run it

Best: publish to GitHub Pages (below) or run `python3 -m http.server` in this folder and open http://localhost:8000. Opening `index.html` straight from disk usually works, but OpenStreetMap tiles can be refused without a web referrer. No build step, package manager, backend or personal API key is required. An internet connection is needed for Leaflet, OpenStreetMap tiles, address lookup and public road routing. Built-in sample journeys can use approximate fallback distances when services do not respond.

## Publish on GitHub Pages

1. Extract `GreenRoute-NCR-One-Screen.zip`.
2. Upload the **files inside the extracted folder** to the root of a GitHub repository (do not upload the containing folder as a nested directory).
3. In **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/(root)`, then save.
4. Open the URL GitHub Pages displays after deployment.

## What’s in the demo

- Compact journey inputs, five mode choices, time-of-day controls and compare button grouped in one planner.
- Mode-based visual styling: green for walking/cycling, amber for metro/bus, and red pollution cues for solo driving.
- A direct cycling-vs-solo-car comparison showing estimated emissions, travel time, distance and approximate emissions saved.
- Selected route shown on a map with a high-contrast outline and clear A/B markers.
- Light/dark appearance, responsive layout, reduced-motion support and small hover/scroll animations.
- Route comfort hints, public transit transfer caveats and share/copy journey tools.

## Data and safety limits

This is an ideathon prototype, not a live navigation or emergency service. Mode recommendations and carbon figures use illustrative assumptions, not audited Delhi-specific measurements. Walking/cycling are treated as zero operational tailpipe emissions; lifecycle emissions are excluded. Metro and bus routes, times, transfer counts, street lighting, protected cycle lanes and personal-safety data are not verified or connected. Comfort guidance is not a safety score or guarantee. OpenStreetMap public tiles, Nominatim and the public routing service have usage limits and may be unavailable; use a suitable licensed provider before launching to high traffic.

## Files

- `index.html` — page structure and initial theme preference
- `style.css` — responsive layout, mode colours, map styling, themes and motion
- `app.js` — route UI, mode selection, map, comparison, comfort guidance and sharing
- `data.js` — Delhi NCR sample locations and approximate station list
- `engine.js` — distance, travel-time, emissions and ranking calculations
- `test-engine.js` — local calculation-engine tests
- `TESTING.md` — verification checklist
- `DEPLOY-QUICKSTART.md` — compact GitHub Pages guide
- `IDEATHON-SUMMARY.md` — project overview and limitations
- `DEMO-SCRIPT.md` — presentation walkthrough
- `LICENSE` — project license
- `.nojekyll` — GitHub Pages helper

## What changed in v2
- **Recommendation fix:** the app now opens on the *greenest realistic* option instead of a pre-selected mode. Impractical modes (e.g. cycling 37 km) are never auto-selected and warn if chosen.
- **"Time I can spare" slider:** the pick is the lowest-CO2e option that is no more than N minutes slower than the fastest (default 30). Walking 5 km no longer beats a 25-minute metro by default.
- **Time of day matters:** Evening pads car/bus/two-wheeler times (peak traffic); Night lightens them. Illustrative multipliers.
- **New mode:** two-wheeler (solo, 60 g CO2e/pkm, illustrative).
- **"Use my location"** button, a yearly-impact line (twice a day, 250 days; clearly marked as an assumption), mobile sticky bar with Share, animated numbers and bars, SVG icons instead of emoji/glyphs, distinct metro/bus colours, dashed line when a route is only an approximation.
- **Route cache:** successful live routes are stored in the browser (localStorage). Run each example once while online and it will load instantly, with real road geometry, even if the public routing server is slow later.
- **Accessibility:** no more page-wide aria-live; scroll-reveals no longer hide content if JavaScript fails or when printing.
- **Share text** now says "Selected mode" and also names the greenest realistic option.

## Haptic feedback
Taps on modes, chips, time pills, cards, swap, share, the slider and Compare give short vibrations; success and error have their own patterns. A header button turns haptics on or off (remembered).
- **Android (Chrome, Edge, Firefox):** uses the Vibration API. Works on a deployed HTTPS site after a tap.
- **iPhone/iPad:** Safari does not support the Vibration API. The app uses a best-effort trick (a hidden switch control) that gives a light tick on iOS 17.4+ for taps. Success/error patterns are Android only.
- Desktop browsers do nothing. This is expected.

## Honest status
Verified here: engine tests pass, JavaScript syntax checks pass, and a simulated-browser test confirmed the recommendation logic, time-of-day change, slider, error handling and vibration calls. NOT verified here: real visual appearance, live map tiles and live routing, and real-phone haptics. Test those on your own phone before presenting.

## v3 design update
- New design language: transit-signage meets editorial. Oversized Bricolage Grotesque headlines, Instrument Sans body (17px base), flat colour blocks, generous spacing.
- **The whole site takes the colour of the selected mode** (header, hero, buttons, cards, "How it works", footer): walk = leaf green, cycle = forest green, metro = blue, bus = amber, 2-wheeler = orange, car = red. Works in light and dark theme and fades smoothly.
- Progressive disclosure: planner and all options stay in one card; results show the verdict, map and mode cards first; trip details and the time-vs-emissions chart are collapsed until opened.
- Tested in a real headless Chromium at 1440px and 390px (no horizontal overflow, no console errors), including dark mode.

## v4 mobile fixes
- Fixed horizontal overflow ("site sliding off-screen") on phones: the chart header, header buttons and the sticky mobile bar were wider than 320-360px screens. Verified in headless Chromium at 320, 360, 375, 390 and 430px, before and after running a journey: page width equals screen width at every size.
- The assumptions table turns into stacked cards on phones instead of scrolling sideways.
- One-finger swipes scroll the page (the map no longer traps scrolling); use two fingers to move the map.
- Tighter header and padding on small screens; sticky "Share" bar fits at 320px.
