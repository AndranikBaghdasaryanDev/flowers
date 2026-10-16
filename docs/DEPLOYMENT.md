# Deployment

## Requirements

- Node.js 20.9 or newer (developed on Node 24).
- A **MongoDB Atlas** cluster. Every Atlas tier, M0 included, is a replica set, which the app needs for transactions.
- Optionally, an SMTP account for transactional email (Postmark, SendGrid, Mailgun, Amazon SES, etc.).

## 1. MongoDB Atlas

1. Create a project and a cluster.
2. Database Access: create a user with read/write access to the database `floriani`.
3. Network Access: allow your hosting provider's egress IPs, or `0.0.0.0/0` together with a strong password.
4. Copy the connection string (`mongodb+srv://…`) into `MONGODB_URI`.

The app creates its collections and indexes on first use, so there are no manual migrations. Images are stored in the same database (GridFS bucket `media`). Back up the database, which covers the images too.

## 2. Environment variables

See `.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string |
| `MONGODB_DB` | no (default `floriani`) | Database name |
| `APP_URL` | yes in production | Public origin, e.g. `https://floriani.am`. Used in emails, canonical URLs, sitemap and CSRF checks |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | for email | Without them no emails are sent; the admin shows them as "Not sent (no provider)" |
| `MAX_UPLOAD_MB` | no (default 8) | Maximum image upload size |

Never commit `.env*` files. Only `.env.example` is tracked.

## 3. First-time data

```bash
npm ci
npm run seed                 # store settings + two delivery methods (review fees before launch)
npm run create-owner -- --email you@example.com --name "Your Name"
#   prints a one-time password if --password is not given
```

`npm run seed -- --demo` additionally loads the **sample** catalogue: 11 categories, 18 products, a gallery and homepage images. Every sample record is labelled "Sample" in the shop and the admin. Don't load it into production unless you plan to replace it.

Then sign in at `/admin` and work through the **"Finish setting up your store"** checklist:

- contact details
- delivery fees and areas
- replace the sample content
- review the legal pages
- configure email

## 4. Hosting

### Vercel

1. Import the repository and set the environment variables.
2. The build (`next build`) doesn't need database access. All data is read at request time.
3. `sharp`, `mongoose` and `nodemailer` run in the Node.js runtime (the Edge runtime is not used).

### Any Node host (Docker, VPS, Render, Railway…)

```bash
npm ci
npm run build
NODE_ENV=production npm start   # listens on PORT (default 3000)
```

Put it behind HTTPS. The session cookie is marked `Secure` in production. If a reverse proxy sets `X-Forwarded-For`, rate limits use the client IP.

## 5. After deploying

- Open `/`, `/shop` and a product page, then place a test order with a real test address.
- In `/admin/orders`, take the order through the full lifecycle, then cancel a second test order to check the restock.
- Check `/sitemap.xml` and `/robots.txt`.
- Delete the test orders' products or keep them; old orders stay intact either way.

## Local development

```bash
npm install
npm run db:local        # terminal 1: local single-node replica set in ./.data/mongo
npm run seed:demo       # once
npm run create-owner -- --email owner@example.com --name "Owner" --password "ChangeMe2026"
npm run dev             # terminal 2
```

`.env.local` for local development:

```
MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=floriani
APP_URL=http://localhost:3000
```

Without SMTP, emails are not sent. In development their content, including password-reset links, is printed to the server console.
