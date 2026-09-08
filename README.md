# Bappa 26 — Mumbai Ganpati Route Planner

Frontend-only static site for planning Mumbai Ganpati darshan routes for 14–25 September 2026.

## Run locally

Open `index.html` directly, or serve the folder with any static server, for example:

`python3 -m http.server 8080`

## V5 transport model

The planner uses a lightweight transport-aware estimate to choose between walking, transit and road travel. Dense Lalbaug–Parel and Girgaon–Khetwadi clusters are treated as walk-friendly, while evening road/transit travel receives a penalty. Google Maps is used for final turn-by-turn navigation.

Queue and crowd figures are planning estimates and should be updated as 2026 information becomes available.
