# GMS CRM — Configure & Deploy Guide (Cloudflare)

Audience: the engineering/DevOps team taking over this repo.
Last verified against production: 2026-11-14.

## 1. Architecture

```
Browser
  │  https://gms.globalmarketingsolutions.in  (also gmscrm.globalmarketingsolutions.in, gmscrm.pages.dev)
  ▼
Cloudflare Pages project "gmscrm"         ← frontend (React/Vite, folder ORDERFORM/)
  │  Pages Functions ORDERFORM/functions/api/[[path]].js and .../uploads/[[path]].js
  │  forward /api/* and /uploads/*  →  https://gms-api.gms-website.workers.dev
  ▼
Cloudflare Worker "gms-api"               ← order-backend/worker/index.js
  ├─ /uploads/*  → served from R2 bucket "gms-uploads"
  ├─ /_r2/*      → internal PUT used by the container to store uploads (needs INTERNAL_SECRET)
  ├─ cron 30 3 * * * (09:00 IST) → POST /internal/run-reminders on the container
  └─ everything else → Cloudflare Container "gms-api-backend" (Express + Mongoose, order-backend/server.js)
                          │
                          ▼
                    MongoDB Atlas (Mumbai)
```

Nothing runs on AWS any more. The container is the only metered resource (see section 8).

Repo layout

| Path | What it is |
|---|---|
| `ORDERFORM/` | Frontend. `functions/` = proxy to the backend. `public/_redirects` = SPA fallback. |
| `order-backend/` | Express API. `Dockerfile`, `wrangler.jsonc`, `worker/index.js` = Cloudflare packaging. |
| `.github/workflows/deploy-backend.yml` | Deploys the backend on every push to `main` that touches `order-backend/**`. |

## 2. Accounts and access you need

- GitHub: write access to `gmsads/Gms-Website`.
- Cloudflare account that owns Pages `gmscrm`, Worker `gms-api`, R2 `gms-uploads`, Container `gms-api-backend`. Plan must be **Workers Paid** (Containers require it).
- MongoDB Atlas: **Network Access must allow `0.0.0.0/0`** (container IPs are not fixed).
- Twilio, Cloudinary (existing keys), Google Cloud (only for the payment extractor, see 4.3).

## 3. One-time setup (new Cloudflare account or rebuild)

1. **R2 bucket:** dashboard → R2 → enable, then `npx wrangler r2 bucket create gms-uploads`.
2. **GitHub Actions secrets** (repo → Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN` — create at Cloudflare → My Profile → API Tokens with: Workers Scripts: Edit, Workers R2 Storage: Edit, Containers (Cloudchamber): Edit, Account Settings: Read, Workers Tail: Read.
3. **Worker secrets** (set once; never put them in git or in chat):
   ```
   cd order-backend
   npx wrangler secret put MONGODB_URI
   npx wrangler secret put TWILIO_ACCOUNT_SID
   npx wrangler secret put TWILIO_AUTH_TOKEN
   npx wrangler secret put ADMIN_PHONE
   npx wrangler secret put CLOUDINARY_CLOUD_NAME
   npx wrangler secret put CLOUDINARY_API_KEY
   npx wrangler secret put CLOUDINARY_API_SECRET
   npx wrangler secret put INTERNAL_SECRET        # any long random string
   ```
   Non-secret vars (`WORKER_URL`, `PRODUCTION_DOMAIN`) live in `order-backend/wrangler.jsonc`.
4. **Pages project `gmscrm`** (Workers & Pages → gmscrm → Settings → Builds): connected to the GitHub repo, production branch `main`, **root directory `ORDERFORM`**, build command `npm run build`, output `dist`. The `functions/` folder must be inside that root directory, otherwise `/api` returns 405 (this already happened once).
5. **Custom domains** on the Pages project: `gms.globalmarketingsolutions.in`, `gmscrm.globalmarketingsolutions.in`.
6. If the Worker URL changes, edit `BACKEND` in both `ORDERFORM/functions/api/[[path]].js` and `ORDERFORM/functions/uploads/[[path]].js`.

## 4. Environment variables

### 4.1 Important: the container only sees variables listed in code
`order-backend/worker/index.js` copies a fixed list of Worker secrets into the container (`envVars`). **Adding a secret with `wrangler secret put` is not enough — also add it to that list**, then deploy.

Currently passed: `MONGODB_URI, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, ADMIN_PHONE, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, PRODUCTION_DOMAIN, INTERNAL_SECRET, WORKER_URL`.

### 4.2 Local development
`order-backend/.env` (gitignored) with the same names; `npm run dev` in `order-backend` (port 5000). In `ORDERFORM`, `npm run dev` — Vite proxies `/api` to `localhost:5000`. The frontend uses relative `/api/...` URLs everywhere; do not reintroduce `http://localhost:5000` in code.

### 4.3 Open item — payment extractor (added by the other team on 2026-10-21)
`order-backend/modules/payment-extractor` reads these variables, which are **not set in production and not in the `envVars` list**, so Google Sheets sync and Google Vision OCR will not work until configured:
`GOOGLE_SHEETS_CREDENTIALS_JSON, GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_WORKSHEET_NAME, GOOGLE_VISION_CREDENTIALS_JSON, GOOGLE_CLOUD_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS`.
Prefer the `*_JSON` variants (no file on disk). Also: it saves screenshots to a local `private_uploads/` folder that is wiped whenever the container sleeps, and its fallback OCR (`tesseract.js`) can use a lot of memory on the 1 GiB container. Confirm Cloudinary is the real store before relying on it.

## 5. Deploying

### Backend (automatic)
Push to `main` with changes under `order-backend/**` → GitHub Actions → `wrangler deploy` (builds the Docker image on GitHub, so **you do not need Docker locally**). Watch it in the repo's Actions tab ("Deploy backend to Cloudflare"). It can also be run by hand (Run workflow).

### Frontend (automatic)
Push to `main` → Cloudflare Pages builds `ORDERFORM` and publishes. Check Workers & Pages → gmscrm → Deployments.

### Manual frontend deploy (emergency)
```
cd ORDERFORM
npm ci && npm run build
npx wrangler pages deploy dist --project-name gmscrm --branch main
```
Run it from `ORDERFORM` so `functions/` is included.

### Important behaviour of container rollouts
After a successful Actions run, the Worker updates immediately but **the running container keeps the old image until Cloudflare restarts it (can take 10–15 minutes)**. To force the new image now, change the instance name in `order-backend/worker/index.js` (`idFromName("main-apac-3")` → `"main-apac-4"`) and deploy. The old instance then idles out. Keep `max_instances` ≥ 2 so a rollout has a spare slot, otherwise requests fail with "Maximum number of running container instances exceeded".

## 6. Verify a deployment
```
curl -i -X POST https://gms.globalmarketingsolutions.in/api/login -H "content-type: application/json" -d '{"name":"x","password":"y"}'   # expect 401 with a JSON body
curl -s -o /dev/null -w "%{http_code}\n" https://gms.globalmarketingsolutions.in/api/orders                                              # expect 200
curl -s -o /dev/null -w "%{http_code}\n" https://gms.globalmarketingsolutions.in/                                                          # expect 200
```
- `405` on `/api/login` → Pages deployment is missing the `functions/` folder.
- `404` with `"CRM routes are not connected yet"` → someone deployed a stub Worker over `gms-api`. Redeploy from `main` (section 7).
- `500 ... Maximum number of running container instances exceeded` → too many containers; see section 5.
- Responses carry `x-app-ms` (time spent inside the backend) and `/api/orders` carries `x-cache: HIT|MISS`.

## 7. Rollback
- Backend: Cloudflare → Workers & Pages → gms-api → Deployments → roll back, or `npx wrangler rollback <VERSION_ID>`; or re-run the Actions workflow on a good commit.
- Frontend: Pages → Deployments → pick a good one → "Rollback to this deployment".
- Note a Worker rollback does not restore a deleted container application; a fresh Actions run does.

## 8. Cost controls (budget target is about $5/month plus the $5 plan fee)
Billing is per provisioned second while the container runs (`basic` ≈ $0.0115/hour). The levers, all already set in the repo:
- `sleepAfter = "10m"` in `worker/index.js` — container sleeps when idle. Do not raise it.
- `max_instances: 2`, `instance_type: "basic"` in `order-backend/wrangler.jsonc`. `lite` (256 MiB, 1/16 vCPU) was measured as too small (peak ≈ 216 MB, and too slow).
- Frontend polling pauses on hidden tabs (`ORDERFORM/src/utils/visibleInterval.js`) and runs every 1–2 minutes. **Any new `setInterval` that calls the API must use `visibleInterval`**, otherwise one open tab keeps the container awake 24/7.
- Set a budget alert: Billing → Billable Usage → "Add Budget Alert". Cloudflare has no hard spend cap.
- Estimated steady-state: about $8/month total (plan fee + ~ $3 containers) at ~10 working hours/day.

## 9. Performance notes
- Cloudflare containers reach Atlas Mumbai at about 255 ms per query whichever region is chosen. Fewer round trips beat everything else: queries fetch in one batch (`server.js`), login runs its role lookups in parallel, and `GET /api/orders` is cached in memory (`utils/orderCache.js`, 5 min TTL, cleared by Order write hooks in `models/Order.js`).
- If you add code that writes to the Order collection through the raw driver (`Order.collection.*`), call `orderCache.clear()` yourself.

## 10. Team rules that prevent outages (all of these have happened)
1. **`git pull` before every `git push`.** Remote `main` was overwritten twice by pushes from a stale clone, deleting the Worker/Dockerfile/proxy and taking login down (405).
2. **Never deploy another Worker named `gms-api`.** A half-finished stub from branch `cloudflare-worker-migration` replaced the backend on 2026-11-14. Build experiments under a different Worker name.
3. Do not commit `.wrangler/` (local Wrangler state) or any `.env`.
4. Rotate any secret that has been pasted into chat/tickets: MongoDB user password, Twilio auth token, Cloudinary API secret, the Cloudflare API tokens, and the Admin passwords (stored in plain text in the `admins` collection — hash them).
5. Keep `ORDERFORM/functions/`, `ORDERFORM/public/_redirects`, `order-backend/Dockerfile`, `order-backend/wrangler.jsonc`, `order-backend/worker/` and `.github/workflows/deploy-backend.yml` — removing any of them breaks production.

## 11. Known gaps / backlog
- `order-backend/routes/logoutHistory.js` writes a local JSON file (lost when the container sleeps) — move to MongoDB.
- `EmployeeLogin.jsx` calls `/api/auth/employee-login` and `/api/employees/with-faces`, which do not exist in the backend.
- Passwords are compared in plain text in `routes/authRoutes.js`.
- Payment extractor variables (4.3).
