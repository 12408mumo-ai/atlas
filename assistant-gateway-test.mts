import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
process.env.OLLAMA_GATEWAY_URL = "https://example.ngrok-free.app";
process.env.OLLAMA_GATEWAY_USER = "atlas";
process.env.OLLAMA_GATEWAY_PASSWORD = "fake-password-123456789";
const { POST } = await import("./app/api/assistant/route.ts");
let calls = 0;
(globalThis as any).fetch = async (url: URL, options: any) => {
  calls++; assert.equal(url.toString(), "https://example.ngrok-free.app/api/chat");
  assert.equal(options.redirect, "error"); assert(options.headers.Authorization.startsWith("Basic "));
  const body = JSON.parse(options.body); assert.equal(body.model, "smallthinker:3b"); assert.equal(body.messages[1].content, "open life");
  return new Response(JSON.stringify({message: {content: JSON.stringify({type:"open",target:"life"})}}), {status:200});
};
function req(origin = "https://atlas.example") { return new NextRequest("https://atlas.example/api/assistant", { method:"POST", headers:{"content-type":"application/json","origin":origin,"host":"atlas.example"}, body:JSON.stringify({command:"open life"}) }); }
assert.equal((await POST(req("https://other.example"))).status, 403); assert.equal(calls, 0);
assert.equal((await POST(req())).status, 200); assert.equal(calls, 1);
process.env.OLLAMA_GATEWAY_URL = "https://evil.example";
assert.equal((await POST(req())).status, 503); assert.equal(calls, 1);
console.log("Public gateway: origin checks, host restrictions and upstream request passed");
