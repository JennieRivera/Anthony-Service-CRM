<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Anthony Service CRM

Internal CRM for Anthony Service, LLC — a notary/apostille, immigration, tax prep, and credit/financing business in Kissimmee, FL. See `README.md` for the full stack and setup steps.

## Conventions to follow

- **Data model:** everything hangs off `contacts` and `deals` (see `src/lib/db/schema.ts`). A deal always has a `service_type` (`notary` | `immigration` | `tax` | `credit_financing`) — don't add service-specific tables unless a service genuinely needs fields the others don't.
- **Database access:** always through Drizzle (`getDb()` from `src/lib/db`), never raw SQL strings, never re-introduce Supabase. `getDb()` and `isDatabaseConfigured()` are intentionally lazy so importing them doesn't throw before `DATABASE_URL` is set — follow that pattern in new server code.
- **Schema changes:** edit `src/lib/db/schema.ts`, then run `npm run db:generate` to produce a migration in `/drizzle`, and `npm run db:migrate` to apply it. Don't hand-write migration SQL.
- **Auth:** Auth.js v5 Google provider only, JWT sessions, enforced in `src/proxy.ts`. All routes are login-gated except `/login`. Sign-in is restricted in `src/auth.ts` to a single email from `ADMIN_EMAIL` — this is intentionally single-tenant for now; don't add a password/Credentials flow or open it up to arbitrary Google accounts without being asked.
- **i18n:** all user-facing text goes through `next-intl` translation keys in `messages/en.json` / `messages/es.json` — never hardcode English strings in components. Routes live under `src/app/[locale]/`.
