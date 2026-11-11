import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, configured, makeSession, validPin } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
// Best-effort, per-instance brake only. Use a shared rate limit or Vercel WAF
// before relying on this for an exposed, paid API.
const attempts = new Map<string, { count: number; reset: number }>();
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: noStore });
  } catch { return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: noStore }); }
  if (!configured()) return NextResponse.json({ error: "PIN access is not configured. Add ATLAS_PIN and ATLAS_SESSION_SECRET in Vercel, then redeploy." }, { status: 503, headers: noStore });
  const key = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const now = Date.now();
  if (attempts.size > 1000) for (const [id, value] of attempts) if (value.reset < now) attempts.delete(id);
  const record = attempts.get(key);
  if (record && record.reset > now && record.count >= 5) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429, headers: noStore });
  if (Number(request.headers.get("content-length") || 0) > 1024) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore });
  let pin: unknown;
  try { const text = await request.text(); if (text.length > 1024) throw new Error(); pin = JSON.parse(text).pin; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore }); }
  if (typeof pin !== "string" || !/^\d{8,12}$/.test(pin) || !validPin(pin)) {
    const current = record && record.reset > now ? record : { count: 0, reset: now + 5 * 60_000 };
    current.count++; attempts.set(key, current);
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401, headers: noStore });
  }
  attempts.delete(key);
  const response = NextResponse.json({ ok: true }, { headers: noStore });
  response.cookies.set(ACCESS_COOKIE, makeSession(), { httpOnly: true, secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
  return response;
}
