import crypto from "node:crypto";

export const SESSION_COOKIE = "shortlist_session";

const password = () => process.env.DASHBOARD_PASSWORD?.trim() || "";

export const authEnabled = () => password() !== "";

export function sessionToken(): string {
  return crypto.createHmac("sha256", password()).update("shortlist-dashboard-v1").digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function validSession(value: string | undefined): boolean {
  return !authEnabled() || (!!value && same(value, sessionToken()));
}

export function passwordMatches(input: string): boolean {
  return authEnabled() && same(input, password());
}