# Anthony Service CRM

A premium client-management platform for [Anthony Service, LLC](https://anthonyservice.com) (Kissimmee, FL) — tracks every client relationship and transaction across the business's service lines: notary (in-person, mobile, online), immigration, tax prep, apostille, document prep, and credit/financing.

## Modules

- **Dashboard** — KPI cards (active clients, revenue this month vs. last month, open cases, outstanding invoices), a revenue chart (weekly/monthly/yearly toggle), a service-breakdown donut, a client-growth bar chart, upcoming appointments, a recent-activity feed, and an action-needed list (overdue invoices, cases stuck waiting on a client).
- **Clients** — searchable/filterable/sortable table, a profile page (cases, invoices, appointments, documents tabs), add/edit forms with a status pipeline (lead → active → in progress → completed → follow-up).
- **Cases** — kanban board (drag between statuses) with a list-view toggle, tagged by service type. Notary-type cases capture a journal entry (document type, notarial act type, ID verification method) for Florida compliance; apostille-type cases capture destination country and submission/return dates.
- **Appointments** — a full calendar (month/week/day/agenda), color-coded by service type, click-to-create and click-to-edit.
- **Invoices** — line-item creation, mark-as-paid (with payment method), cancel, and PDF export.
- **Documents** — upload to Vercel Blob per client/case, plus a global searchable index.
- **Reports & Analytics** — custom date-range revenue by service type, new clients/cases, average case turnaround, all-time seasonality, CSV and PDF export.
- **Settings** — business profile, account info, notification preferences and staff accounts (both marked "coming soon" — this is intentionally a single-user CRM for now).

## Stack

- **Framework:** Next.js (App Router, TypeScript), Tailwind CSS v4
- **UI:** shadcn/ui (Base UI primitives), Recharts (via shadcn's `chart` component), `react-big-calendar`, `@dnd-kit` for the case kanban board
- **Forms:** React Hook Form + Zod
- **Database:** [Neon](https://neon.tech) Postgres via [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Auth.js](https://authjs.dev) v5, Google sign-in restricted to a single allowed email (`ADMIN_EMAIL`)
- **File storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **PDF export:** `@react-pdf/renderer`, served through authenticated API routes
- **CSV export:** `papaparse`
- **i18n:** [next-intl](https://next-intl.dev), bilingual English/Spanish
- **Hosting:** Vercel

## Design system

Deep navy (`#0F1A2B`) and warm cream (`#FAF8F3`) with a muted gold/brass accent (`#B8964A`), Playfair Display for headings and Public Sans for body/UI. Tokens live in `src/app/globals.css`. Single light theme (no dark mode). Gold is restricted to fills/borders/chips/chart accents — never used as a text color on the cream background (fails contrast; see the comment in `globals.css` for the full rule).

## Data model

- **Clients** — one record per person; status pipeline, referral source, interested services
- **Cases** — a job for a client, tagged with a `service_type` (notary, mobile/online notary, immigration, tax prep, apostille, document prep, credit/financing) and its own status; `clientId` required, everything else optional
- **Appointments** — scheduled events tied to a client (and optionally a case)
- **Invoices** / **Invoice line items** — billing tied to a client (and optionally a case); totals are always recomputed server-side from line items, never trusted from the client
- **Notary log entries** — Florida notarial journal records (immutable client-name snapshot, FKs `set null` never `cascade`, never hard-deleted from the UI)
- **Apostille details** — 1:1 extension of a case for apostille-specific tracking
- **Documents** — files attached to a client (and optionally a case), stored in Vercel Blob
- **Users** — reserved for future multi-staff logins; not used for auth today (Google sign-in is gated by `ADMIN_EMAIL`, not a database row)

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
4. (Optional) Seed realistic sample data — 12 clients spanning every service type, cases, appointments, invoices (including one overdue), notary log entries, and apostille details:
   ```bash
   npm run db:seed
   ```
   All seeded rows are tagged internally so they can be cleanly removed later with `npm run db:unseed` before entering real client data.
5. Run the dev server:
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
| `npm run db:seed` | Populate sample data (safe to run once; no-ops if clients already exist) |
| `npm run db:unseed` | Remove all sample data cleanly before going live |

## Deployment

Deployed on Vercel from the `main` branch of this repo. Required environment variables (set in Vercel Project Settings → Environment Variables): `DATABASE_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAIL`. Remember to add the production callback URL (`https://<your-domain>/api/auth/callback/google`) to the Google OAuth client's authorized redirect URIs.
