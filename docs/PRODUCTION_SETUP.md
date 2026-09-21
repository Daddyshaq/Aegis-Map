# Aegis Map — Production Setup Guide
### Stack: Supabase (Database & Auth) · Render (Backend API) · Vercel (Frontend Web & PWA)

This guide provides step-by-step instructions to deploy **Aegis Map** to production using:
- **[Supabase](https://supabase.com)** — PostgreSQL database (with PostGIS spatial extensions), GoTrue Authentication, Realtime WebSocket sync, and Object Storage.
- **[Render](https://render.com)** — Containerized Fastify API engine (Node 20, rate-limiting, spatial route calculations, What3Words API integration).
- **[Vercel](https://vercel.com)** — High-performance Global Edge hosting for the React 18 SPA, PWA offline caching, and instant Git deployments.

---

## 1. Production Architecture Overview

```
                          ┌────────────────────────────────────────────────────────┐
                          │               END USER (BROWSER / PHONE)               │
                          └───────────┬────────────────────────────────┬───────────┘
                                      │                                │
                  1. Loads App Shell  │                                │ 2. Direct Auth & Realtime
                     & Static Assets  │                                │    (Guarded by RLS)
                                      ▼                                ▼
         ┌─────────────────────────────────────────┐      ┌─────────────────────────────────┐
         │              VERCEL (WEB)               │      │            SUPABASE             │
         │    React 18 · PWA Manifest & SW         │      │  PostgreSQL (PostGIS spatial)   │
         │    https://your-app.vercel.app          │      │  GoTrue Auth · Storage Buckets  │
         └────────────────────┬────────────────────┘      │  Realtime WebSockets            │
                              │                           └─────────────────▲───────────────┘
                              │ 3. API Requests (Reports,                   │
                              │    Moderation, What3Words)                  │ 4. Service-Role Access
                              ▼                                             │    (Bypasses RLS)
         ┌─────────────────────────────────────────┐                        │
         │              RENDER (API)               │                        │
         │    Fastify Engine · Docker Runner       ├────────────────────────┘
         │    https://your-api.onrender.com        │
         └─────────────────────────────────────────┘
```

---

## 2. Phase 1: Set Up Supabase (Database, Auth, Storage)

### Step 1.1: Create your Supabase Project
1. Log in to **[supabase.com](https://supabase.com)** and click **"New Project"**.
2. Select your Organization, Project Name (e.g. `aegis-map-prod`), Database Password, and select the region geographically closest to your users.
3. Wait 1–2 minutes for the database cluster to initialize.

---

### Step 1.2: Apply the Production Database Schema
Aegis Map includes a pre-assembled, consolidated SQL schema containing all tables, PostGIS extensions, triggers, RLS security policies, and default disaster categories.

1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **"New query"**.
3. Open the file [supabase/production-schema.sql](file:///c:/Users/HP/Desktop/Aegis%20Map/supabase/production-schema.sql) in this repository.
4. Copy the entire file contents and paste them into the Supabase SQL Editor.
5. Click **Run** (green button).
6. Verify that the query executes with **Success** (`Success. No rows returned`).

---

### Step 1.3: Confirm Storage Buckets & Realtime
1. **Storage Buckets**:
   - Go to **Storage** ➔ **Buckets** in your Supabase dashboard.
   - Confirm that `evidence` and `avatars` exist and are toggled to **Public** (the SQL migration automatically configured their RLS upload/read policies).
2. **Realtime Replication**:
   - Go to **Database** ➔ **Replication**.
   - Ensure the `supabase_realtime` publication has the following tables enabled:
     - `reports`
     - `alerts`
     - `safe_locations`

---

### Step 1.4: Retrieve Supabase Credentials
Go to **Project Settings** ➔ **API** and copy these credentials to a notepad:

| Credential Name | Where to find | Needed In |
|---|---|---|
| **Project URL** | **Project Settings** ➔ **API** (`https://xxxx.supabase.co`) | **Vercel** (`VITE_SUPABASE_URL`) & **Render** (`SUPABASE_URL`) |
| **Anon Public Key** | **Project Settings** ➔ **API** (`anon` `public`) | **Vercel** (`VITE_SUPABASE_ANON_KEY`) & **Render** (`SUPABASE_ANON_KEY`) |
| **Service Role Key** | **Project Settings** ➔ **API** (`service_role` `secret`) | **Render ONLY** (`SUPABASE_SERVICE_ROLE_KEY`) |
| **JWT Secret** | **Project Settings** ➔ **API** ➔ **JWT Settings** | **Render ONLY** (`SUPABASE_JWT_SECRET`) |

---

## 3. Phase 2: Deploy the Backend API to Render

The Fastify API runs inside Docker and handles spatial clustering, rate limiting, What3Words API conversions, and administrative moderation.

### Step 2.1: Create Web Service on Render
1. Go to **[dashboard.render.com](https://dashboard.render.com/)** and click **New +** ➔ **Web Service**.
2. Connect your Git repository (`Aegis-Map`).
3. Configure the service settings:
   - **Name**: `aegis-map-api`
   - **Region**: Choose the same region or closest region to your Supabase project (e.g. `Oregon` or `Frankfurt`).
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Docker Context**: `.` *(the repository root directory)*
   - **Instance Type**: `Free` or `Starter` (Starter recommended for production to prevent cold-starts).

---

### Step 2.2: Add Environment Variables in Render
Under the **Environment** tab in Render, add the following variables:

| Environment Variable | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode & caching |
| `API_HOST` | `0.0.0.0` | Binds to all network interfaces |
| `API_PORT` | `4000` | Port exposed by `apps/api/Dockerfile` |
| `LOG_LEVEL` | `info` | Pino log verbosity |
| `SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Supabase Secret Service Role Key |
| `SUPABASE_JWT_SECRET` | `your-supabase-jwt-secret` | Supabase JWT Secret |
| `CORS_ORIGIN` | `https://*.vercel.app,http://localhost:5173` | Allowed origins *(Update with your exact Vercel URL in Phase 4)* |
| `W3W_API_KEY` | *(Optional)* | What3Words API Key (from developer.what3words.com) |
| `GOOGLE_MAPS_API_KEY` | *(Optional)* | Google Maps JavaScript API key |
| `VAPID_PUBLIC_KEY` | *(Optional)* | Web Push public key (`pnpm --filter @crisis/api gen:vapid`) |
| `VAPID_PRIVATE_KEY` | *(Optional)* | Web Push private key |
| `VAPID_SUBJECT` | `mailto:admin@yourdomain.com` | Web Push contact address |

*(Note: If you prefer automated blueprint setup, this repository includes [render.yaml](file:///c:/Users/HP/Desktop/Aegis%20Map/render.yaml) which configures these settings automatically).*

---

### Step 2.3: Deploy and Copy Render URL
1. Click **Deploy Web Service**.
2. Once Render finishes building the Docker container, confirm the log displays:
   `Server listening at http://0.0.0.0:4000`
3. Copy your live Render API URL from the top of the page (e.g. `https://aegis-map-api.onrender.com`).
4. Test health: Open `https://aegis-map-api.onrender.com/api/v1/health` in your browser. It should return:
   ```json
   {"status":"ok","timestamp":"2026-..."}
   ```

---

## 4. Phase 3: Deploy the Frontend Web App to Vercel

The frontend is a React 18 SPA + Progressive Web App with MapLibre GL vector maps and optional Google Maps toggle.

### Step 3.1: Import Project into Vercel
1. Go to **[vercel.com/new](https://vercel.com/new)**.
2. Select your Git repository and click **Import**.
3. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` *(Leave at root; [vercel.json](file:///c:/Users/HP/Desktop/Aegis%20Map/vercel.json) handles building the monorepo package)*
   - **Build Command**: `pnpm --filter @crisis/web build` *(Pre-configured)*
   - **Output Directory**: `apps/web/dist` *(Pre-configured)*

---

### Step 3.2: Configure Vercel Environment Variables
Under **Environment Variables**, paste the following keys:

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | From Supabase Project Settings |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Anon Key |
| `VITE_API_URL` | `https://aegis-map-api.onrender.com` | **Your live Render URL from Step 2.3** |
| `VITE_GOOGLE_MAPS_API_KEY` | *(Optional)* | Google Maps API key (from Google Cloud Console) |
| `VITE_GOOGLE_MAPS_MAP_ID` | `DEMO_MAP_ID` | Default Vector Map ID |
| `VITE_MAP_STYLE_URL` | `https://tiles.openfreemap.org/styles/liberty` | Free OpenStreetMap style |
| `VITE_MAP_DEFAULT_LAT` | `9.0765` | Initial map center (Abuja, Nigeria) |
| `VITE_MAP_DEFAULT_LNG` | `7.3986` | Initial map center |
| `VITE_MAP_DEFAULT_ZOOM` | `6` | Initial zoom level |
| `VITE_VAPID_PUBLIC_KEY` | *(Optional)* | Same public key set on Render |

---

### Step 3.3: Deploy to Vercel
1. Click **Deploy**.
2. Vercel will build the React application and deploy it across its global edge network.
3. Once completed, Vercel will assign you a production URL (e.g. `https://aegis-map.vercel.app` or your custom domain).

---

## 5. Phase 4: Final Connection Handshakes

### 4.1 Update Supabase Auth Redirects
Now that you have your live Vercel URL:
1. Open your **Supabase Dashboard** ➔ **Authentication** ➔ **URL Configuration**.
2. Set **Site URL** to your Vercel URL:
   ```
   https://aegis-map.vercel.app
   ```
3. Under **Redirect URLs**, add:
   ```
   https://aegis-map.vercel.app/**
   https://*.vercel.app/**
   ```
   *(If you attach a custom domain like `https://aegismap.com`, add `https://aegismap.com/**` as well).*

### 4.2 Restrict Render CORS
1. In your **Render Dashboard** ➔ **Web Service (`aegis-map-api`)** ➔ **Environment**.
2. Update `CORS_ORIGIN` to include your exact Vercel production domain:
   ```
   CORS_ORIGIN=https://aegis-map.vercel.app,https://*.vercel.app
   ```
3. Save changes (Render will perform a zero-downtime rolling restart).

---

## 6. Phase 5: Post-Deployment Smoke Tests

Execute these quick tests to verify all parts of your deployment:

1. **API Health & Readiness**:
   - `https://aegis-map-api.onrender.com/api/v1/health` ➔ Returns `{"status":"ok"}`
   - `https://aegis-map-api.onrender.com/api/v1/ready` ➔ Returns `{"status":"ready"}` (Confirms Render can talk to Supabase)
2. **PWA & Web App**:
   - Open `https://aegis-map.vercel.app` in your browser.
   - The interactive crisis map should display immediately.
   - Look for the **"Install App"** prompt in the header or browser navigation bar to test PWA installation on mobile/desktop.
3. **Authentication**:
   - Click **Sign In** ➔ **Create account**.
   - Register a test user and verify the confirmation email works.
4. **What3Words & Location Picker**:
   - Go to **Safe Locations** ➔ **Suggest a location**.
   - Type a What3Words address like `///filled.count.soap`.
   - Verify that it resolves to Abuja coordinates and moves the map pin.
5. **Emergency Report Submission**:
   - Submit a test report.
   - Verify it appears on the live map in real time!

---

## 7. Ongoing Maintenance & Upgrades

- **Deploying Frontend Updates**: Any push to your Git `main` branch will automatically trigger a new zero-downtime deployment on Vercel.
- **Deploying Backend Updates**: Any push modifying backend code triggers an automated Docker build and rolling deploy on Render.
- **Database Migrations**: When adding new tables or columns in the future, run the SQL script via the Supabase SQL Editor.
- **Backups**: Supabase Cloud automatically creates daily automated backups of your PostgreSQL database. Point-in-time recovery (PITR) is available under **Database** ➔ **Backups**.
