import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, validSession } from "@/lib/access";

export function proxy(request: NextRequest) {
  if (validSession(request.cookies.get(ACCESS_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Unlock Atlas first." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(new URL("/pin", request.url));
}
export const config = { matcher: ["/hub/:path*", "/work/:path*", "/study/:path*", "/life/:path*", "/people/:path*", "/memories/:path*", "/atlas/:path*", "/flow-wave/:path*", "/api/((?!unlock(?:/|$)).*)"] };
