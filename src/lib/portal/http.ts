import { NextResponse } from "next/server";
import { noStore } from "./session";

// Shared request checks for the client-portal API routes.

// CSRF defense in depth (the session cookie is already SameSite=Lax): a
// state-changing request must come from this same site.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readSmallJson(request: Request, maxBytes = 4096): Promise<unknown | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: noStore });

export const forbiddenOrigin = () => json({ error: "forbidden" }, 403);
export const badRequest = () => json({ error: "invalid" }, 400);
export const notFound = () => json({ error: "not_found" }, 404);
