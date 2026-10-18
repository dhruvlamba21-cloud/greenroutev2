# GreenRoute NCR — Ideathon Summary

## Problem
People often compare journeys by time alone. The carbon trade-off between cycling, public transport and driving can be hard to see quickly.

## Solution
GreenRoute NCR is a lightweight Delhi NCR mobility prototype. Users enter two places, tap one of six modes and immediately compare route distance, estimated time and operational CO₂e. A dedicated cycling-vs-solo-car view makes the emissions difference easy to understand at a glance.

## Experience
- One compact planner groups both locations, five transport modes, time-of-day choice and the compare action.
- Green styling signals walking/cycling, amber signals metro/bus, and red with restrained pollution motifs signals solo-car travel.
- A quiet basemap and thick outlined selected route improve route legibility.
- Brief comfort cues, shareable trip summaries, remembered light/dark mode and reduced-motion support.

## Technology
Static HTML, CSS and vanilla JavaScript; Leaflet mapping; OpenStreetMap tiles, Nominatim address search and a public OSM-based route service when available. No build step or required personal API key.

## Impact hypothesis
Making time and emissions trade-offs visible with less reading may encourage users to consider lower-carbon transport. This is a hypothesis to test, not a measured outcome.

## Limits
Travel times, emission factors and public-transit routes are illustrative. Transfer counts, live timetables, street lighting, crime data, sidewalk condition and protected cycle lanes are not verified. Comfort cues are not a safety score or guarantee. Public services can be unavailable or rate-limited.

## Next steps
Test usability with Delhi NCR commuters; validate local emission factors; integrate permitted, reliable transit and pedestrian/cycling infrastructure data; and select providers appropriate for expected traffic.
