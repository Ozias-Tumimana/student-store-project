# CLAUDE.md — Student Store Project (Project #4)

This file is the working contract for this repo. **Re-read it at the start of each task**
to make sure work stays aligned with the assignment. The full source-of-truth system spec
lives in [student-store-api/planning.md](student-store-api/planning.md) — keep it in sync
with the schema and routes at all times.

---

## Repo layout

- `student-store-api/` — **the backend** (Node + Express + Prisma + PostgreSQL). Most work happens here.
  - `src/server.js` — Express app + all route handlers
  - `src/db/db.js` — exports the shared PrismaClient instance
  - `prisma/schema.prisma` — data models
  - `prisma/migrations/` — migration history
  - `models/` — `product.js`, `order.js`, `orderItem.js` (data-access classes using Prisma Client)
  - `data/products.json`, `data/orders.json` — seed data
  - `seed.js` — seeding script (run with `npm run seed`)
  - `planning.md` — **the system spec (source of truth)**
  - `.env` — `DATABASE_URL` (gitignored)
- `student-store-ui/` — fully built React frontend (Vite). Connected in Milestone 6.

## Environment / local conventions (this machine)

- **PostgreSQL** runs via **Postgres.app** (v18.4). CLI tools live at
  `/Applications/Postgres.app/Contents/Versions/latest/bin/` (added to PATH via
  `/etc/paths.d/postgresapp`; only visible in NEW terminal tabs).
- Local DB: **`student_store`**, owner/user **`otumimana`**, no password (trust auth).
- `DATABASE_URL="postgresql://otumimana@localhost:5432/student_store?schema=public"`
- Prisma is pinned to **v6.19.3** (CLI + client) to keep them matched. Ignore the
  "update to 7.x" nag. The `package.json#prisma` seed-config deprecation warning is also
  harmless on v6.
- Backend port: **3001** (`PORT` env or default). Frontend (Vite): **5173**.
- **Commits:** the user wants a SINGLE commit at the very end, verified end-to-end —
  NOT per-milestone. Push goes to the fork `git@github.com:Ozias-Tumimana/student-store-project.git`.

## Common commands (run from `student-store-api/`)

- Install: `npm install`
- Run server: `npm run dev` (or `npm start`) → `node ./src/server.js`
- Migrate: `npx prisma migrate dev --name <descriptive_name>`
- Generate client: `npx prisma generate`
- Seed: `npm run seed`
- Prisma Studio (inspect DB): `npx prisma studio`

---

## The Assignment (Project #4: Student Store)

Build the backend API + Prisma/PostgreSQL DB for an online student store, then connect it to
the provided React frontend. This is a multi-model system: three related models with foreign
keys, cascade deletes, and a transactional order-creation endpoint.

### Required Features

**Database** — Postgres via Prisma. Models for products, orders, order_items.

**Products model** — at minimum: `id`, `name`, `description`, `price`, `image_url`, `category`.
CRUD methods. Deleting a product cascade-deletes its order_items.

**Orders model** — at minimum: `order_id`, `customer_id`, `total_price`, `status`, `created_at`.
CRUD methods. Deleting an order cascade-deletes its order_items.

**Order Items model** — at minimum: `order_item_id`, `order_id`, `product_id`, `quantity`, `price`.
Methods for fetching and creating order items.

**Product Endpoints:**
- `GET /products` — list all products
- `GET /products/:id` — one product
- `POST /products` — create
- `PUT /products/:id` — update
- `DELETE /products/:id` — delete

**Order Endpoints:**
- `GET /orders` — list all orders
- `GET /orders/:order_id` — one order, **including its order items**
- `POST /orders` — create an order **with specified order items** (transactional)
- `PUT /orders/:order_id` — update (e.g. status)
- `DELETE /orders/:order_id` — delete

**Frontend integration** — connect backend to the provided UI. Home page displays products
from the product table. Cart + order placement must work end-to-end.

### Stretch Features
- `GET /order-items` — fetch all order items
- `POST /orders/:order_id/items` — add an item to an existing order
- Past Orders page (list past orders: id, date, total, status) → click into an individual
  order detail page (items, quantities, item costs, total)
- Filter orders by customer email on the Past Orders page (with "no orders found" handling)
- Deploy on Render

### Milestones (each references planning.md)
- **M0 — Setup:** fork, `npm install`, Express server + root route, write `planning.md`
  (3 sections: Data Models incl. cascade rules; API Contract w/ request/response/error shapes
  for every endpoint; Transactional Flow for POST /orders). ✅ DONE
- **M1 — Product model:** translate spec → schema, migrate (`init_products_table`),
  `models/product.js`, 5 product routes, test in Postman. Add **Decisions Log — Product Model**
  (2–3 entries) to planning.md.
- **M2 — Query params:** update planning.md GET /products with a Query Parameters subsection
  (category filter, sort, default behavior) BEFORE coding. Then implement with Prisma
  `where`/`orderBy` from `req.query`.
- **M3 — Order model:** schema + migrate (`add_orders_table`), `models/order.js`, order CRUD routes.
- **M4 — OrderItem + relationships:** add OrderItem with `@relation` to Order & Product,
  `onDelete: Cascade` on both, migrate (`add_order_items_with_relations`), `models/orderItem.js`,
  Order method that fetches order WITH items via `include`. Do the **Schema Audit** and add a
  **Spec Reconciliation — Milestone 4** section to planning.md.
- **M5 — Order creation transaction:** implement `POST /orders` with `prisma.$transaction` —
  create order + items + total atomically, roll back on failure, 404 on nonexistent productId,
  no partial records. Add **Decisions Log — Order Creation Transaction** to planning.md.
- **M6 — Connect frontend:** audit every UI `fetch`/axios call vs the API contract, resolve
  mismatches, enable `cors`, test full flow. Add **Final Spec Reconciliation** section to planning.md.

### Key design rules (decided in planning.md)
- Prisma model fields are camelCase: `imageUrl`, `totalPrice`, `createdAt`, `orderId`, `productId`.
  PKs are `id` (autoincrement). API paths still use `:order_id` per the spec.
- `Order.customer` is a **String** (stores checkout email) to support the email-filter stretch.
- `OrderItem.price` = unit price **captured at purchase time** (copied from product), so historical
  orders are stable if a product's price later changes.
- Cascade: deleting a Product OR an Order deletes the referencing OrderItems. Deleting a product
  does NOT delete the order (order survives as a historical record; its totalPrice may go stale).
- `POST /orders` computes prices/total server-side from current product prices — the client does
  NOT send prices.
- Consistent error shape across the whole API: `{ "error": "message" }`.

### Documentation discipline (do not skip)
Whenever a milestone says to write a Decisions Log / Spec Reconciliation section, **actually write
it into planning.md** with real content reflecting what happened. If implementation diverges from
the spec, update planning.md FIRST, then the schema/code — they must always agree.
