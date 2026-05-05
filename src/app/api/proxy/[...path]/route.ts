export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Agent, request as undiciRequest } from "undici";

// Connect directly to the server IP on port 80 (HTTP) to bypass Fortinet's
// SNI-based HTTPS filtering. Traefik routes by the Host header, so we pass
// the .local virtual hostname it expects. No DNS resolution needed.
const SERVER_HTTP = "http://15.235.165.81";
const TRAEFIK_HOST = "toko-kopi-jaya-api.local";
const API_PREFIX = "/api/v1";

const agent = new Agent();

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const url = `${SERVER_HTTP}${API_PREFIX}/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    host: TRAEFIK_HOST,
  };
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const ct = req.headers.get("content-type");
  if (ct) headers["content-type"] = ct;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  const { statusCode, headers: resHeaders, body: resBody } = await undiciRequest(url, {
    method: req.method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    headers,
    body,
    dispatcher: agent,
  });

  const resBuffer = Buffer.from(await resBody.arrayBuffer());
  const outHeaders = new Headers();
  const resCt = Array.isArray(resHeaders["content-type"])
    ? resHeaders["content-type"][0]
    : resHeaders["content-type"];
  if (resCt) outHeaders.set("content-type", resCt);

  return new NextResponse(resBuffer, { status: statusCode, headers: outHeaders });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
