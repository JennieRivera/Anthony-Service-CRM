<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Anthony Service CRM

Client-management platform for Anthony Service, LLC — a notary/apostille, immigration, tax prep, and credit/financing business in Kissimmee, FL. See `README.md` for the full stack, module list, and setup steps.

## Conventions to follow

- **Data model:** everything hangs off `clients` and `cases` (see `src/lib/db/schema.ts`). A case always has a `service_type` (`notary` | `mobile_notary` | `online_notary` | `immigration` | `tax_prep` | `apostille` | `document_prep` | `credit_financing`). `appointments`, `invoices`, and `documents` all anchor to a required `clientId` with an optional `caseId` — a record can exist before a formal case does (walk-in notarization, intake scan). Service-specific data goes in its own extension table (`notary_log_entries`, `apostille_details`), not as nullable columns bolted onto `cases`.
- **Financial correctness:** invoice `subtotal`/`total` are always recomputed server-side from line items in the server action — never trust a total submitted from the client.
- **Notary journal:** `notary_log_entries` is a compliance record (Florida notarial journal). FKs are `onDelete: set null`, never `cascade`, and it stores a frozen `clientNameSnapshot` so the entry survives edits elsewhere. Never add a hard-delete UI for this table.
- **Database access:** always through Drizzle (`getDb()` from `src/lib/db`), never raw SQL strings, never re-introduce Supabase or Prisma. `getDb()` and `isDatabaseConfigured()` are intentionally lazy so importing them doesn't throw before `DATABASE_URL` is set — follow that pattern (see also `isBlobConfigured()` in `src/lib/blob/config.ts`) in new server code so pages degrade gracefully instead of crashing when a service isn't configured yet.
- **Schema changes:** edit `src/lib/db/schema.ts`, then run `npm run db:generate` to produce a migration in `/drizzle`, and `npm run db:migrate` to apply it. Don't hand-write migration SQL. `drizzle-kit generate` prompts interactively on renames — if that's ever a problem again, prefer additive changes over renames now that real client data may exist.
- **Auth:** Auth.js v5 Google provider only, JWT sessions, enforced in `src/proxy.ts`. All routes are login-gated except `/login`. Sign-in is restricted in `src/auth.ts` to a single email from `ADMIN_EMAIL` — this is intentionally single-tenant for now; don't add a password/Credentials flow or open it up to arbitrary Google accounts without being asked.
- **i18n:** all user-facing text goes through `next-intl` translation keys in `messages/en.json` / `messages/es.json` — never hardcode English strings in components. Routes live under `src/app/[locale]/(app)/` (authenticated, wrapped in `AppShell`) or `src/app/[locale]/login/` (public, no shell). Always import `Link`/`useRouter`/`usePathname` from `@/i18n/navigation`, never raw `next/navigation`.
- **UI components:** this project uses shadcn/ui's Base UI flavor (`@base-ui/react`, not Radix) — composition uses a `render` prop (e.g. `<Button render={<Link href="/x" />}>`), not `asChild`. The `form` registry component isn't implemented for this flavor; forms are hand-wired with `react-hook-form` + `zodResolver` directly (see any `*Form.tsx` under `src/components/`) rather than a generic `<Form>` wrapper.
- **Design tokens:** navy/cream/gold brand tokens live in `src/app/globals.css`. Single light theme, no dark mode. Never use `--accent` (gold) as a text color on `--background`/`--card` — it fails contrast; restrict it to fills, borders, chips, and chart accents (see the comment at the top of the token block).
- **Seed data:** `scripts/seed.ts` / `scripts/unseed.ts` tag every row they create with a `"[SEED DATA]"` marker in its `notes` field so sample data can be cleanly identified and removed. Don't seed without this tag.
