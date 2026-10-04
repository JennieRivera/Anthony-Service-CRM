import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getPublicAvailability } from "@/lib/booking/server";

// Public route (no login — /api is outside proxy.ts's matcher): returns
// ONLY free start times per day for one bookable service, e.g.
// { days: [{ date: "2026-10-05", slots: ["09:00", "09:30"] }] }.
// No names, titles, statuses or any other appointment detail.
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const service = new URL(request.url).searchParams.get("service") ?? "";
  if (!/^[a-z_]{1,40}$/.test(service)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const days = await getPublicAvailability(service);
  if (!days) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    { days },
    { headers: { "Cache-Control": "no-store" } },
  );
}
