/* ================================================================== */
/*  app/api/r2/upload/route.ts — server-only upload signing            */
/*                                                                     */
/*  The browser asks for a signed PUT, then uploads the file straight */
/*  to R2. The secret key never leaves the server.                    */
/* ================================================================== */

import { NextResponse } from "next/server";
import {
  allowedMediaTypes,
  buildObjectKey,
  r2Configured,
  signGetObject,
  signPutObject,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

type Body = {
  contentType?: string;
  size?: number;
  filename?: string;
};

export async function POST(req: Request) {
  if (!r2Configured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Cloudflare storage is not set up yet. Add the R2 variables to Vercel and redeploy.",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  const contentType = (body.contentType ?? "").toLowerCase().split(";")[0].trim();
  if (!allowedMediaTypes().includes(contentType)) {
    return NextResponse.json(
      {
        ok: false,
        error: `That file type is not supported. Use one of: ${allowedMediaTypes().join(", ")}.`,
      },
      { status: 400 }
    );
  }

  if (typeof body.size === "number" && body.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "That file is larger than 25 MB." },
      { status: 400 }
    );
  }

  // Identify the user from the Supabase session cookie if present.
  const userId = await currentUserId(req);

  const key = buildObjectKey({
    userId,
    contentType,
    filename: body.filename,
  });

  try {
    const signed = signPutObject(
      key,
      contentType,
      typeof body.size === "number" ? body.size : undefined
    );
    const readUrl = signGetObject(key, 60 * 60);

    return NextResponse.json({
      ok: true,
      key,
      uploadUrl: signed.url,
      method: signed.method,
      headers: signed.headers,
      readUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not prepare the upload.",
      },
      { status: 500 }
    );
  }
}

/** Read the signed-in user id from the Supabase auth cookie, if present. */
async function currentUserId(req: Request): Promise<string> {
  try {
    const cookie = req.headers.get("cookie") ?? "";
    const match = cookie.match(/sb-[a-z0-9-]+-auth-token=([^;]+)/i);
    if (!match) return "anon";
    const raw = decodeURIComponent(match[1]);
    const parsed = JSON.parse(raw);
    const id = parsed?.user?.id ?? parsed?.access_token;
    return typeof id === "string" ? id : "anon";
  } catch {
    return "anon";
  }
}
