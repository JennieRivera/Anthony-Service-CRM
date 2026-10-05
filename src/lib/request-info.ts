// The visitor's IP and browser as Vercel reports them. Vercel sets
// x-forwarded-for / x-real-ip itself (a client-sent value is overwritten),
// so on Vercel these are trustworthy; locally they're whatever the
// request carries.
export function requestIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}

export function requestUserAgent(headers: Headers): string | null {
  return headers.get("user-agent");
}
