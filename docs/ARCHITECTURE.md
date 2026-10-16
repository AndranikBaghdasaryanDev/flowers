# Floriani Flowers — Architecture

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.4 App Router, React 19, TypeScript (strict). `cacheComponents` + `partialPrefetching` are enabled. |
| Backend | Next.js Route Handlers under `src/app/api/**` (JSON API), plus Server Components that call the same services directly. |
| Database | MongoDB (Atlas in production) through Mongoose 9. A **replica set is required** — order creation, cancellations and category deletion use multi-document transactions. |
| Images | MongoDB GridFS bucket `media`, served by `/api/media/[id]` with immutable caching and optimized by `next/image`. |
| Styling | Tailwind CSS v4 with design tokens in `src/app/globals.css`. Fonts: Cormorant Garamond and Manrope, self-hosted from `@fontsource-variable`, so the site never depends on a font CDN. |
| Validation | Zod 4 schemas in `src/lib/validation.ts`, shared by forms and the API. |
| Email | Nodemailer over any SMTP provider. This is optional, and its status is reported honestly (see Notifications). |
| Tests | Vitest (unit + integration on an in-memory MongoDB replica set) and Playwright (E2E, mobile). |

## Source layout

```
src/
  app/
    (store)/          storefront: home, shop, categories, products, cart, checkout, account, auth, info pages
    admin/            admin dashboard (separate layout, server-side role checks)
    api/              JSON API (public, auth, account, admin/*)
    robots.ts, sitemap.ts, icon.svg
  components/         ui/ (design system), store/, home/, admin/, auth/, providers/
  lib/
    domain/           pure rules shared by client and server: order lifecycle, roles, money, time zones, slugs
    models/           Mongoose schemas with explicit TypeScript interfaces
    services/         business logic (catalog, pricing, delivery, orders, analytics, auth, account, admin, media, notifications)
    auth/             scrypt password hashing, DB sessions, page guards
    api/              route wrapper (errors, CSRF origin check, JSON parsing), ApiError
  proxy.ts            optimistic redirect for /account and /admin (real checks are server-side)
scripts/              dev-db, seed (+ sample assets), create-owner
tests/                unit, integration, e2e
```

## Key decisions

- **One service layer.** Pages (Server Components) and API routes call the same `lib/services/*` functions, so validation and authorization rules can't drift apart.
- **Server-authoritative pricing.** The client sends only product IDs and quantities. `priceCart` re-reads products, availability, stock limits and delivery fees. Checkout recomputes everything inside a transaction and can also reject the order if the total the customer saw (`expectedTotal`) has changed.
- **Idempotent checkout.** Each checkout attempt has a client-generated `idempotencyKey`, enforced by a unique partial index. A retry, double click or refresh returns the existing order instead of creating a duplicate.
- **Immutable order snapshots.** Each order line stores the name, slug, image, unit price and line total at the time of the order. A product that appears in an order can't be deleted (it is archived instead), and its images are kept.
- **Explicit lifecycle.** `lib/domain/orders.ts` defines the allowed transitions per fulfilment type (delivery or pickup), the permission each transition needs, and the guards: a courier must be assigned before dispatch, and payment must be recorded before completion. Updates use optimistic concurrency (a `version` field plus a conditional update), so two staff members can't overwrite each other's changes.
- **Separate payment status.** Payment (`unpaid → paid → refunded`, and `voided` on cancel) is tracked separately from order status. Only cash on delivery and cash at pickup are implemented. Cards are never collected.
- **Internal vs customer-visible information.** Internal notes and history notes are stored separately from customer messages. Customer DTOs (`toCustomerOrderDTO`) never contain internal fields; an integration test checks this.
- **Time zones.** Timestamps are stored in UTC. Business days (delivery dates, analytics, "today" filters) use the store time zone (default `Asia/Yerevan`), with DST-safe helpers in `lib/domain/time.ts`. Mongo's `$dateToString` uses the same time zone.
- **Cache Components.** Database reads happen at request time inside `<Suspense>` boundaries (`await connection()`), so no business data is cached stale and the build never needs a database. Admin and account pages declare `instant = false` because they are personalised by nature.

## Security

- Passwords are hashed with scrypt (N=16384) and compared in constant time. A dummy hash keeps login timing the same whether or not the email exists.
- Sessions are 256-bit random tokens in an httpOnly, SameSite=Lax cookie (`Secure` in production). Only SHA-256 hashes are stored, with a 30-day TTL. Changing or resetting a password revokes the other sessions.
- Cross-site requests are blocked on every mutating API request by an Origin and `Sec-Fetch-Site` check.
- Every API route and page checks authorization on the server through `requirePermission`, `requireStaffPage` and `requirePageUser`. Customer order queries filter by `user` inside the query itself, so asking for another customer's order ID returns "not found".
- Brute force and abuse are limited by a MongoDB-backed fixed-window rate limiter on login (per IP and per account), registration, password reset, checkout, order lookup, reviews, uploads and newsletter signup.
- Password-reset and email-verification tokens are single-use, expire, and are consumed atomically. The forgot-password response never reveals whether an email address is registered.
- Uploads are decoded with sharp: format, size and pixel limits are checked, metadata is stripped, and every image is re-encoded to WebP. Images are served with `nosniff` and `default-src 'none'`.
- Zod objects strip unknown keys, which prevents mass assignment. Profile updates write only whitelisted fields. Roles can only be changed by owners, nobody can change their own role, and there is always at least one active owner.
- Mongo queries are built from typed values, and user-supplied search text is regex-escaped.
- XSS: owner-edited text is rendered as plain text (`RichText`), and JSON-LD is escaped.
- CSV exports protect against formula injection and include contact columns only for users with `customers:read`.

## Notifications

`lib/services/notifications.ts` records every notification with a status:

- `sent`
- `failed`
- `skipped`: no provider is configured; these are never reported as delivered
- `in_app`: shown in the customer's account

Email goes out through SMTP when it is configured. SMS and messaging providers can be added later as another channel. Background sending uses `after()`, so responses are not delayed.

## Analytics definitions

See the comment at the top of `lib/services/analytics.ts` (also shown in the admin UI). In short:

- An order counts on the day it was placed.
- Cancelled orders are excluded from all value metrics.
- "Gross order value" is not revenue or profit.
- Metrics are computed live, so cancelling an order later updates them.
