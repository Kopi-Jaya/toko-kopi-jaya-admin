export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Agent, request as undiciRequest } from "undici";

// Two deployment modes:
//   - **Local dev** (default): hit the server's public IP over HTTP and pass
//     the Traefik virtual host via the `Host` header. Bypasses Fortinet's
//     SNI-based HTTPS filtering on Davis's home/campus networks.
//   - **Dokploy** (when BACKEND_URL is set): connect to the backend's
//     internal Docker hostname (`http://toko-kopi-jaya-api-4w8wou:3000`).
//     The container is reachable directly on the swarm network, so no
//     virtual host header is needed.
const SERVER_HTTP = process.env.BACKEND_URL ?? "http://15.235.165.81";
// BACKEND_HOST: explicit virtual-host for Traefik routing (set in .env.local for local dev).
// When deploying on Dokploy, BACKEND_URL is the internal Docker hostname so no Host header needed.
const TRAEFIK_HOST = process.env.BACKEND_HOST ?? null;
const API_PREFIX = "/api/v1";

// When hitting the raw server IP over HTTPS, the TLS cert is issued for the
// domain name, not the IP — so we must disable cert verification and set the
// correct SNI so Traefik can route to the right virtual host.
const agent = new Agent(
  process.env.BACKEND_HOST
    ? { connect: { rejectUnauthorized: false, servername: process.env.BACKEND_HOST } }
    : {}
);

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join("/");
  // Static uploads (images) live at /uploads/… on the backend, not under /api/v1.
  const backendPath = pathStr.startsWith("uploads/")
    ? `/${pathStr}`
    : `${API_PREFIX}/${pathStr}`;
  const url = `${SERVER_HTTP}${backendPath}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  if (TRAEFIK_HOST) {
    headers.host = TRAEFIK_HOST;
  }
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

  // 204/205/304 are null-body statuses — passing any body (even empty) throws
  // "Invalid response status code N" in the Fetch API Response constructor.
  const nullBodyStatus = statusCode === 204 || statusCode === 205 || statusCode === 304;
  return new NextResponse(nullBodyStatus ? null : resBuffer, { status: statusCode, headers: outHeaders });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
