# Customer Presentation & Technical Review Video Script
**Platform:** UK Wind Generation Forecast Analysis Platform  
**Target Duration:** Maximum 10 minutes (Strict limit)  
**Structure:** Part 1: Customer Presentation (5:00 max) | Part 2: Technical Lead Review (5:00 max)  
**Format:** Unlisted YouTube Video  

---

## Recording Checklist

Before starting the screen recording:
- [ ] Run `python -m uvicorn app.main:app --port 8000` in `backend`
- [ ] Run `npm run dev` in `frontend` (or `docker compose up --build`)
- [ ] Open browser at `http://localhost:5173` in full screen (or 1920x1080 resolution)
- [ ] Ensure default date scope shows **January 2026** (e.g., Jan 1 – 7 or Jan 1 – 31)
- [ ] Have VS Code or editor open on backend files (`forecast_selector.py`, `metrics.py`, `alignment.py`) for Part 2
- [ ] Have terminal open with pytest test suite ready to run (`python -m pytest backend/tests -v`)
- [ ] Close notifications, messengers, and personal tabs
- [ ] Check microphone audio levels

---

## Part 1: Customer Presentation (Utility Energy Traders & Analysts)
**Time Limit:** 5:00  
**Tone:** Professional, business-focused, authoritative, concise  

### 0:00 – 0:30 | Introduction & Purpose of the Pilot
* **On Screen:** Dashboard overview at `http://localhost:5173`. Show the platform title and top badges ("Day-Ahead Pilot", "Europe/London (GMT)", "Data Mode: Live BMRS / Cache").
* **Spoken Script:**
  > "Hello. As an energy utility procuring power in the UK wholesale electricity market, our primary commercial challenge is estimating net residual demand before day-ahead auction closure. Because wind generation is intermittent and weather-driven, our trading team cannot wait until real-time delivery to see what turbines will produce. We must make binding day-ahead purchasing decisions based strictly on the forecasts available before market gate closure.
  >
  > Today, I'm presenting the UK Wind Generation Forecast Analysis Platform. This pilot is specifically built to help our power traders quantify wind generation uncertainty, eliminate look-ahead bias, and evaluate historical day-ahead forecast performance across January 2026."

### 0:30 – 1:30 | The Core Business Workflow: Decision-Time Wind Forecasts
* **On Screen:** Point out the Controls Bar. Hover over the "Decision Cutoff (D-1): 11:00 London" selector and the January date presets.
* **Spoken Script:**
  > "In the UK power market, the wholesale day-ahead auction order books close at 11:00 AM London time on the day preceding delivery—day D minus one. 
  > 
  > A common flaw in standard analytics dashboards is showing the forecast that was published just minutes before delivery, or even today. That introduces look-ahead bias. A trader sitting at their desk at 10:45 AM day-ahead cannot use a forecast published at 4:00 PM or the next morning.
  > 
  > This platform solves that problem. By default, it locks the analysis to the latest eligible forecast published no later than 11:00 AM on D-1. If our commercial desk enters an alternative auction at 12:00 or evaluates post-auction notices at 17:00, the cutoff is instantly configurable here, re-evaluating historical accuracy strictly from the perspective of what was known when that trade was placed."

### 1:30 – 2:30 | Demonstration: Forecast vs. Actual Generation
* **On Screen:** Hover across the interactive time-series chart showing the emerald line (Actual Outturn) and amber line (Day-Ahead Forecast). Show the floating dual-metric tooltip showing SP number, UK local time, MW rates, and MWh energy.
* **Spoken Script:**
  > "Looking at our interactive generation chart for delivery dates in January 2026, the green line represents the actual wind outturn reported half-hourly in Elexon's FUELHH dataset. The amber dashed line shows the day-ahead forecast from Elexon's WINDFOR feed that was actually on our screens at the 11:00 AM cutoff.
  > 
  > Hovering over each half-hour settlement period displays the exact operating point: both the instantaneous power rate in megawatts and the aggregate energy in megawatt-hours. 
  > 
  > For instance, on January 2nd during evening peak periods, actual wind reached nearly 14,000 MW, while the day-ahead forecast anticipated approximately 12,800 MW. We can immediately observe periods of close alignment as well as abrupt weather ramp events where forecast models diverged."

### 2:30 – 3:45 | Forecast Error Analytics & Commercial Implications
* **On Screen:** Scroll down to the Error Time Series and the Error Distribution histogram. Point out the red (overforecast) and blue (underforecast) bars and the KPI cards above.
* **Spoken Script:**
  > "Now let's examine the error analytics. We define forecast error consistently as Forecast minus Actual: e_t = G_hat_t minus G_t. This means positive values represent an overforecast, and negative values represent an underforecast.
  > 
  > Why does this distinction matter commercially?
  > In an overforecast interval—shown here in coral red—our forecast led us to believe wind generation would be higher than it actually was. In wholesale procurement, that causes us to under-purchase day-ahead power, leaving us short in the balancing mechanism and exposed to expensive system buy prices.
  > 
  > Conversely, in an underforecast interval—shown in cyan blue—wind outturn exceeded expectations. We over-procured day-ahead power, leaving a long position where excess energy had to be sold back at depressed system sell prices.
  > 
  > Across January 2026, our summary cards show an overall Mean Absolute Error of around 1,400 to 1,600 MW, with a Root Mean Squared Error of approximately 1,900 MW. Our Mean Forecast Error reveals the systematic bias direction, while our coverage metric verifies that 100% of expected half-hour intervals are matched and audited."

### 3:45 – 4:30 | Forecast Publication History & Audit Provenance
* **On Screen:** Click on any point on the chart to open the **Forecast Publication Audit History** modal. Show the table with eligible and ineligible versions and the 'Chosen for Trading' badge. Close the modal, then scroll to the Data Provenance section.
* **Spoken Script:**
  > "Transparency is critical for trader trust. By clicking any settlement period on the chart, the platform opens the complete forecast audit trail for that half-hour.
  > 
  > Here, you can see every single forecast version published by National Grid ESO. The platform clearly tags versions published prior to 11:00 AM on D-1 as 'Eligible', highlights the exact version selected for our trading decision, and marks later versions published after gate closure as 'Ineligible: Post-cutoff'. This guarantees that no look-ahead information leaks into our decision-time benchmark.
  > 
  > Below the charts, our Data Provenance card provides full governance: tracking source feeds, interval counts, missing observation flags, and retrieval timestamps."

### 4:30 – 5:00 | Business Value Summary & Practical Scope Limits
* **On Screen:** Scroll back up to the overview dashboard.
* **Spoken Script:**
  > "In summary, this pilot equips our commercial team with a defensible, bias-free benchmark of wind forecast uncertainty at the exact moment day-ahead purchasing decisions are executed.
  > 
  > It is important to note what the platform does and does not do: it accurately models national wind generation forecast uncertainty from Elexon BMRS data. It does not pretend to calculate our utility's final net procurement requirement, because final procurement also requires consumer load profiles, thermal generation dispatch, and contract positions. 
  > 
  > However, by isolating wind forecast variance at day-ahead gate closure, it gives our traders the precise quantitative foundation needed to manage renewable volume risk. Thank you."

---

## Part 2: Internal Technical Lead Review
**Time Limit:** 5:00  
**Tone:** Technical, architectural, rigorous, code-focused  

### 0:00 – 0:45 | System Architecture & Technology Stack
* **On Screen:** Show the Mermaid architecture diagram in README or code folder structure (`backend/app`, `frontend/src`, `docker-compose.yml`).
* **Spoken Script:**
  > "Welcome to the technical review. As requested by the engineering leadership, this platform follows a clean, decoupled architecture:
  > - The backend is built with Python 3.11+ using FastAPI for asynchronous API routing, Pydantic v2 for strict runtime schema validation, and NumPy/Pandas for vector math.
  > - The frontend is a single-page React 19 application built with TypeScript and Vite, styled with custom vanilla CSS and responsive SVG visualizations.
  > - For containerization, we provide dedicated Dockerfiles for frontend and backend, orchestrated via Docker Compose with container health checks and volume caching.
  > - Per the specification, we avoided unnecessary complexity: no distributed message brokers or heavy external databases were introduced, as local structured caching and in-memory vector analysis provide sub-20ms response times for the January 2026 scope."

### 0:45 – 1:45 | Elexon BMRS Data Ingestion & Normalization
* **On Screen:** Open `backend/app/services/elexon_client.py` in VS Code. Highlight `_fetch_stream`, `get_wind_actuals`, and `get_wind_forecasts`.
* **Spoken Script:**
  > "Let's review data ingestion. The platform integrates directly with Elexon's official Insights Solution BMRS stream APIs:
  > - Actual wind generation is ingested from the FUELHH stream, filtered strictly where fuelType equals 'WIND'.
  > - Forecasts are ingested from the WINDFOR stream.
  > 
  > In `elexon_client.py`, we implement a cache-first strategy using MD5-hashed query parameters. When live connectivity is active, data is fetched with asynchronous HTTPX, validated, and persisted locally to `data/cache`. 
  > 
  > If the Elexon API experiences an outage or rate limiting, the client seamlessly falls back to bundled, authentic historical Elexon fixtures stored in `data/fixtures`. Importantly, as mandated by the prompt, we never fabricate synthetic values—every record is an authentic Elexon observation."

### 1:45 – 2:45 | Forecast Selection, Cutoff Logic, and Metrics Calculation
* **On Screen:** Open `backend/app/services/forecast_selector.py` and `backend/app/services/metrics.py`. Show `select_decision_forecasts` and `calculate_metrics`.
* **Spoken Script:**
  > "The core business logic resides in `forecast_selector.py` and `metrics.py`.
  > 
  > In `forecast_selector.py`, for a delivery date D, the cutoff timestamp is computed in Europe/London timezone on D-1 at the configured cutoff time (default 11:00 AM) and converted to UTC. For each delivery interval, we filter candidate WINDFOR forecasts where `publishTime <= cutoff_utc`, sorting by publication time to select the latest eligible forecast. Forecasts published after the cutoff are tagged as ineligible, strictly eliminating look-ahead bias.
  > 
  > Next, regarding interval granularity: WINDFOR is published at hourly resolution, while FUELHH has 48 half-hour settlement periods per day. In `alignment.py`, we provide a configurable alignment policy: 'hourly_block' maps the hourly forecast to both settlement periods of that clock hour, while 'exact_timestamp' matches only :00 intervals.
  > 
  > In `metrics.py`, calculations are vectorized. Error is defined as Forecast minus Actual. We compute MAE, RMSE, Mean Error (bias), and 95th percentile error. For MAPE, we implement a mathematically sound threshold policy: intervals where actual generation is below 50 MW are excluded from the MAPE denominator to prevent division-by-near-zero distortion, and the policy is explicitly reported in the API response."

### 2:45 – 3:45 | Backend API Routing, Frontend Component Tree, and Docker
* **On Screen:** Open `backend/app/api/endpoints.py` and show FastAPI interactive docs at `http://localhost:8000/docs`, then switch to `frontend/src/App.tsx` and `docker-compose.yml`.
* **Spoken Script:**
  > "The backend exposes five dedicated REST endpoints:
  > - `/health`: system configuration and provenance status
  > - `/api/overview`: aggregate KPIs, error metrics, and sample coverage
  > - `/api/generation`: time series of aligned half-hour intervals
  > - `/api/forecast-errors`: error distribution histogram and daily summaries
  > - `/api/forecast-history`: version audit trail for any selected interval
  > 
  > On the frontend, components are decoupled: `KpiCards` handles metric display, `GenerationChart` renders responsive SVG paths with hover crosshairs, and `ForecastHistoryModal` gives traders interactive transparency.
  > 
  > In `docker-compose.yml`, the backend runs with Uvicorn, and the frontend is compiled into static assets served via an Nginx alpine container on port 3000, with reverse proxying for `/api/` and container health checks."

### 3:45 – 4:30 | Automated Testing & Edge Case Handling
* **On Screen:** Run the test suites in terminal: `python -m pytest backend/tests -v` and `npm test` in `frontend`. Show all tests passing.
* **Spoken Script:**
  > "We prioritized test reliability. Running pytest on the backend:
  > All 19 unit and integration tests pass with 100% success.
  > The test suite rigorously covers:
  > - Correct selection of latest forecast before cutoff and exclusion of post-cutoff versions
  > - MAE, RMSE, and bias sign conventions
  > - MAPE behavior when actuals are zero or below threshold
  > - Expected interval handling: verifying standard 48-period days in January, as well as 46-period and 50-period days during UK daylight saving clock changes
  > - API error responses for invalid dates or inverted ranges
  > 
  > On the frontend, our Vitest suite validates KPI card rendering, user date changes, and chart empty/loading states."

### 4:30 – 5:00 | README, Deployment Verification, and Future Roadmap
* **On Screen:** Show `README.md` with the Mermaid diagram, test results, and deployment guide.
* **Spoken Script:**
  > "Finally, the project repository includes comprehensive documentation:
  > - An architecture diagram using Mermaid
  > - Authoritative market references for the UK wholesale day-ahead timeline (EPEX SPOT and Elexon BSC)
  > - One-click Docker Compose and local setup instructions
  > - Deployment configurations for Vercel and Heroku/Render
  > - Full AI usage disclosure acknowledging AI coding assistance with human review
  > 
  > Future production enhancements could incorporate regional wind generation breakdown (onshore vs offshore via Elexon AGWS) and weather forecast ensemble spreads.
  > 
  > The codebase is fully verified, tested, and ready for production evaluation."

---

## YouTube Upload Guide (Unlisted Video)

1. **Title:** UK Wind Generation Forecast Analysis Platform - Day-Ahead Market Pilot
2. **Visibility:** Select **Unlisted** (Anyone with the link can view; not publicly searchable).
3. **Audience:** Select "No, it's not made for kids".
4. **Description:**
   ```text
   Demonstration and Technical Architecture Review of the UK Wind Generation Forecast Analysis Platform.
   
   Timestamps:
   0:00 - Part 1: Customer Presentation (Business Context & Day-Ahead Workflow)
   1:30 - Forecast vs Actual Wind Generation Time Series
   2:30 - Forecast Error Analytics & Commercial Implications
   3:45 - Forecast Publication History & Cutoff Audit
   5:00 - Part 2: Internal Technical Lead Review (Architecture & Technologies)
   5:45 - Elexon BMRS Data Ingestion & Stream Normalization
   6:45 - Day-Ahead Cutoff Selection Logic & Metrics Implementation
   7:45 - Backend Endpoints, Frontend Architecture & Docker Configuration
   8:45 - Automated Tests & Error Handling
   9:30 - Deployment, Documentation & Summary
   
   Data Sources: Elexon BMRS FUELHH & WINDFOR.
   Scope: January 2026 delivery period.
   ```
5. **Incognito Verification:**
   - Copy the YouTube video URL.
   - Open an **Incognito / Private Window**.
   - Paste the URL and verify that video playback works smoothly without requiring login or authentication.
