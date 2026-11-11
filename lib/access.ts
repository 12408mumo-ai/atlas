import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE = "atlas_access";
const MAX_AGE = 12 * 60 * 60;
export function configured() {
  return /^\d{8,12}$/.test(process.env.ATLAS_PIN || "") && (process.env.ATLAS_SESSION_SECRET || "").length >= 32;
}
function signature(payload: string) { return createHmac("sha256", process.env.ATLAS_SESSION_SECRET || "").update(payload).digest("base64url"); }
function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function validPin(input: string) { return configured() && equal(input, process.env.ATLAS_PIN!); }
export function makeSession() {
  const payload = `${Math.floor(Date.now() / 1000) + MAX_AGE}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload)}`;
}
export function validSession(token: string | undefined) {
  if (!configured() || !token || token.length > 300) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{32}$/.test(parts[1])) return false;
  const expiry = Number(parts[0]), now = Math.floor(Date.now() / 1000);
  return Number.isSafeInteger(expiry) && expiry > now && expiry <= now + MAX_AGE && equal(parts[2], signature(`${parts[0]}.${parts[1]}`));
}
