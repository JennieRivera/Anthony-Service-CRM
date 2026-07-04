# Anthony Service CRM

Internal CRM for [Anthony Service, LLC](https://anthonyservice.com) (Kissimmee, FL) — tracks clients and cases across the business's four service lines: notary/apostille, immigration, tax prep, and credit/financing.

## Stack

- **Framework:** Next.js (App Router, TypeScript, Tailwind)
- **Database:** [Neon](https://neon.tech) Postgres, accessed via [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Auth.js](https://authjs.dev) v5, Google sign-in restricted to a single allowed email (`ADMIN_EMAIL`)
- **File storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (for notarized documents attached to deals)
- **i18n:** [next-intl](https://next-intl.dev), bilingual English/Spanish
- **Hosting:** Vercel

## Data model

- **Contacts** — clients, one record per person
- **Deals** — a case/job for a contact, tagged with a `service_type` (`notary`, `immigration`, `tax`, `credit_financing`) and a status
- **Documents** — files attached to a deal, stored in Vercel Blob
- **Users** — reserved for future staff logins; not used for auth today (see below)

See `src/lib/db/schema.ts` for the full schema.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `DATABASE_URL` — from your Neon project
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `BLOB_READ_WRITE_TOKEN` — from Vercel Blob storage settings
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from a Google Cloud OAuth Client ID (console.cloud.google.com → APIs & Services → Credentials → OAuth client ID → Web application; add `http://localhost:3000/api/auth/callback/google` and `https://<your-domain>/api/auth/callback/google` as authorized redirect URIs)
   - `ADMIN_EMAIL` — the only Google account allowed to sign in
3. Apply the database schema:
   ```bash
   npm run db:migrate
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) and sign in with the Google account matching `ADMIN_EMAIL`.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint the project |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:studio` | Open Drizzle Studio to browse data |

## Deployment

Deployed on Vercel from the `main` branch of this repo. Required environment variables (set in Vercel Project Settings → Environment Variables): `DATABASE_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAIL`. Remember to add the production callback URL (`https://<your-domain>/api/auth/callback/google`) to the Google OAuth client's authorized redirect URIs.
