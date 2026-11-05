/* ================================================================== */
/*  lib/r2.ts — Cloudflare R2 access (server-only)                    */
/*                                                                     */
/*  R2 speaks the S3 API, so uploads are signed with AWS Signature   */
/*  V4. Nothing in this file may be imported by client code.         */
/* ================================================================== */

import { createHash, createHmac } from "node:crypto";

const SERVICE = "s3";
const REGION = "auto";

/* Read the environment at call time so redeploys and local .env changes
   always take effect without needing a module reload. */
function bucketName(): string {
  return process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "";
}
function accountId(): string {
  return process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
}
function accessKeyId(): string {
  return process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "";
}
function secretAccessKey(): string {
  return process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "";
}

export function r2Configured(): boolean {
  return Boolean(
    accountId() && accessKeyId() && secretAccessKey() && bucketName()
  );
}

export function r2Endpoint(): string {
  return `https://${accountId()}.r2.cloudflarestorage.com`;
}

/* ------------------------------ helpers ------------------------------ */

function sha256Hex(payload: Buffer | string): string {
  return createHash("sha256")
    .update(typeof payload === "string" ? Buffer.from(payload, "utf8") : payload)
    .digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/** ISO8601 basic format, e.g. 20261105T120000Z */
function amzDate(now: Date): { stamp: string; day: string } {
  const stamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { stamp, day: stamp.slice(0, 8) };
}

/** RFC3986 percent-encoding as required by SigV4. */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/** Encode each path segment but keep the slashes. */
function uriEncodePath(path: string): string {
  return path.split("/").map(uriEncode).join("/");
}

export type SignedUpload = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
};

/**
 * Build a presigned-style PUT request for one object.
 * We sign the request and return the exact headers the browser must send,
 * so the upload never exposes the secret key to the client.
 */
export function signPutObject(
  objectKey: string,
  contentType: string,
  contentLength?: number
): SignedUpload {
  if (!r2Configured()) {
    throw new Error("Cloudflare R2 is not configured.");
  }

  const now = new Date();
  const { stamp, day } = amzDate(now);
  const payloadHash = sha256Hex("UNSIGNED-PAYLOAD");
  const endpoint = r2Endpoint();
  const canonicalUri = `/${bucketName()}/${uriEncodePath(objectKey)}`;
  const host = new URL(endpoint).host;

  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${stamp}`,
  ];
  if (contentType) canonicalHeaders.push(`content-type:${contentType}`);
  if (typeof contentLength === "number") {
    canonicalHeaders.push(`content-length:${String(contentLength)}`);
  }
  canonicalHeaders.sort();

  const signedHeaders = canonicalHeaders.map((h) => h.split(":")[0]).join(";");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "", // no query string
    `${canonicalHeaders.join("\n")}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${day}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    stamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(
      hmac(hmac(`AWS4${secretAccessKey()}`, day), REGION),
      SERVICE
    ),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const headers: Record<string, string> = {
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKeyId()}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": stamp,
  };
  if (contentType) headers["Content-Type"] = contentType;
  if (typeof contentLength === "number") {
    headers["Content-Length"] = String(contentLength);
  }

  return {
    url: `${endpoint}${canonicalUri}`,
    method: "PUT",
    headers,
    key: objectKey,
  };
}

/**
 * Build a presigned GET URL so private objects can be read without
 * making the bucket public.
 */
export function signGetObject(objectKey: string, expiresInSeconds = 3600): string {
  if (!r2Configured()) {
    throw new Error("Cloudflare R2 is not configured.");
  }

  const now = new Date();
  const { stamp, day } = amzDate(now);
  const credentialScope = `${day}/${REGION}/${SERVICE}/aws4_request`;
  const endpoint = r2Endpoint();
  const host = new URL(endpoint).host;
  const canonicalUri = `/${bucketName()}/${uriEncodePath(objectKey)}`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId()}/${credentialScope}`,
    "X-Amz-Date": stamp,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  });
  query.sort();

  const canonicalQuery = query.toString();
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    stamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey()}`, day), REGION), SERVICE),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return `${endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/* --------------------------- object keys --------------------------- */

const SAFE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

export function allowedMediaTypes(): string[] {
  return Object.keys(SAFE_EXT);
}

export function extensionFor(contentType: string): string {
  return SAFE_EXT[contentType.toLowerCase()] ?? "bin";
}

/** Build a collision-resistant, path-safe object key. */
export function buildObjectKey(opts: {
  userId: string;
  contentType: string;
  filename?: string;
}): string {
  const safeUser = opts.userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anon";
  const ext = extensionFor(opts.contentType);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 10);
  return `media/${safeUser}/${stamp}-${rand}.${ext}`;
}
