# Student Store — System Spec (planning.md)

This document is the source of truth for the Student Store backend. It is written
**before** any schema or route code, and is updated whenever a real decision
changes the design. Three sections define the system:

1. **Data Models** — the three Prisma models, their fields, relationships, and cascade rules.
2. **API Contract** — every endpoint, its request/response shapes, and error cases.
3. **Transactional Flow** — the step-by-step data-layer behavior of `POST /orders`.

Decision logs and spec-reconciliation notes are appended to the end as each
milestone is completed.

---

## Section 1: Data Models

The store has three related models: **Product**, **Order**, and **OrderItem**.
Field names use Prisma's camelCase convention (matching the provided `seed.js`).
Primary keys are integers that auto-increment.

### Product

Represents a single item available for sale.

| Field         | Prisma type | Required | Default            | Notes                                  |
|---------------|-------------|----------|--------------------|----------------------------------------|
| `id`          | `Int`       | yes      | `autoincrement()`  | Primary key                            |
| `name`        | `String`    | yes      | —                  | Product name                           |
| `description` | `String`    | yes      | —                  | Longer description shown on detail page|
| `price`       | `Float`     | yes      | —                  | Unit price in USD                      |
| `imageUrl`    | `String?`   | no       | —                  | Optional; frontend falls back to a placeholder when null |
| `category`    | `String`    | yes      | —                  | e.g. "Apparel", "Books", "Snacks"      |
| `orderItems`  | `OrderItem[]` | —      | —                  | Back-relation: all order items referencing this product |

- **Primary key:** `id`, auto-incrementing.
- **Relationships:** one Product has many OrderItems (1-to-many).
- **`imageUrl` is optional** because the frontend (`ProductCard`, `ProductDetail`)
  already guards for a missing image with a placeholder. Making it optional is the
  defensive choice; all seed data happens to include one.

### Order

Represents a single customer purchase.

| Field         | Prisma type   | Required | Default        | Notes                                          |
|---------------|---------------|----------|----------------|------------------------------------------------|
| `id`          | `Int`         | yes      | `autoincrement()` | Primary key (the spec's `order_id`)         |
| `customer`    | `String`      | yes      | —              | Customer identifier — stores the email entered at checkout (the spec's `customer_id`). String chosen to support the "filter orders by email" stretch feature. |
| `totalPrice`  | `Float`       | yes      | `0`            | Sum of (item price × quantity), set during order creation |
| `status`      | `String`      | yes      | `"pending"`    | e.g. "pending", "completed", "cancelled". String is sufficient for now. |
| `createdAt`   | `DateTime`    | yes      | `now()`        | Auto-populated timestamp (the spec's `created_at`) |
| `orderItems`  | `OrderItem[]` | —        | —              | Back-relation: all items in this order         |

- **Primary key:** `id`, auto-incrementing. Referred to as `order_id` in the API paths.
- **Naming:** the spec calls these `order_id`/`customer_id`/`total_price`/`created_at`;
  the Prisma model uses `id`/`customer`/`totalPrice`/`createdAt`. The API responses
  expose Prisma's field names. This is recorded here so the frontend audit
  (Milestone 6) checks against the right shape.
- **Relationships:** one Order has many OrderItems (1-to-many).

### OrderItem

A single line item within an order — a specific product, at a specific quantity
and a captured unit price. Sits at the intersection of two relationships.

| Field        | Prisma type | Required | Default           | Notes                                         |
|--------------|-------------|----------|-------------------|-----------------------------------------------|
| `id`         | `Int`       | yes      | `autoincrement()` | Primary key (the spec's `order_item_id`)      |
| `orderId`    | `Int`       | yes      | —                 | Foreign key → `Order.id`                       |
| `order`      | `Order`     | —        | —                 | Relation, `onDelete: Cascade`                  |
| `productId`  | `Int`       | yes      | —                 | Foreign key → `Product.id`                     |
| `product`    | `Product`   | —        | —                 | Relation, `onDelete: Cascade`                  |
| `quantity`   | `Int`       | yes      | —                 | How many of this product                       |
| `price`      | `Float`     | yes      | —                 | **Unit price captured at time of purchase** — copied from the product so historical orders are stable even if the product's price later changes. |

- **Primary key:** `id`, auto-incrementing.
- **Relationships:** belongs to exactly one Order and one Product.

### Cascade Behavior (the critical part)

The required features mandate two cascade-delete rules:

1. **Deleting a Product deletes every OrderItem that references it.**
   Implemented with `onDelete: Cascade` on the `OrderItem → Product` relation.
2. **Deleting an Order deletes every OrderItem that references it.**
   Implemented with `onDelete: Cascade` on the `OrderItem → Order` relation.

OrderItem is therefore **downstream of two cascade rules at once**.

**Edge case — deleting a Product that an active Order contains:**
When a Product is deleted, its OrderItems vanish (cascade). The **Order itself is
NOT deleted** — there is no cascade from Product → Order. The order survives, but:

- It may now have fewer line items than when it was placed.
- Its stored `totalPrice` will no longer equal the sum of its remaining items
  (the total is a snapshot taken at creation, not recomputed on delete).

**Decision:** keep the order as a historical record and accept the stale
`totalPrice`. Orders are receipts; deleting one because a product was removed
would lose purchase history. The captured `OrderItem.price` already protects the
*unit* prices; only the order's aggregate total can drift. A production system
would prefer a *soft delete* / "discontinued" flag on Product instead of a hard
delete (see Decisions Log). For this project we honor the required hard-cascade
and document the tradeoff rather than hiding it.

**Dependency chain summary:**
```
Product ──(1:N, cascade)──> OrderItem <──(1:N, cascade)── Order
```
Delete a Product → its OrderItems go. Delete an Order → its OrderItems go.
Neither delete touches the other parent.

---

## Section 2: API Contract

**Base URL (local):** `http://localhost:3001`

**Consistent error shape (entire API):**
```json
{ "error": "human-readable message" }
```
All non-2xx responses return this shape with an appropriate status code.

**Common status codes:**
- `200 OK` — successful GET / PUT.
- `201 Created` — successful POST.
- `204 No Content` — successful DELETE (no body) — *(this API returns 200 with the deleted record instead; see each endpoint).*
- `400 Bad Request` — malformed/missing body fields.
- `404 Not Found` — resource (or referenced resource) does not exist.
- `500 Internal Server Error` — unexpected failure.

### Product Endpoints

#### `GET /products`
Fetch all products, with optional filtering and sorting via query parameters.

- **Request:** no body.
- **Query Parameters** (all optional):
  | Param      | Values                | Behavior                                              |
  |------------|-----------------------|-------------------------------------------------------|
  | `category` | any category string   | Exact-match filter, e.g. `?category=Apparel`. Case-sensitive (matches the stored category value). |
  | `sort`     | `price` \| `name`     | `price` → ascending by price; `name` → ascending (A→Z) by name. Any other value is ignored (no ordering). |

  - **Default behavior (no params):** return **all** products, **unordered** (database default order).
  - Params combine: `?category=Apparel&sort=price` returns only Apparel products, sorted by price ascending.
  - **Invalid `category`** (a category with no matching products) is **not an error** — it returns `200 OK` with an empty array `[]`.
  - An unrecognized `sort` value falls back to unordered (no error).
- **Success — `200 OK`:**
  ```json
  [
    { "id": 1, "name": "College Hoodie", "description": "…", "price": 29.99, "imageUrl": "https://…", "category": "Apparel" }
  ]
  ```
- **Error — `500`:** `{ "error": "Failed to fetch products" }`

#### `GET /products/:id`
Fetch one product by id.

- **Route param:** `id` (integer).
- **Success — `200 OK`:** the single product object (shape as above).
- **Error — `404`:** `{ "error": "Product not found" }`
- **Error — `400`:** `{ "error": "Invalid product id" }` (non-numeric id).

#### `POST /products`
Create a product.

- **Request body:**
  ```json
  { "name": "string", "description": "string", "price": 12.99, "imageUrl": "https://… (optional)", "category": "string" }
  ```
- **Success — `201 Created`:** the created product (including its new `id`).
- **Error — `400`:** `{ "error": "Missing required field: name" }` (or price/description/category).

#### `PUT /products/:id`
Update an existing product. Accepts any subset of the writable fields.

- **Route param:** `id` (integer).
- **Request body:** any of `name`, `description`, `price`, `imageUrl`, `category`.
- **Success — `200 OK`:** the updated product.
- **Error — `404`:** `{ "error": "Product not found" }`

#### `DELETE /products/:id`
Delete a product. Cascade-deletes its OrderItems.

- **Route param:** `id` (integer).
- **Success — `200 OK`:** `{ "message": "Product deleted", "product": { …deleted product… } }`
- **Error — `404`:** `{ "error": "Product not found" }`

### Order Endpoints

#### `GET /orders`
Fetch all orders. Each order includes its `orderItems` array.

- **Request:** no body. (Optional `?customer=email` filter added for the stretch feature — see Milestone 2/stretch notes.)
- **Success — `200 OK`:**
  ```json
  [
    {
      "id": 1, "customer": "ada@college.edu", "totalPrice": 89.97, "status": "completed",
      "createdAt": "2023-04-06T10:00:00.000Z",
      "orderItems": [ { "id": 1, "orderId": 1, "productId": 1, "quantity": 2, "price": 29.99 } ]
    }
  ]
  ```
- **Error — `500`:** `{ "error": "Failed to fetch orders" }`

#### `GET /orders/:order_id`
Fetch one order **including its order items** (and each item's product).

- **Route param:** `order_id` (integer).
- **Success — `200 OK`:** a single order object with a populated `orderItems` array (each item includes its `product`).
- **Error — `404`:** `{ "error": "Order not found" }`

#### `POST /orders`
Create an order **and its items atomically**. See Section 3 for the full flow.

- **Request body:**
  ```json
  {
    "customer": "ada@college.edu",
    "status": "pending",                     // optional, defaults to "pending"
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 4, "quantity": 1 }
    ]
  }
  ```
  - `customer` (string, required).
  - `items` (array, required, non-empty). Each item: `productId` (int, required), `quantity` (int, required, ≥ 1).
  - The client does **not** send prices or the total — the server looks up each
    product's current price and computes both `OrderItem.price` and the order's
    `totalPrice`. This prevents a client from dictating prices.
- **Success — `201 Created`:** the created order with its `orderItems` populated:
  ```json
  {
    "id": 7, "customer": "ada@college.edu", "totalPrice": 61.97, "status": "pending",
    "createdAt": "2026-06-24T18:00:00.000Z",
    "orderItems": [
      { "id": 12, "orderId": 7, "productId": 1, "quantity": 2, "price": 29.99 },
      { "id": 13, "orderId": 7, "productId": 4, "quantity": 1, "price": 1.99 }
    ]
  }
  ```
- **Error — `400`:** `{ "error": "Order must contain at least one item" }` (empty/missing `items`) or `{ "error": "customer is required" }`.
- **Error — `404`:** `{ "error": "Product with id 999 not found" }` (an item references a nonexistent product) — **no order is created** (transaction rolls back).

#### `PUT /orders/:order_id`
Update an order — primarily its `status`.

- **Route param:** `order_id` (integer).
- **Request body:** any of `status`, `customer`. (Items are not edited here.)
- **Success — `200 OK`:** the updated order (with `orderItems`).
- **Error — `404`:** `{ "error": "Order not found" }`

#### `DELETE /orders/:order_id`
Delete an order. Cascade-deletes its OrderItems.

- **Route param:** `order_id` (integer).
- **Success — `200 OK`:** `{ "message": "Order deleted", "order": { …deleted order… } }`
- **Error — `404`:** `{ "error": "Order not found" }`

### Stretch Endpoints (implemented if time allows)

- `GET /order-items` — `200 OK`, array of all order items.
- `POST /orders/:order_id/items` — add an item to an existing order; `201 Created`, the new item; `404` if order or product missing.

---

## Section 3: Transactional Flow — `POST /orders`

`POST /orders` is the most architecturally significant endpoint. It must create
an Order **and** several OrderItem rows **and** compute the total, all atomically:
if any single step fails, nothing is persisted.

### Request body
```json
{
  "customer": "ada@college.edu",
  "status": "pending",
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 4, "quantity": 1 }
  ]
}
```

### Step-by-step data-layer behavior

1. **Validate the request (before touching the DB).**
   - `customer` is a non-empty string → else `400 { error: "customer is required" }`.
   - `items` is a non-empty array → else `400 { error: "Order must contain at least one item" }`.
   - every item has a numeric `productId` and a `quantity ≥ 1` → else `400`.

2. **Open a transaction** with `prisma.$transaction(async (tx) => { … })`.
   Every query inside uses `tx`, so they all commit together or not at all.

3. **Look up the referenced products** inside the transaction:
   `tx.product.findMany({ where: { id: { in: [productIds…] } } })`.
   - Build a map of `id → product`.
   - If any requested `productId` is missing from the result, **throw** an error
     (e.g. `ProductNotFound`). Throwing inside `$transaction` aborts and rolls back
     the whole transaction — no Order, no OrderItems are written.

4. **Compute prices.** For each requested item, take the product's current
   `price` from the map. Compute:
   - each line's stored unit `price` = product's current price,
   - `totalPrice` = Σ (product price × quantity).

5. **Create the Order with its items in one nested write:**
   ```js
   tx.order.create({
     data: {
       customer,
       status: status ?? "pending",
       totalPrice,
       orderItems: {
         create: items.map(i => ({
           productId: i.productId,
           quantity:  i.quantity,
           price:     priceMap[i.productId],
         })),
       },
     },
     include: { orderItems: true },
   })
   ```
   Using a nested `create` means the Order and all its OrderItems are written in a
   single atomic operation; the FK on each item points at the new order's id.

6. **Return** the created order (with `orderItems` included) → `201 Created`.

### What happens if an item references a nonexistent product?
Step 3 detects it and throws. `prisma.$transaction` catches the throw, **rolls back**
the entire transaction, and the route handler maps the error to
`404 { "error": "Product with id <X> not found" }`. The database is left untouched —
there is **no half-created order**.

### Why a transaction (vs. plain sequential creates)?
Without `$transaction`, a failure midway (e.g. the 3rd of 4 items references a
deleted product) would leave an Order row plus a couple of OrderItems already
committed — a corrupt, partial order. `$transaction` guarantees all-or-nothing.

---

## Spec Reconciliation — Milestone 4 (Schema Audit)

Performed before running the `add_order_items_with_relations` migration, comparing
`planning.md` §1 against `prisma/schema.prisma`.

### Schema vs. spec gaps found
- **No gaps found** — the schema matched the spec exactly. All three models'
  fields, types, and modifiers line up with §1, including the back-relations
  (`Product.orderItems`, `Order.orderItems`) that were deferred from M1/M3 and
  added in this milestone.
- `OrderItem.price` carries a schema comment documenting that it is the unit price
  **captured at purchase time** (copied from the product). This matches the spec's
  description; the field type (`Float`) was already correct — only a clarifying
  comment was added, not a type change.
- The generated `migration.sql` confirms both foreign keys were created with
  `ON DELETE CASCADE ON UPDATE CASCADE`, matching the documented cascade rules.

### Cascade delete verification
- Deleting a Product removes associated OrderItems: ✅ tested — deleted Product 1,
  its order items (ids 1 and 6) disappeared, and Order 1 **survived** (a
  product-delete does not delete the order, per the §1 edge-case decision).
- Deleting an Order removes associated OrderItems: ✅ tested — deleted Order 2, its
  items (ids 3, 4, 5) were all removed.

---

## Decisions Log

_(Appended as each milestone is completed.)_

### Decisions Log — Product Model (Milestone 1)

- **Schema translation that went smoothly**: `price` as `Float` — Prisma's `Float`
  maps cleanly to PostgreSQL `double precision`, which is fine for a store of this
  scale. (A production money system would use `Decimal` to avoid floating-point
  rounding, but `Float` matches the seed data and the spec's intent without
  ceremony.) `imageUrl` as `String?` translated directly from the spec's "optional"
  note, and the frontend already guards for a missing image.

- **Field decision made during implementation that wasn't in the original spec**:
  `PUT /products/:id` was implemented as a **partial update** — the handler forwards
  only the fields actually present in the request body, so sending `{ "price": 2.49 }`
  updates just the price instead of nulling out `name`/`description`/etc. The spec
  said "update the details" without specifying partial vs. full replacement; partial
  is the more useful and less destructive behavior, so that's what I built. No new
  fields were added to the schema.

- **Route behavior that needed a spec update**: None. The spec said `DELETE` returns
  `200` with `{ message, product }` and `404 { error: "Product not found" }` for a
  missing id — confirmed and tested exactly as written. One implementation detail
  worth noting: a missing record surfaces as Prisma error code `P2025`, which the
  handlers catch and translate into the documented `404` shape rather than letting it
  fall through to a `500`. The first request after server boot can fail with a
  transient "Can't reach database server" while Prisma opens its first pool
  connection; subsequent requests are fine. No spec change needed.

### Decisions Log — Order Creation Transaction (Milestone 5)

- **What my Transactional Flow spec got right**: The step-by-step order of
  operations was accurate and implementable almost verbatim — validate the body,
  open `prisma.$transaction`, `findMany` the referenced products, throw on any
  missing id (which rolls back), compute each line price + the total from the
  products' *current* prices, then create the Order with its OrderItems in a single
  nested `create` and `include: { orderItems: true }` in the response. Computing
  prices server-side (the client never sends prices) worked exactly as designed and
  was tested: a 2×$29.99 + 1×$1.99 order returned `totalPrice` 61.97.

- **What the spec missed that I discovered during implementation**:
  - **Float drift in the total.** Summing floats can produce values like `61.97000000001`.
    The spec didn't mention rounding, so I round the stored total to cents
    (`Math.round(total * 100) / 100`). Documented here rather than silently.
  - **Item-shape validation.** §3 listed the validation conceptually but I made it
    concrete: each item must have an integer `productId` and an integer `quantity ≥ 1`,
    else `400`. Empty/missing `items` and missing `customer` were already specced and
    are enforced before the transaction opens.

- **How the transaction error handling works** (in my own words):
  `prisma.$transaction(async (tx) => { ... })` runs every `tx.*` query inside one
  database transaction. If the callback **throws** — here, when a requested
  `productId` isn't in the products looked up — Prisma issues a `ROLLBACK`, so the
  Order row and every OrderItem that would have been created are discarded as if
  nothing happened. The throw propagates out of `$transaction`; my route catches it,
  sees `err.code === 'PRODUCT_NOT_FOUND'`, and returns `404 { error: "Product with
  id <X> not found" }`. Tested: posting an order with a valid item + a nonexistent
  product returned 404 and the total order count was unchanged — **no partial order**.

- **One thing I'd design differently if starting over**: I'd store money as
  `Decimal` (Prisma `Decimal` → PostgreSQL `numeric`) instead of `Float` from the
  start, so prices and totals are exact and I wouldn't need the manual cents
  rounding. I kept `Float` here because it matches the seed data and the project
  scope, but `Decimal` is the correct call for anything handling real currency.
