# Anthony Service CRM

Internal CRM for [Anthony Service, LLC](https://anthonyservice.com) (Kissimmee, FL) — tracks clients and cases across the business's four service lines: notary/apostille, immigration, tax prep, and credit/financing.

## Stack

- **Framework:** Next.js (App Router, TypeScript, Tailwind)
- **Database:** [Neon](https://neon.tech) Postgres, accessed via [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Auth.js](https://authjs.dev) v5, email/password (Credentials provider)
- **File storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (for notarized documents attached to deals)
- **i18n:** [next-intl](https://next-intl.dev), bilingual English/Spanish
- **Hosting:** Vercel

## Data model

- **Contacts** — clients, one record per person
- **Deals** — a case/job for a contact, tagged with a `service_type` (`notary`, `immigration`, `tax`, `credit_financing`) and a status
- **Documents** — files attached to a deal, stored in Vercel Blob
- **Users** — internal staff logins (not client-facing)

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
3. Apply the database schema:
   ```bash
   npm run db:migrate
   ```
4. Create your first login:
   ```bash
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=changeme npm run db:seed-admin
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint the project |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:studio` | Open Drizzle Studio to browse data |
| `npm run db:seed-admin` | Create/update an admin login (`ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars) |

## Deployment

Deployed on Vercel from the `main` branch of this repo. Required environment variables (set in Vercel Project Settings → Environment Variables): `DATABASE_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`.
