# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

SafeCity is an AI-powered crime prediction and routing platform. The `project1` directory contains the active app:
- `project1/backend`: FastAPI service exposing ML-driven crime hotspots, city risk index, safe routing, and basic user auth (Firebase-backed when configured).
- `project1/frontend`: React + TypeScript single-page app (Vite) for police and citizen dashboards, maps, and analytics.

Most future work should assume `project1` is the main codepath unless the user states otherwise.

## Common Commands

All commands are shown for PowerShell from the repo root (`SafeCity`). Adjust paths if the active project folder differs.

### Backend (FastAPI)

From `project1/backend`:

- Create / activate virtualenv (example):
  - `python -m venv .venv`
  - `./.venv/Scripts/Activate.ps1`
- Install dependencies:
  - `pip install -r requirements.txt`
- Run the API server (default `http://localhost:8000`):
  - `uvicorn main:app --reload`
- Run individual ML scripts to regenerate JSON artifacts under `ml/output/` (make sure CSV data exists at the configured paths):
  - Clustering hotspots: `python ml/scripts/cluster.py`
  - Forecasts per ward: `python ml/scripts/forecast.py`
  - Risk scores: `python ml/scripts/risk_score.py`

> Notes for Agents:
> - Backend endpoints assumed by the frontend include:
>   - `GET /getHeatmap`
>   - `GET /predict?ward=<name>`
>   - `GET /riskScores`
>   - `POST /api/signup`, `POST /api/login`
>   - `POST /api/routing/safeRoute`
>   - `GET /api/cityRisk`
> - If you change paths, update the frontend fetch calls accordingly (e.g. in `CitizenDashboard.tsx`, `AuthContext.tsx`, and any routing/safety components).

### Frontend (Vite + React + TypeScript)

From `project1/frontend`:

- Install dependencies:
  - `npm install`
- Start dev server (default `http://localhost:5173`):
  - `npm run dev`
- Build for production:
  - `npm run build`
- Lint TypeScript/JS:
  - `npm run lint`
- Type-check only:
  - `npm run typecheck`

To run a single Vitest (or React Testing Library) test file if tests are later added, follow the existing script style (e.g. `"test": "vitest"` if introduced) and then run:
- `npm run test -- path/to/Some.test.tsx`

Currently there is no explicit test script in `package.json`; add one before suggesting test commands.

### Environment / Integration

- The frontend uses Google Maps through `@react-google-maps/api` and expects `VITE_GOOGLE_MAPS_API_KEY` in the Vite env (e.g. `.env.local`).
- Backend Firebase auth is optional; it looks for `serviceAccountKey.json` at the backend root and initializes Firestore if present. Without it, `/api/signup` and `/api/login` will return HTTP 500.
- CORS in `main.py` allows `http://localhost:5173` and `http://localhost:3000` by default.

## High-Level Architecture

### Backend

**Entry point:**
- `project1/backend/main.py`
  - Creates the `FastAPI` app, configures CORS, and wires:
    - Direct ML result endpoints (`/getHeatmap`, `/predict`, `/riskScores`) via `api/services/ml_service.py`.
    - Routing API under `/api/routing` via `routing/safe_route_api.py`.
    - City-wide risk index under `/api/cityRisk` via `city_risk/city_risk_api.py`.
  - Implements simple `/api/signup` and `/api/login` endpoints using Firestore when configured.

**ML layer (`ml/`)**
- `ml/scripts/cluster.py`
  - Runs DBSCAN on historical crime CSV (`ml/data/bangalore_merged_crime_dataset_new.csv`) to compute hotspot clusters.
  - Persists hotspots to `ml/output/hotspots.json` with fields like `lat`, `lng`, `count`, `intensity`.
- `ml/scripts/forecast.py`
  - Generates per-ward forecasts using Prophet if available, otherwise a rolling-average fallback.
  - Stores structured predictions in `backend/ml/output/predictions.json` keyed by ward.
- `ml/scripts/risk_score.py`
  - Samples incidents from the same CSV and computes per-incident risk scores based on severity, time-of-day, and weather.
  - Outputs `backend/ml/output/risk_scores_sample.json`.
- `ml/utils/geospatial_utils.py` is currently a stub; prefer adding reusable geo math/helpers here (e.g., distance or grid utilities) rather than duplicating logic.

**ML serving layer (`api/services/ml_service.py`)**
- Provides read-only accessors over the JSON artifacts produced by the ML scripts.
- Normalizes flexible JSON shapes (either raw lists or objects with `hotspots` / `risk_scores` keys).
- This layer is the abstraction between `main.py` and the filesystem. When changing JSON schema in `ml/output`, update this service and the TypeScript types/consumers.

**City risk engine (`city_risk/`)**
- `city_risk_engine.py`:
  - Implements a TTL-based cache for hotspot and risk score JSON loads to avoid disk churn.
  - Computes a city-wide risk index by combining:
    - Weighted hotspot intensity (`compute_hotspot_weight_score`).
    - Average per-incident risk score from `risk_scores_sample.json` (`compute_average_risk`).
    - A time-of-day multiplier (`time_multiplier`) to increase risk at night / peak hours.
  - Returns a normalized 0–100 `risk_index`, a textual `risk_level`, and `active_hotspots` count.
- `city_risk_api.py`:
  - FastAPI router exposing `GET /api/cityRisk` to the frontend, wrapping `compute_city_risk_index()`.

**Routing engine (`routing/`)**
- `route_engine.py`:
  - Core safe-routing logic using an A* search on an implicit lat/lng grid.
  - Risk-aware cost function uses a haversine distance plus per-node risk penalty from nearby hotspots (`risk_penalty_for_point`).
  - Hotspots are loaded from `data/hotspots.json`; keep this in sync with `ml/output/hotspots.json` or add a unifying loader if you change locations.
  - Produces both a list of route points and an encoded Google polyline string.
- `safe_route_api.py`:
  - Defines `POST /api/routing/safeRoute` accepting `{ start: [lat, lng], end: [lat, lng] }`.
  - Delegates to `compute_safe_path(...)` and returns `{ status, route }` where `route` includes `polyline`, `points`, `risk_score`, and `avoided_hotspots`.

### Frontend

**App shell & auth**
- `project1/frontend/src/main.tsx` (noted but not fully detailed here) bootstraps React and wraps `App` in providers.
- `src/App.tsx`:
  - Uses `useAuth()` to branch between `LoginPage`, `PoliceDashboard`, and `CitizenDashboard` based on `user.role`.
- `src/context/AuthContext.tsx`:
  - Holds `user` state and `login`, `signup`, `logout` methods.
  - `login` and `signup` call the backend at `http://localhost:8000/api/login` and `/api/signup`.
  - `isAuthenticated` is `true` when a `user` is set; there is no persistent session yet (no tokens/localStorage).

**Citizen experience**
- `components/Citizen/CitizenDashboard.tsx`:
  - Manages tabs for Safety Map, Safe Routes, and Alerts.
  - On an interval, fetches from backend:
    - `/getHeatmap` → normalized into `BackendHotspot[]` for the map.
    - `/api/cityRisk` → displays city safety index with color-coded severity.
    - `/riskScores` → uses count as “Alerts” badge (falls back to `"Live"` on error).
  - Passes `hotspots` and a fixed `userLocation` (Bangalore default) into `CrimeMap`.
  - `SafeRoutes` and `SafetyAlerts` (both default exports) are mounted in the respective tabs and should be wired to `/api/routing/safeRoute` and `/riskScores` / other alert mechanisms.

**Police experience**
- `components/Police/PoliceDashboard.tsx`:
  - Generates mock incidents, hotspots, patrol plans, and SOS requests from `services/mockData.ts` for a simulated command center view.
  - Uses `predictHotspots` (from `services/predictionService.ts`) on the mock incidents to derive high-risk areas.
  - Aggregates metrics (critical/high hotspots, total and recent incidents) and supports JSON report export.
  - Tabs:
    - Hotspot map using `CrimeMap` with optional historical incidents overlay.
    - Analytics charts via `AnalyticsCharts`.
    - Patrol planning via `PatrolManagement`.
    - Live SOS monitoring via `SOSMonitor`.

**Map & geospatial UI**
- `components/Map/CrimeMap.tsx`:
  - Wraps `@react-google-maps/api` `GoogleMap`, `Marker`, and `HeatmapLayer` to render:
    - User marker at the current or default location.
    - A heatmap based on `BackendHotspot[]` data from the backend or mock sources.
  - Normalizes multiple hotspot shapes (raw `lat/lng` vs `center`) and scales intensity/count to a bounded heatmap weight.
  - Applies a custom dark theme and visualization gradient.
  - Requires `VITE_GOOGLE_MAPS_API_KEY` and `visualization` library.

**Prediction utilities**
- `services/predictionService.ts`:
  - Implements a pure-TS DBSCAN-style clustering over `CrimeIncident[]` for the police view.
  - Exposes:
    - `performDBSCAN` → groups incidents into clusters by geographic proximity.
    - `predictHotspots` → converts clusters into `CrimeHotspot` objects with risk scoring based on severity, time-of-day, day-of-week, and weather.
    - `calculateRiskForLocation` → derives a risk level for a specific lat/lng given a set of hotspots.
  - These functions are independent from the Python ML backend and operate solely on frontend-side data.

## Cross-Cutting Considerations

- **Backend ↔ Frontend contracts**
  - When changing backend JSON output (e.g., fields in `hotspots.json`, risk scores, or routing payloads), update:
    - `backend/api/services/ml_service.py` to normalize inputs.
    - TypeScript interfaces in `frontend/src/types` and consumers in Citizen/Police dashboards and map components.
- **Data file locations**
  - Several modules use hard-coded relative CSV/JSON paths (e.g., `backend/ml/data/...`, `ml/output/...`, `routing/data/hotspots.json`). If you relocate data, prefer centralizing path definitions or adding a config layer rather than scattering string literals.
- **Caching and performance**
  - City risk and hotspot loads are cached via `TTLCache` (5s default). If adding new endpoints that read the same files repeatedly, reuse this pattern instead of re-reading from disk each request.
- **Auth and roles**
  - Current auth is minimal and relies on Firestore documents with plaintext passwords. If you introduce a more secure scheme (hashing, JWTs, role-based access control), keep the `AuthContext` and `/api/login` / `/api/signup` implementations aligned.
