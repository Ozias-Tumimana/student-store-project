# Deploying Student Store to Render

You deploy **three resources**, in this order (each needs the previous one's URL):

1. **PostgreSQL database** (Neon — free, never expires)
2. **Backend** — Express API (Web Service)
3. **Frontend** — React storefront (Static Site)

> The code is already deploy-ready: the API listens on `process.env.PORT` and
> reads `DATABASE_URL` from the environment, the Prisma schema targets
> `postgresql`, and the UI reads its API URL from `VITE_API_URL`
> (`student-store-ui/src/constants.js`). Deployment is dashboard configuration only.

**Two ways to do this:**

- **Fastest — Blueprint:** create the Neon database first (step 1), then Render
  dashboard → **New + → Blueprint** → pick the `Ozias-Tumimana/student-store-project`
  repo. The included `render.yaml` creates both the API and the storefront; Render
  prompts you for `DATABASE_URL` (paste the Neon string). After the first deploy,
  set `VITE_API_URL` on the storefront (step 3) and redeploy it.
- **Manual:** follow steps 1–3 below. Prereq: push to GitHub and connect the repo
  (dashboard.render.com → New → connect `Ozias-Tumimana/student-store-project`).

---

## 1. PostgreSQL database (Neon — free, never expires)

Use **Neon** instead of Render's own Postgres. Render's free Postgres is deleted
~30 days after creation; Neon's free tier is permanent (it just auto-sleeps when
idle and wakes on the next query). This is the same setup the Orbis capstone uses.

- Go to **neon.tech** → sign up (free) → **Create Project**.
- Name it `student-store` (region: pick one close to your Render region).
- After it's created, open **Connection Details** and copy the connection string
  (starts with `postgresql://…`, ends with `?sslmode=require`). This is your
  `DATABASE_URL` — you'll paste it into the backend next.

> Keep the pooled connection string Neon shows by default; it works fine with Prisma.

---

## 2. Backend (Web Service)

- Render dashboard → **New → Web Service** → pick your repo.
- **Root Directory:** `student-store-api`
- **Runtime:** Node
- **Build Command:**
  ```
  npm install && npx prisma generate && npx prisma migrate deploy && npm run seed
  ```
  (installs deps, generates the Prisma client, applies migrations to create the
  Product/Order/OrderItem tables, then seeds the product catalog.)
- **Start Command:**
  ```
  npm start
  ```
- **Region:** same as the database.
- **Environment variables** (Advanced → Add Environment Variable):
  | Key | Value |
  |---|---|
  | `DATABASE_URL` | the **Neon connection string** from step 1 |
- Click **Create Web Service**. Wait for the deploy to finish, then copy the
  service URL — something like `https://student-store-api.onrender.com`.
- Verify: open `<that URL>/products` in a browser → you should see the seeded
  product list as JSON.

> The seed step TRUNCATEs and reloads products on every deploy — great for a demo,
> but it also wipes any orders placed through the live site. Once you're happy with
> the catalog, drop `&& npm run seed` from the build command so orders persist.

---

## 3. Frontend (Static Site)

- Render dashboard → **New → Static Site** → pick the same repo.
- **Root Directory:** `student-store-ui`
- **Build Command:**
  ```
  npm install && npm run build
  ```
- **Publish Directory:** `dist`
- **Environment variable:**
  | Key | Value |
  |---|---|
  | `VITE_API_URL` | the backend URL from step 2 (e.g. `https://student-store-api.onrender.com`) |
- **Redirects/Rewrites** (so react-router deep links work): add a rule —
  Source `/*` → Destination `/index.html` → Action **Rewrite**.
  (The `render.yaml` blueprint sets this automatically.)
- Click **Create Static Site**. When it finishes, open the site URL — you should
  see the storefront load products from your API.

---

## Free-tier gotchas

- The **backend Web Service sleeps after ~15 min idle** and cold-starts in ~30–50s,
  so the first page load after a while is slow. This is normal on the free plan.
- If the storefront loads but shows no products, it's almost always `VITE_API_URL`
  pointing at the wrong place, or the API still cold-starting — give it a minute.
