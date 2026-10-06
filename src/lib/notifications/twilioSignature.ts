import { createHmac, timingSafeEqual } from "node:crypto";

// Twilio request validation (X-Twilio-Signature): base64 HMAC-SHA1, keyed
// with the account's auth token, of the full request URL followed by every
// POST parameter (sorted by name) as name+value. Pure, unit-tested.
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function isValidTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
