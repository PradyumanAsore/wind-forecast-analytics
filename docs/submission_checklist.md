# Final Assignment Submission & Verification Checklist

This checklist provides a step-by-step verification protocol to guarantee a flawless submission.

---

## 1. Incognito Verification Protocol

The assignment requires opening every submitted URL in an **incognito / private browser session** to confirm public accessibility without authentication:

- [ ] **Public GitHub Repository URL**
  - Open an Incognito Window (`Ctrl + Shift + N` or `Cmd + Shift + N`).
  - Navigate to `https://github.com/<anonymous-org-or-user>/<repo-name>`.
  - Verify that the code, branches, and README are publicly visible without logging in.
  - Confirm no private files or `.env` secrets are visible.

- [ ] **Deployed Application URL**
  - Paste the live deployment URL (e.g. Vercel / Heroku / Render) into Incognito.
  - Verify that the dashboard loads immediately.
  - Verify that KPI cards display values for January 2026.
  - Verify that the Forecast vs Actual chart renders without console errors.
  - Verify that clicking a data point opens the Forecast Publication History modal.

- [ ] **Unlisted YouTube Video URL**
  - Paste the YouTube URL into Incognito.
  - Confirm video plays without asking for a Google login.
  - Confirm total duration is $\le 10:00$ minutes.
  - Confirm audio quality and clarity of screen text.

---

## 2. Technical Quality & Code Integrity Checklist

- [x] **No Committed Secrets or Private Information**
  - Checked `.gitignore`: `.env` is ignored.
  - No personal names or credentials exist in source code, commit history, or documentation.
  - Anonymous repository naming convention adhered to.
- [x] **Backend Automated Tests**
  - Run command: `python -m pytest backend/tests -v`
  - Result: **19 passed, 0 failed (100% pass rate)**.
- [x] **Frontend Automated Tests**
  - Run command: `npm test` (in `frontend/`)
  - Result: **3 test files passed, 6 tests passed (100% pass rate)**.
- [x] **Frontend Production Build**
  - Run command: `npm run build` (in `frontend/`)
  - Result: Zero TypeScript or Vite bundling errors.
- [x] **Docker & Docker Compose**
  - Run command: `docker compose config`
  - Validated container build context, port mappings (`8000:8000`, `3000:80`), health checks, and network bridge.
- [x] **Data Authenticity**
  - Real observations extracted directly from Elexon BMRS `FUELHH` (fuelType=WIND) and `WINDFOR` streams for January 2026.
  - No synthetic or fabricated records used.
- [x] **Day-Ahead Market Decision Logic**
  - Decision cutoff locked to 11:00 UK local time on D-1 (EPEX SPOT UK Day-Ahead Auction).
  - Look-ahead bias strictly prevented by selecting only forecasts published $\le \text{cutoff}$.
  - Granularity reconciliation cleanly documented (`hourly_block` vs `exact_timestamp`).
  - MAPE zero/near-zero threshold policy documented and enforced ($\ge 50$ MW).

---

## 3. GitHub Repository Publishing Commands

To publish this codebase to a public, anonymous GitHub repository:

```bash
# 1. Initialize Git repository
git init

# 2. Add all files (respecting .gitignore)
git add .

# 3. Create initial commit
git commit -m "Initial release: UK Wind Generation Forecast Analysis Platform"

# 4. Set default branch to main
git branch -M main

# 5. Link to your anonymous public GitHub repository
# (Create an empty public repository on GitHub e.g. 'uk-wind-forecast-platform')
git remote add origin https://github.com/<your-anonymous-user>/uk-wind-forecast-platform.git

# 6. Push to GitHub
git push -u origin main
```

---

## 4. One-Click Cloud Deployment Guide

### Option A: Frontend on Vercel + Backend on Render / Heroku (Recommended)

1. **Deploy Backend (FastAPI)**:
   - On Render (render.com) or Heroku (heroku.com): Create a new Web Service from the GitHub repo.
   - Root directory: `.`
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (or use `backend/Procfile`).
   - Copy the deployed backend URL (e.g. `https://uk-wind-backend.onrender.com`).

2. **Deploy Frontend (React + Vite)**:
   - On Vercel (vercel.com): Import the repository.
   - Root directory: `frontend`
   - Framework preset: `Vite`
   - Environment Variable: Add `VITE_API_BASE_URL` = `https://uk-wind-backend.onrender.com`
   - Click Deploy.
   - Test the live URL in an Incognito window!

### Option B: Dockerized Deployment (Single Host / VPS / AWS EC2)

```bash
docker compose up -d --build
```
Access frontend at `http://<your-server-ip>:3000` and backend at `http://<your-server-ip>:8000`.
