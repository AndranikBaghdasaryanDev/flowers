# Floriani Flowers

A premium flower e-commerce platform for **Floriani Flowers** (Yerevan). It has a customer storefront with real accounts, cart, checkout and order tracking, plus an admin dashboard for the catalogue, orders, delivery, customers, content and analytics.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 and MongoDB (Atlas) via Mongoose.

## Quick start (local)

```bash
npm install
npm run db:local                # starts a local MongoDB replica set (keep running)
npm run seed:demo               # settings, delivery methods, SAMPLE catalogue
npm run create-owner -- --email owner@example.com --name "Owner" --password "ChangeMe2026"
npm run dev                     # http://localhost:3000
```

Create `.env.local` with:

```
MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=floriani
APP_URL=http://localhost:3000
```

The admin is at `/admin`. Production setup is described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), and the design and security notes are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next core-web-vitals + TypeScript) |
| `npm test` | Vitest unit and integration tests (in-memory MongoDB replica set) |
| `npm run test:e2e` | Playwright end-to-end tests against a running app (`E2E_BASE_URL`, `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`) |
| `npm run seed` / `seed:demo` | Seed settings and delivery methods / plus the sample catalogue |
| `npm run create-owner` | Create or promote the first owner account |
| `npm run db:local` | Local development database |

## Content honesty

- Products, categories, gallery photos, prices and delivery fees from `seed:demo` are **illustrative samples**. They are flagged `isSample`, labelled "Sample" in the shop and admin, and left out of the sitemap and structured data.
- What was taken from the public Instagram profile (`@floriani.flowers`): the brand is based in Yerevan, sells bouquets, compositions and indoor plants, does wedding and event decoration, and delivers within Yerevan. No prices, product names or contact details were published there, so none were invented.
- Testimonials appear only from approved reviews by customers with a delivered order. With no reviews, a neutral brand statement is shown instead.
- Sample photos come from Unsplash (see `scripts/seed-assets/CREDITS.json`) and should be replaced with Floriani's own photography.

## Replacing the logo

Put the logo file in `public/brand/` and set `brand.logo` in [src/lib/brand.ts](src/lib/brand.ts). Every place the brand appears uses the single `<Logo />` component.
