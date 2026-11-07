import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 10_000;
const noStore = { "Cache-Control": "no-store" };

// This testing proxy accepts only the caller's own key and forwards it to the
// fixed Fish Audio endpoint. Keys are not stored or logged on the server.
export async function POST(request: Request) {
  const match = request.headers.get("authorization")?.match(/^Bearer ([\x21-\x7e]{1,512})$/);
  if (!match) return NextResponse.json({ error: "Enter a Fish Audio API key in settings." }, { status: 400, headers: noStore });
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return NextResponse.json({ error: "Request is too large." }, { status: 413, headers: noStore });
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return NextResponse.json({ error: "Request is too large." }, { status: 413, headers: noStore });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid voice request." }, { status: 400, headers: noStore }); }
  const { text, referenceId } = (body && typeof body === "object" ? body : {}) as { text?: unknown; referenceId?: unknown };
  if (typeof text !== "string" || !text.trim() || text.length > 1500 || typeof referenceId !== "string" || !/^[a-f0-9]{32}$/i.test(referenceId)) {
    return NextResponse.json({ error: "Enter a valid voice ID and text of at most 1,500 characters." }, { status: 400, headers: noStore });
  }
  try {
    const upstream = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { Authorization: `Bearer ${match[1]}`, "Content-Type": "application/json", model: "s2-pro" },
      body: JSON.stringify({ text: text.trim(), reference_id: referenceId, format: "mp3" }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    if (!upstream.ok) return NextResponse.json({ error: `Fish Audio returned ${upstream.status}. Check your key, voice ID, and account balance.` }, { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, headers: noStore });
    if (!upstream.body || !upstream.headers.get("content-type")?.toLowerCase().startsWith("audio/")) {
      return NextResponse.json({ error: "Fish Audio did not return audio." }, { status: 502, headers: noStore });
    }
    return new Response(upstream.body, { headers: { ...noStore, "Content-Type": "audio/mpeg", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Could not reach Fish Audio. Please try again." }, { status: 502, headers: noStore });
  }
}
