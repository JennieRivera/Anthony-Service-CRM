export default function DatabaseNotConfigured() {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      Neon isn&apos;t connected yet. Add DATABASE_URL to .env.local (see
      .env.local.example), run <code>npm run db:generate</code> and{" "}
      <code>npm run db:migrate</code>, then seed an admin user with{" "}
      <code>npm run db:seed-admin</code>.
    </p>
  );
}
