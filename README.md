# PandalHop — Mumbai Ganpati 2026 Darshan Planner

Frontend-only static site for discovering Mumbai Ganpati pandals and planning smarter darshan routes for 14–25 September 2026.

PandalHop helps visitors choose a date, time budget, starting point and travel preference, then builds a route designed to maximise worthwhile pandal visits while reducing unnecessary travel and queue time.

## Run locally

Open `index.html` directly, or serve the folder with any static server, for example:

`python3 -m http.server 8080`

## SEO

The site includes search-friendly metadata, Open Graph/Twitter metadata, a WebApplication structured-data block, a PWA manifest and a custom favicon. Once the production domain is known, the canonical URL and sitemap can be set to the exact domain.

## Route model

The planner uses a lightweight transport-aware estimate to choose between walking, transit and road travel. Dense Lalbaug–Parel and Girgaon–Khetwadi clusters are treated as walk-friendly, while longer evening road/transit travel receives a penalty. Google Maps is used for final turn-by-turn navigation.

Queue and crowd figures are planning estimates and should be updated as 2026 information becomes available.
